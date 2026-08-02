// Game request validation. express-validator schemas only — no
// business logic (e.g. this never checks balances, ownership, or
// session status; that's gameService's job).

import { body, param, validationResult } from 'express-validator';

export const gameIdParamValidationRules = [
  param('id').isUUID().withMessage('id must be a valid UUID'),
];

export const sessionIdParamValidationRules = [
  param('sessionId').isUUID().withMessage('sessionId must be a valid UUID'),
];

export const completeSessionValidationRules = [
  body('score')
    .notEmpty()
    .withMessage('score is required')
    .isInt({ min: 0 })
    .withMessage('score must be a non-negative integer'),
];

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map((e) => e.msg) });
  }

  next();
}
