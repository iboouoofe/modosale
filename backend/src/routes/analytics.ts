import { Router } from 'express';
import { getAnalyticsOverview, getWeeklyViews, getHourlyHeatmap } from '../controllers/analytics';

const router = Router();

// GET /api/v1/analytics/overview
router.get('/overview', getAnalyticsOverview);

// GET /api/v1/analytics/weekly-views
router.get('/weekly-views', getWeeklyViews);

// GET /api/v1/analytics/heatmap
router.get('/heatmap', getHourlyHeatmap);

export default router;
