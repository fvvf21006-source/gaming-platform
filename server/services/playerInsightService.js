// Player insight service — who may look at a player's results, history and
// logs, and how the pieces are put together. No SQL, no req/res.

import * as playerInsightRepository from '../repositories/playerInsightRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import { forbidden, notFound } from '../utils/httpErrors.js';

const VIEWER_ROLES = ['super_admin', 'level_3'];
const HISTORY_LIMIT = 100;

const n = (value) => Number(value ?? 0);

function toGameResult(row) {
  const totalWon = n(row.total_won);
  const totalLost = n(row.total_lost);

  return {
    gameName: row.game_name,
    rounds: n(row.rounds),
    openRounds: n(row.open_rounds),
    boughtIn: n(row.bought_in),
    paidOut: n(row.paid_out),
    totalWon,
    totalLost,
    wins: n(row.wins),
    losses: n(row.losses),
    net: totalWon - totalLost,
  };
}

function summarizeResults(byGame) {
  const sum = (key) => byGame.reduce((total, g) => total + g[key], 0);
  const rounds = sum('rounds');
  const wins = sum('wins');
  const totalWon = sum('totalWon');
  const totalLost = sum('totalLost');

  return {
    rounds,
    openRounds: sum('openRounds'),
    boughtIn: sum('boughtIn'),
    paidOut: sum('paidOut'),
    totalWon,
    totalLost,
    net: totalWon - totalLost,
    wins,
    losses: sum('losses'),
    winRate: rounds > 0 ? Math.round((wins / rounds) * 100) : 0,
  };
}

function toSession(row) {
  const payout = row.pays_out ? n(row.score) : 0;

  return {
    id: row.id,
    gameName: row.game_name,
    paysOut: Boolean(row.pays_out),
    pointsSpent: n(row.points_spent),
    score: row.score === null ? null : n(row.score),
    // Points actually returned to the player; an arcade score is not points.
    payout,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    isAltered: Boolean(row.is_altered),
    alterationReason: row.alteration_reason,
    forcedScore: row.forced_score ?? null,
  };
}

function toTransaction(row, playerId) {
  const incoming = row.recipient_id === playerId;

  return {
    id: row.id,
    type: row.transaction_type,
    direction: incoming ? 'in' : 'out',
    amount: n(row.amount),
    counterparty: incoming ? row.sender_username : row.recipient_username,
    balanceAfter: incoming ? row.recipient_balance_after : row.sender_balance_after,
    createdAt: row.created_at,
  };
}

function toLog(row) {
  return {
    id: row.id,
    action: row.action,
    actorUsername: row.actor_username,
    entityType: row.entity_type,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

/** Only Super Admin and Level 3 may look into players' results and history. */
export async function assertCanViewPlayers(requesterRole) {
  if (!VIEWER_ROLES.includes(requesterRole)) {
    throw forbidden('Only Level 3 users and administrators can view player results');
  }
}

/**
 * A single player's full picture: account facts, win/lose totals, per-game
 * breakdown, recent games, point movements, logins and the activity log.
 * Super Admin may open any player; Level 3 only players in their hierarchy.
 * @param {{requesterId: string, requesterRole: string, playerId: string}} input
 */
export async function getPlayerOverview({ requesterId, requesterRole, playerId }) {
  await assertCanViewPlayers(requesterRole);

  const player = await userRepository.findUserById(playerId);

  if (!player || player.role !== 'player') {
    throw notFound('Player not found');
  }

  if (requesterRole !== 'super_admin') {
    const inHierarchy = await userRepository.isDescendant(requesterId, playerId);

    if (!inHierarchy) {
      throw forbidden('Player is outside your hierarchy');
    }
  }

  const [meta, byGameRows, sessionRows, transactionRows, logRows, logins] = await Promise.all([
    playerInsightRepository.findPlayerMeta(playerId),
    playerInsightRepository.getResultsByGame(playerId),
    playerInsightRepository.getRecentSessions(playerId, HISTORY_LIMIT),
    playerInsightRepository.getRecentTransactions(playerId, HISTORY_LIMIT),
    playerInsightRepository.getRecentLogs(playerId, player.username, HISTORY_LIMIT),
    playerInsightRepository.getLoginSummary(playerId, player.username),
  ]);

  const byGame = byGameRows.map(toGameResult);

  return {
    player: {
      id: player.id,
      username: player.username,
      email: player.email,
      status: player.status,
      balance: player.balance === null ? null : n(player.balance),
      createdAt: player.created_at,
      createdBy: meta?.created_by_username ?? null,
      lastSeenAt: meta?.last_seen_at ?? null,
    },
    totals: summarizeResults(byGame),
    byGame,
    sessions: sessionRows.map(toSession),
    transactions: transactionRows.map((row) => toTransaction(row, playerId)),
    logins: {
      successes: n(logins?.successes),
      failures: n(logins?.failures),
      lastLoginAt: logins?.last_login_at ?? null,
    },
    logs: logRows.map(toLog),
    historyLimit: HISTORY_LIMIT,
  };
}
