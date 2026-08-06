import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import walletRoutes from './walletRoutes.js';
import gameRoutes from './gameRoutes.js';
import reportRoutes from './reportRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import auditRoutes from './auditRoutes.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Gaming Platform API' });
});

router.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

router.use('/api/auth', authRoutes);
router.use('/api/users', userRoutes);
router.use('/api/wallet', walletRoutes);
router.use('/api/games', gameRoutes);
router.use('/api/reports', reportRoutes);
router.use('/api/notifications', notificationRoutes);
router.use('/api/audit', auditRoutes);

export default router;
