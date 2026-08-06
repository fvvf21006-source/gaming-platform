import { Router } from 'express';
import * as auditController from '../controllers/auditController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  idParamValidationRules,
  auditFilterValidationRules,
  handleValidationErrors,
} from '../validators/auditValidator.js';

const router = Router();

// Super Admin only, platform-wide — no hierarchy scoping, matching
// GET /api/reports/login's authorization exactly. No PUT/PATCH/
// DELETE routes exist here by design (BR-27: audit logs are
// immutable).
router.get(
  '/',
  authenticate,
  authorize(['super_admin']),
  auditFilterValidationRules,
  handleValidationErrors,
  auditController.list
);

router.get(
  '/:id',
  authenticate,
  authorize(['super_admin']),
  idParamValidationRules,
  handleValidationErrors,
  auditController.getById
);

export default router;
