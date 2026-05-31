import { Router } from 'express';
import { analyzeListingImage } from '../controllers/ai';

const router = Router();

// POST /api/v1/ai/analyze-listing
router.post('/analyze-listing', analyzeListingImage);

export default router;
