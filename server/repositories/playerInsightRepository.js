// Player insight repository — the only layer permitted to contain SQL for the
// per-player overview (results, game history, points movements, activity log).
// No authorization or business rules here; playerInsightService decides who may
// look at whom and shapes the response.

import pool from '../database/connection.js';

// What a settled round paid the player in points. Only casino games
// (games.pays_out) report points as their score; an arcade score is just a score.
const PAYOUT = `(CASE WHEN g.pays_out THEN COALESCE(s.score, 0) ELSE 0 END)`;

/**
 * Basic account facts the overview needs beyond findUserById: when the player
 * was last active and who created them.
 * @param {string} userId
 */
export async function findPlayerMeta(userId) {
  const result = await pool.query(
    `SELECT u.last_seen_at, parent.username AS created_by_username
     FROM users u
     LEFT JOIN users parent ON parent.id = u.created_by
     WHERE u.id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * Per-game totals over a player's finished rounds, plus how many rounds are
 * still open.
 * @param {string} userId
 */
export async function getResultsByGame(userId) {
  const result = await pool.query(
    `SELECT
       g.name AS game_name,
       COUNT(*) FILTER (WHERE s.status = 'completed') AS rounds,
       COUNT(*) FILTER (WHERE s.status = 'in_progress') AS open_rounds,
       COALESCE(SUM(s.points_spent) FILTER (WHERE s.status = 'completed'), 0) AS bought_in,
       COALESCE(SUM(${PAYOUT}) FILTER (WHERE s.status = 'completed'), 0) AS paid_out,
       COALESCE(SUM(GREATEST(${PAYOUT} - s.points_spent, 0)) FILTER (WHERE s.status = 'completed'), 0) AS total_won,
       COALESCE(SUM(GREATEST(s.points_spent - ${PAYOUT}, 0)) FILTER (WHERE s.status = 'completed'), 0) AS total_lost,
       COUNT(*) FILTER (WHERE s.status = 'completed' AND ${PAYOUT} > s.points_spent) AS wins,
       COUNT(*) FILTER (WHERE s.status = 'completed' AND ${PAYOUT} < s.points_spent) AS losses
     FROM game_sessions s
     JOIN games g ON g.id = s.game_id
     WHERE s.user_id = $1
     GROUP BY g.name
     ORDER BY g.name ASC`,
    [userId]
  );

  return result.rows;
}

/**
 * The player's most recent game sessions, newest first.
 * @param {string} userId
 * @param {number} limit
 */
export async function getRecentSessions(userId, limit) {
  const result = await pool.query(
    `SELECT
       s.id,
       g.name AS game_name,
       g.pays_out,
       s.points_spent,
       s.score,
       s.status,
       s.started_at,
       s.completed_at,
       s.is_altered,
       s.alteration_reason,
       s.forced_score
     FROM game_sessions s
     JOIN games g ON g.id = s.game_id
     WHERE s.user_id = $1
     ORDER BY s.started_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
}

/**
 * Every point movement into or out of the player's wallet (transfers,
 * adjustments, game buy-ins and payouts), newest first.
 * @param {string} userId
 * @param {number} limit
 */
export async function getRecentTransactions(userId, limit) {
  const result = await pool.query(
    `SELECT
       t.id,
       t.transaction_type,
       t.amount,
       t.sender_id,
       sender.username AS sender_username,
       t.recipient_id,
       recipient.username AS recipient_username,
       t.sender_balance_after,
       t.recipient_balance_after,
       t.created_at
     FROM wallet_transactions t
     JOIN users sender ON sender.id = t.sender_id
     JOIN users recipient ON recipient.id = t.recipient_id
     WHERE t.sender_id = $1 OR t.recipient_id = $1
     ORDER BY t.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
}

/**
 * Audit-log entries that involve the player: things they did, things done to
 * them (including by supervisors), and transfers naming them.
 * @param {string} userId
 * @param {string} username
 * @param {number} limit
 */
export async function getRecentLogs(userId, username, limit) {
  const result = await pool.query(
    `SELECT
       a.id,
       a.action,
       a.entity_type,
       a.entity_id,
       a.metadata,
       a.created_at,
       actor.username AS actor_username
     FROM audit_logs a
     LEFT JOIN users actor ON actor.id = a.actor_id
     WHERE a.actor_id = $1
        OR a.entity_id = $1
        OR a.metadata->>'targetPlayerId' = $1::text
        OR a.metadata->>'targetUserId' = $1::text
        OR a.metadata->>'recipient' = $2
        OR a.metadata->>'sender' = $2
        OR (a.action = 'login_failed' AND a.metadata->>'attemptedUsername' = $2)
     ORDER BY a.created_at DESC
     LIMIT $3`,
    [userId, username, limit]
  );

  return result.rows;
}

/**
 * Login counts and the last successful login.
 * @param {string} userId
 * @param {string} username
 */
export async function getLoginSummary(userId, username) {
  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE action = 'login_success' AND actor_id = $1) AS successes,
       COUNT(*) FILTER (WHERE action = 'login_failed' AND metadata->>'attemptedUsername' = $2) AS failures,
       MAX(created_at) FILTER (WHERE action = 'login_success' AND actor_id = $1) AS last_login_at
     FROM audit_logs
     WHERE action IN ('login_success', 'login_failed')`,
    [userId, username]
  );

  return result.rows[0];
}
