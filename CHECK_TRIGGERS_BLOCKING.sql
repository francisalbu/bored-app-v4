-- ============================================
-- CHECK: Ver TRIGGERS e FUNCTIONS que bloqueiam
-- ============================================

-- 1. Ver todos os triggers na tabela users
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- 2. Ver functions relacionadas com users
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_name LIKE '%user%'
  AND routine_schema = 'public';

-- 3. Tentar desabilitar RLS novamente (caso tenha sido reativado)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 4. Ver políticas RLS ativas
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'users';
