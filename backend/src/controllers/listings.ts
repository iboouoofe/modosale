import { Request, Response } from 'express';
import pool from '../config/db';
import { matchListingWithAlerts } from '../services/alertMatcher';

export const getListingsFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
    const radiusKm = req.query.radius_km ? parseFloat(req.query.radius_km as string) : 5.0; // Default 5km
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const minPrice = req.query.min_price ? parseFloat(req.query.min_price as string) : undefined;
    const maxPrice = req.query.max_price ? parseFloat(req.query.max_price as string) : undefined;
    const condition = req.query.condition as string | undefined;
    const bboxStr = req.query.bbox as string | undefined; // minLng,minLat,maxLng,maxLat
    const favoritesOnly = req.query.favorites_only === 'true';
    const userId = req.headers['x-user-id'] as string || req.query.user_id as string;

    let query = `
      SELECT 
        listings.id, 
        listings.user_id, 
        listings.title, 
        listings.description, 
        listings.price, 
        listings.currency, 
        listings.images, 
        listings.category, 
        listings.condition,
        listings.city_district, 
        listings.show_phone, 
        listings.bumped_at, 
        listings.created_at,
        ST_X(listings.location::geometry) as longitude,
        ST_Y(listings.location::geometry) as latitude
    `;

    const queryParams: any[] = [];
    let distanceSelect = '';
    let locationWhere = '';
    let orderClause = 'ORDER BY listings.bumped_at DESC';

    // If coordinates are provided, compute distance and filter based on radius
    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      distanceSelect = `, ST_DistanceSphere(listings.location, ST_MakePoint($1, $2)) as distance_meters`;
      locationWhere = `AND ST_DWithin(listings.location::geography, ST_MakePoint($1, $2)::geography, $3 * 1000)`;
      queryParams.push(lng, lat, radiusKm);
      orderClause = 'ORDER BY distance_meters ASC, listings.bumped_at DESC';
    }

    query += distanceSelect;

    // Join with user_favorites if favoritesOnly is requested
    if (favoritesOnly && userId) {
      query += ` FROM listings INNER JOIN user_favorites uf ON listings.id = uf.listing_id WHERE uf.user_id = $${queryParams.length + 1} AND listings.is_active = TRUE `;
      queryParams.push(userId);
    } else {
      query += ` FROM listings WHERE listings.is_active = TRUE `;
    }

    if (locationWhere) {
      query += locationWhere;
    }

    if (category) {
      const categoryIndex = queryParams.length + 1;
      query += ` AND listings.category = $${categoryIndex}`;
      queryParams.push(category);
    }

    if (search && search.trim() !== '') {
      const searchIndex = queryParams.length + 1;
      query += ` AND (listings.title ILIKE $${searchIndex} OR listings.description ILIKE $${searchIndex})`;
      queryParams.push(`%${search.trim()}%`);
    }

    if (minPrice !== undefined && !isNaN(minPrice)) {
      const index = queryParams.length + 1;
      query += ` AND listings.price >= $${index}`;
      queryParams.push(minPrice);
    }

    if (maxPrice !== undefined && !isNaN(maxPrice)) {
      const index = queryParams.length + 1;
      query += ` AND listings.price <= $${index}`;
      queryParams.push(maxPrice);
    }

    if (condition) {
      const index = queryParams.length + 1;
      query += ` AND listings.condition = $${index}`;
      queryParams.push(condition);
    }

    if (bboxStr) {
      const bboxParts = bboxStr.split(',').map(parseFloat);
      if (bboxParts.length === 4 && bboxParts.every((val) => !isNaN(val))) {
        const [minLng, minLat, maxLng, maxLat] = bboxParts;
        const idx1 = queryParams.length + 1;
        const idx2 = queryParams.length + 2;
        const idx3 = queryParams.length + 3;
        const idx4 = queryParams.length + 4;
        query += ` AND ST_Contains(ST_MakeEnvelope($${idx1}, $${idx2}, $${idx3}, $${idx4}, 4326), listings.location::geometry)`;
        queryParams.push(minLng, minLat, maxLng, maxLat);
      }
    }

    query += ` ${orderClause} LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching listings feed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
};

export const createListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, price, currency, images, category, lat, lng, city_district, show_phone, user_id, condition, video_url } = req.body;

    // Validate minimum requirements
    if (!title || !price || !category || !lat || !lng || !city_district || !user_id || !images || images.length === 0) {
       res.status(400).json({ success: false, error: 'Missing required parameters.' });
       return;
    }

    const query = `
      INSERT INTO listings (
        user_id, title, description, price, currency, images, category, location, city_district, show_phone, condition, video_url
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($8, $9), 4326), $10, $11, $12, $13
      ) RETURNING *, ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude
    `;

    const result = await pool.query(query, [
      user_id, title, description, price, currency || 'TL', images, category, lng, lat, city_district, show_phone || false, condition || 'good', video_url || null
    ]);

    const createdListing = result.rows[0];
    
    // Trigger background wish alert matcher asynchronously
    matchListingWithAlerts(createdListing).catch((err) => {
      console.error('[AlertMatcher] Failed to process matching asynchronously:', err);
    });

    res.status(201).json({
      success: true,
      data: createdListing
    });
  } catch (error: any) {
    console.error('Error creating listing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string || req.body.user_id;
    const { title, description, price, category, condition, city_district, show_phone, images, is_active } = req.body;

    if (!title || !price || !category) {
      res.status(400).json({ success: false, error: 'Başlık, fiyat ve kategori zorunludur.' });
      return;
    }

    const query = `
      UPDATE listings SET
        title = $1,
        description = $2,
        price = $3,
        category = $4,
        condition = $5,
        city_district = $6,
        show_phone = $7,
        images = $8,
        is_active = $9
      WHERE id = $10
      RETURNING *, ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude
    `;

    const result = await pool.query(query, [
      title, description, parseFloat(price), category, condition || 'good',
      city_district, show_phone ?? false, images, is_active ?? true, id
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'İlan bulunamadı.' });
      return;
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating listing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};



export const bumpListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const query = `
      UPDATE listings 
      SET bumped_at = CURRENT_TIMESTAMP 
      WHERE id = $1 AND is_active = TRUE 
      RETURNING *
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
       res.status(404).json({ success: false, error: 'Listing not found or inactive.' });
       return;
    }

    res.status(200).json({
      success: true,
      message: 'Listing successfully bumped to top.',
      data: result.rows[0]
    });
  } catch (error: any) {
     console.error('Error bumping listing:', error);
     res.status(500).json({ success: false, error: error.message });
  }
};

export const getListingDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        id, 
        user_id, 
        title, 
        description, 
        price, 
        currency, 
        images, 
        category, 
        city_district, 
        show_phone, 
        is_active,
        bumped_at, 
        created_at,
        ST_X(location::geometry) as longitude,
        ST_Y(location::geometry) as latitude
      FROM listings 
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
       res.status(404).json({ success: false, error: 'Listing not found.' });
       return;
    }

    // Log listing view asynchronously for storefront analytics (Phase 4)
    const viewerId = req.headers['x-user-id'] as string || null;
    pool.query(
      'INSERT INTO listing_views (listing_id, viewer_id) VALUES ($1, $2)',
      [id, viewerId]
    ).catch(err => console.error('Error logging listing view:', err));

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
     console.error('Error fetching listing details:', error);
     res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // Authenticated user ID passed via headers in production
    const userId = req.headers['x-user-id'] as string;

    const deleteQuery = `
      DELETE FROM listings 
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
       res.status(404).json({ success: false, error: 'Listing not found or already deleted.' });
       return;
    }

    res.status(200).json({
      success: true,
      message: 'Listing successfully deleted.',
      data: result.rows[0]
    });
  } catch (error: any) {
     console.error('Error deleting listing:', error);
     res.status(500).json({ success: false, error: error.message });
  }
};

export const uploadPhotos = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: 'No files uploaded.' });
      return;
    }

    const host = req.get('host') || '192.168.1.120:4000';
    const protocol = req.protocol || 'http';
    const urls = files.map((file) => {
      return `${protocol}://${host}/uploads/${file.filename}`;
    });

    res.status(200).json({
      success: true,
      urls
    });
  } catch (error: any) {
    console.error('Error uploading photos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const uploadVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'Dosya yüklenemedi.' });
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
    console.error('Error uploading video:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const favoriteListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // Authenticated user ID passed via headers/body or fallback query
    const userId = req.headers['x-user-id'] as string || req.body.user_id as string;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized. User session not found.' });
      return;
    }

    const query = `
      INSERT INTO user_favorites (user_id, listing_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      RETURNING *
    `;
    const result = await pool.query(query, [userId, id]);

    res.status(200).json({
      success: true,
      message: 'Listing added to favorites successfully.',
      data: result.rows[0] || { user_id: userId, listing_id: id }
    });
  } catch (error: any) {
    console.error('Error favoriting listing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const unfavoriteListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // Authenticated user ID passed via headers/body or fallback query
    const userId = req.headers['x-user-id'] as string || req.body.user_id as string;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized. User session not found.' });
      return;
    }

    const query = `
      DELETE FROM user_favorites
      WHERE user_id = $1 AND listing_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [userId, id]);

    res.status(200).json({
      success: true,
      message: 'Listing removed from favorites successfully.',
      data: result.rows[0] || { user_id: userId, listing_id: id }
    });
  } catch (error: any) {
    console.error('Error unfavoriting listing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
