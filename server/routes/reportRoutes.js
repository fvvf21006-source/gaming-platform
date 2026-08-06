import { Router } from 'express';
import * as reportController from '../controllers/reportController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { dateRangeValidationRules, handleValidationErrors } from '../validators/reportValidator.js';

const router = Router();

// Hierarchy reports: every role except Player, same list P04/P05
// already use for their equivalent "everyone but Player" routes.
router.get(
  '/point-distribution',
  authenticate,
  authorize(['super_admin', 'level_1', 'level_2', 'level_3']),
  dateRangeValidationRules,
  handleValidationErrors,
  reportController.pointDistribution
);

router.get(
  '/player-activity',
  authenticate,
  authorize(['super_admin', 'level_1', 'level_2', 'level_3']),
  dateRangeValidationRules,
  handleValidationErrors,
  reportController.playerActivity
);

// Platform-wide, not hierarchy-scoped — Super Admin only.
router.get(
  '/login',
  authenticate,
  authorize(['super_admin']),
  dateRangeValidationRules,
  handleValidationErrors,
  reportController.login
);

export default router;
