-- ============================================================================
-- FIX URGENTE: ATIVAR O TRIGGER DESATIVADO
-- ============================================================================
-- O trigger existe mas está DESATIVADO (enabled = O significa disabled)
-- Vamos ativá-lo E garantir que tudo funciona
-- ============================================================================

-- PASSO 1: ATIVA O TRIGGER na tabela auth.users
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- PASSO 2: Verifica se ativou
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ ENABLED (Origin)'
    WHEN tgenabled = 'D' THEN '❌ DISABLED'
    WHEN tgenabled = 'A' THEN '✅ ENABLED (Always)'
    WHEN tgenabled = 'R' THEN '✅ ENABLED (Replica)'
    ELSE 'UNKNOWN: ' || tgenabled
  END as status
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- PASSO 3: Verifica se a função existe
SELECT 
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- PASSO 4: Verifica permissões na tabela users
SELECT 
  grantee,
  string_agg(privilege_type, ', ') as privileges
FROM information_schema.role_table_grants
WHERE table_name = 'users' 
  AND table_schema = 'public'
  AND grantee IN ('supabase_auth_admin', 'postgres', 'authenticated', 'anon')
GROUP BY grantee;

-- PASSO 5: Verifica permissões na sequência
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_usage_grants
WHERE object_name = 'users_id_seq'
  AND object_schema = 'public';

-- ============================================================================
-- SE O TRIGGER ESTIVER ATIVO (enabled = 'O' com status OK):
-- ============================================================================
-- 1. Apague um user de teste do auth.users (se tiver criado um)
-- 2. Faça login com uma conta Google NOVA
-- 3. Execute: SELECT * FROM public.users ORDER BY created_at DESC LIMIT 5;
-- 4. O user DEVE aparecer!

-- ============================================================================
-- SE AINDA NÃO FUNCIONAR DEPOIS DE ATIVAR:
-- ============================================================================
-- Execute o script EMERGENCY_FIX_NO_RLS.sql que remove todas as barreiras
-- ============================================================================
