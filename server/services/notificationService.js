// Notification service — all notification business logic lives
// here. No SQL, no req/res objects.

import * as notificationRepository from '../repositories/notificationRepository.js';
import { forbidden, notFound } from '../utils/httpErrors.js';

// The five notification types this milestone supports (BR-28).
// password_changed has no trigger yet — there is no password-change
// endpoint anywhere in the API (FR-2.3 is unimplemented) — but the
// type is defined now so createNotification is ready the moment
// that endpoint exists.
export const NOTIFICATION_TYPES = [
  'account_created',
  'wallet_transfer',
  'password_changed',
  'account_status_changed',
  'game_completed',
];

function toPublicNotification(row) {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

/**
 * Creates one notification. Best-effort and defensive by design —
 * every caller (userService, walletService, gameService) treats
 * notifications as a side effect of a real action, never something
 * that action's own success should depend on. A failure here is
 * logged and swallowed, same policy as authService's login-audit
 * write, so callers never need their own try/catch for this.
 * @param {{userId: string, type: string, message: string}} input
 */
export async function createNotification({ userId, type, message }) {
  try {
    return await notificationRepository.createNotification({ userId, type, message });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
    return null;
  }
}

/**
 * Returns the caller's own notifications, newest first.
 * @param {string} userId
 */
export async function getNotifications(userId) {
  const rows = await notificationRepository.findByUserId(userId);
  const items = rows.map(toPublicNotification);

  return { items, total: items.length };
}

/**
 * Marks one of the caller's own notifications as read.
 * @param {string} userId
 * @param {string} notificationId
 */
export async function markNotificationRead(userId, notificationId) {
  const notification = await notificationRepository.findById(notificationId);

  if (!notification) {
    throw notFound('Notification not found');
  }

  if (notification.user_id !== userId) {
    throw forbidden('This is not your notification');
  }

  const updated = await notificationRepository.markAsRead(notificationId);
  return toPublicNotification(updated);
}

/**
 * Marks every unread notification belonging to the caller as read.
 * @param {string} userId
 */
export async function markAllNotificationsRead(userId) {
  const updatedCount = await notificationRepository.markAllAsReadForUser(userId);
  return { updatedCount };
}
