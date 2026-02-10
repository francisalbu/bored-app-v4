-- ============================================
-- ROLLBACK AND FIX - OAuth Login Issues
-- ============================================
-- This script fixes issues caused by running the schema SQL
-- Run this in Supabase SQL Editor
-- ============================================

-- STEP 1: Remove the trigger if it was created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- STEP 2: Fix RLS policies that might be blocking OAuth users
-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.users;
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;

-- STEP 3: Create more permissive policies for OAuth
-- Allow anyone to view users (needed for public profiles)
CREATE POLICY "Anyone can view users" 
  ON public.users 
  FOR SELECT 
  USING (true);

-- Allow authenticated users to insert their own profile
-- This is MORE PERMISSIVE - allows any authenticated user to create
CREATE POLICY "Authenticated users can insert profile" 
  ON public.users 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
  ON public.users 
  FOR UPDATE 
  USING (
    auth.uid()::text = supabase_uid OR 
    auth.role() = 'service_role'
  );

-- Allow users to delete their own profile
CREATE POLICY "Users can delete own profile" 
  ON public.users 
  FOR DELETE 
  USING (auth.uid()::text = supabase_uid);

-- STEP 4: Verify RLS is enabled but not blocking everything
-- This just checks - doesn't change anything
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'users';

-- STEP 5: Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users';

-- ============================================
-- AFTER RUNNING THIS:
-- ============================================
-- 1. Go to Supabase Dashboard → Authentication → Providers
-- 2. Make sure Google is ENABLED
-- 3. Make sure Redirect URL includes: app.rork.bored-explorer://
-- 4. Try Google login again
-- 5. Check if user appears in auth.users
-- 6. If YES → Run auto-create-user-on-signup.sql to sync to public.users
-- 7. If NO → Check Google Cloud Console OAuth settings
