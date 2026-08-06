// Report controller — HTTP request/response handling only. No
// business logic and no SQL; both delegate to reportService. The
// only thing beyond a typical thin controller is picking JSON vs.
// CSV output, which is response-shaping, not business logic.

import * as reportService from '../services/reportService.js';
import { toCsv } from '../utils/csv.js';

function sendReport(res, filename, format, report) {
  if (format === 'csv') {
    res.type('text/csv');
    res.set('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.status(200).send(toCsv(report.items));
  }

  return res.status(200).json(report);
}

export async function pointDistribution(req, res, next) {
  try {
    const { startDate, endDate, format } = req.query;

    const report = await reportService.getPointDistributionReport({
      requesterId: req.user.userId,
      startDate,
      endDate,
    });

    sendReport(res, 'point-distribution-report', format, report);
  } catch (err) {
    next(err);
  }
}

export async function playerActivity(req, res, next) {
  try {
    const { startDate, endDate, format } = req.query;

    const report = await reportService.getPlayerActivityReport({
      requesterId: req.user.userId,
      startDate,
      endDate,
    });

    sendReport(res, 'player-activity-report', format, report);
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { startDate, endDate, format } = req.query;

    const report = await reportService.getLoginReport({ startDate, endDate });

    sendReport(res, 'login-report', format, report);
  } catch (err) {
    next(err);
  }
}
