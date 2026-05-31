import { Router } from 'express';
import { createSwapOffer, respondToSwapOffer, getReceivedSwapOffers, getSentSwapOffers } from '../controllers/swaps';

const router = Router();

// GET /api/v1/swaps/received
router.get('/received', getReceivedSwapOffers);

// GET /api/v1/swaps/sent
router.get('/sent', getSentSwapOffers);

// POST /api/v1/swaps
router.post('/', createSwapOffer);

// PATCH /api/v1/swaps/:id/respond
router.patch('/:id/respond', respondToSwapOffer);

export default router;
