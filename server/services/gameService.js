// Game service — all game-management business logic lives here. No
// SQL (that's the repository's job), no req/res objects (that's the
// controller's job).

import * as gameRepository from '../repositories/gameRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import { forbidden, notFound, conflict } from '../utils/httpErrors.js';

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
    gameId: row.game_id,
    gameName: row.game_name,
    pointsSpent: row.points_spent,
    score: row.score,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
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

  if (player.status === 'frozen') {
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

  return {
    ...toPublicSession({ ...result.session, game_name: game.name }),
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

  if (session.status !== 'in_progress') {
    throw conflict('Session is not in progress');
  }

  const updated = await gameRepository.completeSession(sessionId, score);

  if (!updated) {
    // Race condition: the session was completed/abandoned by another
    // request between the check above and this update.
    throw conflict('Session is not in progress');
  }

  return toPublicSession(updated);
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
