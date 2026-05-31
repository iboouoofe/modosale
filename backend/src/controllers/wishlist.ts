import { Request, Response } from 'express';
import pool from '../config/db';

export const createWishAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string || req.body.user_id;
    const { keywords, category, min_price, max_price, radius_km, notification_frequency } = req.body;

    if (!userId || !keywords || keywords.length === 0) {
      res.status(400).json({ success: false, error: 'Kullanıcı kimliği ve anahtar kelimeler zorunludur.' });
      return;
    }

    const query = `
      INSERT INTO wish_alerts (
        user_id, keywords, category, min_price, max_price, radius_km, notification_frequency, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, TRUE
      ) RETURNING *
    `;

    const result = await pool.query(query, [
      userId,
      keywords,
      category || null,
      min_price ? parseInt(min_price) : null,
      max_price ? parseInt(max_price) : null,
      radius_km ? parseInt(radius_km) : 15,
      notification_frequency || 'instant'
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating wish alert:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getWishAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(400).json({ success: false, error: 'Kullanıcı kimliği eksik.' });
      return;
    }

    const query = `SELECT * FROM wish_alerts WHERE user_id = $1 ORDER BY created_at DESC`;
    const result = await pool.query(query, [userId]);

    res.status(200).json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error getting wish alerts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const toggleWishAlertActive = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const query = `UPDATE wish_alerts SET is_active = $1 WHERE id = $2 RETURNING *`;
    const result = await pool.query(query, [is_active, id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Alarm bulunamadı.' });
      return;
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error toggling wish alert:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteWishAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const query = `DELETE FROM wish_alerts WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Alarm bulunamadı.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Alarm başarıyla silindi.' });
  } catch (error: any) {
    console.error('Error deleting wish alert:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
