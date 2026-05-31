import { Router } from 'express';
import { createWishAlert, getWishAlerts, toggleWishAlertActive, deleteWishAlert } from '../controllers/wishlist';

const router = Router();

// GET /api/v1/wishlist
router.get('/', getWishAlerts);

// POST /api/v1/wishlist
router.post('/', createWishAlert);

// PATCH /api/v1/wishlist/:id
router.patch('/:id', toggleWishAlertActive);

// DELETE /api/v1/wishlist/:id
router.delete('/:id', deleteWishAlert);

export default router;
