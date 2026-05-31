import { Request, Response } from 'express';
import pool from '../config/db';

export const getNeighborhoodPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const neighborhood = req.query.neighborhood as string;

    let query = 'SELECT * FROM neighborhood_posts';
    let params: any[] = [];

    if (neighborhood) {
      query += ' WHERE LOWER(neighborhood) = LOWER($1)';
      params.push(neighborhood);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    res.status(200).json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error retrieving neighborhood posts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createNeighborhoodPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { userName, userAvatar, neighborhood, content } = req.body;

    if (!userId || !userName || !neighborhood || !content) {
      res.status(400).json({ success: false, error: 'Eksik parametre. Tüm alanlar zorunludur.' });
      return;
    }

    const insertQuery = `
      INSERT INTO neighborhood_posts (user_id, user_name, user_avatar, neighborhood, content)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      userId,
      userName,
      userAvatar || '',
      neighborhood,
      content
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating neighborhood post:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const likeNeighborhoodPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { postId } = req.body;

    if (!postId) {
      res.status(400).json({ success: false, error: 'Post ID gereklidir.' });
      return;
    }

    const updateQuery = `
      UPDATE neighborhood_posts 
      SET likes = likes + 1 
      WHERE id = $1 
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [postId]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Duyuru bulunamadı.' });
      return;
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error liking neighborhood post:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
