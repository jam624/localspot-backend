// routes/userRoutes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  getUserProfile,
  forgotPassword,
  resendOTP,
  verifyOTP,
  resetPassword,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Throttle the OTP endpoints so nobody can spam Resend
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});

/* ------------------------------- public ------------------------------- */
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/resend-otp', otpLimiter, resendOTP);
router.post('/verify-otp', otpLimiter, verifyOTP);
router.post('/reset-password', authLimiter, resetPassword);

/* ------------------------------ protected ----------------------------- */
router.get('/profile', protect, getUserProfile);

export default router;