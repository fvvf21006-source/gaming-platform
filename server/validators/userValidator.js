// User-management request validation. express-validator schemas
// only — no business logic (e.g. this never checks the database or
// the hierarchy; that's userService's job).

import { body, param, validationResult } from 'express-validator';

const CREATABLE_ROLES = ['level_1', 'level_2', 'level_3', 'player'];
const STATUSES = ['active', 'frozen'];

export const idParamValidationRules = [
  param('id').isUUID().withMessage('id must be a valid UUID'),
];

export const createUserValidationRules = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('username must be between 3 and 50 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('email is required')
    .isEmail()
    .withMessage('email must be a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('password is required')
    .isLength({ min: 8 })
    .withMessage('password must be at least 8 characters'),
  body('role')
    .notEmpty()
    .withMessage('role is required')
    .isIn(CREATABLE_ROLES)
    .withMessage(`role must be one of: ${CREATABLE_ROLES.join(', ')}`),
  body('status')
    .optional()
    .isIn(STATUSES)
    .withMessage(`status must be one of: ${STATUSES.join(', ')}`),
  body('fullName').optional().trim().isLength({ max: 100 }).withMessage('fullName must be 100 characters or fewer'),
  body('displayName').optional().trim().isLength({ max: 50 }).withMessage('displayName must be 50 characters or fewer'),
];

export const updateUserValidationRules = [
  body('role')
    .not()
    .exists()
    .withMessage('role cannot be changed through this endpoint'),
  body('email').optional().trim().isEmail().withMessage('email must be a valid email address'),
  body('status')
    .optional()
    .isIn(STATUSES)
    .withMessage(`status must be one of: ${STATUSES.join(', ')}`),
  body('fullName').optional().trim().isLength({ max: 100 }).withMessage('fullName must be 100 characters or fewer'),
  body('displayName').optional().trim().isLength({ max: 50 }).withMessage('displayName must be 50 characters or fewer'),
  body('avatarUrl').optional().trim().isLength({ max: 2048 }).withMessage('avatarUrl is too long'),
];

export const statusValidationRules = [
  body('status')
    .notEmpty()
    .withMessage('status is required')
    .isIn(STATUSES)
    .withMessage(`status must be one of: ${STATUSES.join(', ')}`),
];

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map((e) => e.msg) });
  }

  next();
}
