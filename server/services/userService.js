// User service — all user-management business logic lives here.
// No SQL (that's the repository's job), no req/res objects (that's
// the controller's job).

import * as userRepository from '../repositories/userRepository.js';
import { hashPassword } from '../utils/password.js';
import { forbidden, notFound, conflict } from '../utils/httpErrors.js';

// Ordered by hierarchy_level (0 = Super Admin ... 4 = Player). A role
// may only create the role immediately after it in this list (BR-1
// to BR-5); Player, being last, cannot create anyone (BR-6).
const ROLE_ORDER = ['super_admin', 'level_1', 'level_2', 'level_3', 'player'];

function nextRoleFor(role) {
  const index = ROLE_ORDER.indexOf(role);

  if (index === -1 || index === ROLE_ORDER.length - 1) {
    return null;
  }

  return ROLE_ORDER[index + 1];
}

function toPublicUser(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    profile: {
      fullName: row.full_name ?? null,
      displayName: row.display_name ?? null,
      avatarUrl: row.avatar_url ?? null,
    },
  };
}

// Postgres unique_violation error code.
const UNIQUE_VIOLATION = '23505';

/**
 * Creates a new user one tier below the requester (BR-1 to BR-9),
 * along with their profile and wallet, in a single transaction.
 * @param {{requesterId: string, requesterRole: string, username: string, email: string, password: string, role: string, status?: string, fullName?: string, displayName?: string}} input
 */
export async function createUser({
  requesterId,
  requesterRole,
  username,
  email,
  password,
  role,
  status,
  fullName,
  displayName,
}) {
  const expectedRole = nextRoleFor(requesterRole);

  if (!expectedRole) {
    throw forbidden(`${requesterRole} accounts cannot create new users`);
  }

  if (role !== expectedRole) {
    throw forbidden(`${requesterRole} may only create ${expectedRole} accounts`);
  }

  const targetRole = await userRepository.findRoleByName(expectedRole);

  if (!targetRole) {
    // Defensive only — the five roles are seeded in P02 and never
    // removed; this should be unreachable in practice.
    throw notFound(`Role "${expectedRole}" is not configured`);
  }

  if (await userRepository.usernameExists(username)) {
    throw conflict('username already exists');
  }

  if (await userRepository.emailExists(email)) {
    throw conflict('email already exists');
  }

  const passwordHash = await hashPassword(password);

  let created;

  try {
    created = await userRepository.createUserWithProfileAndWallet({
      roleId: targetRole.id,
      createdBy: requesterId,
      username,
      email,
      passwordHash,
      status: status || 'active',
      fullName,
      displayName,
    });
  } catch (err) {
    // Fallback for a race condition between the existence checks
    // above and the insert — the unique constraints are the real
    // backstop (BR: username/email must be unique).
    if (err.code === UNIQUE_VIOLATION) {
      if (err.constraint === 'uq_users_username') throw conflict('username already exists');
      if (err.constraint === 'uq_users_email') throw conflict('email already exists');
    }
    throw err;
  }

  const full = await userRepository.findUserById(created.id);
  return toPublicUser(full);
}

/**
 * Returns the requester's own record plus every user in their
 * descendant hierarchy (BR-8). A Player, having no descendants,
 * sees only themselves.
 * @param {string} requesterId
 */
export async function getVisibleUsers(requesterId) {
  const rows = await userRepository.findDescendantsAndSelf(requesterId);
  const items = rows.map(toPublicUser);

  return { items, total: items.length };
}

/**
 * Returns a single user, if the requester is allowed to view them
 * (self or an ancestor — BR-8).
 * @param {string} requesterId
 * @param {string} targetId
 */
export async function getUserById(requesterId, targetId) {
  const target = await userRepository.findUserById(targetId);

  if (!target) {
    throw notFound('User not found');
  }

  const visible = await userRepository.isSelfOrDescendant(requesterId, targetId);

  if (!visible) {
    throw forbidden('User is outside your hierarchy');
  }

  return toPublicUser(target);
}

/**
 * Updates email, status, and/or profile fields for a user the
 * requester may act on (self or an ancestor — BR-8). Role changes
 * are never accepted here (enforced by the validator, which rejects
 * a `role` field before this is even called).
 *
 * Status changes are restricted to ancestors — never self (BR-19) —
 * even though status is accepted through this same endpoint.
 * @param {string} requesterId
 * @param {string} targetId
 * @param {{email?: string, status?: string, fullName?: string, displayName?: string, avatarUrl?: string}} updates
 */
export async function updateUser(requesterId, targetId, updates) {
  const target = await userRepository.findUserById(targetId);

  if (!target) {
    throw notFound('User not found');
  }

  const visible = await userRepository.isSelfOrDescendant(requesterId, targetId);

  if (!visible) {
    throw forbidden('User is outside your hierarchy');
  }

  const isSelf = requesterId === targetId;

  if (updates.status !== undefined && updates.status !== target.status && isSelf) {
    throw forbidden('You cannot change your own account status');
  }

  if (updates.email !== undefined && updates.email !== target.email) {
    if (await userRepository.emailExists(updates.email, targetId)) {
      throw conflict('email already exists');
    }
  }

  let updated;

  try {
    updated = await userRepository.updateUser(targetId, updates);
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION && err.constraint === 'uq_users_email') {
      throw conflict('email already exists');
    }
    throw err;
  }

  return toPublicUser(updated);
}

/**
 * Activates, suspends, or freezes a user. Only an ancestor may do
 * this — never the user themselves (BR-19).
 * @param {string} requesterId
 * @param {string} targetId
 * @param {string} status
 */
export async function updateUserStatus(requesterId, targetId, status) {
  const target = await userRepository.findUserById(targetId);

  if (!target) {
    throw notFound('User not found');
  }

  if (requesterId === targetId) {
    throw forbidden('You cannot change your own account status');
  }

  const isAncestor = await userRepository.isSelfOrDescendant(requesterId, targetId);

  if (!isAncestor) {
    throw forbidden('User is outside your hierarchy');
  }

  const updated = await userRepository.updateUserStatus(targetId, status);
  return toPublicUser(updated);
}
