import { Router } from 'express';
import authRoutes from './authRoutes.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Gaming Platform API' });
});

router.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

router.use('/api/auth', authRoutes);

export default router;
