-- ============================================
-- CHECK USER_PREFERENCES TABLE STRUCTURE
-- ============================================
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================

-- Ver se a tabela existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'user_preferences'
) as table_exists;

-- Ver estrutura completa
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_preferences'
ORDER BY ordinal_position;

-- Ver dados de exemplo
SELECT * FROM public.user_preferences LIMIT 5;
