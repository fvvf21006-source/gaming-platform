// Audit repository — the only layer permitted to contain SQL for
// audit_logs. This table is a cross-cutting concern (BR-25 to BR-27)
// rather than belonging to any single entity, so it gets its own
// small repository instead of being bolted onto another module's.
//
// No business logic here — deciding *when* to log something (e.g.
// authService.login) and who may *read* the log (auditService,
// Super-Admin-only) both belong to their respective services. This
// repository only ever inserts or selects — never updates or
// deletes, per BR-27.

import pool from '../database/connection.js';

/**
 * Records one immutable audit log entry. Never updated or deleted
 * afterward (BR-27) — callers should only ever insert.
 * @param {{actorId: string|null, action: string, entityType?: string|null, entityId?: string|null, metadata?: object|null}} input
 */
export async function createLogEntry({ actorId, action, entityType = null, entityId = null, metadata = null }) {
  const result = await pool.query(
    `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, actor_id, action, entity_type, entity_id, metadata, created_at`,
    [actorId, action, entityType, entityId, metadata]
  );

  return result.rows[0];
}

/**
 * Every audit_logs entry matching the given filters, newest first.
 * Any filter left null/undefined is not applied. No pagination, per
 * the same precedent every other list endpoint in this project uses
 * (users, transactions, sessions, reports).
 * @param {{actorId?: string|null, action?: string|null, entityType?: string|null, startDate?: string|null, endDate?: string|null}} filters
 */
export async function findLogs({ actorId, action, entityType, startDate, endDate }) {
  const result = await pool.query(
    `SELECT
       a.id,
       a.actor_id,
       u.username,
       a.action,
       a.entity_type,
       a.entity_id,
       a.metadata,
       a.created_at
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.actor_id
     WHERE ($1::uuid IS NULL OR a.actor_id = $1)
       AND ($2::text IS NULL OR a.action = $2)
       AND ($3::text IS NULL OR a.entity_type = $3)
       AND ($4::timestamptz IS NULL OR a.created_at >= $4)
       AND ($5::timestamptz IS NULL OR a.created_at <= $5)
     ORDER BY a.created_at DESC`,
    [actorId ?? null, action ?? null, entityType ?? null, startDate ?? null, endDate ?? null]
  );

  return result.rows;
}

/**
 * Finds a single audit_logs entry by id.
 * @param {string} id
 */
export async function findLogById(id) {
  const result = await pool.query(
    `SELECT
       a.id,
       a.actor_id,
       u.username,
       a.action,
       a.entity_type,
       a.entity_id,
       a.metadata,
       a.created_at
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.actor_id
     WHERE a.id = $1`,
    [id]
  );

  return result.rows[0] || null;
}
