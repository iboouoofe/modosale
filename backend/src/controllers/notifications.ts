import { Request, Response } from 'express';
import pool from '../config/db';

// In-memory push token registry
const pushTokens: Map<string, string> = new Map();

// ─── Register Push Token ───────────────────────────────────────────────────────
export const registerPushToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id, push_token } = req.body;
    if (!user_id || !push_token) {
      res.status(400).json({ success: false, error: 'user_id and push_token are required.' });
      return;
    }
    pushTokens.set(user_id, push_token);
    console.log(`[Push] Token registered for user ${user_id}: ${push_token}`);
    res.status(200).json({ success: true, message: 'Push token registered.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Get Notifications ─────────────────────────────────────────────────────────
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      res.status(400).json({ success: false, error: 'x-user-id header is required.' });
      return;
    }

    const query = `
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const result = await pool.query(query, [userId]);

    res.status(200).json({
      success: true,
      data: result.rows,
      unread_count: result.rows.filter((n: any) => !n.is_read).length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Mark Notification as Read ─────────────────────────────────────────────────
export const markNotificationRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const query = `UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Notification not found.' });
      return;
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Mark All as Read ─────────────────────────────────────────────────────────
export const markAllNotificationsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      res.status(400).json({ success: false, error: 'x-user-id header is required.' });
      return;
    }
    await pool.query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1`, [userId]);
    res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Create Notification (internal use) ───────────────────────────────────────
export const createNotification = async (
  userId: string,
  type: string,
  title: string,
  body: string,
  data?: any
): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, data) VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, body, data ? JSON.stringify(data) : null]
    );
  } catch (err) {
    console.error('[Notification] Failed to create notification:', err);
  }
};
