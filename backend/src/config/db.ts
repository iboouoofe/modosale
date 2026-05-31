import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:modsalepassword@localhost:5432/modsale',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// ==========================================
// 🧠 RESILIENT IN-MEMORY FALLBACK DATABASE
// ==========================================


const mockNotifications: any[] = [];
const mockWishAlerts: any[] = [];
const mockSwaps: any[] = [];
const mockListingViews: any[] = [];

const mockNeighborhoodPosts: any[] = [
  {
    id: 1,
    user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    user_name: 'Can Yılmaz',
    user_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    neighborhood: 'Kadıköy',
    content: 'Komşular selam! Moda caddesinde bulduğum anahtarı muhtarlığa teslim ettim, bilginiz olsun. 🔑',
    likes: 12,
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 2,
    user_id: 'visitor-2',
    user_name: 'Zeynep Yılmaz',
    user_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
    neighborhood: 'Kadıköy',
    content: 'Moda İlkokulu önünde sahipsiz kedi maması dağıtıyoruz, ihtiyacı olan komşular gelebilir. 🐈',
    likes: 24,
    created_at: new Date(Date.now() - 7200000).toISOString()
  }
];

const mockStores = [
  {
    id: 1,
    user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Can Teknoloji & Aksesuar ⚡',
    description: 'Geleceğin teknolojileri, akıllı kulaklık ve ses sistemleri. Hızlı ve güvenilir elden teslimat.',
    banner_url: 'https://images.unsplash.com/photo-1468436139062-f60a71c5c892?auto=format&fit=crop&w=800&q=80',
    logo_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    created_at: new Date().toISOString()
  }
];
const mockStoreFollowers: any[] = [];

// Seed views dynamically for rich storefront analytics metrics (Faz 4)
const seedViews = () => {
  const hours = [9, 10, 11, 12, 14, 15, 17, 18, 19, 20, 21, 22];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const day = new Date();
    day.setDate(now.getDate() - i);
    const count = 10 + Math.floor(Math.random() * 20);
    for (let c = 0; c < count; c++) {
      const viewDate = new Date(day);
      const randomHour = hours[Math.floor(Math.random() * hours.length)];
      viewDate.setHours(randomHour, Math.floor(Math.random() * 60));
      mockListingViews.push({
        id: mockListingViews.length + 1,
        listing_id: 'l1',
        viewer_id: 'visitor-' + Math.random(),
        created_at: viewDate.toISOString()
      });
    }
  }
};
seedViews();

const mockUsers = [
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    phone_number: '+905555555511',
    email: 'can.yilmaz@example.com',
    display_name: 'Can Yılmaz',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    is_phone_verified: true,
  }
];

const mockListings = [
  {
    id: 'l1',
    user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    title: 'Sony WH-1000XM4 Kulaklık',
    description: 'Aktif gürültü engelleyici kulaklık. Kutu ve tüm aksesuarları eksiksizdir. Kadıköy içi elden teslim.',
    price: 6450,
    currency: 'TL',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80'],
    category: 'Electronics',
    condition: 'good',
    city_district: 'Moda, Kadıköy',
    show_phone: true,
    is_active: true,
    distance_meters: 350,
    latitude: 40.985,
    longitude: 29.025,
    created_at: new Date().toISOString(),
    bumped_at: new Date().toISOString(),
  },
  {
    id: 'l2',
    user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    title: 'FujiFilm X-T30 II + 18-55mm Kit',
    description: 'Sadece 3000 shutterda. Temiz kozmetik, çiziksiz lens grubu.',
    price: 34500,
    currency: 'TL',
    images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=500&q=80'],
    category: 'Electronics',
    condition: 'new',
    city_district: 'Suadiye, Kadıköy',
    show_phone: false,
    is_active: true,
    distance_meters: 980,
    latitude: 40.965,
    longitude: 29.085,
    created_at: new Date().toISOString(),
    bumped_at: new Date().toISOString(),
  }
];

const mockRooms: any[] = [];
const mockMessages: any[] = [];
const mockFavorites: Array<{ user_id: string; listing_id: string }> = [];
const mockReviews: Array<{ id: string; reviewer_id: string; reviewee_id: string; listing_id: string | null; rating: number; comment: string | null; created_at: string }> = [];

// Helper to simulate SQL queries in-memory when DB is closed
const executeMockQuery = (text: string, params?: any[]): { rows: any[] } => {
  const queryStr = text.replace(/\s+/g, ' ').trim();
  const args = params || [];

  // 1. INSERT INTO users (Upsert)
  if (queryStr.includes('INSERT INTO users')) {
    const phone = args[0];
    const email = args[1];
    const name = args[2];
    const avatar = args[3];

    let user = mockUsers.find((u) => u.phone_number === phone);
    if (!user) {
      user = {
        id: `user-${Date.now()}`,
        phone_number: phone,
        email: email || null,
        display_name: name,
        avatar_url: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        is_phone_verified: true,
      };
      mockUsers.push(user);
    } else {
      user.display_name = name;
      if (email) user.email = email;
      if (avatar) user.avatar_url = avatar;
    }
    return { rows: [user] };
  }

  // 2. SELECT * FROM users
  if (queryStr.includes('SELECT * FROM users WHERE id =')) {
    const id = args[0];
    let user = mockUsers.find((u) => u.id === id);
    if (!user) {
      user = {
        id,
        phone_number: '+90532556663',
        email: 'yenikullanici@modosale.com',
        display_name: 'ModoSale Üyesi',
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        is_phone_verified: true,
      };
      mockUsers.push(user);
    }
    return { rows: [user] };
  }

  // 3. GET /profile Listings retrieve
  if (queryStr.includes('SELECT *, ST_X(location::geometry)') && queryStr.includes('user_id =')) {
    const userId = args[0];
    const filtered = mockListings.filter((l) => l.user_id === userId);
    return { rows: filtered };
  }

  // 4. FAVORITE LISTING INSERT
  if (queryStr.includes('INSERT INTO user_favorites')) {
    const userId = args[0];
    const listingId = args[1];
    const exists = mockFavorites.some((f) => f.user_id === userId && f.listing_id === listingId);
    if (!exists) {
      mockFavorites.push({ user_id: userId, listing_id: listingId });
    }
    return { rows: [{ user_id: userId, listing_id: listingId }] };
  }

  // 5. FAVORITE LISTING DELETE
  if (queryStr.includes('DELETE FROM user_favorites')) {
    const userId = args[0];
    const listingId = args[1];
    const idx = mockFavorites.findIndex((f) => f.user_id === userId && f.listing_id === listingId);
    let deleted = null;
    if (idx !== -1) {
      deleted = mockFavorites[idx];
      mockFavorites.splice(idx, 1);
    }
    return { rows: deleted ? [deleted] : [] };
  }

  // 6. GET feed listings (with advanced multi-attribute filtering)
  if (
    (queryStr.includes('SELECT') && queryStr.includes('listings.id') || queryStr.includes('SELECT id, user_id, title')) &&
    (queryStr.includes('listings WHERE') || queryStr.includes('FROM listings WHERE') || queryStr.includes('INNER JOIN user_favorites')) &&
    queryStr.includes('is_active')
  ) {
    let filtered = mockListings.filter((l) => l.is_active);

    // Inner Join user_favorites (Favorites only mode)
    if (queryStr.includes('user_favorites') || queryStr.includes('INNER JOIN user_favorites')) {
      const ufMatch = queryStr.match(/uf\.user_id = \$(\d+)/);
      if (ufMatch) {
        const idx = parseInt(ufMatch[1]) - 1;
        const userId = args[idx];
        const favIds = mockFavorites.filter((f) => f.user_id === userId).map((f) => f.listing_id);
        filtered = filtered.filter((l) => favIds.includes(l.id));
      }
    }

    // Category check
    const catParamIndex = queryStr.indexOf('category = $');
    if (catParamIndex !== -1) {
      const match = queryStr.match(/category = \$(\d+)/);
      if (match) {
        const idx = parseInt(match[1]) - 1;
        const cat = args[idx];
        filtered = filtered.filter((l) => l.category === cat);
      }
    }

    // Search check
    const searchParamIndex = queryStr.indexOf('ILIKE $');
    if (searchParamIndex !== -1) {
      const match = queryStr.match(/ILIKE \$(\d+)/);
      if (match) {
        const idx = parseInt(match[1]) - 1;
        const searchVal = args[idx] ? args[idx].replace(/%/g, '').toLowerCase() : '';
        if (searchVal) {
          filtered = filtered.filter((l) => 
            l.title.toLowerCase().includes(searchVal) || 
            l.description.toLowerCase().includes(searchVal)
          );
        }
      }
    }

    // Min Price check
    const minPriceMatch = queryStr.match(/price >= \$(\d+)/);
    if (minPriceMatch) {
      const idx = parseInt(minPriceMatch[1]) - 1;
      const minP = parseFloat(args[idx]);
      if (!isNaN(minP)) {
        filtered = filtered.filter((l) => l.price >= minP);
      }
    }

    // Max Price check
    const maxPriceMatch = queryStr.match(/price <= \$(\d+)/);
    if (maxPriceMatch) {
      const idx = parseInt(maxPriceMatch[1]) - 1;
      const maxP = parseFloat(args[idx]);
      if (!isNaN(maxP)) {
        filtered = filtered.filter((l) => l.price <= maxP);
      }
    }

    // Condition check
    const condMatch = queryStr.match(/condition = \$(\d+)/);
    if (condMatch) {
      const idx = parseInt(condMatch[1]) - 1;
      const cond = args[idx];
      if (cond) {
        filtered = filtered.filter((l) => l.condition === cond);
      }
    }

    // Map Bbox boundary checks (ST_Contains or MakeEnvelope simulation)
    if (queryStr.includes('ST_Contains') || queryStr.includes('ST_MakeEnvelope')) {
      const envMatch = queryStr.match(/ST_MakeEnvelope\(\$(\d+),\s*\$(\d+),\s*\$(\d+),\s*\$(\d+)/);
      if (envMatch) {
        const minLng = parseFloat(args[parseInt(envMatch[1]) - 1]);
        const minLat = parseFloat(args[parseInt(envMatch[2]) - 1]);
        const maxLng = parseFloat(args[parseInt(envMatch[3]) - 1]);
        const maxLat = parseFloat(args[parseInt(envMatch[4]) - 1]);

        if (!isNaN(minLng) && !isNaN(minLat) && !isNaN(maxLng) && !isNaN(maxLat)) {
          filtered = filtered.filter((l) => {
            const lat = l.latitude !== undefined ? l.latitude : 40.985;
            const lng = l.longitude !== undefined ? l.longitude : 29.025;
            return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
          });
        }
      }
    }

    return { rows: filtered };
  }

  // 7. GET single listing details
  if ((queryStr.includes('SELECT') && queryStr.includes('listings WHERE id =')) || (queryStr.includes('SELECT') && queryStr.includes('FROM listings WHERE id ='))) {
    const id = args[0];
    const listing = mockListings.find((l) => l.id === id);
    return { rows: listing ? [listing] : [] };
  }

  // 8. CREATE listing
  if (queryStr.includes('INSERT INTO listings')) {
    const userId = args[0];
    const title = args[1];
    const desc = args[2];
    const price = args[3];
    const currency = args[4];
    const images = args[5];
    const category = args[6];
    const lng = args[7];
    const lat = args[8];
    const city = args[9];
    const show_phone = args[10];
    // Check if optional condition column is provided
    const condMatch = queryStr.match(/INSERT INTO listings.*?condition.*?\)/i);
    let condition = 'good';
    if (condMatch) {
      // Find the index of condition parameter in args
      // We will search for it dynamically or assign default
      condition = args[11] || 'good';
    }

    const newListing = {
      id: `listing-${Date.now()}`,
      user_id: userId,
      title,
      description: desc,
      price,
      currency,
      images,
      category,
      condition,
      city_district: city,
      show_phone,
      is_active: true,
      longitude: lng,
      latitude: lat,
      distance_meters: 100,
      created_at: new Date().toISOString(),
      bumped_at: new Date().toISOString(),
    };
    mockListings.push(newListing);
    return { rows: [newListing] };
  }

  // 9. BUMP listing
  if (queryStr.includes('UPDATE listings SET bumped_at = CURRENT_TIMESTAMP')) {
    const id = args[0];
    const listing = mockListings.find((l) => l.id === id);
    if (listing) {
      listing.bumped_at = new Date().toISOString();
    }
    return { rows: listing ? [listing] : [] };
  }

  // 10. DELETE listing
  if (queryStr.includes('DELETE FROM listings WHERE id =')) {
    const id = args[0];
    const idx = mockListings.findIndex((l) => l.id === id);
    let deleted = null;
    if (idx !== -1) {
      deleted = mockListings[idx];
      mockListings.splice(idx, 1);
    }
    return { rows: deleted ? [deleted] : [] };
  }

  // 10b. UPDATE listing (edit/revise)
  if (queryStr.includes('UPDATE listings SET') && queryStr.includes('WHERE id =') && !queryStr.includes('bumped_at = CURRENT_TIMESTAMP') && !queryStr.includes('offer_status')) {
    const id = args[args.length - 1];
    const idx = mockListings.findIndex((l: any) => l.id === id);
    if (idx !== -1) {
      const titleM = queryStr.match(/title = \$(\d+)/);
      const descM = queryStr.match(/description = \$(\d+)/);
      const priceM = queryStr.match(/price = \$(\d+)/);
      const catM = queryStr.match(/category = \$(\d+)/);
      const condM = queryStr.match(/condition = \$(\d+)/);
      const cityM = queryStr.match(/city_district = \$(\d+)/);
      const phoneM = queryStr.match(/show_phone = \$(\d+)/);
      const imagesM = queryStr.match(/images = \$(\d+)/);
      const activeM = queryStr.match(/is_active = \$(\d+)/);

      const oldPrice = mockListings[idx].price;

      if (titleM) mockListings[idx].title = args[parseInt(titleM[1]) - 1];
      if (descM) mockListings[idx].description = args[parseInt(descM[1]) - 1];
      if (priceM) {
        const newPrice = parseFloat(args[parseInt(priceM[1]) - 1]);
        if (newPrice < oldPrice) {
          (mockListings[idx] as any).original_price = oldPrice;
          
          const discountPct = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
          mockNotifications.push({
            id: `notif-${Date.now()}`,
            user_id: mockListings[idx].user_id,
            type: 'price_drop',
            title: `Fiyatı Düştü! 📉`,
            body: `Favorilediğiniz "${mockListings[idx].title}" ürününde %${discountPct} indirim yapıldı! Eski: ${oldPrice} TL, Yeni: ${newPrice} TL.`,
            is_read: false,
            created_at: new Date().toISOString(),
          });
        }
        mockListings[idx].price = newPrice;
      }
      if (catM) mockListings[idx].category = args[parseInt(catM[1]) - 1];
      if (condM) mockListings[idx].condition = args[parseInt(condM[1]) - 1];
      if (cityM) mockListings[idx].city_district = args[parseInt(cityM[1]) - 1];
      if (phoneM) mockListings[idx].show_phone = args[parseInt(phoneM[1]) - 1];
      if (imagesM) mockListings[idx].images = args[parseInt(imagesM[1]) - 1];
      if (activeM) mockListings[idx].is_active = args[parseInt(activeM[1]) - 1];
    }
    return { rows: idx !== -1 ? [mockListings[idx]] : [] };
  }


  if (queryStr.includes('SELECT id FROM chat_rooms WHERE listing_id =') || queryStr.includes('SELECT * FROM chat_rooms WHERE listing_id =') || queryStr.includes('SELECT id FROM chat_rooms WHERE')) {
    const listingId = args[0];
    const buyerId = args[1];
    const sellerId = args[2];
    const room = mockRooms.find(
      (r) => r.listing_id === listingId && r.buyer_id === buyerId && r.seller_id === sellerId
    );
    return { rows: room ? [room] : [] };
  }

  if (queryStr.includes('FROM chat_rooms cr') || queryStr.includes('FROM chat_rooms')) {
    const userId = args[0];
    const rooms = mockRooms.filter(r => r.buyer_id === userId || r.seller_id === userId);
    const enrichedRooms = rooms.map(r => {
      const listing = mockListings.find(l => l.id === r.listing_id) || mockListings[0];
      const buyer = mockUsers.find(u => u.id === r.buyer_id) || mockUsers[0];
      const seller = mockUsers.find(u => u.id === r.seller_id) || mockUsers[0];
      const lastMsg = mockMessages.filter(m => m.room_id === r.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      return {
        room_id: r.id,
        created_at: r.created_at,
        listing_id: r.listing_id,
        listing_title: listing?.title || 'Ürün',
        listing_price: listing?.price || 0,
        listing_thumbnail: listing?.images ? listing.images[0] : null,
        buyer_name: buyer?.display_name || 'Alıcı',
        buyer_avatar: buyer?.avatar_url || null,
        seller_name: seller?.display_name || 'Satıcı',
        seller_avatar: seller?.avatar_url || null,
        last_message: lastMsg?.message_text || 'Sohbet başladı.',
        last_message_time: lastMsg?.created_at || r.created_at
      };
    });
    return { rows: enrichedRooms };
  }

  if (queryStr.includes('INSERT INTO chat_rooms')) {
    const listingId = args[0];
    const buyerId = args[1];
    const sellerId = args[2];

    let room = mockRooms.find(
      (r) => r.listing_id === listingId && r.buyer_id === buyerId && r.seller_id === sellerId
    );
    if (!room) {
      room = {
        id: `room-${Date.now()}`,
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: sellerId,
        created_at: new Date().toISOString(),
      };
      mockRooms.push(room);
    }
    return { rows: [room] };
  }

  // 26. INSERT INTO swap_offers
  if (queryStr.includes('INSERT INTO swap_offers')) {
    const swap = {
      id: `swap-${Date.now()}`,
      listing_id: args[0],
      offerer_id: args[1],
      offered_listing_id: args[2],
      cash_difference: parseInt(args[3]) || 0,
      cash_direction: args[4] || 'none',
      note: args[5] || '',
      status: 'pending',
      chat_room_id: args[6],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockSwaps.push(swap);
    return { rows: [swap] };
  }

  // 27. UPDATE swap_offers
  if (queryStr.includes('UPDATE swap_offers SET status =')) {
    const status = args[0];
    const id = args[1];
    const idx = mockSwaps.findIndex(s => s.id === id);
    if (idx !== -1) {
      mockSwaps[idx].status = status;
      mockSwaps[idx].updated_at = new Date().toISOString();
    }
    return { rows: idx !== -1 ? [mockSwaps[idx]] : [] };
  }

  // 28. SELECT FROM swap_offers
  if (queryStr.includes('FROM swap_offers')) {
    const userId = args[0];
    let filtered = [];
    if (queryStr.includes('l.user_id = $1')) {
      filtered = mockSwaps.filter(s => {
        const listing = mockListings.find(l => l.id === s.listing_id);
        return listing && listing.user_id === userId;
      });
    } else {
      filtered = mockSwaps.filter(s => s.offerer_id === userId);
    }
    const enriched = filtered.map(s => {
      const listing = mockListings.find(l => l.id === s.listing_id);
      const offered = mockListings.find(l => l.id === s.offered_listing_id);
      return {
        ...s,
        target_title: listing?.title || 'Ürün',
        offered_title: offered?.title || 'Teklif Edilen Ürün'
      };
    });
    return { rows: enriched };
  }

  // 12. CREATE message
  if (queryStr.includes('INSERT INTO messages')) {
    const roomId = args[0];
    const senderId = args[1];
    const text = args[2];
    const type = args[3] || 'text';
    const imageUrl = args[4] || null;
    const offerPrice = args[5] !== undefined && args[5] !== null ? parseFloat(args[5]) : null;
    const offerStatus = args[6] || 'pending';
    const isDelivered = args[7] === true || args[7] === 'true';

    const newMsg = {
      id: `msg-${Date.now()}`,
      room_id: roomId,
      sender_id: senderId,
      message_text: text,
      message_type: type,
      image_url: imageUrl,
      offer_price: offerPrice,
      offer_status: offerStatus,
      is_delivered: isDelivered,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    mockMessages.push(newMsg);
    return { rows: [newMsg] };
  }

  // 13. SELECT FROM messages (getRoomMessages)
  if (queryStr.includes('SELECT id, room_id, sender_id') && queryStr.includes('FROM messages WHERE room_id =')) {
    const roomId = args[0];
    const filtered = mockMessages.filter((m) => m.room_id === roomId);
    return { rows: filtered };
  }

  // 14. UPDATE messages (update offer status)
  if (queryStr.includes('UPDATE messages SET offer_status =')) {
    const offerStatus = args[0];
    const id = args[1];
    const msg = mockMessages.find((m) => m.id === id);
    if (msg) {
      msg.offer_status = offerStatus;
    }
    return { rows: msg ? [msg] : [] };
  }

  // 15. UPDATE messages (set is_read / is_delivered)
  if (queryStr.includes('UPDATE messages SET is_read =')) {
    const isRead = args[0] === true || args[0] === 'true';
    const roomId = args[1];
    mockMessages.forEach((m) => {
      if (m.room_id === roomId && m.sender_id !== args[2]) {
        m.is_read = isRead;
      }
    });
    return { rows: [] };
  }

  // 16. INSERT INTO reviews
  if (queryStr.includes('INSERT INTO reviews')) {
    const reviewer_id = args[0];
    const reviewee_id = args[1];
    const listing_id = args[2] || null;
    const rating = args[3];
    const comment = args[4] || null;

    // Upsert: remove existing then add new
    const existingIdx = mockReviews.findIndex(
      (r) => r.reviewer_id === reviewer_id && r.reviewee_id === reviewee_id && r.listing_id === listing_id
    );
    if (existingIdx !== -1) mockReviews.splice(existingIdx, 1);

    const newReview = {
      id: `review-${Date.now()}`,
      reviewer_id,
      reviewee_id,
      listing_id,
      rating,
      comment,
      created_at: new Date().toISOString(),
    };
    mockReviews.push(newReview);
    return { rows: [newReview] };
  }

  // 17. SELECT FROM reviews WHERE reviewee_id
  if (queryStr.includes('FROM reviews') && queryStr.includes('reviewee_id = $')) {
    const revieweeId = args[0];
    const filtered = mockReviews
      .filter((r) => r.reviewee_id === revieweeId)
      .map((r) => ({
        ...r,
        reviewer_name: mockUsers.find((u) => u.id === r.reviewer_id)?.display_name || 'Anonim',
        reviewer_avatar: mockUsers.find((u) => u.id === r.reviewer_id)?.avatar_url || null,
      }));
    return { rows: filtered };
  }

  // 18. SELECT trending listings (bumped_at DESC)
  if (queryStr.includes('FROM listings') && queryStr.includes('ORDER BY') && queryStr.includes('bumped_at DESC') && !queryStr.includes('WHERE')) {
    const sorted = [...mockListings].sort((a, b) =>
      new Date(b.bumped_at).getTime() - new Date(a.bumped_at).getTime()
    ).slice(0, 10);
    return { rows: sorted };
  }

  // 19. INSERT INTO notifications
  if (queryStr.includes('INSERT INTO notifications')) {
    const notif = {
      id: `notif-${Date.now()}`,
      user_id: args[0],
      type: args[1],
      title: args[2],
      body: args[3],
      data: args[4] || null,
      is_read: false,
      created_at: new Date().toISOString()
    };
    mockNotifications.push(notif);
    return { rows: [notif] };
  }

  // 20. SELECT FROM notifications
  if (queryStr.includes('FROM notifications') && queryStr.includes('user_id = $')) {
    const userId = args[0];
    const filtered = mockNotifications.filter((n) => n.user_id === userId);
    return { rows: filtered };
  }

  // 22. INSERT INTO wish_alerts
  if (queryStr.includes('INSERT INTO wish_alerts')) {
    const alert = {
      id: `alert-${Date.now()}`,
      user_id: args[0],
      keywords: args[1],
      category: args[2],
      min_price: args[3],
      max_price: args[4],
      radius_km: args[5],
      notification_frequency: args[6],
      is_active: true,
      last_matched_at: null,
      match_count: 0,
      created_at: new Date().toISOString()
    };
    mockWishAlerts.push(alert);
    return { rows: [alert] };
  }

  // 23. SELECT FROM wish_alerts
  if (queryStr.includes('FROM wish_alerts')) {
    if (queryStr.includes('user_id = $')) {
      const userId = args[0];
      const filtered = mockWishAlerts.filter((a) => a.user_id === userId);
      return { rows: filtered };
    }
    if (queryStr.includes('is_active = TRUE')) {
      const active = mockWishAlerts.filter((a) => a.is_active === true);
      return { rows: active };
    }
    return { rows: mockWishAlerts };
  }

  // 24. UPDATE wish_alerts
  if (queryStr.includes('UPDATE wish_alerts')) {
    if (queryStr.includes('is_active = $1')) {
      const isActive = args[0];
      const id = args[1];
      const idx = mockWishAlerts.findIndex((a) => a.id === id);
      if (idx !== -1) {
        mockWishAlerts[idx].is_active = isActive;
      }
      return { rows: idx !== -1 ? [mockWishAlerts[idx]] : [] };
    }
    if (queryStr.includes('match_count = match_count + 1')) {
      const id = args[0];
      const idx = mockWishAlerts.findIndex((a) => a.id === id);
      if (idx !== -1) {
        mockWishAlerts[idx].match_count += 1;
        mockWishAlerts[idx].last_matched_at = new Date().toISOString();
      }
      return { rows: idx !== -1 ? [mockWishAlerts[idx]] : [] };
    }
  }

  // 25. DELETE FROM wish_alerts
  if (queryStr.includes('DELETE FROM wish_alerts')) {
    const id = args[0];
    const idx = mockWishAlerts.findIndex((a) => a.id === id);
    let deleted = null;
    if (idx !== -1) {
      deleted = mockWishAlerts[idx];
      mockWishAlerts.splice(idx, 1);
    }
    return { rows: deleted ? [deleted] : [] };
  }

  // 29. INSERT INTO listing_views
  if (queryStr.includes('INSERT INTO listing_views')) {
    const view = {
      id: mockListingViews.length + 1,
      listing_id: args[0],
      viewer_id: args[1],
      created_at: new Date().toISOString()
    };
    mockListingViews.push(view);
    return { rows: [view] };
  }

  // 30. SELECT COUNT(v.id) as total_views FROM listing_views v
  if (queryStr.includes('COUNT(v.id) as total_views')) {
    const userId = args[0];
    const userListingsIds = mockListings.filter(l => l.user_id === userId).map(l => l.id);
    const count = mockListingViews.filter(v => userListingsIds.includes(v.listing_id)).length;
    return { rows: [{ total_views: count }] };
  }

  // 31. SELECT DATE(v.created_at) as day_date, COUNT(v.id) as view_count
  if (queryStr.includes('DATE(v.created_at) as day_date')) {
    const userId = args[0];
    const userListingsIds = mockListings.filter(l => l.user_id === userId).map(l => l.id);
    const views = mockListingViews.filter(v => userListingsIds.includes(v.listing_id));
    const groups: { [key: string]: number } = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      groups[key] = 0;
    }
    views.forEach(v => {
      const key = v.created_at.split('T')[0];
      if (groups[key] !== undefined) {
        groups[key]++;
      }
    });
    const rows = Object.keys(groups).map(k => ({
      day_date: k,
      view_count: groups[k]
    }));
    return { rows };
  }

  // 32. SELECT EXTRACT(HOUR FROM v.created_at) as hour, COUNT(v.id) as view_count
  if (queryStr.includes('EXTRACT(HOUR FROM v.created_at) as hour')) {
    const userId = args[0];
    const userListingsIds = mockListings.filter(l => l.user_id === userId).map(l => l.id);
    const views = mockListingViews.filter(v => userListingsIds.includes(v.listing_id));
    const groups: { [key: number]: number } = {};
    for (let i = 0; i < 24; i++) {
      groups[i] = 0;
    }
    views.forEach(v => {
      const hr = new Date(v.created_at).getHours();
      groups[hr]++;
    });
    const rows = Object.keys(groups).map(k => ({
      hour: parseInt(k),
      view_count: groups[parseInt(k)]
    }));
    return { rows };
  }

  // 33. INSERT INTO stores (or upsert)
  if (queryStr.includes('INSERT INTO stores')) {
    const userId = args[0];
    const name = args[1];
    const desc = args[2] || '';
    const banner = args[3] || '';
    const logo = args[4] || '';

    let store = mockStores.find(s => s.user_id === userId);
    if (!store) {
      store = {
        id: mockStores.length + 1,
        user_id: userId,
        name,
        description: desc,
        banner_url: banner,
        logo_url: logo,
        created_at: new Date().toISOString()
      };
      mockStores.push(store);
    } else {
      store.name = name;
      store.description = desc;
      store.banner_url = banner;
      store.logo_url = logo;
    }
    return { rows: [store] };
  }

  // 34. SELECT FROM stores
  if (queryStr.includes('SELECT * FROM stores WHERE user_id =')) {
    const userId = args[0];
    const store = mockStores.find(s => s.user_id === userId);
    return { rows: store ? [store] : [] };
  }

  // 35. SELECT COUNT store_followers
  if (queryStr.includes('FROM store_followers WHERE store_id =') && queryStr.includes('COUNT(*)')) {
    const storeId = parseInt(args[0]);
    const count = mockStoreFollowers.filter(sf => sf.store_id === storeId).length;
    return { rows: [{ count }] };
  }

  // 36. SELECT follow check store_followers
  if (queryStr.includes('FROM store_followers WHERE store_id =') && !queryStr.includes('COUNT(*)')) {
    const storeId = parseInt(args[0]);
    const followerId = args[1];
    const follows = mockStoreFollowers.some(sf => sf.store_id === storeId && sf.follower_id === followerId);
    return { rows: follows ? [{ follower_id: followerId }] : [] };
  }

  // 37. INSERT INTO store_followers
  if (queryStr.includes('INSERT INTO store_followers')) {
    const storeId = parseInt(args[0]);
    const followerId = args[1];
    const exists = mockStoreFollowers.some(sf => sf.store_id === storeId && sf.follower_id === followerId);
    if (!exists) {
      mockStoreFollowers.push({ store_id: storeId, follower_id: followerId });
    }
    return { rows: [{ store_id: storeId, follower_id: followerId }] };
  }

  // 38. DELETE FROM store_followers
  if (queryStr.includes('DELETE FROM store_followers')) {
    const storeId = parseInt(args[0]);
    const followerId = args[1];
    const idx = mockStoreFollowers.findIndex(sf => sf.store_id === storeId && sf.follower_id === followerId);
    if (idx !== -1) {
      mockStoreFollowers.splice(idx, 1);
    }
    return { rows: [] };
  }

  // 39. SELECT FROM neighborhood_posts
  if (queryStr.includes('FROM neighborhood_posts')) {
    if (queryStr.includes('neighborhood =')) {
      const neighborhood = args[0] || 'Kadıköy';
      const filtered = mockNeighborhoodPosts.filter(p => p.neighborhood.toLowerCase().includes(neighborhood.toLowerCase()));
      return { rows: filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) };
    }
    return { rows: mockNeighborhoodPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) };
  }

  // 40. INSERT INTO neighborhood_posts
  if (queryStr.includes('INSERT INTO neighborhood_posts')) {
    const post = {
      id: mockNeighborhoodPosts.length + 1,
      user_id: args[0],
      user_name: args[1],
      user_avatar: args[2] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      neighborhood: args[3],
      content: args[4],
      likes: 0,
      created_at: new Date().toISOString()
    };
    mockNeighborhoodPosts.push(post);
    return { rows: [post] };
  }

  // 41. UPDATE neighborhood_posts SET likes = likes + 1
  if (queryStr.includes('UPDATE neighborhood_posts SET likes = likes + 1')) {
    const id = parseInt(args[0]);
    const idx = mockNeighborhoodPosts.findIndex(p => p.id === id);
    if (idx !== -1) {
      mockNeighborhoodPosts[idx].likes += 1;
      return { rows: [mockNeighborhoodPosts[idx]] };
    }
    return { rows: [] };
  }

  // Default empty return fallback
  return { rows: [] };
};

// Override standard pool.query to catch refused Postgres handles
const originalQuery = pool.query.bind(pool);
pool.query = async function (text: any, params: any) {
  try {
    // Attempt standard PostgreSQL query
    return await originalQuery(text, params);
  } catch (err: any) {
    // If the database container is offline, trigger the resilient In-Memory Fallback Engine
    if (err.code === 'ECONNREFUSED' || err.message.includes('connect')) {
      console.warn('⚠️ [DATABASE FALLBACK] PostgreSQL is offline. Running in resilient In-Memory engine!');
      return executeMockQuery(text, params) as any;
    }
    throw err;
  }
} as any;

// ==========================================
// 🚀 AUTOMATIC POSTGRESQL SCHEMA INITIALIZER
// ==========================================
const initPostgresSchema = async () => {
  try {
    // 1. Add condition column to listings table if missing
    await originalQuery(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS condition VARCHAR(30) DEFAULT 'good';`, []);
    // 2. Create user_favorites schema table
    await originalQuery(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, listing_id)
      );
    `, []);

    // 3. Add message type, image and offer columns to messages table if missing
    await originalQuery(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text';`, []);
    await originalQuery(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;`, []);
    await originalQuery(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS offer_price DECIMAL(12,2);`, []);
    await originalQuery(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS offer_status VARCHAR(20) DEFAULT 'pending';`, []);
    await originalQuery(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN DEFAULT FALSE;`, []);

    // 4. Create listing_views schema table for analytics (Faz 4)
    await originalQuery(`
      CREATE TABLE IF NOT EXISTS listing_views (
        id SERIAL PRIMARY KEY,
        listing_id VARCHAR(50) NOT NULL,
        viewer_id VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, []);

    // 5. Create stores & followers schema tables (Faz 5)
    await originalQuery(`
      CREATE TABLE IF NOT EXISTS stores (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        banner_url TEXT,
        logo_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, []);

    await originalQuery(`
      CREATE TABLE IF NOT EXISTS store_followers (
        store_id INT REFERENCES stores(id) ON DELETE CASCADE,
        follower_id VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (store_id, follower_id)
      );
    `, []);

    await originalQuery(`
      CREATE TABLE IF NOT EXISTS neighborhood_posts (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        user_name VARCHAR(100) NOT NULL,
        user_avatar TEXT,
        neighborhood VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        likes INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, []);

    console.log('✅ [DATABASE INITIALIZATION] PostgreSQL listings, user_favorites, messages, listing_views, stores, store_followers & neighborhood_posts schema verified.');
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.message.includes('connect')) {
      console.log('ℹ️ [DATABASE INITIALIZATION] Running offline mock database simulator. Schema migrations bypassed.');
    } else {
      console.error('❌ [DATABASE INITIALIZATION] Critical database schema setup failure:', err);
    }
  }
};

// Fire database init asynchronously
initPostgresSchema();

export default pool;

