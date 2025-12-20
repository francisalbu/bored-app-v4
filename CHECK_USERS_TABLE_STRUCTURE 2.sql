-- ============================================
-- CHECK USERS TABLE STRUCTURE
-- ============================================
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================

-- PASSO 1: Ver estrutura da tabela users
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- PASSO 2: Ver constraints (NOT NULL, PRIMARY KEY, etc)
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public' 
  AND tc.table_name = 'users'
ORDER BY tc.constraint_type, kcu.column_name;

-- PASSO 3: Check RLS status
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'users' AND relnamespace = 'public'::regnamespace;

-- PASSO 4: Check existing RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'users';

-- ============================================
-- 📋 INTERPRETAÇÃO
-- ============================================
-- 1. Ve quais colunas são NOT NULL
-- 2. Ve se há UNIQUE constraints no email
-- 3. Ve se RLS está ativo
-- 4. Ve quais policies estão aplicadas
-- ============================================
