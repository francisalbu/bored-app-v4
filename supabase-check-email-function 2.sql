-- Function to check if an email exists in auth.users
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- Check if email exists in auth.users table
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE email = email_to_check
  ) INTO user_exists;
  
  RETURN user_exists;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO authenticated, anon;
