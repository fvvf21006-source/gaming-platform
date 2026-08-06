// Report repository — the only layer permitted to contain SQL for
// reporting data access. No aggregation and no business logic here
// — every method returns raw rows; totals/summaries are computed in
// reportService, per the existing layering convention.

import pool from '../database/connection.js';

// Shared hierarchy-scoping fragment: self + every descendant of
// $1, found by walking created_by — the same recursive idiom
// userRepository.isSelfOrDescendant/findDescendantsAndSelf already
// use. Kept as one constant so both report queries below scope
// identically rather than each redefining their own copy.
const DESCENDANTS_AND_SELF_CTE = `
  WITH RECURSIVE descendants AS (
    SELECT id FROM users WHERE id = $1

    UNION ALL

    SELECT u.id FROM users u
    INNER JOIN descendants d ON u.created_by = d.id
  )
`;

/**
 * Every wallet_transactions row sent by the requester or anyone in
 * their descendant hierarchy, optionally date-filtered.
 * @param {{requesterId: string, startDate: string|null, endDate: string|null}} input
 */
export async function getPointDistributionTransactions({ requesterId, startDate, endDate }) {
  const result = await pool.query(
    `${DESCENDANTS_AND_SELF_CTE}
     SELECT
       t.id,
       t.sender_id,
       sender.username AS sender_username,
       t.recipient_id,
       recipient.username AS recipient_username,
       t.amount,
       t.created_at
     FROM wallet_transactions t
     JOIN users sender ON sender.id = t.sender_id
     JOIN users recipient ON recipient.id = t.recipient_id
     WHERE t.sender_id IN (SELECT id FROM descendants)
       AND ($2::timestamptz IS NULL OR t.created_at >= $2)
       AND ($3::timestamptz IS NULL OR t.created_at <= $3)
     ORDER BY t.created_at DESC`,
    [requesterId, startDate, endDate]
  );

  return result.rows;
}

/**
 * Every game_sessions row belonging to the requester or anyone in
 * their descendant hierarchy, optionally date-filtered.
 * @param {{requesterId: string, startDate: string|null, endDate: string|null}} input
 */
export async function getPlayerActivitySessions({ requesterId, startDate, endDate }) {
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
       s.completed_at
     FROM game_sessions s
     JOIN users u ON u.id = s.user_id
     JOIN games g ON g.id = s.game_id
     WHERE s.user_id IN (SELECT id FROM descendants)
       AND ($2::timestamptz IS NULL OR s.started_at >= $2)
       AND ($3::timestamptz IS NULL OR s.started_at <= $3)
     ORDER BY s.started_at DESC`,
    [requesterId, startDate, endDate]
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
