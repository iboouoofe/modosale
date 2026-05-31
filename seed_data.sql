-- Insert mock users
INSERT INTO users (id, phone_number, email, display_name, avatar_url, is_phone_verified) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '+905555555511', 'can.yilmaz@example.com', 'Can Yılmaz', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Can', TRUE),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', '+905555555522', 'elif.kaya@example.com', 'Elif Kaya', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Elif', TRUE),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', '+905555555533', 'deniz.demir@example.com', 'Deniz Demir', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Deniz', TRUE);

-- Insert mock listings with PostGIS geographical points around Kadıköy & Üsküdar
-- SRID 4326 Point representation: ST_SetSRID(ST_MakePoint(Longitude, Latitude), 4326)
INSERT INTO listings (user_id, title, description, price, currency, images, category, location, city_district, show_phone) VALUES
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'iPhone 13 Pro 128GB - Graphite',
    'Kutulu, faturalı, pil sağlığı %85. Çiziksiz.',
    28500.00,
    'TL',
    ARRAY['https://images.unsplash.com/photo-1639462204851-47d4c339598a?w=500'],
    'Electronics',
    ST_SetSRID(ST_MakePoint(29.0225, 40.9902), 4326), -- Caferağa, Kadıköy
    'Caferağa, Kadıköy',
    TRUE
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Minimalist Ahşap Çalışma Masası',
    'Çok temiz durumda, 120x60cm boyutlarında.',
    1200.00,
    'TL',
    ARRAY['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=500'],
    'Home & Living',
    ST_SetSRID(ST_MakePoint(29.0255, 40.9820), 4326), -- Osmanağa, Kadıköy
    'Osmanağa, Kadıköy',
    FALSE
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'Kırmızı Deri Ceket - S Beden',
    'Zara marka, sadece 1-2 kez kullanıldı.',
    1750.00,
    'TL',
    ARRAY['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500'],
    'Fashion',
    ST_SetSRID(ST_MakePoint(29.0160, 41.0269), 4326), -- Üsküdar Merkez
    'Mimar Sinan, Üsküdar',
    FALSE
);
