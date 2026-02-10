-- ============================================
-- ROLLBACK: Remove auto-create user trigger
-- ============================================
-- This script removes the trigger that was blocking OAuth signup
-- Run this in Supabase SQL Editor to restore OAuth functionality
-- ============================================

-- Step 1: Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 3: Verify the trigger and function are gone
SELECT 
  trigger_name, 
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Should return 0 rows

-- Step 4: Check if auth.users is accessible again
-- This should work without errors
SELECT COUNT(*) FROM auth.users;

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this script:
-- 1. Try to sign up with Google OAuth again
-- 2. The user should appear in auth.users
-- 3. Check: SELECT * FROM auth.users ORDER BY created_at DESC LIMIT 1;
-- ============================================

COMMIT;
