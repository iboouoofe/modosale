import { Request, Response, NextFunction } from 'express';
import pool from '../config/db';

export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: No user ID provided.' });
      return;
    }

    const query = `SELECT is_admin FROM users WHERE id = $1`;
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    if (!result.rows[0].is_admin) {
      res.status(403).json({ success: false, error: 'Forbidden: Admin access required.' });
      return;
    }

    next();
  } catch (error: any) {
    console.error('Error in adminMiddleware:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
