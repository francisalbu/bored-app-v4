-- ============================================
-- FIX COMPLETO: Resolver supabase_uid
-- ============================================
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================

-- PASSO 1: Remover foreign key constraint
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_supabase_uid_fkey;

-- PASSO 2: Mudar coluna de UUID para TEXT
ALTER TABLE public.users 
ALTER COLUMN supabase_uid TYPE TEXT USING supabase_uid::TEXT;

-- PASSO 3: Verificar que mudou
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name = 'supabase_uid';
-- Deve mostrar: supabase_uid | text | NO

-- PASSO 4: TESTE - Inserir um user de teste
INSERT INTO public.users (
  supabase_uid,
  email,
  name,
  password,
  created_at,
  updated_at
) VALUES (
  'test-' || gen_random_uuid()::text,
  'teste_direto_' || floor(random() * 10000)::text || '@example.com',
  'Test User',
  '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJ',
  NOW(),
  NOW()
) RETURNING id, email, supabase_uid;
-- Se isto funcionar, o problema está resolvido!

-- ============================================
-- ✅ SE TUDO FUNCIONOU:
-- ============================================
-- 1. Verás "text" no PASSO 3
-- 2. Verás um novo user criado no PASSO 4
-- 3. TESTA criar user na app IMEDIATAMENTE!
-- ============================================
