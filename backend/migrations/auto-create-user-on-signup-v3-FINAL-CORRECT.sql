-- ============================================================================
-- AUTO-CREATE USER TRIGGER - VERSÃO 3 FINAL (MAPEAMENTO CORRETO)
-- ============================================================================
-- Este script cria um trigger que automaticamente sincroniza utilizadores
-- da tabela auth.users (Supabase) para public.users (aplicação)
-- 
-- PROBLEMA RESOLVIDO:
-- - auth.users.id (UUID) → public.users.supabase_uid (text/uuid)
-- - public.users.id (BIGINT) → AUTO-GERADO pela sequência
--
-- VERSÃO: v3 - FINAL CORRECT MAPPING
-- DATA: 2025-11-25
-- ============================================================================

-- ============================================================================
-- PASSO 1: LIMPAR VERSÕES ANTERIORES (se existirem)
-- ============================================================================

-- Remove o trigger se já existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remove a função se já existir
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================================================
-- PASSO 2: CRIAR A FUNÇÃO COM MAPEAMENTO CORRETO
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER  -- Executa com permissões do criador (postgres/supabase_admin)
SET search_path = public  -- Força o schema correto
LANGUAGE plpgsql
AS $$
DECLARE
  user_name text;
  user_phone text;
BEGIN
  -- Log para debug (aparece nos logs do Supabase)
  RAISE LOG 'Trigger handle_new_user disparado para user: %', NEW.email;

  -- Extrai nome do metadata (com fallback para email)
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)  -- Usa parte antes do @ se não houver nome
  );

  -- Extrai telefone do metadata (se existir)
  user_phone := NEW.raw_user_meta_data->>'phone';

  -- Insere na tabela public.users com o mapeamento CORRETO
  INSERT INTO public.users (
    supabase_uid,      -- ← AQUI vai o UUID do auth.users (como text)
    email,
    name,
    phone,
    profile_picture,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id::text,      -- ← Converte UUID para text
    NEW.email,
    user_name,
    user_phone,
    NEW.raw_user_meta_data->>'avatar_url',  -- Foto do Google/Facebook
    NOW(),
    NOW()
  )
  ON CONFLICT (supabase_uid) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    phone = COALESCE(EXCLUDED.phone, public.users.phone),
    profile_picture = COALESCE(EXCLUDED.profile_picture, public.users.profile_picture),
    updated_at = NOW();

  RAISE LOG 'User criado/atualizado com sucesso: % (supabase_uid: %)', NEW.email, NEW.id;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, NÃO bloqueia o signup
    RAISE WARNING 'Erro ao criar user em public.users: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE WARNING 'User details: email=%, id=%', NEW.email, NEW.id;
    RETURN NEW;  -- ← CRÍTICO: retorna NEW mesmo com erro
END;
$$;

-- ============================================================================
-- PASSO 3: ADICIONAR COMENTÁRIO À FUNÇÃO
-- ============================================================================

COMMENT ON FUNCTION public.handle_new_user() IS 
'Trigger function que sincroniza automaticamente utilizadores de auth.users para public.users. 
Mapeia auth.users.id (UUID) → public.users.supabase_uid (text).
O public.users.id (BIGINT) é gerado automaticamente pela sequência.';

-- ============================================================================
-- PASSO 4: CRIAR O TRIGGER
-- ============================================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users  -- ← Dispara APÓS inserção bem-sucedida
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PASSO 5: CONCEDER PERMISSÕES NECESSÁRIAS
-- ============================================================================

-- Permite que a função seja executada
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;

-- Permite INSERT e UPDATE na tabela public.users
GRANT INSERT, UPDATE ON public.users TO supabase_auth_admin;
GRANT INSERT, UPDATE ON public.users TO postgres;

-- IMPORTANTE: Permite uso da sequência para gerar o id automaticamente
GRANT USAGE, SELECT ON SEQUENCE public.users_id_seq TO supabase_auth_admin;
GRANT USAGE, SELECT ON SEQUENCE public.users_id_seq TO postgres;

-- ============================================================================
-- PASSO 6: VERIFICAÇÃO APÓS INSTALAÇÃO
-- ============================================================================

-- Execute estas queries DEPOIS de aplicar o script para confirmar:

-- 1. Verifica se a função existe
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  provolatile as volatility
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 2. Verifica se o trigger existe
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  tgtype as trigger_type
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 3. Verifica permissões na tabela
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'users' 
  AND table_schema = 'public';

-- 4. Verifica permissões na sequência
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_usage_grants
WHERE object_name = 'users_id_seq' 
  AND object_schema = 'public';

-- ============================================================================
-- PASSO 7: TESTE O TRIGGER
-- ============================================================================

-- Depois de aplicar o script, teste com uma conta Google NOVA (nunca usada):

-- 1. Faça login com Google OAuth na app
-- 2. Verifique se o user aparece em AMBAS as tabelas:

-- Verifica auth.users (deve ter o user)
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'seu-email-de-teste@gmail.com';

-- Verifica public.users (deve ter o MESMO user com supabase_uid correspondente)
SELECT id, supabase_uid, email, name, created_at 
FROM public.users 
WHERE email = 'seu-email-de-teste@gmail.com';

-- 3. Confirma que o mapeamento está correto:
SELECT 
  au.id as auth_id,
  pu.id as public_id,
  pu.supabase_uid,
  au.email,
  (au.id::text = pu.supabase_uid) as mapping_correct
FROM auth.users au
LEFT JOIN public.users pu ON au.id::text = pu.supabase_uid
WHERE au.email = 'seu-email-de-teste@gmail.com';

-- Se mapping_correct = true, SUCESSO! ✅

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

-- ✅ VANTAGENS DESTA VERSÃO:
-- 1. Usa SECURITY DEFINER para ter permissões elevadas
-- 2. Mapeia CORRETAMENTE UUID → text/uuid (supabase_uid)
-- 3. Deixa o id (BIGINT) ser gerado automaticamente
-- 4. Tem EXCEPTION handler para não bloquear OAuth
-- 5. Tem ON CONFLICT para não falhar em duplicados
-- 6. Concede permissões à sequência (CRÍTICO!)
-- 7. Extrai nome e foto do metadata do OAuth

-- ⚠️ ATENÇÃO:
-- - Teste SEMPRE com uma conta Google NOVA (nunca usada antes)
-- - Se já testou com uma conta, delete-a do auth.users primeiro
-- - Verifique os logs do Supabase se algo falhar

-- 🔧 TROUBLESHOOTING:
-- Se o trigger não disparar:
-- 1. Verifique se está ENABLED: SELECT tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';
-- 2. Verifique os logs: Dashboard → Logs → Postgres Logs
-- 3. Teste manualmente inserindo um user fictício em auth.users

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
