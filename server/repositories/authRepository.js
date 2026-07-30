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
       r.name AS role
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}
