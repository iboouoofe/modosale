import { Request, Response } from 'express';
import pool from '../config/db';

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT id, phone_number, email, display_name, is_admin, is_banned, created_at 
      FROM users 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const toggleBanUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_banned } = req.body; // boolean

    const query = `
      UPDATE users 
      SET is_banned = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, display_name, is_banned
    `;
    const result = await pool.query(query, [is_banned, id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT m.id, m.message_text, m.created_at, 
             u.display_name as sender_name, u.email as sender_email,
             r.listing_id
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      JOIN chat_rooms r ON m.room_id = r.id
      ORDER BY m.created_at DESC
      LIMIT 100
    `;
    const result = await pool.query(query);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPromotionRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT pr.id, pr.proof_image_url, pr.status, pr.created_at,
             u.display_name as user_name, u.email as user_email,
             l.id as listing_id, l.title as listing_title, l.images as listing_images
      FROM promotion_requests pr
      JOIN users u ON pr.user_id = u.id
      JOIN listings l ON pr.listing_id = l.id
      ORDER BY pr.created_at DESC
    `;
    const result = await pool.query(query);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const approvePromotion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // request id
    const { status } = req.body; // 'approved' or 'rejected'

    // 1. Update the request status
    const updateReqQuery = `
      UPDATE promotion_requests 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING listing_id
    `;
    const reqResult = await pool.query(updateReqQuery, [status, id]);

    if (reqResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Promotion request not found' });
      return;
    }

    // 2. If approved, set listing is_promoted = true
    if (status === 'approved') {
      const listingId = reqResult.rows[0].listing_id;
      await pool.query(`UPDATE listings SET is_promoted = TRUE, bumped_at = CURRENT_TIMESTAMP WHERE id = $1`, [listingId]);
    } else if (status === 'rejected') {
      const listingId = reqResult.rows[0].listing_id;
      await pool.query(`UPDATE listings SET is_promoted = FALSE WHERE id = $1`, [listingId]);
    }

    res.status(200).json({ success: true, message: `Promotion ${status} successfully` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
