import { Router } from 'express';
import * as presenceController from '../controllers/presenceController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// Any signed-in user reports that their client is open
router.post(
  '/heartbeat',
  authenticate,
  authorize(['super_admin', 'level_1', 'level_2', 'level_3', 'player']),
  presenceController.heartbeat
);

// Level 3 & Super Admin: which players are online right now
router.get('/online', authenticate, authorize(['super_admin', 'level_3']), presenceController.listOnline);

export default router;
