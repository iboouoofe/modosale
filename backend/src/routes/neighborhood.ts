import { Router } from 'express';
import { getNeighborhoodPosts, createNeighborhoodPost, likeNeighborhoodPost } from '../controllers/neighborhood';

const router = Router();

// GET /api/v1/neighborhood (Retrieve posts)
router.get('/', getNeighborhoodPosts);

// POST /api/v1/neighborhood (Create a new post)
router.post('/', createNeighborhoodPost);

// POST /api/v1/neighborhood/like (Like a post)
router.post('/like', likeNeighborhoodPost);

export default router;
