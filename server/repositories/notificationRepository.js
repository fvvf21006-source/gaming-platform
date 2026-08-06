// Notification repository — the only layer permitted to contain SQL
// for notifications. No business logic here (no ownership checks,
// no decisions about when to notify) — those live in
// notificationService and in whichever other service triggers a
// notification (userService, walletService, gameService).

import pool from '../database/connection.js';

/**
 * Every notification belonging to a user, newest first.
 * @param {string} userId
 */
export async function findByUserId(userId) {
  const result = await pool.query(
    `SELECT id, user_id, type, message, is_read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Finds a single notification by id, regardless of owner — the
 * caller (notificationService) checks ownership.
 * @param {string} id
 */
export async function findById(id) {
  const result = await pool.query(
    `SELECT id, user_id, type, message, is_read, created_at
     FROM notifications
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Creates one notification for one user.
 * @param {{userId: string, type: string, message: string}} input
 */
export async function createNotification({ userId, type, message }) {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, type, message)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, type, message, is_read, created_at`,
    [userId, type, message]
  );

  return result.rows[0];
}

/**
 * Marks one notification read. Returns null if it didn't exist.
 * @param {string} id
 */
export async function markAsRead(id) {
  const result = await pool.query(
    `UPDATE notifications
     SET is_read = true
     WHERE id = $1
     RETURNING id, user_id, type, message, is_read, created_at`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Marks every unread notification for a user as read. Returns the
 * number of rows actually changed.
 * @param {string} userId
 */
export async function markAllAsReadForUser(userId) {
  const result = await pool.query(
    `UPDATE notifications
     SET is_read = true
     WHERE user_id = $1 AND is_read = false`,
    [userId]
  );

  return result.rowCount;
}
