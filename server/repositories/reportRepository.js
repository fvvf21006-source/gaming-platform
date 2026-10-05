// Report repository — the only layer permitted to contain SQL for
// reporting data access. No aggregation and no business logic here
// — every method returns raw rows; totals/summaries are computed in
// reportService, per the existing layering convention.

import pool from '../database/connection.js';

// Shared hierarchy-scoping fragment: the requester plus the users
// they directly created (immediate child tier only — never deeper
// levels). Kept as one constant so both report queries below scope
// identically.
const DESCENDANTS_AND_SELF_CTE = `
  WITH descendants AS (
    SELECT id FROM users WHERE $4::boolean OR id = $1 OR created_by = $1
  )
`;

/**
 * Every wallet_transactions row sent or received by the requester or
 * their direct children (everyone, when isGlobal — Super Admin), optionally date-filtered.
 * @param {{requesterId: string, isGlobal: boolean, startDate: string|null, endDate: string|null}} input
 */
export async function getPointDistributionTransactions({ requesterId, isGlobal, startDate, endDate }) {
  const result = await pool.query(
    `${DESCENDANTS_AND_SELF_CTE}
     SELECT
       t.id,
       t.sender_id,
       sender.username AS sender_username,
       t.recipient_id,
       recipient.username AS recipient_username,
       t.amount,
       t.transaction_type,
       t.created_at
     FROM wallet_transactions t
     JOIN users sender ON sender.id = t.sender_id
     JOIN users recipient ON recipient.id = t.recipient_id
     WHERE (t.sender_id IN (SELECT id FROM descendants) OR t.recipient_id IN (SELECT id FROM descendants))
       AND t.transaction_type NOT IN ('game_buy_in', 'game_payout')
       AND ($2::timestamptz IS NULL OR t.created_at >= $2)
       AND ($3::timestamptz IS NULL OR t.created_at <= $3)
     ORDER BY t.created_at DESC`,
    [requesterId, startDate, endDate, isGlobal]
  );

  return result.rows;
}

/**
 * Every game_sessions row belonging to the requester or their direct
 * children (everyone, when isGlobal — Super Admin), optionally date-filtered.
 * @param {{requesterId: string, isGlobal: boolean, startDate: string|null, endDate: string|null}} input
 */
export async function getPlayerActivitySessions({ requesterId, isGlobal, startDate, endDate }) {
  const result = await pool.query(
    `${DESCENDANTS_AND_SELF_CTE}
     SELECT
       s.id,
       s.user_id,
       u.username,
       s.game_id,
       g.name AS game_name,
       s.points_spent,
       s.score,
       s.status,
       s.started_at,
       s.completed_at,
       s.is_altered,
       s.alteration_reason
     FROM game_sessions s
     JOIN users u ON u.id = s.user_id
     JOIN games g ON g.id = s.game_id
     WHERE s.user_id IN (SELECT id FROM descendants)
       AND ($2::timestamptz IS NULL OR s.started_at >= $2)
       AND ($3::timestamptz IS NULL OR s.started_at <= $3)
     ORDER BY s.started_at DESC`,
    [requesterId, startDate, endDate, isGlobal]
  );

  return result.rows;
}

/**
 * Every login-related audit_logs entry, platform-wide (no hierarchy
 * scoping — this report is Super-Admin-only), optionally date-filtered.
 * @param {{startDate: string|null, endDate: string|null}} input
 */
export async function getLoginActivity({ startDate, endDate }) {
  const result = await pool.query(
    `SELECT
       a.id,
       a.actor_id,
       u.username,
       a.action,
       a.metadata,
       a.created_at
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.actor_id
     WHERE a.action IN ('login_success', 'login_failed')
       AND ($1::timestamptz IS NULL OR a.created_at >= $1)
       AND ($2::timestamptz IS NULL OR a.created_at <= $2)
     ORDER BY a.created_at DESC`,
    [startDate, endDate]
  );

  return result.rows;
}

/**
 * Settled (completed) game sessions summed per game (only casino games pay
 * their score out as points; arcade buy-ins count as fully lost), platform-wide (Super
 * Admin only), optionally filtered by when the session finished. Sums are
 * computed in SQL because the raw session rows can be very numerous; the
 * service only totals the per-game rows.
 * @param {{startDate: string|null, endDate: string|null}} input
 */
export async function getGameResultsByGame({ startDate, endDate }) {
  const result = await pool.query(
    `SELECT
       g.name AS game_name,
       COUNT(*) AS sessions,
       COALESCE(SUM(s.points_spent), 0) AS bought_in,
       COALESCE(SUM(CASE WHEN g.pays_out THEN s.score ELSE 0 END), 0) AS paid_out,
       COALESCE(SUM(GREATEST(CASE WHEN g.pays_out THEN s.score ELSE 0 END - s.points_spent, 0)), 0) AS total_won,
       COALESCE(SUM(GREATEST(s.points_spent - CASE WHEN g.pays_out THEN s.score ELSE 0 END, 0)), 0) AS total_lost
     FROM game_sessions s
     JOIN games g ON g.id = s.game_id
     WHERE s.status = 'completed'
       AND ($1::timestamptz IS NULL OR s.completed_at >= $1)
       AND ($2::timestamptz IS NULL OR s.completed_at <= $2)
     GROUP BY g.name
     ORDER BY g.name ASC`,
    [startDate, endDate]
  );

  return result.rows;
}

/**
 * The Super Admin house wallet balance, or null if it has never received a buy-in.
 */
export async function getHouseWalletBalance() {
  const result = await pool.query(
    `SELECT w.balance
     FROM wallets w
     JOIN users u ON u.id = w.user_id
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'super_admin'
     ORDER BY u.created_at ASC
     LIMIT 1`
  );

  return result.rows[0] ? Number(result.rows[0].balance) : null;
}

/**
 * Win/lose totals for each player the requester may see (every player for
 * Super Admin, direct-child players otherwise), over finished rounds. Only
 * casino games pay their score out as points. Aggregated in SQL so a long
 * history stays cheap to load for the whole player list.
 * @param {{requesterId: string, isGlobal: boolean}} input
 */
export async function getPlayerResultTotals({ requesterId, isGlobal }) {
  const result = await pool.query(
    `WITH descendants AS (
       SELECT id FROM users WHERE $2::boolean OR id = $1 OR created_by = $1
     )
     SELECT
       s.user_id,
       COUNT(*) AS rounds,
       COALESCE(SUM(s.points_spent), 0) AS bought_in,
       COALESCE(SUM(CASE WHEN g.pays_out THEN COALESCE(s.score, 0) ELSE 0 END), 0) AS paid_out,
       COALESCE(SUM(GREATEST(CASE WHEN g.pays_out THEN COALESCE(s.score, 0) ELSE 0 END - s.points_spent, 0)), 0) AS total_won,
       COALESCE(SUM(GREATEST(s.points_spent - CASE WHEN g.pays_out THEN COALESCE(s.score, 0) ELSE 0 END, 0)), 0) AS total_lost
     FROM game_sessions s
     JOIN games g ON g.id = s.game_id
     WHERE s.status = 'completed'
       AND s.user_id IN (SELECT id FROM descendants)
     GROUP BY s.user_id`,
    [requesterId, isGlobal]
  );

  return result.rows;
}
