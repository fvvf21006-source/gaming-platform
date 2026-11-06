// Game request validation. express-validator schemas only — no
// business logic (e.g. this never checks balances, ownership, or
// session status; that's gameService's job).

import { body, param, validationResult } from 'express-validator';
import { isPointAmount } from '../utils/points.js';

export const gameIdParamValidationRules = [
  param('id').isUUID().withMessage('id must be a valid UUID'),
];

export const sessionIdParamValidationRules = [
  param('sessionId').isUUID().withMessage('sessionId must be a valid UUID'),
];

export const playGameValidationRules = [
  body('stake').optional().isFloat({ min: 0.5, max: 1000000 })
    .withMessage('Stake must be between 0.5 and 1,000,000 points')
    .custom((value) => Number.isInteger(Number(value) * 2))
    .withMessage('Stake must increase in steps of 0.5 points').toFloat(),
];

export const completeSessionValidationRules = [
  body('score')
    .notEmpty()
    .withMessage('score is required')
    .isFloat({ min: 0, max: 100000000 })
    .withMessage('score must be a non-negative number').bail().toFloat()
    .custom(isPointAmount).withMessage('score must have at most two decimal places'),
];

export const alterSessionValidationRules = [
  body('score')
    .optional()
    .isFloat({ min: 0, max: 100000000 })
    .withMessage('score must be a non-negative number').bail().toFloat()
    .custom(isPointAmount).withMessage('score must have at most two decimal places'),
  body('reason')
    .optional()
    .isString()
    .withMessage('reason must be a string'),
];

export const presetOutcomeValidationRules = [
  body('score')
    .notEmpty()
    .withMessage('score is required')
    .isFloat({ min: 0, max: 100000000 })
    .withMessage('score must be a non-negative number').bail().toFloat()
    .custom(isPointAmount).withMessage('score must have at most two decimal places'),
];

export const playerIdParamValidationRules = [
  param('playerId').isUUID().withMessage('playerId must be a valid UUID'),
];

export const nextOutcomeValidationRules = [
  body('score')
    .notEmpty()
    .withMessage('score is required')
    .isFloat({ min: 0, max: 100000000 })
    .withMessage('score must be a non-negative number').bail().toFloat()
    .custom(isPointAmount).withMessage('score must have at most two decimal places'),
  body('gameId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('gameId must be a valid UUID'),
];

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map((e) => e.msg) });
  }

  next();
}
