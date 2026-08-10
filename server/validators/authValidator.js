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

// Same minimum-length policy as account creation (userValidator's
// createUserValidationRules) — no separate password policy invented
// for this endpoint.
export const changePasswordValidationRules = [
  body('currentPassword').notEmpty().withMessage('currentPassword is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('newPassword is required')
    .isLength({ min: 8 })
    .withMessage('newPassword must be at least 8 characters'),
];

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map((e) => e.msg) });
  }

  next();
}
