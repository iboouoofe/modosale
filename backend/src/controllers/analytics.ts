import { Request, Response } from 'express';
import pool from '../config/db';

export const getAnalyticsOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      res.status(400).json({ success: false, error: 'User identification header missing.' });
      return;
    }

    // 1. Total Views of all user listings
    const viewsQuery = `
      SELECT COUNT(v.id) as total_views 
      FROM listing_views v
      JOIN listings l ON v.listing_id = l.id
      WHERE l.user_id = $1
    `;
    const viewsRes = await pool.query(viewsQuery, [userId]);
    const totalViews = parseInt(viewsRes.rows[0]?.total_views || '0');

    // 2. Active Listings Count
    const activeQuery = `SELECT COUNT(id) as active_count FROM listings WHERE user_id = $1 AND is_active = TRUE`;
    const activeRes = await pool.query(activeQuery, [userId]);
    const activeCount = parseInt(activeRes.rows[0]?.active_count || '0');

    // 3. Favorites Count
    const favsQuery = `
      SELECT COUNT(uf.listing_id) as fav_count 
      FROM user_favorites uf
      JOIN listings l ON uf.listing_id = l.id
      WHERE l.user_id = $1
    `;
    const favsRes = await pool.query(favsQuery, [userId]);
    const favCount = parseInt(favsRes.rows[0]?.fav_count || '0');

    // 4. Rating (Average from reviews)
    const ratingQuery = `SELECT AVG(rating) as avg_rating FROM reviews WHERE reviewee_id = $1`;
    const ratingRes = await pool.query(ratingQuery, [userId]);
    const avgRating = parseFloat(ratingRes.rows[0]?.avg_rating || '4.8');

    res.status(200).json({
      success: true,
      data: {
        total_views: totalViews,
        active_listings: activeCount,
        favorites_count: favCount,
        average_rating: avgRating
      }
    });
  } catch (error: any) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getWeeklyViews = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      res.status(400).json({ success: false, error: 'User identification header missing.' });
      return;
    }

    const query = `
      SELECT DATE(v.created_at) as day_date, COUNT(v.id) as view_count
      FROM listing_views v
      JOIN listings l ON v.listing_id = l.id
      WHERE l.user_id = $1 AND v.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(v.created_at)
      ORDER BY DATE(v.created_at) ASC
    `;
    const result = await pool.query(query, [userId]);

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching weekly views:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getHourlyHeatmap = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      res.status(400).json({ success: false, error: 'User identification header missing.' });
      return;
    }

    const query = `
      SELECT EXTRACT(HOUR FROM v.created_at) as hour, COUNT(v.id) as view_count
      FROM listing_views v
      JOIN listings l ON v.listing_id = l.id
      WHERE l.user_id = $1
      GROUP BY EXTRACT(HOUR FROM v.created_at)
      ORDER BY hour ASC
    `;
    const result = await pool.query(query, [userId]);

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching hourly heatmap:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
