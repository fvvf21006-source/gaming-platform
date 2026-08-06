// Notification controller — HTTP request/response handling only. No
// business logic and no SQL; both delegate to notificationService.

import * as notificationService from '../services/notificationService.js';

export async function list(req, res, next) {
  try {
    const result = await notificationService.getNotifications(req.user.userId);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function markRead(req, res, next) {
  try {
    const notification = await notificationService.markNotificationRead(req.user.userId, req.params.id);

    res.status(200).json({ notification });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req, res, next) {
  try {
    const result = await notificationService.markAllNotificationsRead(req.user.userId);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
