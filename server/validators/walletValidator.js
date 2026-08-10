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
    const isInteger = Number.isInteger(value);
    const min = req.body.operation === 'set' ? 0 : 1;

    if (!isInteger || value < min) {
      throw new Error(
        req.body.operation === 'set' ? 'amount must be a non-negative integer' : 'amount must be a positive integer'
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
