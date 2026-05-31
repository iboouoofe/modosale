-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Drop existing tables if they exist (for easy iteration/resetting)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;
DROP TABLE IF EXISTS listings CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS listing_category CASCADE;

-- 2. Create Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Categories ENUM
CREATE TYPE listing_category AS ENUM (
    'Electronics', 'Fashion', 'Home & Living', 'Sports & Outdoor', 
    'Books & Hobbies', 'Baby & Kids', 'Other'
);

-- 4. Create Listings Table (No housing/vehicles, PostGIS proximity search)
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(5) DEFAULT 'TL',
    images TEXT[] NOT NULL CHECK (array_length(images, 1) > 0),
    category listing_category NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL, -- Spatial latitude/longitude coordinates
    city_district VARCHAR(100) NOT NULL, -- E.g. "Moda, Kadıköy"
    show_phone BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    bumped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial GIST index for rapid radial searches
CREATE INDEX idx_listings_location ON listings USING GIST(location);
CREATE INDEX idx_listings_is_active_bumped ON listings(is_active, bumped_at DESC);

-- 5. Create Chat Rooms Table
CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(listing_id, buyer_id, seller_id),
    CONSTRAINT chk_different_parties CHECK (buyer_id <> seller_id)
);

-- 6. Create Messages Table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL CHECK (length(trim(message_text)) > 0),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_room_created ON messages(room_id, created_at ASC);
