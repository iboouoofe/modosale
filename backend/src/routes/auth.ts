import { Router } from 'express';
import { registerOrVerify, getUserProfile, requestOtp, refreshTokens, logoutUser } from '../controllers/auth';

const router = Router();

// Request OTP SMS dispatch code
router.post('/request-otp', requestOtp);

// OTP/Social auth token validation
router.post('/register-verify', registerOrVerify);

// Token refresh endpoint
router.post('/refresh', refreshTokens);

// Logout token blacklisting
router.post('/logout', logoutUser);

// Profile listings retrieval
router.get('/profile', getUserProfile);

export default router;
