// Auth repository — the only layer permitted to contain SQL for
// authentication-related lookups. No business logic here (no
// password comparison, no token generation) — just data access.

import pool from '../database/connection.js';

/**
 * Finds a user by username, joined with their role name.
 * Returns null if no user exists with that username.
 * @param {string} username
 */
export async function findUserByUsername(username) {
  const result = await pool.query(
    `SELECT
       u.id,
       u.username,
       u.email,
       u.password_hash,
       u.status,
       u.must_change_password,
       r.name AS role
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.username = $1`,
    [username]
  );

  return result.rows[0] || null;
}

/**
 * Finds a user by id, joined with their role name.
 * Used by /me to return the authenticated user's current record
 * (rather than trusting stale data from the JWT payload alone).
 * @param {string} userId
 */
export async function findUserById(userId) {
  const result = await pool.query(
    `SELECT
       u.id,
       u.username,
       u.email,
       u.status,
       u.must_change_password,
       r.name AS role
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * Returns just the stored password hash for a user, for verifying
 * the caller's current password before a self-service change
 * (P08 Part 3). Deliberately separate from findUserById, which
 * never exposes password_hash.
 * @param {string} userId
 */
export async function findPasswordHashById(userId) {
  const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);

  return result.rows[0]?.password_hash ?? null;
}

/**
 * Updates a user's password hash and must_change_password flag —
 * shared by self-service change (Part 3, flag always cleared) and
 * administrative reset (Part 4, flag always set).
 * @param {string} userId
 * @param {{passwordHash: string, mustChangePassword: boolean}} input
 */
export async function updatePassword(userId, { passwordHash, mustChangePassword }) {
  await pool.query(
    'UPDATE users SET password_hash = $1, must_change_password = $2, updated_at = now() WHERE id = $3',
    [passwordHash, mustChangePassword, userId]
  );
}
