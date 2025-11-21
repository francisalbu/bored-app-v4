-- ============================================
-- CLEANUP SCRIPT
-- Remove profiles table and disable RLS for testing
-- ============================================

-- 1. Drop profiles table if it exists (we don't need it)
DROP TABLE IF EXISTS profiles CASCADE;

-- 2. Temporarily disable RLS on all tables for easier testing
-- You can re-enable this later when implementing Supabase auth
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE operators DISABLE ROW LEVEL SECURITY;
ALTER TABLE experiences DISABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies (they'll error without auth.uid())
DROP POLICY IF EXISTS "Anyone can view users" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can delete their own profile" ON users;
DROP POLICY IF EXISTS "Anyone can view operators" ON operators;
DROP POLICY IF EXISTS "Operators can update their own profile" ON operators;
DROP POLICY IF EXISTS "Anyone can view active experiences" ON experiences;
DROP POLICY IF EXISTS "Operators can manage their experiences" ON experiences;
DROP POLICY IF EXISTS "Anyone can view available slots" ON availability_slots;
DROP POLICY IF EXISTS "Operators can manage slots" ON availability_slots;
DROP POLICY IF EXISTS "Users can view their favorites" ON favorites;
DROP POLICY IF EXISTS "Users can manage their favorites" ON favorites;
DROP POLICY IF EXISTS "Users can view their bookings" ON bookings;
DROP POLICY IF EXISTS "Operators can view their bookings" ON bookings;
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews for their bookings" ON reviews;
DROP POLICY IF EXISTS "Users can update their reviews" ON reviews;

-- 4. Verify tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
