import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth, requireRoles } from '../middleware/auth';
import { Role } from '../types';

const router = Router();

// Anti brute-force protection for login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 20, // max 20 login attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts from this IP. Please try again in 15 minutes.' },
});

router.post('/login', authLimiter, AuthController.login);
router.get('/me', requireAuth, AuthController.getMe);
router.get('/users', requireAuth, AuthController.listUsers);
router.post('/users', requireAuth, requireRoles(Role.ADMIN), AuthController.createUser);
router.put('/users/:id', requireAuth, requireRoles(Role.ADMIN), AuthController.updateUser);

export default router;
