-- ============================================
-- AUTO-CREATE USER IN public.users ON SIGNUP - FIXED VERSION
-- ============================================
-- This trigger automatically creates a record in public.users
-- whenever a new user signs up via OAuth (Google, Apple, etc.)
-- or email in auth.users
-- 
-- FIXED: Changed SECURITY DEFINER to SECURITY INVOKER
-- This prevents permission issues with auth.users table
-- ============================================

-- Step 1: Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Create function to handle new user creation
-- IMPORTANT: Using SECURITY INVOKER instead of SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY INVOKER -- Changed from SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert into public.users
  INSERT INTO public.users (
    supabase_uid,
    email,
    name,
    phone,
    email_verified,
    password,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name', 
      SPLIT_PART(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'phone',
    (NEW.email_confirmed_at IS NOT NULL),
    'OAUTH_USER', -- Password placeholder for OAuth users
    NOW(),
    NOW()
  )
  ON CONFLICT (supabase_uid) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    phone = COALESCE(EXCLUDED.phone, public.users.phone),
    email_verified = EXCLUDED.email_verified,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation in auth.users
    RAISE WARNING 'Error creating user in public.users: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 3: Create trigger that fires AFTER a new user is inserted in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Grant necessary permissions
-- These are required for the trigger to work
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT, UPDATE ON public.users TO supabase_auth_admin;
GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO supabase_auth_admin;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries to verify the trigger is working:

-- 1. Check if trigger exists
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
-- Should return 1 row

-- 2. Check if function exists
SELECT 
  routine_name, 
  routine_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';
-- Should return 1 row

-- ============================================
-- TESTING
-- ============================================
-- Test by signing up with a new Google account
-- Then verify:

-- Check auth.users
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 1;

-- Check public.users (should have matching supabase_uid)
-- SELECT id, supabase_uid, email, name FROM public.users ORDER BY created_at DESC LIMIT 1;

-- The supabase_uid in public.users should match the id in auth.users
