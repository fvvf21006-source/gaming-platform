// Notification request validation. express-validator schemas only —
// no business logic (e.g. this never checks ownership; that's
// notificationService's job).

import { param, validationResult } from 'express-validator';

export const idParamValidationRules = [
  param('id').isUUID().withMessage('id must be a valid UUID'),
];

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map((e) => e.msg) });
  }

  next();
}
