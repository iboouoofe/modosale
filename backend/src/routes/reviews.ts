import { Router } from 'express';
import { submitReview, getUserReviews, getTrendingListings } from '../controllers/reviews';

const router = Router();

// POST /api/v1/reviews
router.post('/', submitReview);

// GET /api/v1/reviews/user/:userId
router.get('/user/:userId', getUserReviews);

// GET /api/v1/reviews/trending
router.get('/trending', getTrendingListings);

export default router;
