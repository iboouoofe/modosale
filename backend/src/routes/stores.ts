import { Router } from 'express';
import { createOrUpdateStore, getStoreDetails, toggleFollowStore } from '../controllers/stores';

const router = Router();

// POST /api/v1/stores (Create/update store storefront)
router.post('/', createOrUpdateStore);

// GET /api/v1/stores/user/:userId (Retrieve store and listings)
router.get('/user/:userId', getStoreDetails);

// POST /api/v1/stores/follow (Follow or unfollow a store)
router.post('/follow', toggleFollowStore);

export default router;
