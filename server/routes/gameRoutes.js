import { Router } from 'express';
import * as gameController from '../controllers/gameController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  gameIdParamValidationRules,
  sessionIdParamValidationRules,
  completeSessionValidationRules,
  handleValidationErrors,
} from '../validators/gameValidator.js';

const router = Router();

// Every route in this module is Player-only, per 04_API_SPEC.md —
// unlike users/wallet, there is no "everyone but Player" case here.
router.get('/', authenticate, authorize(['player']), gameController.list);

// Registered before /:id/play so a literal path segment always wins
// over the dynamic one, though the differing segment counts already
// prevent any real collision between the two.
router.get('/history', authenticate, authorize(['player']), gameController.history);

router.post(
  '/:id/play',
  authenticate,
  authorize(['player']),
  gameIdParamValidationRules,
  handleValidationErrors,
  gameController.play
);

router.post(
  '/sessions/:sessionId/complete',
  authenticate,
  authorize(['player']),
  sessionIdParamValidationRules,
  completeSessionValidationRules,
  handleValidationErrors,
  gameController.complete
);

export default router;
