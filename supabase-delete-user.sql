-- SQL function to allow users to delete their own account
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)

-- First, create a function that deletes the user
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get the current user's ID from the JWT
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Delete user data from all related tables
  DELETE FROM bookings WHERE user_id = current_user_id;
  DELETE FROM reviews WHERE user_id = current_user_id;
  DELETE FROM saved_experiences WHERE user_id = current_user_id;
  DELETE FROM users WHERE id = current_user_id;
  
  -- Delete the user from auth.users
  DELETE FROM auth.users WHERE id = current_user_id;
  
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;
