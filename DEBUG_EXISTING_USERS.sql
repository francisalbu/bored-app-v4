-- ============================================
-- DEBUG: Ver users existentes
-- ============================================

SELECT 
  id,
  supabase_uid,
  pg_typeof(supabase_uid) as tipo_supabase_uid,
  email,
  name,
  created_at
FROM public.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Mostra-me o resultado disto!
