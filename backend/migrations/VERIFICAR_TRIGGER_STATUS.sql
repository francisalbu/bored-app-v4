-- ============================================================================
-- DIAGNÓSTICO COMPLETO DO TRIGGER
-- Execute TODAS estas queries no Supabase SQL Editor
-- ============================================================================

-- 1️⃣ VERIFICA SE A FUNÇÃO EXISTE
SELECT 
  p.proname as function_name,
  p.prosecdef as is_security_definer,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'handle_new_user'
  AND n.nspname = 'public';

-- 2️⃣ VERIFICA SE O TRIGGER EXISTE E ESTÁ ATIVO
SELECT 
  t.tgname as trigger_name,
  t.tgenabled as enabled,  -- 'O' = enabled
  t.tgtype as trigger_type,
  c.relname as table_name,
  n.nspname as schema_name,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE t.tgname = 'on_auth_user_created';

-- 3️⃣ VERIFICA PERMISSÕES NA FUNÇÃO
SELECT 
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'handle_new_user'
  AND routine_schema = 'public';

-- 4️⃣ VERIFICA PERMISSÕES NA TABELA public.users
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- 5️⃣ VERIFICA PERMISSÕES NA SEQUÊNCIA
SELECT 
  sequence_schema,
  sequence_name,
  grantee,
  privilege_type
FROM information_schema.role_usage_grants
WHERE object_schema = 'public'
  AND object_name LIKE '%users%seq%';

-- 6️⃣ VERIFICA POLÍTICAS RLS NA TABELA users
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users';

-- 7️⃣ VERIFICA SE RLS ESTÁ ATIVADO
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'users'
  AND schemaname = 'public';

-- ============================================================================
-- RESULTADOS ESPERADOS:
-- ============================================================================
-- Query 1: Deve mostrar a função com is_security_definer = true
-- Query 2: Deve mostrar o trigger com enabled = 'O' (Origin = enabled)
-- Query 3: Deve mostrar EXECUTE para supabase_auth_admin e postgres
-- Query 4: Deve mostrar INSERT/UPDATE para supabase_auth_admin e postgres
-- Query 5: Deve mostrar USAGE/SELECT para a sequência users_id_seq
-- Query 6: Deve mostrar as políticas RLS (se existirem)
-- Query 7: Deve mostrar rls_enabled = true ou false

-- ============================================================================
-- SE ALGUMA DESTAS QUERIES NÃO RETORNAR RESULTADOS:
-- ============================================================================
-- → O trigger NÃO FOI APLICADO corretamente!
-- → Execute o script auto-create-user-on-signup-v3-FINAL-CORRECT.sql
