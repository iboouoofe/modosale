import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { 
  getListingsFeed, 
  createListing, 
  updateListing,
  bumpListing, 
  getListingDetails, 
  deleteListing,
  uploadPhotos,
  uploadVideo,
  favoriteListing,
  unfavoriteListing
} from '../controllers/listings';

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'photo-' + uniqueSuffix + ext);
  }
});

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, 'video-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const uploadVideoLimit = multer({
  storage: videoStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

const router = Router();

// Listings Geospatial Feed route
router.get('/feed', getListingsFeed);

// Create new listing
router.post('/', createListing);

// Upload photos endpoint (up to 8 photos)
router.post('/upload', upload.array('photos', 8), uploadPhotos);

// Upload video endpoint (Phase 6)
router.post('/upload-video', uploadVideoLimit.single('video'), uploadVideo);

// Favorite operations
router.post('/:id/favorite', favoriteListing);
router.delete('/:id/favorite', unfavoriteListing);

// Get single listing details
router.get('/:id', getListingDetails);

// Bump listing to top
router.post('/:id/bump', bumpListing);

// Update (edit/revise) a listing
router.patch('/:id', updateListing);

// Delete listing
router.delete('/:id', deleteListing);

export default router;
