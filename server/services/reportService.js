// Report service — all reporting business logic lives here,
// including aggregation (the repository returns raw rows only).
// No SQL, no req/res objects.

import * as reportRepository from '../repositories/reportRepository.js';

// --- Point Distribution -----------------------------------------

function toPointDistributionItem(row) {
  return {
    id: row.id,
    // Was a hardcoded literal before P08 added the real column —
    // see the migration comment in
    // 012_alter_wallet_transactions_admin_support.sql. Response
    // shape is unchanged; the value just comes from the database now.
    type: row.transaction_type,
    senderId: row.sender_id,
    senderUsername: row.sender_username,
    recipientId: row.recipient_id,
    recipientUsername: row.recipient_username,
    amount: row.amount,
    createdAt: row.created_at,
  };
}

function summarizePointDistribution(items) {
  return {
    totalAmount: items.reduce((sum, item) => sum + Number(item.amount), 0),
    transactionCount: items.length,
  };
}

/**
 * Point distribution within the caller's own hierarchy (self +
 * direct children; Super Admin sees everything), optionally restricted to a date range.
 * @param {{requesterId: string, requesterRole: string, startDate?: string, endDate?: string}} input
 */
export async function getPointDistributionReport({ requesterId, requesterRole, startDate, endDate }) {
  const rows = await reportRepository.getPointDistributionTransactions({
    requesterId,
    isGlobal: requesterRole === 'super_admin',
    startDate: startDate ?? null,
    endDate: endDate ?? null,
  });

  const items = rows.map(toPointDistributionItem);

  return { summary: summarizePointDistribution(items), items };
}

// --- Player Activity ----------------------------------------------

function toPlayerActivityItem(row) {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    gameId: row.game_id,
    gameName: row.game_name,
    pointsSpent: row.points_spent,
    score: row.score,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    isAltered: Boolean(row.is_altered),
    alterationReason: row.alteration_reason,
  };
}

function summarizePlayerActivity(items) {
  return {
    sessionCount: items.length,
    totalPointsSpent: items.reduce((sum, item) => sum + Number(item.pointsSpent), 0),
    completed: items.filter((item) => item.status === 'completed').length,
    inProgress: items.filter((item) => item.status === 'in_progress').length,
    abandoned: items.filter((item) => item.status === 'abandoned').length,
  };
}

/**
 * Game session activity within the caller's own hierarchy (self +
 * direct children; Super Admin sees everything), optionally restricted to a date range.
 * @param {{requesterId: string, requesterRole: string, startDate?: string, endDate?: string}} input
 */
export async function getPlayerActivityReport({ requesterId, requesterRole, startDate, endDate }) {
  const rows = await reportRepository.getPlayerActivitySessions({
    requesterId,
    isGlobal: requesterRole === 'super_admin',
    startDate: startDate ?? null,
    endDate: endDate ?? null,
  });

  const items = rows.map(toPlayerActivityItem);

  return { summary: summarizePlayerActivity(items), items };
}

// --- Login Activity -------------------------------------------------

function toLoginActivityItem(row) {
  return {
    id: row.id,
    userId: row.actor_id,
    username: row.username,
    action: row.action,
    reason: row.metadata?.reason ?? null,
    attemptedUsername: row.metadata?.attemptedUsername ?? null,
    createdAt: row.created_at,
  };
}

function summarizeLoginActivity(items) {
  return {
    successCount: items.filter((item) => item.action === 'login_success').length,
    failureCount: items.filter((item) => item.action === 'login_failed').length,
  };
}

/**
 * Platform-wide login activity (no hierarchy scoping — Super Admin
 * only), optionally restricted to a date range.
 * @param {{startDate?: string, endDate?: string}} input
 */
export async function getLoginReport({ startDate, endDate }) {
  const rows = await reportRepository.getLoginActivity({
    startDate: startDate ?? null,
    endDate: endDate ?? null,
  });

  const items = rows.map(toLoginActivityItem);

  return { summary: summarizeLoginActivity(items), items };
}

// --- Game Win / Loss -------------------------------------------------

function toGameResultItem(row) {
  const totalWon = Number(row.total_won);
  const totalLost = Number(row.total_lost);

  return {
    gameName: row.game_name,
    sessions: Number(row.sessions),
    boughtIn: Number(row.bought_in),
    paidOut: Number(row.paid_out),
    totalWon,
    totalLost,
    houseNet: totalLost - totalWon,
  };
}

function summarizeGameResults(items, houseBalance) {
  const sum = (key) => items.reduce((total, item) => total + item[key], 0);
  const totalWon = sum('totalWon');
  const totalLost = sum('totalLost');

  return {
    sessions: sum('sessions'),
    boughtIn: sum('boughtIn'),
    paidOut: sum('paidOut'),
    totalWon,
    totalLost,
    // What the house gained (positive) or paid out (negative) over the range.
    houseNet: totalLost - totalWon,
    houseBalance: houseBalance ?? 0,
  };
}

/**
 * Platform-wide player win/loss over settled game sessions, per game and in
 * total (Super Admin only), optionally restricted to a date range. A session
 * is "won" by score above its buy-in and "lost" by score below it; whatever
 * players lose is what the house (Super Admin) wallet keeps.
 * @param {{startDate?: string, endDate?: string}} input
 */
export async function getGameResultsReport({ startDate, endDate }) {
  const [rows, houseBalance] = await Promise.all([
    reportRepository.getGameResultsByGame({ startDate: startDate ?? null, endDate: endDate ?? null }),
    reportRepository.getHouseWalletBalance(),
  ]);

  const items = rows.map(toGameResultItem);

  return { summary: summarizeGameResults(items, houseBalance), items };
}
