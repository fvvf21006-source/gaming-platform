import { Router } from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { authenticate } from '../middleware/authenticate.js';
import { idParamValidationRules, handleValidationErrors } from '../validators/notificationValidator.js';

const router = Router();

// Every authenticated role may manage their own notifications — no
// role restriction, same as GET /api/wallet.
router.get('/', authenticate, notificationController.list);

// Registered before /:id/read so the literal path always wins over
// the dynamic one, though the differing segment counts (one segment
// vs. two) already prevent any real collision between the two.
router.patch('/read-all', authenticate, notificationController.markAllRead);

router.patch(
  '/:id/read',
  authenticate,
  idParamValidationRules,
  handleValidationErrors,
  notificationController.markRead
);

export default router;
