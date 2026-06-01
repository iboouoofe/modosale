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

import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary with user credentials
cloudinary.config({
  cloud_name: 'dzrgheqid',
  api_key: '421577617323396',
  api_secret: '6Eh45MwtJ_owdj_KbqNKlxmsQ_o'
});

// Cloudinary storage for photos
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'modosale_listings',
      format: 'jpg',
      public_id: `photo-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    };
  },
});

// Cloudinary storage for videos
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'modosale_videos',
      resource_type: 'video',
      public_id: `video-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    };
  },
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
