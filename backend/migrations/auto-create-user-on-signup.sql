-- ============================================
-- AUTO-CREATE USER IN public.users ON SIGNUP
-- ============================================
-- This trigger automatically creates a record in public.users
-- whenever a new user signs up via OAuth (Google, Apple, etc.)
-- or email in auth.users
-- ============================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    NEW.email_confirmed_at IS NOT NULL,
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after a new user is inserted in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
-- Grant necessary permissions for the function to work
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.users TO supabase_auth_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;

-- ============================================
-- TEST THE TRIGGER (Optional)
-- ============================================
-- You can test by signing up with a new Google account
-- The user should automatically appear in both auth.users and public.users

-- To verify:
-- SELECT * FROM auth.users;
-- SELECT * FROM public.users;
