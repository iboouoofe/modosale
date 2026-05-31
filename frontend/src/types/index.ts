// ─── API Base Types ────────────────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: { field: string; message: string }[];
}

// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  phone_number: string;
  email?: string | null;
  display_name: string;
  avatar_url?: string | null;
  is_phone_verified: boolean;
  created_at?: string;
}

// ─── Listing ──────────────────────────────────────────────────────────────────
export interface Listing {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  images: string[];
  category: string;
  condition?: 'new' | 'good' | 'fair';
  city_district: string;
  show_phone: boolean;
  is_active: boolean;
  distance_meters?: number;
  latitude?: number;
  longitude?: number;
  bumped_at?: string;
  created_at?: string;
  seller_name?: string;
  seller_avatar?: string;
}

// ─── Message ──────────────────────────────────────────────────────────────────
export type MessageType = 'text' | 'image' | 'offer';
export type OfferStatus = 'pending' | 'accepted' | 'rejected';

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  message_text?: string;
  message_type: MessageType;
  image_url?: string | null;
  offer_price?: number | null;
  offer_status?: OfferStatus;
  is_delivered: boolean;
  is_read: boolean;
  created_at: string;
}

// ─── Chat Room ────────────────────────────────────────────────────────────────
export interface ChatRoom {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  listing_title?: string;
  listing_price?: number;
  listing_thumbnail?: string;
  buyer_name?: string;
  seller_name?: string;
  last_message?: string;
  last_message_time?: string;
}

// ─── Review ───────────────────────────────────────────────────────────────────
export interface Review {
  id: string;
  reviewer_id: string;
  reviewee_id: string;
  listing_id?: string | null;
  rating: number;
  comment?: string | null;
  reviewer_name?: string;
  reviewer_avatar?: string;
  created_at: string;
}

export interface ReviewStats {
  total_reviews: number;
  avg_rating: number;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export type NotificationType = 'message' | 'offer' | 'review' | 'listing_bump' | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}
