-- ============================================
-- CREATE USER_PREFERENCES TABLE
-- ============================================
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- Create the user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  favorite_categories TEXT[] DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  quiz_completed BOOLEAN DEFAULT false,
  quiz_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint on user_id (one preference per user)
CREATE UNIQUE INDEX IF NOT EXISTS user_preferences_user_id_unique 
ON public.user_preferences(user_id);

-- Disable RLS for simplicity (or enable with proper policies)
ALTER TABLE public.user_preferences DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO anon;
GRANT ALL ON public.user_preferences TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.user_preferences_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.user_preferences_id_seq TO anon;

-- Verify the table was created
SELECT 'Table created successfully!' as status;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_preferences'
ORDER BY ordinal_position;
