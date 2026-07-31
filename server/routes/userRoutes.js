import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  createUserValidationRules,
  updateUserValidationRules,
  statusValidationRules,
  idParamValidationRules,
  handleValidationErrors,
} from '../validators/userValidator.js';

const router = Router();

// Only roles that can create a descendant tier may hit this endpoint
// at all (BR-6: Players never can). The exact "one tier below only"
// rule is enforced in userService, since it depends on the
// requester's specific role, not just "is an admin-ish role".
router.post(
  '/',
  authenticate,
  authorize(['super_admin', 'level_1', 'level_2', 'level_3']),
  createUserValidationRules,
  handleValidationErrors,
  userController.create
);

// Every authenticated role may call this — visibility is filtered
// per-requester in userService (BR-8), not by a static role list.
router.get('/', authenticate, userController.list);

router.get('/:id', authenticate, idParamValidationRules, handleValidationErrors, userController.getById);

router.put(
  '/:id',
  authenticate,
  idParamValidationRules,
  updateUserValidationRules,
  handleValidationErrors,
  userController.update
);

router.patch(
  '/:id/status',
  authenticate,
  idParamValidationRules,
  statusValidationRules,
  handleValidationErrors,
  userController.updateStatus
);

// Deletion is explicitly out of scope for this milestone.
router.delete('/:id', authenticate, idParamValidationRules, handleValidationErrors, userController.remove);

export default router;
