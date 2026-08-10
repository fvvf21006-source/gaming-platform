import { Router } from 'express';
import * as walletController from '../controllers/walletController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  transferValidationRules,
  adjustBalanceValidationRules,
  handleValidationErrors,
} from '../validators/walletValidator.js';

const router = Router();

// Any authenticated role may check their own wallet — including
// Player, who has one but never transfers from it.
router.get('/', authenticate, walletController.getWallet);

// Same role gate as P04's user-creation route: every role except
// Player, since Players cannot transfer points (rule 6). The exact
// "direct child only" hierarchy check is data-dependent and lives
// in walletService, same pattern as P04. Super Admin's transfers are
// unlimited (no balance check) but otherwise go through this exact
// same endpoint and hierarchy check (P08 Part 1).
router.post(
  '/transfer',
  authenticate,
  authorize(['super_admin', 'level_1', 'level_2', 'level_3']),
  transferValidationRules,
  handleValidationErrors,
  walletController.transfer
);

router.get('/transactions', authenticate, walletController.transactions);

// Administrative point management (P08 Part 2) — same role gate as
// /transfer; the "only within your hierarchy" restriction for
// non-Super-Admin roles is data-dependent and lives in walletService.
router.post(
  '/adjust',
  authenticate,
  authorize(['super_admin', 'level_1', 'level_2', 'level_3']),
  adjustBalanceValidationRules,
  handleValidationErrors,
  walletController.adjustBalance
);

export default router;
