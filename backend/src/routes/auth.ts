import { Router } from 'express';
import { 
  registerOrVerify, 
  requestOtp, 
  refreshTokens, 
  logoutUser, 
  getUserProfile, 
  updateProfile,
  requestEmailOtp,
  verifyEmailOtp,
  googleLogin
} from '../controllers/auth';

import { authenticateUser } from '../middlewares/auth';

const router = Router();

// Phone Auth
router.post('/register-verify', registerOrVerify);
router.post('/request-otp', requestOtp);

// Email Auth
router.post('/email/request-otp', requestEmailOtp);
router.post('/email/verify-otp', verifyEmailOtp);

// Google Auth
router.post('/google', googleLogin);

// Token management & Profile
router.post('/refresh', refreshTokens);
router.post('/logout', logoutUser);
router.get('/profile', authenticateUser, getUserProfile);
router.put('/profile', authenticateUser, updateProfile);

export default router;
