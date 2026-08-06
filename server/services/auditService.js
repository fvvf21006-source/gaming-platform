// Audit service — all audit-log business logic lives here. No SQL,
// no req/res objects. The review side (getAuditLogs/getAuditLogById)
// is read-only by design (BR-27) — no update/delete function exists
// anywhere for an existing entry. logAction() only ever creates a
// new entry, which is the one write operation audit logs support.

import * as auditRepository from '../repositories/auditRepository.js';
import { notFound } from '../utils/httpErrors.js';

function toPublicLogEntry(row) {
  return {
    id: row.id,
    actorId: row.actor_id,
    username: row.username,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

/**
 * Records one audit log entry (BR-25, BR-26). Best-effort and
 * defensive by design, same policy as authService's login audit
 * write: every caller (userService, walletService, gameService)
 * treats this as a side effect of a real action, never something
 * that action's own success should depend on. A failure here is
 * logged and swallowed, so callers never need their own try/catch.
 * @param {{actorId: string|null, action: string, entityType?: string|null, entityId?: string|null, metadata?: object|null}} input
 */
export async function logAction({ actorId, action, entityType = null, entityId = null, metadata = null }) {
  try {
    return await auditRepository.createLogEntry({ actorId, action, entityType, entityId, metadata });
  } catch (err) {
    console.error('Failed to create audit log entry:', err.message);
    return null;
  }
}

/**
 * Returns audit log entries matching the given filters, newest
 * first. No hierarchy scoping — this is Super-Admin-only and
 * platform-wide, enforced at the route layer via authorize.
 * @param {{actorId?: string, action?: string, entityType?: string, startDate?: string, endDate?: string}} filters
 */
export async function getAuditLogs({ actorId, action, entityType, startDate, endDate }) {
  const rows = await auditRepository.findLogs({ actorId, action, entityType, startDate, endDate });
  const items = rows.map(toPublicLogEntry);

  return { items, total: items.length };
}

/**
 * Returns a single audit log entry by id.
 * @param {string} id
 */
export async function getAuditLogById(id) {
  const row = await auditRepository.findLogById(id);

  if (!row) {
    throw notFound('Audit log entry not found');
  }

  return toPublicLogEntry(row);
}
