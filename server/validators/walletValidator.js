// Wallet request validation. express-validator schemas only — no
// business logic (e.g. this never checks balances or hierarchy;
// that's walletService's job).

import { body, query, validationResult } from 'express-validator';
import { isPointAmount } from '../utils/points.js';

export const transferValidationRules = [
  body('recipientId')
    .notEmpty()
    .withMessage('recipientId is required')
    .isUUID()
    .withMessage('recipientId must be a valid UUID'),
  body('amount')
    .notEmpty()
    .withMessage('amount is required')
    .isFloat({ gt: 0 }).withMessage('amount must be positive').bail().toFloat()
    .custom(isPointAmount).withMessage('amount must have at most two decimal places'),
];

export const transactionsQueryValidationRules = [
  query('userId').optional().isUUID().withMessage('userId must be a valid UUID'),
];

const ADJUSTMENT_OPERATIONS = ['add', 'remove', 'set'];

export const adjustBalanceValidationRules = [
  body('userId').notEmpty().withMessage('userId is required').isUUID().withMessage('userId must be a valid UUID'),
  body('operation')
    .notEmpty()
    .withMessage('operation is required')
    .isIn(ADJUSTMENT_OPERATIONS)
    .withMessage(`operation must be one of: ${ADJUSTMENT_OPERATIONS.join(', ')}`),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('reason is required')
    .isLength({ max: 500 })
    .withMessage('reason must be 500 characters or fewer'),
  // 'set' is an absolute target balance, so 0 is valid; 'add'/'remove'
  // are deltas, where 0 would be a meaningless no-op.
  body('amount').custom((value, { req }) => {
    if (!isPointAmount(value) || (req.body.operation !== 'set' && value <= 0)) {
      throw new Error(
        'amount must be a valid point amount with at most two decimal places'
      );
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
