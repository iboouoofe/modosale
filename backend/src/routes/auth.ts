import { Router } from 'express';
import { registerOrVerify, getUserProfile, requestOtp, refreshTokens, logoutUser, updateProfile } from '../controllers/auth';

const router = Router();

// Request OTP SMS dispatch code
router.post('/request-otp', requestOtp);

// OTP/Social auth token validation
router.post('/register-verify', registerOrVerify);

// Token refresh endpoint
router.post('/refresh', refreshTokens);

// Logout token blacklisting
router.post('/logout', logoutUser);

// Profile retrieval
router.get('/profile', getUserProfile);

// Profile updates
router.put('/profile', updateProfile);

export default router;
