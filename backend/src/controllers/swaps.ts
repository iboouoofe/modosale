import { Request, Response } from 'express';
import pool from '../config/db';

export const createSwapOffer = async (req: Request, res: Response): Promise<void> => {
  try {
    const offererId = req.headers['x-user-id'] as string || req.body.offerer_id;
    const { listing_id, offered_listing_id, cash_difference, cash_direction, note } = req.body;

    if (!offererId || !listing_id || !offered_listing_id) {
      res.status(400).json({ success: false, error: 'Eksik parametre. Teklif edilen ve hedef ilan gereklidir.' });
      return;
    }

    // 1. Fetch target listing to find target seller_id
    const targetListingRes = await pool.query('SELECT user_id, title FROM listings WHERE id = $1', [listing_id]);
    if (targetListingRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Hedef ilan bulunamadı.' });
      return;
    }
    const sellerId = targetListingRes.rows[0].user_id;

    // 2. Open or get active chat room between offerer and seller
    let chatRoomId = '';
    const roomCheckQuery = `
      SELECT id FROM chat_rooms 
      WHERE listing_id = $1 AND buyer_id = $2 AND seller_id = $3
    `;
    const roomCheckRes = await pool.query(roomCheckQuery, [listing_id, offererId, sellerId]);

    if (roomCheckRes.rows.length > 0) {
      chatRoomId = roomCheckRes.rows[0].id;
    } else {
      const createRoomQuery = `
        INSERT INTO chat_rooms (listing_id, buyer_id, seller_id)
        VALUES ($1, $2, $3) RETURNING id
      `;
      const createRoomRes = await pool.query(createRoomQuery, [listing_id, offererId, sellerId]);
      chatRoomId = createRoomRes.rows[0].id;
    }

    // 3. Insert swap offer
    const swapQuery = `
      INSERT INTO swap_offers (
        listing_id, offerer_id, offered_listing_id, cash_difference, cash_direction, note, status, chat_room_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'pending', $7
      ) RETURNING *
    `;
    const swapResult = await pool.query(swapQuery, [
      listing_id,
      offererId,
      offered_listing_id,
      cash_difference ? parseInt(cash_difference) : 0,
      cash_direction || 'none',
      note || '',
      chatRoomId
    ]);

    const swapOffer = swapResult.rows[0];

    // 4. Send special swap message balloon to Chat Room
    const offeredTitleRes = await pool.query('SELECT title FROM listings WHERE id = $1', [offered_listing_id]);
    const offeredTitle = offeredTitleRes.rows[0]?.title || 'Ürün';

    let messageText = `🔄 TAKAS TEKLİFİ: "${offeredTitle}" ilanımı teklif ediyorum.`;
    if (cash_difference && cash_difference > 0) {
      messageText += cash_direction === 'offerer' ? ` + Ben ${cash_difference}₺ fark öderim.` : ` + Karşı taraftan ${cash_difference}₺ fark bekliyorum.`;
    }

    const messageQuery = `
      INSERT INTO messages (room_id, sender_id, message_text, message_type, offer_price, offer_status)
      VALUES ($1, $2, $3, 'swap', $4, 'pending') RETURNING *
    `;
    await pool.query(messageQuery, [
      chatRoomId,
      offererId,
      messageText,
      swapOffer.id // Save swap_offer_id inside offer_price column or custom metadata
    ]);

    // Send push notification to target seller
    const notificationQuery = `
      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await pool.query(notificationQuery, [
      sellerId,
      'swap_offer',
      '🔄 Yeni Takas Teklifi!',
      `"${targetListingRes.rows[0].title}" ürününüz için yeni bir takas teklifi aldınız!`,
      JSON.stringify({ chat_room_id: chatRoomId })
    ]);

    res.status(201).json({ success: true, data: swapOffer, chat_room_id: chatRoomId });
  } catch (error: any) {
    console.error('Error creating swap offer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const respondToSwapOffer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'accepted' | 'rejected'

    if (!['accepted', 'rejected'].includes(status)) {
      res.status(400).json({ success: false, error: 'Geçersiz takas durumu.' });
      return;
    }

    const query = `UPDATE swap_offers SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`;
    const result = await pool.query(query, [status, id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Takas teklifi bulunamadı.' });
      return;
    }

    const offer = result.rows[0];

    // Add a system update chat message to the room
    const systemMsg = status === 'accepted' ? '🎉 Takas teklifi KABUL EDİLDİ!' : '❌ Takas teklifi REDDEDİLDİ.';
    const systemQuery = `
      INSERT INTO messages (room_id, sender_id, message_text, message_type)
      VALUES ($1, $2, $3, 'system')
    `;
    await pool.query(systemQuery, [offer.chat_room_id, offer.offerer_id, systemMsg]);

    res.status(200).json({ success: true, data: offer });
  } catch (error: any) {
    console.error('Error responding to swap offer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getReceivedSwapOffers = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const query = `
      SELECT s.*, l.title as target_title, o.title as offered_title 
      FROM swap_offers s
      JOIN listings l ON s.listing_id = l.id
      JOIN listings o ON s.offered_listing_id = o.id
      WHERE l.user_id = $1 ORDER BY s.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getSentSwapOffers = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const query = `
      SELECT s.*, l.title as target_title, o.title as offered_title 
      FROM swap_offers s
      JOIN listings l ON s.listing_id = l.id
      JOIN listings o ON s.offered_listing_id = o.id
      WHERE s.offerer_id = $1 ORDER BY s.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
