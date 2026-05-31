export enum ListingCategory {
  ELECTRONICS = 'Electronics',
  FASHION = 'Fashion',
  HOME_LIVING = 'Home & Living',
  SPORTS_OUTDOOR = 'Sports & Outdoor',
  BOOKS_HOBBIES = 'Books & Hobbies',
  BABY_KIDS = 'Baby & Kids',
  OTHER = 'Other'
}

export interface User {
  id: string;
  phone_number: string;
  email?: string | null;
  display_name: string;
  avatar_url?: string | null;
  is_phone_verified: boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface Listing {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  images: string[];
  category: ListingCategory;
  location?: any; // PostGIS Point representation
  latitude?: number; // ST_Y
  longitude?: number; // ST_X
  city_district: string;
  show_phone: boolean;
  is_active: boolean;
  bumped_at?: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface ChatRoom {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at?: Date | string;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  message_text: string;
  is_read: boolean;
  created_at?: Date | string;
}
