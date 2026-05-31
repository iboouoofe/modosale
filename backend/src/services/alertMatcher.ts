import pool from '../config/db';

export const matchListingWithAlerts = async (listing: any): Promise<void> => {
  try {
    console.log(`[AlertMatcher] Analyzing new listing: "${listing.title}" for matching wish alerts...`);
    
    // 1. Fetch all active wish alerts from DB
    const alertsQuery = `SELECT * FROM wish_alerts WHERE is_active = TRUE`;
    const alertsRes = await pool.query(alertsQuery, []);
    const activeAlerts = alertsRes.rows || [];

    for (const alert of activeAlerts) {
      // Avoid matching owner's own alerts
      if (alert.user_id === listing.user_id) continue;

      let isMatch = false;

      // Kriter 1: Keywords Match (at least one keyword matches title/description)
      const keywords = Array.isArray(alert.keywords) ? alert.keywords : [alert.keywords];
      const titleLower = listing.title.toLowerCase();
      const descLower = (listing.description || '').toLowerCase();

      const keywordMatched = keywords.some((kw: string) => {
        const kwLower = kw.toLowerCase().trim();
        return titleLower.includes(kwLower) || descLower.includes(kwLower);
      });

      if (keywordMatched) {
        isMatch = true;

        // Kriter 2: Category Match (if alert has category set)
        if (alert.category && alert.category !== 'Tümü' && alert.category !== listing.category) {
          isMatch = false;
        }

        // Kriter 3: Price Match (if alert has min/max set)
        if (alert.min_price && listing.price < alert.min_price) {
          isMatch = false;
        }
        if (alert.max_price && listing.price > alert.max_price) {
          isMatch = false;
        }
      }

      // 🔔 WE HAVE A MATCH! Create a futuristic push notification!
      if (isMatch) {
        console.log(`[AlertMatcher] MATCH FOUND! Alert ID ${alert.id} matches listing ${listing.id}`);

        // Update match stats on wish_alert
        const updateAlertQuery = `
          UPDATE wish_alerts
          SET match_count = match_count + 1, last_matched_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `;
        await pool.query(updateAlertQuery, [alert.id]);

        // Insert notifications for alert owner
        const notificationQuery = `
          INSERT INTO notifications (user_id, type, title, body, data)
          VALUES ($1, $2, $3, $4, $5)
        `;
        
        const priceFormatted = listing.price.toLocaleString('tr-TR');
        await pool.query(notificationQuery, [
          alert.user_id,
          'wish_match',
          '🔔 Aradığınız İlan Geldi!',
          `Takip ettiğiniz "${keywords[0]}" aramasına uygun yeni ilan: "${listing.title}" ${priceFormatted} TL fiyatıyla yayında!`,
          JSON.stringify({ listing_id: listing.id })
        ]);
      }
    }
  } catch (error) {
    console.error('[AlertMatcher] Matcher processing failed:', error);
  }
};
