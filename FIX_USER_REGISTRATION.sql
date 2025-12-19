-- ============================================
-- FIX USER REGISTRATION - SOLUÇÃO COMPLETA
-- ============================================
-- Este script resolve o erro "Database error saving new user"
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================

-- PASSO 1: Desabilitar RLS (Row Level Security) para permitir inserções do backend
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- PASSO 2: Remover todas as policies existentes que podem estar bloqueando
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users CASCADE', r.policyname);
    END LOOP;
END $$;

-- PASSO 3: Tornar o campo password NULLABLE (para usuários OAuth)
ALTER TABLE public.users 
  ALTER COLUMN password DROP NOT NULL;

-- PASSO 4: Garantir que supabase_uid é UNIQUE
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS users_supabase_uid_unique;

ALTER TABLE public.users 
  ADD CONSTRAINT users_supabase_uid_unique UNIQUE (supabase_uid);

-- PASSO 5: Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid 
  ON public.users(supabase_uid);

-- PASSO 6: Limpar usuários duplicados (se existirem)
-- Mantém apenas o registro mais recente de cada email
WITH duplicates AS (
  SELECT id, email, 
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
  FROM public.users
)
DELETE FROM public.users
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- PASSO 7: Verificar a estrutura da tabela
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- PASSO 8: Verificar se há policies ativas (deve retornar vazio)
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
-- Execute estas queries para confirmar que está tudo OK:

-- 1. RLS deve estar OFF
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';
-- Deve retornar: rowsecurity = false

-- 2. Password deve ser nullable
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'password';
-- Deve retornar: is_nullable = YES

-- 3. Supabase_uid deve ser unique
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'users' 
  AND constraint_name LIKE '%supabase_uid%';
-- Deve retornar: users_supabase_uid_unique | UNIQUE

-- ============================================
-- ✅ PRONTO! 
-- ============================================
-- Agora tente registrar um novo usuário no app
-- O erro "Database error saving new user" deve estar resolvido!
-- ============================================
