// Game service — all game-management business logic lives here. No
// SQL (that's the repository's job), no req/res objects (that's the
// controller's job).

import * as gameRepository from '../repositories/gameRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import { forbidden, notFound, conflict } from '../utils/httpErrors.js';
import { createNotification } from './notificationService.js';
import { logAction } from './auditService.js';
import { isEffectivelyFrozen } from './accountStatusService.js';

function toPublicGame(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    pointCost: row.point_cost,
    category: row.category,
  };
}

function toPublicSession(row) {
  return {
    id: row.id,
    userId: row.user_id,
    playerUsername: row.player_username,
    gameId: row.game_id,
    gameName: row.game_name,
    pointsSpent: row.points_spent,
    score: row.score,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    isAltered: Boolean(row.is_altered),
    alteredBy: row.altered_by,
    alterationReason: row.alteration_reason,
  };
}

/**
 * Returns the current catalog of active games.
 */
export async function listGames() {
  const rows = await gameRepository.findActiveGames();
  const items = rows.map(toPublicGame);

  return { items, total: items.length };
}

/**
 * Starts a game session for a Player: debits the point cost from
 * their wallet and creates the session, atomically (BR-20, BR-21).
 *
 * The player is re-fetched fresh from the database rather than
 * trusted from the JWT, so a frozen account can't start a session
 * even with a still-valid, previously-issued token — the same
 * pattern walletService.transferPoints uses for BR-18.
 * @param {{userId: string, gameId: string}} input
 */
export async function playGame({ userId, gameId }) {
  const player = await userRepository.findUserById(userId);

  if (!player) {
    throw notFound('Player not found');
  }

  if (await isEffectivelyFrozen(player)) {
    throw forbidden('A frozen account cannot start a game session');
  }

  const game = await gameRepository.findGameById(gameId);

  if (!game || !game.is_active) {
    throw notFound('Game not found');
  }

  let result;

  try {
    result = await gameRepository.startGameSession({
      userId,
      gameId,
      pointCost: game.point_cost,
    });
  } catch (err) {
    if (err.code === 'INSUFFICIENT_BALANCE') {
      throw conflict('Insufficient balance');
    }
    throw err;
  }

  await logAction({
    actorId: userId,
    action: 'game_started',
    entityType: 'game_session',
    entityId: result.session.id,
    metadata: { game: game.name, cost: game.point_cost },
  });

  return {
    ...toPublicSession({ ...result.session, game_name: game.name, player_username: player.username }),
    remainingBalance: result.walletBalance,
  };
}

/**
 * Records the result of a completed game session (BR-22). Only the
 * session's own owner may complete it, and only while it is still
 * in_progress.
 * @param {{userId: string, sessionId: string, score: number}} input
 */
export async function completeSession({ userId, sessionId, score }) {
  const session = await gameRepository.findSessionById(sessionId);

  if (!session) {
    throw notFound('Session not found');
  }

  if (session.user_id !== userId) {
    throw forbidden('This is not your session');
  }

  // If session was forcibly altered while in progress (e.g. by Level 3 agent),
  // return the forced loss session gracefully to the player.
  if (session.is_altered) {
    const game = await gameRepository.findGameById(session.game_id);
    return toPublicSession({ ...session, game_name: game?.name });
  }

  if (session.status !== 'in_progress') {
    throw conflict('Session is not in progress');
  }

  const updated = await gameRepository.completeSession(sessionId, score);

  if (!updated) {
    // Race condition: session was altered or completed right before update
    const freshSession = await gameRepository.findSessionById(sessionId);
    if (freshSession?.is_altered) {
      const game = await gameRepository.findGameById(freshSession.game_id);
      return toPublicSession({ ...freshSession, game_name: game?.name });
    }
    throw conflict('Session is not in progress');
  }

  const game = await gameRepository.findGameById(session.game_id);

  await createNotification({
    userId,
    type: 'game_completed',
    message: `You completed ${game?.name ?? 'a game'} with a score of ${score}.`,
  });

  await logAction({
    actorId: userId,
    action: 'game_completed',
    entityType: 'game_session',
    entityId: sessionId,
    metadata: { score },
  });

  return toPublicSession({ ...updated, game_name: game?.name });
}

/**
 * Returns the caller's own gameplay history, newest first (BR
 * — "Players can view their own gameplay history", FR-4.4).
 * @param {string} userId
 */
export async function getHistory(userId) {
  const rows = await gameRepository.findSessionsByUserId(userId);
  const items = rows.map(toPublicSession);

  return { items, total: items.length };
}

/**
 * Returns all active (in_progress) game sessions for descendant players under requester.
 * @param {string} requesterId
 * @param {string} requesterRole
 */
export async function getActiveSessions(requesterId, requesterRole) {
  const ALLOWED_ROLES = ['super_admin', 'level_3'];
  if (!ALLOWED_ROLES.includes(requesterRole)) {
    throw forbidden('Only Level 3 users and administrators can view active game sessions');
  }

  const rows = await gameRepository.findActiveSessionsForAncestors(requesterId, requesterRole);
  const items = rows.map(toPublicSession);

  return { items, total: items.length };
}

/**
 * Forcibly alters an active game session (e.g. Level 3 forces player to lose).
 * @param {{requesterId: string, requesterRole: string, sessionId: string, score?: number, reason?: string}} input
 */
export async function alterSession({ requesterId, requesterRole, sessionId, score = 0, reason }) {
  const ALLOWED_ROLES = ['super_admin', 'level_3'];
  if (!ALLOWED_ROLES.includes(requesterRole)) {
    throw forbidden('Only Level 3 users and administrators can alter game sessions');
  }

  const session = await gameRepository.findSessionById(sessionId);

  if (!session) {
    throw notFound('Session not found');
  }

  if (session.status !== 'in_progress') {
    throw conflict('Session is no longer in progress');
  }

  if (requesterRole !== 'super_admin') {
    const isDescendant = await userRepository.isDescendant(requesterId, session.user_id);
    if (!isDescendant) {
      throw forbidden('Player is outside your hierarchy');
    }
  }

  const defaultReason = reason || 'Game outcome altered by Level 3 supervisor (Forced loss)';
  const altered = await gameRepository.alterGameSession({
    sessionId,
    alteredBy: requesterId,
    score,
    reason: defaultReason,
  });

  if (!altered) {
    throw conflict('Session is no longer in progress');
  }

  const game = await gameRepository.findGameById(session.game_id);

  await createNotification({
    userId: session.user_id,
    type: 'game_altered',
    message: `Your active game session for "${game?.name ?? 'the game'}" was altered by your level 3 supervisor (Outcome: Forced Loss, Score: ${score}).`,
  });

  await logAction({
    actorId: requesterId,
    action: 'game_altered',
    entityType: 'game_session',
    entityId: sessionId,
    metadata: {
      targetPlayerId: session.user_id,
      gameName: game?.name,
      forcedScore: score,
      reason: defaultReason,
    },
  });

  return toPublicSession({ ...altered, game_name: game?.name });
}
