import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createChatRoom, listChatRooms, getRoomMessages, uploadChatPhoto } from '../controllers/chat';

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
    cb(null, 'chat-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = Router();

// Create room
router.post('/rooms', createChatRoom);

// Get conversations
router.get('/rooms', listChatRooms);

// Get room messages history
router.get('/rooms/:roomId/messages', getRoomMessages);

// Upload chat photo
router.post('/upload', upload.single('photo'), uploadChatPhoto);

export default router;
