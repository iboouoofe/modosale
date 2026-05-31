import { Request, Response } from 'express';
import pool from '../config/db';

// ─── Submit Review ────────────────────────────────────────────────────────────
export const submitReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reviewer_id, reviewee_id, listing_id, rating, comment } = req.body;

    if (!reviewer_id || !reviewee_id || !rating) {
      res.status(400).json({ success: false, error: 'reviewer_id, reviewee_id and rating are required.' });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ success: false, error: 'Rating must be between 1 and 5.' });
      return;
    }

    if (reviewer_id === reviewee_id) {
      res.status(400).json({ success: false, error: 'You cannot review yourself.' });
      return;
    }

    const query = `
      INSERT INTO reviews (reviewer_id, reviewee_id, listing_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (reviewer_id, reviewee_id, listing_id)
      DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW()
      RETURNING *
    `;
    const result = await pool.query(query, [reviewer_id, reviewee_id, listing_id || null, rating, comment || null]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error submitting review:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Get Reviews for a User ───────────────────────────────────────────────────
export const getUserReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ success: false, error: 'userId param is required.' });
      return;
    }

    const query = `
      SELECT 
        r.*,
        u.display_name AS reviewer_name,
        u.avatar_url AS reviewer_avatar
      FROM reviews r
      LEFT JOIN users u ON u.id = r.reviewer_id
      WHERE r.reviewee_id = $1
      ORDER BY r.created_at DESC
      LIMIT 50
    `;
    const result = await pool.query(query, [userId]);

    // Compute aggregate stats
    const reviews = result.rows;
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + parseFloat(r.rating), 0) / reviews.length
      : 0;

    res.status(200).json({
      success: true,
      data: reviews,
      stats: {
        total_reviews: reviews.length,
        avg_rating: Math.round(avgRating * 10) / 10,
      },
    });
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Get Trending Listings ─────────────────────────────────────────────────────
export const getTrendingListings = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT 
        l.*,
        ST_X(l.location::geometry) as longitude,
        ST_Y(l.location::geometry) as latitude,
        u.display_name as seller_name,
        u.avatar_url as seller_avatar
      FROM listings l
      LEFT JOIN users u ON u.id = l.user_id
      WHERE l.is_active = TRUE
      ORDER BY l.bumped_at DESC, l.created_at DESC
      LIMIT 10
    `;
    const result = await pool.query(query);

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching trending listings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
