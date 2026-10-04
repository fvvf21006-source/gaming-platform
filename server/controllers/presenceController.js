// Presence controller — HTTP request/response handling only.

import * as presenceService from '../services/presenceService.js';

export async function heartbeat(req, res, next) {
  try {
    await presenceService.recordHeartbeat(req.user.userId);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function listOnline(req, res, next) {
  try {
    const result = await presenceService.listOnlinePlayers({
      requesterId: req.user.userId,
      requesterRole: req.user.role,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
