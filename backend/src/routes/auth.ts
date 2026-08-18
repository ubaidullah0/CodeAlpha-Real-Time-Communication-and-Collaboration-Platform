import { Router } from 'express';
import { register, login, logout, getMe } from '../controllers/auth.controller';
import { forgotPassword, verifyOtp, resetPassword } from '../controllers/passwordReset.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

import { RequestHandler } from 'express';

router.post('/register', register as RequestHandler);
router.post('/login', login as RequestHandler);
router.post('/logout', logout as RequestHandler);
router.get('/me', requireAuth, getMe as RequestHandler);

// Password Reset Flow
router.post('/forgot-password', forgotPassword as RequestHandler);
router.post('/verify-reset-otp', verifyOtp as RequestHandler);
router.post('/reset-password', resetPassword as RequestHandler);

export default router;
