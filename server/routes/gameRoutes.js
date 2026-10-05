import { Router } from 'express';
import * as gameController from '../controllers/gameController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  gameIdParamValidationRules,
  sessionIdParamValidationRules,
  completeSessionValidationRules,
  alterSessionValidationRules,
  presetOutcomeValidationRules,
  handleValidationErrors,
} from '../validators/gameValidator.js';

const router = Router();

// List games catalog (Player)
router.get('/', authenticate, authorize(['player']), gameController.list);

// Active live game sessions for descendant players (Level 3 & admins)
router.get(
  '/active-sessions',
  authenticate,
  authorize(['super_admin', 'level_3']),
  gameController.getActiveSessions
);

// Registered before /:id/play so a literal path segment always wins
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

// Alter active game session (Level 3 & admins: force lose / alter game)
router.post(
  '/sessions/:sessionId/alter',
  authenticate,
  authorize(['super_admin', 'level_3']),
  sessionIdParamValidationRules,
  alterSessionValidationRules,
  handleValidationErrors,
  gameController.alter
);

// Preset the final score of a live session (Level 3 & admins)
router.put(
  '/sessions/:sessionId/outcome',
  authenticate,
  authorize(['super_admin', 'level_3']),
  sessionIdParamValidationRules,
  presetOutcomeValidationRules,
  handleValidationErrors,
  gameController.presetOutcome
);

// The player's own game reads its preset so the round can play out to it
router.get(
  '/sessions/:sessionId/outcome',
  authenticate,
  authorize(['player']),
  sessionIdParamValidationRules,
  handleValidationErrors,
  gameController.getOutcome
);

export default router;

