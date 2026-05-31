import { Request, Response } from 'express';
import pool from '../config/db';

export const createOrUpdateStore = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { name, description, banner_url, logo_url } = req.body;

    if (!userId || !name) {
      res.status(400).json({ success: false, error: 'Eksik parametre. Mağaza adı gereklidir.' });
      return;
    }

    const upsertQuery = `
      INSERT INTO stores (user_id, name, description, banner_url, logo_url)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id)
      DO UPDATE SET 
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        banner_url = EXCLUDED.banner_url,
        logo_url = EXCLUDED.logo_url
      RETURNING *
    `;
    const result = await pool.query(upsertQuery, [
      userId,
      name,
      description || '',
      banner_url || '',
      logo_url || ''
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating/updating store:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getStoreDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const viewerId = req.headers['x-user-id'] as string || null;

    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required.' });
      return;
    }

    // 1. Fetch store
    const storeQuery = `SELECT * FROM stores WHERE user_id = $1`;
    const storeRes = await pool.query(storeQuery, [userId]);

    if (storeRes.rows.length === 0) {
      res.status(200).json({ success: true, store: null });
      return;
    }

    const store = storeRes.rows[0];

    // 2. Fetch follower stats
    const followersCountQuery = `SELECT COUNT(*) as count FROM store_followers WHERE store_id = $1`;
    const countRes = await pool.query(followersCountQuery, [store.id]);
    const followerCount = parseInt(countRes.rows[0]?.count || '0');

    let isFollowing = false;
    if (viewerId) {
      const followCheckQuery = `SELECT 1 FROM store_followers WHERE store_id = $1 AND follower_id = $2`;
      const checkRes = await pool.query(followCheckQuery, [store.id, viewerId]);
      isFollowing = checkRes.rows.length > 0;
    }

    // 3. Fetch active listings for this store
    const listingsQuery = `
      SELECT *, ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude 
      FROM listings 
      WHERE user_id = $1 AND is_active = TRUE 
      ORDER BY bumped_at DESC
    `;
    const listingsRes = await pool.query(listingsQuery, [userId]);

    res.status(200).json({
      success: true,
      store: {
        ...store,
        follower_count: followerCount,
        is_following: isFollowing
      },
      listings: listingsRes.rows
    });
  } catch (error: any) {
    console.error('Error fetching store details:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const toggleFollowStore = async (req: Request, res: Response): Promise<void> => {
  try {
    const followerId = req.headers['x-user-id'] as string;
    const { storeId } = req.body;

    if (!followerId || !storeId) {
      res.status(400).json({ success: false, error: 'Eksik parametre. Mağaza ve takipçi bilgileri gereklidir.' });
      return;
    }

    const checkQuery = `SELECT 1 FROM store_followers WHERE store_id = $1 AND follower_id = $2`;
    const checkRes = await pool.query(checkQuery, [storeId, followerId]);

    let following = false;
    if (checkRes.rows.length > 0) {
      // Unfollow
      const deleteQuery = `DELETE FROM store_followers WHERE store_id = $1 AND follower_id = $2`;
      await pool.query(deleteQuery, [storeId, followerId]);
      following = false;
    } else {
      // Follow
      const insertQuery = `INSERT INTO store_followers (store_id, follower_id) VALUES ($1, $2)`;
      await pool.query(insertQuery, [storeId, followerId]);
      following = true;
    }

    // Get updated follower count
    const countRes = await pool.query(`SELECT COUNT(*) as count FROM store_followers WHERE store_id = $1`, [storeId]);
    const followerCount = parseInt(countRes.rows[0]?.count || '0');

    res.status(200).json({
      success: true,
      is_following: following,
      follower_count: followerCount
    });
  } catch (error: any) {
    console.error('Error toggling follow status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
