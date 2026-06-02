import { Router } from 'express';
import { requireAdmin } from '../middlewares/adminMiddleware';
import { 
  getAllUsers, 
  toggleBanUser, 
  getAllMessages, 
  getPromotionRequests, 
  approvePromotion 
} from '../controllers/admin';

const router = Router();

// Secure all admin routes with the requireAdmin middleware
router.use(requireAdmin);

// User Management
router.get('/users', getAllUsers);
router.post('/users/:id/ban', toggleBanUser);

// Message Moderation
router.get('/messages', getAllMessages);

// Promotion Approvals
router.get('/promotions', getPromotionRequests);
router.post('/promotions/:id/approve', approvePromotion);

export default router;
