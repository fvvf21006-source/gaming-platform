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
