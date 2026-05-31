import { Request, Response } from 'express';
import pool from '../config/db';

export const createChatRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { listing_id, buyer_id, seller_id } = req.body;

    if (!listing_id || !buyer_id || !seller_id) {
       res.status(400).json({ success: false, error: 'Missing mandatory parameters.' });
       return;
    }

    if (buyer_id === seller_id) {
       res.status(400).json({ success: false, error: 'Buyers cannot create chat rooms with themselves.' });
       return;
    }

    // Upsert equivalent for unique combination
    const query = `
      INSERT INTO chat_rooms (listing_id, buyer_id, seller_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (listing_id, buyer_id, seller_id)
      DO UPDATE SET created_at = CURRENT_TIMESTAMP -- NOP, return existing
      RETURNING *
    `;

    const result = await pool.query(query, [listing_id, buyer_id, seller_id]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating chat room:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const listChatRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
       res.status(400).json({ success: false, error: 'User header missing.' });
       return;
    }

    // Query active chat rooms with product preview and latest message context
    const query = `
      SELECT 
        cr.id as room_id,
        cr.created_at,
        l.id as listing_id,
        l.title as listing_title,
        l.price as listing_price,
        l.images[1] as listing_thumbnail,
        buyer.display_name as buyer_name,
        buyer.avatar_url as buyer_avatar,
        seller.display_name as seller_name,
        seller.avatar_url as seller_avatar,
        (
          SELECT message_text 
          FROM messages 
          WHERE room_id = cr.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT created_at 
          FROM messages 
          WHERE room_id = cr.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message_time
      FROM chat_rooms cr
      JOIN listings l ON cr.listing_id = l.id
      JOIN users buyer ON cr.buyer_id = buyer.id
      JOIN users seller ON cr.seller_id = seller.id
      WHERE cr.buyer_id = $1 OR cr.seller_id = $1
      ORDER BY last_message_time DESC NULLS LAST
    `;

    const result = await pool.query(query, [userId]);

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
     console.error('Error listing chat rooms:', error);
     res.status(500).json({ success: false, error: error.message });
  }
};

export const getRoomMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;

    const query = `
      SELECT id, room_id, sender_id, message_text, message_type, image_url, offer_price, offer_status, is_delivered, is_read, created_at
      FROM messages
      WHERE room_id = $1
      ORDER BY created_at ASC
    `;

    const result = await pool.query(query, [roomId]);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error: any) {
     console.error('Error fetching chat room messages:', error);
     res.status(500).json({ success: false, error: error.message });
  }
};

export const uploadChatPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'No file uploaded.' });
      return;
    }

    const host = req.get('host') || '192.168.1.120:4000';
    const protocol = req.protocol || 'http';
    const url = `${protocol}://${host}/uploads/${file.filename}`;

    res.status(200).json({
      success: true,
      url
    });
  } catch (error: any) {
    console.error('Error uploading chat photo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
