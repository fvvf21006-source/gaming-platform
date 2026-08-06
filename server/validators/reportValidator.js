// Report request validation. express-validator schemas only — no
// business logic (e.g. this never checks the database or hierarchy;
// that's reportService's job).

import { query, validationResult } from 'express-validator';

export const dateRangeValidationRules = [
  query('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO 8601 date'),
  query('format').optional().isIn(['json', 'csv']).withMessage('format must be "json" or "csv"'),
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
