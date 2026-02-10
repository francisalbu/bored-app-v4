-- ============================================
-- SUPABASE MIGRATION SCRIPT
-- Bored Tourist Database Schema
-- ============================================
--
-- ARCHITECTURE:
-- - auth.users (Supabase built-in) → Authentication data (email, password, OAuth)
-- - public.users (this table) → User profile data (name, avatar, bio, role)
-- - Connection: users.supabase_uid = auth.users.id (UUID from auth)
--
-- We DON'T need a separate "profiles" table - our "users" table IS the profile!
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  phone VARCHAR(50),
  avatar VARCHAR(500),
  role VARCHAR(50) DEFAULT 'user' CHECK(role IN ('user', 'operator', 'admin')),
  bio TEXT,
  google_id VARCHAR(255),
  apple_id VARCHAR(255),
  email_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  supabase_uid VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid ON users(supabase_uid);

-- ============================================
-- OPERATORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS operators (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  logo_url VARCHAR(500),
  description TEXT,
  website VARCHAR(500),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  verified BOOLEAN DEFAULT false,
  rating DECIMAL(3, 2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operators_user_id ON operators(user_id);

-- ============================================
-- EXPERIENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS experiences (
  id BIGSERIAL PRIMARY KEY,
  operator_id BIGINT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  
  -- Basic Info
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Location
  location VARCHAR(255) NOT NULL,
  address TEXT,
  meeting_point TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  distance VARCHAR(50),
  
  -- Pricing
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'EUR',
  
  -- Duration & Capacity
  duration VARCHAR(50) NOT NULL,
  max_group_size INTEGER,
  
  -- Category
  category VARCHAR(100),
  tags JSONB,  -- PostgreSQL native JSON
  
  -- Media
  video_url VARCHAR(500),
  image_url VARCHAR(500),
  images JSONB,  -- PostgreSQL native JSON
  provider_logo VARCHAR(500),
  
  -- Details
  highlights JSONB,
  included JSONB,
  what_to_bring JSONB,
  languages JSONB,
  
  -- Policies
  cancellation_policy TEXT,
  important_info TEXT,
  
  -- Booking
  instant_booking BOOLEAN DEFAULT false,
  available_today BOOLEAN DEFAULT false,
  
  -- Status & Stats
  verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  rating DECIMAL(3, 2) DEFAULT 0.00,
  review_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exp_operator ON experiences(operator_id);
CREATE INDEX IF NOT EXISTS idx_exp_category ON experiences(category);
CREATE INDEX IF NOT EXISTS idx_exp_rating ON experiences(rating);
CREATE INDEX IF NOT EXISTS idx_exp_active ON experiences(is_active);
CREATE INDEX IF NOT EXISTS idx_exp_location ON experiences(latitude, longitude);

-- ============================================
-- AVAILABILITY SLOTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS availability_slots (
  id BIGSERIAL PRIMARY KEY,
  experience_id BIGINT NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_participants INTEGER NOT NULL,
  booked_participants INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slots_exp ON availability_slots(experience_id);
CREATE INDEX IF NOT EXISTS idx_slots_date ON availability_slots(date);

-- ============================================
-- FAVORITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  experience_id BIGINT NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, experience_id)
);

CREATE INDEX IF NOT EXISTS idx_fav_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_fav_exp ON favorites(experience_id);

-- ============================================
-- BOOKINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,
  booking_reference TEXT NOT NULL UNIQUE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  experience_id BIGINT NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  slot_id BIGINT NOT NULL REFERENCES availability_slots(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  participants INTEGER NOT NULL DEFAULT 1,
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(customer_email);

-- ============================================
-- REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  experience_id BIGINT NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  booking_id BIGINT REFERENCES bookings(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  operator_response TEXT,
  response_date TIMESTAMPTZ,
  source VARCHAR(50) DEFAULT 'internal',
  author_name VARCHAR(255),
  author_avatar TEXT,
  verified_purchase BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_experience_source ON reviews(experience_id, source);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(experience_id, rating);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Users: Users can read all, but only authenticated users can update their own
CREATE POLICY "Anyone can view users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid()::text = supabase_uid);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid()::text = supabase_uid);
CREATE POLICY "Users can delete their own profile" ON users FOR DELETE USING (auth.uid()::text = supabase_uid);

-- Operators: Public read, operators can update their own
CREATE POLICY "Anyone can view operators" ON operators FOR SELECT USING (true);
CREATE POLICY "Operators can update their own profile" ON operators FOR UPDATE 
  USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()::text));

-- Experiences: Public read, operators can manage their own
CREATE POLICY "Anyone can view active experiences" ON experiences FOR SELECT USING (is_active = true);
CREATE POLICY "Operators can manage their experiences" ON experiences FOR ALL 
  USING (operator_id IN (SELECT id FROM operators WHERE user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()::text)));

-- Availability Slots: Public read, operators can manage
CREATE POLICY "Anyone can view available slots" ON availability_slots FOR SELECT USING (is_available = true);
CREATE POLICY "Operators can manage slots" ON availability_slots FOR ALL 
  USING (experience_id IN (SELECT id FROM experiences WHERE operator_id IN (SELECT id FROM operators WHERE user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()::text))));

-- Favorites: Users can manage their own
CREATE POLICY "Users can view their favorites" ON favorites FOR SELECT USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()::text));
CREATE POLICY "Users can manage their favorites" ON favorites FOR ALL USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()::text));

-- Bookings: Users see their own, operators see their experiences' bookings
CREATE POLICY "Users can view their bookings" ON bookings FOR SELECT 
  USING (
    user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()::text) OR
    customer_email IN (SELECT email FROM users WHERE supabase_uid = auth.uid()::text)
  );
CREATE POLICY "Operators can view their bookings" ON bookings FOR SELECT 
  USING (experience_id IN (SELECT id FROM experiences WHERE operator_id IN (SELECT id FROM operators WHERE user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()::text))));

-- Reviews: Public read, users can write for their bookings
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews for their bookings" ON reviews FOR INSERT 
  WITH CHECK (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()::text));
CREATE POLICY "Users can update their reviews" ON reviews FOR UPDATE 
  USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()::text));

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_operators_updated_at BEFORE UPDATE ON operators FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_experiences_updated_at BEFORE UPDATE ON experiences FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
