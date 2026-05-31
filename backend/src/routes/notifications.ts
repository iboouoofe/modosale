import { Router } from 'express';
import {
  registerPushToken,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notifications';

const router = Router();

// POST /api/v1/notifications/register-token
router.post('/register-token', registerPushToken);

// GET /api/v1/notifications
router.get('/', getNotifications);

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', markNotificationRead);

// PATCH /api/v1/notifications/read-all
router.patch('/read-all', markAllNotificationsRead);

export default router;
