-- Migration: 008_add_swap_offers.sql
-- Description: Create swap_offers table for inter-user barter simulation

CREATE TABLE IF NOT EXISTS swap_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  offerer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  offered_listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  cash_difference INTEGER DEFAULT 0,
  cash_direction VARCHAR(10) DEFAULT 'none', -- 'offerer' | 'receiver' | 'none'
  note VARCHAR(200),
  status VARCHAR(10) DEFAULT 'pending', -- 'pending' | 'accepted' | 'rejected' | 'counter'
  chat_room_id UUID REFERENCES chat_rooms(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
