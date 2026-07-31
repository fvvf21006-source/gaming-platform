// User repository — the only layer permitted to contain SQL for
// user-management data access. No business logic here (no hierarchy
// rules, no authorization decisions) — those live in userService.

import pool from '../database/connection.js';

/**
 * Finds a role by its name (e.g. "level_1"), for resolving the
 * role_id needed when creating a user.
 * @param {string} name
 */
export async function findRoleByName(name) {
  const result = await pool.query(
    `SELECT id, name, hierarchy_level FROM roles WHERE name = $1`,
    [name]
  );

  return result.rows[0] || null;
}

/**
 * @param {string} username
 * @param {string|null} excludeUserId - when set, ignores this user's own row (for update checks)
 */
export async function usernameExists(username, excludeUserId = null) {
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM users
       WHERE username = $1 AND ($2::uuid IS NULL OR id <> $2)
     ) AS exists`,
    [username, excludeUserId]
  );

  return result.rows[0].exists;
}

/**
 * @param {string} email
 * @param {string|null} excludeUserId - when set, ignores this user's own row (for update checks)
 */
export async function emailExists(email, excludeUserId = null) {
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM users
       WHERE email = $1 AND ($2::uuid IS NULL OR id <> $2)
     ) AS exists`,
    [email, excludeUserId]
  );

  return result.rows[0].exists;
}

/**
 * Creates a user, their profile, and their wallet in a single
 * transaction — all three rows are committed together or not at all.
 * No hierarchy/duplicate checks here; the caller (userService) is
 * expected to have already validated those.
 * @param {{roleId: string, createdBy: string, username: string, email: string, passwordHash: string, status: string, fullName?: string, displayName?: string}} input
 * @returns the newly created users row
 */
export async function createUserWithProfileAndWallet({
  roleId,
  createdBy,
  username,
  email,
  passwordHash,
  status,
  fullName,
  displayName,
}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users (role_id, created_by, username, email, password_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, role_id, created_by, username, email, status, created_at, updated_at`,
      [roleId, createdBy, username, email, passwordHash, status]
    );
    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO user_profiles (user_id, full_name, display_name)
       VALUES ($1, $2, $3)`,
      [user.id, fullName || null, displayName || null]
    );

    await client.query(
      `INSERT INTO wallets (user_id, balance) VALUES ($1, 0)`,
      [user.id]
    );

    await client.query('COMMIT');
    return user;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Finds a single user by id, joined with role name and profile
 * fields. Never includes password_hash.
 * @param {string} id
 */
export async function findUserById(id) {
  const result = await pool.query(
    `SELECT
       u.id,
       u.created_by,
       u.username,
       u.email,
       u.status,
       u.created_at,
       u.updated_at,
       r.name AS role,
       p.full_name,
       p.display_name,
       p.avatar_url
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Returns the requesting user's own row plus every user in their
 * descendant hierarchy (children, grandchildren, ...), found by
 * walking the created_by chain with a recursive query.
 * @param {string} requesterId
 */
export async function findDescendantsAndSelf(requesterId) {
  const result = await pool.query(
    `WITH RECURSIVE descendants AS (
       SELECT id, role_id, created_by, username, email, status, created_at, updated_at
       FROM users
       WHERE id = $1

       UNION ALL

       SELECT u.id, u.role_id, u.created_by, u.username, u.email, u.status, u.created_at, u.updated_at
       FROM users u
       INNER JOIN descendants d ON u.created_by = d.id
     )
     SELECT
       d.id,
       d.created_by,
       d.username,
       d.email,
       d.status,
       d.created_at,
       d.updated_at,
       r.name AS role,
       p.full_name,
       p.display_name,
       p.avatar_url
     FROM descendants d
     JOIN roles r ON r.id = d.role_id
     LEFT JOIN user_profiles p ON p.user_id = d.id
     ORDER BY d.created_at ASC`,
    [requesterId]
  );

  return result.rows;
}

/**
 * True if targetId is the requester's own id, or anywhere in the
 * requester's descendant hierarchy (BR-8). Uses the same created_by
 * walk as findDescendantsAndSelf, without fetching full rows.
 * @param {string} requesterId
 * @param {string} targetId
 */
export async function isSelfOrDescendant(requesterId, targetId) {
  const result = await pool.query(
    `WITH RECURSIVE descendants AS (
       SELECT id FROM users WHERE id = $1

       UNION ALL

       SELECT u.id FROM users u
       INNER JOIN descendants d ON u.created_by = d.id
     )
     SELECT EXISTS (SELECT 1 FROM descendants WHERE id = $2) AS is_visible`,
    [requesterId, targetId]
  );

  return result.rows[0].is_visible;
}

/**
 * Updates whichever of email/status (on users) and full_name/
 * display_name/avatar_url (on user_profiles) are provided, in a
 * single transaction. Fields left undefined are left unchanged.
 * No authorization/business rules here — see userService.
 * @param {string} id
 * @param {{email?: string, status?: string, fullName?: string, displayName?: string, avatarUrl?: string}} fields
 */
export async function updateUser(id, fields) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userSets = [];
    const userValues = [];
    let i = 1;

    if (fields.email !== undefined) {
      userSets.push(`email = $${i++}`);
      userValues.push(fields.email);
    }
    if (fields.status !== undefined) {
      userSets.push(`status = $${i++}`);
      userValues.push(fields.status);
    }

    if (userSets.length > 0) {
      userSets.push('updated_at = now()');
      userValues.push(id);
      await client.query(`UPDATE users SET ${userSets.join(', ')} WHERE id = $${i}`, userValues);
    }

    const profileSets = [];
    const profileValues = [];
    let j = 1;

    if (fields.fullName !== undefined) {
      profileSets.push(`full_name = $${j++}`);
      profileValues.push(fields.fullName);
    }
    if (fields.displayName !== undefined) {
      profileSets.push(`display_name = $${j++}`);
      profileValues.push(fields.displayName);
    }
    if (fields.avatarUrl !== undefined) {
      profileSets.push(`avatar_url = $${j++}`);
      profileValues.push(fields.avatarUrl);
    }

    if (profileSets.length > 0) {
      profileSets.push('updated_at = now()');
      profileValues.push(id);
      await client.query(
        `UPDATE user_profiles SET ${profileSets.join(', ')} WHERE user_id = $${j}`,
        profileValues
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return findUserById(id);
}

/**
 * Updates only status (BR-19: status changes are a distinct,
 * ancestor-only action — see userService.updateUserStatus).
 * @param {string} id
 * @param {string} status
 */
export async function updateUserStatus(id, status) {
  await pool.query('UPDATE users SET status = $1, updated_at = now() WHERE id = $2', [status, id]);

  return findUserById(id);
}
