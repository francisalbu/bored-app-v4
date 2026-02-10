-- ============================================
-- FIX: Alterar supabase_uid de UUID para TEXT
-- ============================================
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================

-- OPÇÃO 1: Mudar coluna de UUID para TEXT (RECOMENDADO)
-- Isto permite que o backend envie strings diretamente
ALTER TABLE public.users 
ALTER COLUMN supabase_uid TYPE TEXT;

-- Verificar que a mudança foi feita
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name = 'supabase_uid';

-- ============================================
-- ✅ PRONTO! 
-- ============================================
-- Agora o backend pode inserir supabase_uid como TEXT
-- Testa criar um user na app!
-- ============================================
