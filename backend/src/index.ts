import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';
import pool from './config/db';

// Route imports
import authRoutes from './routes/auth';
import listingRoutes from './routes/listings';
import chatRoutes from './routes/chat';
import reviewRoutes from './routes/reviews';
import notificationRoutes from './routes/notifications';
import aiRoutes from './routes/ai';
import wishlistRoutes from './routes/wishlist';
import swapRoutes from './routes/swaps';
import analyticsRoutes from './routes/analytics';
import storeRoutes from './routes/stores';
import neighborhoodRoutes from './routes/neighborhood';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Set to specific frontend URL in production
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

// Global Rate Limiter — 100 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Çok fazla istek gönderdiniz. Lütfen 1 dakika sonra tekrar deneyin.' },
});

// Strict Rate Limiter for Auth — 10 requests per 10 minutes
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Çok fazla kimlik doğrulama isteği. Lütfen 10 dakika sonra tekrar deneyin.' },
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(globalLimiter);

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Base Routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/listings', listingRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/swaps', swapRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/stores', storeRoutes);
app.use('/api/v1/neighborhood', neighborhoodRoutes);

// Health Check Endpoint
app.get('/health', async (req, res) => {
  try {
    const dbCheck = await pool.query('SELECT 1');
    res.status(200).json({ status: 'OK', database: 'CONNECTED' });
  } catch (err: any) {
    res.status(500).json({ status: 'ERROR', database: 'DISCONNECTED', error: err.message });
  }
});

// Socket.io WebSocket Connections
io.on('connection', (socket) => {
  console.log(`[WebSocket] Client connected: ${socket.id}`);

  // Join chat room
  socket.on('join_room', ({ roomId }) => {
    socket.join(roomId);
    console.log(`[WebSocket] Client ${socket.id} joined chat room: ${roomId}`);
  });

  // Handle outgoing and persistent message saves (supporting text, image, and offers!)
  socket.on('send_message', async ({ roomId, senderId, text, messageType, imageUrl, offerPrice }) => {
    try {
      const query = `
        INSERT INTO messages (room_id, sender_id, message_text, message_type, image_url, offer_price, offer_status, is_delivered)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const type = messageType || 'text';
      const img = imageUrl || null;
      const price = offerPrice !== undefined && offerPrice !== null ? parseFloat(offerPrice) : null;
      const status = type === 'offer' ? 'pending' : 'pending';

      // Check if recipient is connected in room to mark as delivered
      const clientsInRoom = io.sockets.adapter.rooms.get(roomId);
      const recipientOnline = clientsInRoom && clientsInRoom.size > 1;
      
      const result = await pool.query(query, [
        roomId, senderId, text || '', type, img, price, status, recipientOnline ? true : false
      ]);
      const savedMessage = result.rows[0];

      // Broadcast back out to target clients inside room channel
      io.to(roomId).emit('receive_message', savedMessage);
    } catch (error) {
      console.error('[WebSocket] Error handling send_message:', error);
    }
  });

  // Message read receipts
  socket.on('message_read', async ({ roomId, userId }) => {
    try {
      // Mark all messages sent by other parties as read
      const query = `
        UPDATE messages
        SET is_read = TRUE
        WHERE room_id = $1 AND sender_id != $2 AND is_read = FALSE
        RETURNING *
      `;
      await pool.query(query, [roomId, userId]);
      
      // Notify sender that messages are read
      socket.to(roomId).emit('messages_read_receipt', { roomId, readerId: userId });
    } catch (error) {
      console.error('[WebSocket] Error handling message_read:', error);
    }
  });

  // Message delivery receipts
  socket.on('message_delivered', async ({ roomId, messageId }) => {
    try {
      const query = `
        UPDATE messages
        SET is_delivered = TRUE
        WHERE id = $1
        RETURNING *
      `;
      await pool.query(query, [messageId]);
      socket.to(roomId).emit('message_delivered_receipt', { roomId, messageId });
    } catch (error) {
      console.error('[WebSocket] Error handling message_delivered:', error);
    }
  });

  // Offer action triggers (Accepting / Rejecting offers)
  socket.on('offer_action', async ({ roomId, messageId, action }) => {
    try {
      const query = `
        UPDATE messages
        SET offer_status = $1
        WHERE id = $2
        RETURNING *
      `;
      const result = await pool.query(query, [action, messageId]);
      const updatedMessage = result.rows[0];

      if (updatedMessage) {
        io.to(roomId).emit('offer_updated', updatedMessage);
      }
    } catch (error) {
      console.error('[WebSocket] Error handling offer_action:', error);
    }
  });

  // Join neighborhood channel
  socket.on('join_neighborhood', ({ neighborhood }) => {
    const roomName = `neighborhood-${neighborhood.toLowerCase()}`;
    socket.join(roomName);
    console.log(`[WebSocket] Client ${socket.id} joined neighborhood room: ${roomName}`);
  });

  // Broadcast new neighborhood posts in real-time
  socket.on('send_neighborhood_post', ({ post }) => {
    const roomName = `neighborhood-${post.neighborhood.toLowerCase()}`;
    io.to(roomName).emit('receive_neighborhood_post', post);
  });

  // Typing state indicators
  socket.on('typing', ({ roomId, userId, isTyping }) => {
    socket.to(roomId).emit('typing', { userId, isTyping });
  });

  socket.on('disconnect', () => {
    console.log(`[WebSocket] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Modsale Backend listening on port ${PORT}`);
});
