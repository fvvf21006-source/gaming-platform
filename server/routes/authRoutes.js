import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { loginValidationRules, changePasswordValidationRules, handleValidationErrors } from '../validators/authValidator.js';

const router = Router();

router.post('/login', loginValidationRules, handleValidationErrors, authController.login);
router.get('/me', authenticate, authController.me);
router.put(
  '/change-password',
  authenticate,
  changePasswordValidationRules,
  handleValidationErrors,
  authController.changePassword
);

export default router;
