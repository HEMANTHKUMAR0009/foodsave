-- ====================================================================
-- FoodSave: Database Schema for Supabase
-- Tables: users, food_donations, claims
-- ====================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    full_name TEXT NOT NULL,
    organization_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('provider', 'receiver', 'volunteer', 'admin')),
    provider_type TEXT CHECK (provider_type IN ('college_canteen', 'restaurant', 'hostel_mess', 'event_catering', 'household', 'bakery', 'supermarket', 'ngo', 'individual')),
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. FOOD DONATIONS TABLE
CREATE TABLE IF NOT EXISTS food_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    food_type TEXT NOT NULL CHECK (food_type IN ('cooked_meals', 'bakery', 'fresh_produce', 'packaged_groceries', 'dairy_beverages', 'other')),
    quantity_meals INTEGER NOT NULL DEFAULT 1,
    quantity_weight_kg NUMERIC(6,2) DEFAULT 0.0,
    provider_id UUID REFERENCES users(id) ON DELETE SET NULL,
    provider_name TEXT NOT NULL,
    provider_type TEXT NOT NULL DEFAULT 'college_canteen',
    pickup_address TEXT NOT NULL,
    pickup_instructions TEXT,
    available_until TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'claimed', 'picked_up', 'expired', 'cancelled')),
    dietary_type TEXT NOT NULL DEFAULT 'vegetarian' CHECK (dietary_type IN ('vegetarian', 'vegan', 'non_veg', 'contains_egg', 'halal')),
    storage_notes TEXT,
    image_url TEXT,
    contact_phone TEXT NOT NULL,
    contact_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CLAIMS TABLE
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id UUID NOT NULL REFERENCES food_donations(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    receiver_name TEXT NOT NULL,
    receiver_organization TEXT,
    receiver_phone TEXT NOT NULL,
    claim_code TEXT NOT NULL,
    estimated_pickup_time TEXT,
    claim_notes TEXT,
    status TEXT NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'picked_up', 'cancelled')),
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    picked_up_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Permissive public policies for demo/hackathon usage
CREATE POLICY "Allow public read access on users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public insert on users" ON users FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on food_donations" ON food_donations FOR SELECT USING (true);
CREATE POLICY "Allow public insert on food_donations" ON food_donations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on food_donations" ON food_donations FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on claims" ON claims FOR SELECT USING (true);
CREATE POLICY "Allow public insert on claims" ON claims FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on claims" ON claims FOR UPDATE USING (true);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_donations_status ON food_donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON food_donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claims_donation_id ON claims(donation_id);

-- Sample Initial Seed Data
INSERT INTO users (id, full_name, organization_name, role, provider_type, phone, address)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'Chef Rajesh Kumar', 'Central Campus Dining Hall', 'provider', 'college_canteen', '+1 (555) 234-5678', 'Campus North Block, 2nd Floor Dining Court'),
    ('a0000000-0000-0000-0000-000000000002', 'Elena Rostova', 'Golden Crust Bakery & Cafe', 'provider', 'bakery', '+1 (555) 345-6789', '42 University Avenue, Downtown'),
    ('a0000000-0000-0000-0000-000000000003', 'Vikram Patel', 'Oakridge Hostel Mess (Wing B)', 'provider', 'hostel_mess', '+1 (555) 456-7890', 'Hostel Zone 4, Kitchen Loading Dock'),
    ('a0000000-0000-0000-0000-000000000004', 'Maria Santos', 'Annual Tech Summit Catering', 'provider', 'event_catering', '+1 (555) 567-8901', 'Student Convention Center, Hall 3 Backstage')
ON CONFLICT (id) DO NOTHING;

INSERT INTO food_donations (
    id, title, description, food_type, quantity_meals, quantity_weight_kg,
    provider_id, provider_name, provider_type, pickup_address, pickup_instructions,
    available_until, status, dietary_type, storage_notes, image_url, contact_phone, contact_name, created_at
) VALUES 
    (
        'b0000000-0000-0000-0000-000000000001',
        'Steamed Basmati Rice, Paneer Curry & Dal Fry',
        'Freshly prepared lunch surplus from university noon rush. Packed in hygienic thermal food grade containers.',
        'cooked_meals',
        35,
        14.0,
        'a0000000-0000-0000-0000-000000000001',
        'Central Campus Dining Hall',
        'college_canteen',
        'Campus North Block, 2nd Floor Dining Court, Service Door B',
        'Ring kitchen bell. Containers can be transferred or brought back tomorrow.',
        timezone('utc'::text, now() + interval '3 hours 30 minutes'),
        'available',
        'vegetarian',
        'Stored in insulated warming bins (65°C+). Ready to serve.',
        'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
        '+1 (555) 234-5678',
        'Chef Rajesh',
        timezone('utc'::text, now() - interval '45 minutes')
    ),
    (
        'b0000000-0000-0000-0000-000000000002',
        'Artisan Sourdough, Baguettes & Croissants',
        'Crisp day-bake artisan bread, seeded multigrain loaves, and butter croissants. Baked this morning.',
        'bakery',
        40,
        12.5,
        'a0000000-0000-0000-0000-000000000002',
        'Golden Crust Bakery & Cafe',
        'bakery',
        '42 University Avenue, Downtown',
        'Come to front counter and mention FoodSave pickup.',
        timezone('utc'::text, now() + interval '5 hours'),
        'available',
        'vegetarian',
        'Kept in clean dry bakery paper bags.',
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
        '+1 (555) 345-6789',
        'Elena Rostova',
        timezone('utc'::text, now() - interval '1 hour 20 minutes')
    ),
    (
        'b0000000-0000-0000-0000-000000000003',
        'Mixed Vegetable Pasta & Garlic Toast (18 Meals)',
        'Creamy herb penne pasta with broccoli, zucchini, bell peppers and foil-wrapped garlic toasts.',
        'cooked_meals',
        18,
        7.2,
        'a0000000-0000-0000-0000-000000000003',
        'Oakridge Hostel Mess (Wing B)',
        'hostel_mess',
        'Hostel Zone 4, Kitchen Loading Dock',
        'Security desk has guest visitor register; mention FoodSave.',
        timezone('utc'::text, now() + interval '2 hours 15 minutes'),
        'available',
        'vegetarian',
        'Warm insulated trays.',
        'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=800&q=80',
        '+1 (555) 456-7890',
        'Vikram Patel',
        timezone('utc'::text, now() - interval '30 minutes')
    ),
    (
        'b0000000-0000-0000-0000-000000000004',
        'Gourmet Wrap Platters & Seasonal Fruit Cups',
        'High quality wrap assortment (Grilled veggies, hummus wraps, falafel) plus diced melon fruit bowls.',
        'cooked_meals',
        28,
        11.0,
        'a0000000-0000-0000-0000-000000000004',
        'Annual Tech Summit Catering',
        'event_catering',
        'Student Convention Center, Hall 3 Backstage Service Ramp',
        'Call Maria on arrival, door will be unlocked.',
        timezone('utc'::text, now() + interval '1 hour 45 minutes'),
        'claimed',
        'vegan',
        'Chilled catering containers with ice packs.',
        'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
        '+1 (555) 567-8901',
        'Maria Santos',
        timezone('utc'::text, now() - interval '2 hours')
    ),
    (
        'b0000000-0000-0000-0000-000000000005',
        'Fresh Organic Apples, Bananas & Orange Crates',
        'Surplus fresh fruit crates from student farmers cooperative. Perfect condition, sweet and ripe.',
        'fresh_produce',
        50,
        22.0,
        'a0000000-0000-0000-0000-000000000001',
        'Green Roots Campus Co-op',
        'college_canteen',
        'Agricultural Building Greenhouse B, Entry 1',
        'Wooden crates can be carried or wheeled via ramp.',
        timezone('utc'::text, now() + interval '8 hours'),
        'available',
        'vegan',
        'Ambient room temperature, cool shaded store.',
        'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80',
        '+1 (555) 678-9012',
        'Samira Vance',
        timezone('utc'::text, now() - interval '3 hours')
    )
ON CONFLICT (id) DO NOTHING;
