import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import walletRoutes from './walletRoutes.js';
import gameRoutes from './gameRoutes.js';

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

export default router;
