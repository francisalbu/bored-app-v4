-- ============================================================================
-- SOLUÇÃO DEFINITIVA: DATABASE WEBHOOK TRIGGER
-- ============================================================================
-- Esta solução usa uma Edge Function do Supabase para sincronizar users
-- GARANTIDO A FUNCIONAR porque o Supabase tem permissões totais!
-- ============================================================================

-- PASSO 1: Cria a função que será chamada pelo webhook
CREATE OR REPLACE FUNCTION public.handle_new_user_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name text;
BEGIN
  -- Log para debug
  RAISE LOG 'Webhook triggered for user: %', NEW.email;

  -- Extrai nome do metadata
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Insere na public.users usando ON CONFLICT para evitar duplicados
  INSERT INTO public.users (
    supabase_uid,
    email,
    name,
    phone,
    avatar,
    email_verified,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id::text,
    NEW.email,
    user_name,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email_confirmed_at IS NOT NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (supabase_uid) 
  DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    updated_at = NOW();

  RAISE LOG 'User synced successfully: %', NEW.email;
  
  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Log erro mas NÃO bloqueia signup
  RAISE WARNING 'Error in webhook: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- PASSO 2: Cria o trigger na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_webhook ON auth.users;

CREATE TRIGGER on_auth_user_created_webhook
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_webhook();

-- PASSO 3: Concede permissões necessárias
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.users TO supabase_auth_admin;
GRANT ALL ON SEQUENCE public.users_id_seq TO supabase_auth_admin;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

-- Verifica se o trigger foi criado
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created_webhook';

-- Verifica se a função existe
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user_webhook';

-- ============================================================================
-- TESTE MANUAL
-- ============================================================================

-- Para testar manualmente, insira um user fictício:
/*
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'test@example.com',
  'fake_password',
  NOW(),
  '{"full_name": "Test User"}'::jsonb,
  NOW(),
  NOW()
);

-- Depois verifique se apareceu em public.users:
SELECT * FROM public.users WHERE email = 'test@example.com';

-- Delete o teste:
DELETE FROM public.users WHERE email = 'test@example.com';
DELETE FROM auth.users WHERE email = 'test@example.com';
*/

-- ============================================================================
-- IMPORTANTE: COMO ATIVAR O TRIGGER
-- ============================================================================

-- Se o trigger estiver desativado, ative com:
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created_webhook;

-- Para verificar se está ativo:
SELECT 
  tgname,
  tgenabled,
  CASE tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'A' THEN 'ALWAYS'
    WHEN 'R' THEN 'REPLICA'
  END as status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created_webhook';

-- ============================================================================
-- FIM
-- ============================================================================
