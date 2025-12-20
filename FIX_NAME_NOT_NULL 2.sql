-- ============================================
-- 🔥 FIX: name é NOT NULL sem default
-- ============================================
-- Executa isto no Supabase SQL Editor
-- ============================================

-- OPÇÃO 1: Tornar 'name' opcional (RECOMENDADO)
ALTER TABLE public.users ALTER COLUMN name DROP NOT NULL;

-- OPÇÃO 2: Ou adicionar um valor default
-- ALTER TABLE public.users ALTER COLUMN name SET DEFAULT 'User';

-- ============================================
-- ✅ TESTA AGORA O INVITE!
-- ============================================
