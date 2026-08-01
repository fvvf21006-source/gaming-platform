// Wallet request validation. express-validator schemas only — no
// business logic (e.g. this never checks balances or hierarchy;
// that's walletService's job).

import { body, validationResult } from 'express-validator';

export const transferValidationRules = [
  body('recipientId')
    .notEmpty()
    .withMessage('recipientId is required')
    .isUUID()
    .withMessage('recipientId must be a valid UUID'),
  body('amount')
    .notEmpty()
    .withMessage('amount is required')
    .isInt({ gt: 0 })
    .withMessage('amount must be a positive integer'),
];

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map((e) => e.msg) });
  }

  next();
}
