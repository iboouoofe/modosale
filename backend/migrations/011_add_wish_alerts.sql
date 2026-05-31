-- Migration: 011_add_wish_alerts.sql
-- Description: Create wish_alerts table for smart wish list tracking

CREATE TABLE IF NOT EXISTS wish_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  keywords TEXT[] NOT NULL,
  category VARCHAR(50),
  min_price INTEGER,
  max_price INTEGER,
  radius_km INTEGER DEFAULT 15,
  city VARCHAR(100),
  notification_frequency VARCHAR(10) DEFAULT 'instant', -- 'instant' | 'daily' | 'weekly'
  is_active BOOLEAN DEFAULT TRUE,
  last_matched_at TIMESTAMP,
  match_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
