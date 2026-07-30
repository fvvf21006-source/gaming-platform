// Auth request validation. express-validator schemas only — no
// business logic (e.g. this never checks the database).

import { body, validationResult } from 'express-validator';

export const loginValidationRules = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('username is required'),
  body('password')
    .notEmpty()
    .withMessage('password is required'),
];

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map((e) => e.msg) });
  }

  next();
}
