// Audit controller — HTTP request/response handling only. No
// business logic and no SQL; both delegate to auditService.

import * as auditService from '../services/auditService.js';

export async function list(req, res, next) {
  try {
    const { actorId, action, entityType, startDate, endDate } = req.query;

    const result = await auditService.getAuditLogs({ actorId, action, entityType, startDate, endDate });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const entry = await auditService.getAuditLogById(req.params.id);

    res.status(200).json({ entry });
  } catch (err) {
    next(err);
  }
}
