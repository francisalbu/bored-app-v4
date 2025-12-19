-- ============================================
-- FIX: Remover Foreign Key e Mudar para TEXT
-- ============================================
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================

-- PASSO 1: Descobrir nome exato da constraint
SELECT constraint_name, table_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND constraint_type = 'FOREIGN KEY';

-- PASSO 2: Remover a foreign key constraint
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_supabase_uid_fkey;

-- PASSO 3: Mudar coluna para TEXT
ALTER TABLE public.users 
ALTER COLUMN supabase_uid TYPE TEXT;

-- PASSO 4: Verificar que funcionou
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name = 'supabase_uid';

-- ============================================
-- ✅ PRONTO! 
-- ============================================
-- Foreign key removida, coluna mudada para TEXT
-- Agora testa criar user na app!
-- ============================================
