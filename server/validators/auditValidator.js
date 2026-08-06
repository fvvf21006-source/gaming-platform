// Audit request validation. express-validator schemas only — no
// business logic (e.g. this never checks the database; that's
// auditService's job).

import { query, param, validationResult } from 'express-validator';

export const idParamValidationRules = [
  param('id').isUUID().withMessage('id must be a valid UUID'),
];

export const auditFilterValidationRules = [
  query('actorId').optional().isUUID().withMessage('actorId must be a valid UUID'),
  query('action').optional().isString().trim().notEmpty().withMessage('action must not be empty'),
  query('entityType').optional().isString().trim().notEmpty().withMessage('entityType must not be empty'),
  query('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO 8601 date'),
  query().custom((_, { req }) => {
    const { startDate, endDate } = req.query;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new Error('startDate must not be after endDate');
    }

    return true;
  }),
];

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map((e) => e.msg) });
  }

  next();
}
