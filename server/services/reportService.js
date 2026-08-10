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
 * descendants), optionally restricted to a date range.
 * @param {{requesterId: string, startDate?: string, endDate?: string}} input
 */
export async function getPointDistributionReport({ requesterId, startDate, endDate }) {
  const rows = await reportRepository.getPointDistributionTransactions({
    requesterId,
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
 * descendants), optionally restricted to a date range.
 * @param {{requesterId: string, startDate?: string, endDate?: string}} input
 */
export async function getPlayerActivityReport({ requesterId, startDate, endDate }) {
  const rows = await reportRepository.getPlayerActivitySessions({
    requesterId,
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
