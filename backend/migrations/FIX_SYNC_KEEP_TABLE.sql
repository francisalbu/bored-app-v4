-- =====================================================
-- SOLUÇÃO SIMPLES: Trigger + Migração de Dados Existentes
-- =====================================================
-- Este script:
-- 1. Cria trigger para sincronizar NOVOS usuários automaticamente
-- 2. Migra usuários EXISTENTES de auth.users para public.users
-- 3. Mantém a tabela atual intacta
-- =====================================================

-- PASSO 1: Criar função do trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (supabase_uid, email, name, email_verified)
  VALUES (
    NEW.id,  -- Mantém como UUID
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name', 
      split_part(NEW.email, '@', 1)
    ),
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (supabase_uid) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    email_verified = EXCLUDED.email_verified,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log erro mas não bloqueia o signup
  RAISE WARNING 'Erro ao criar usuário: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASSO 2: Criar trigger para NOVOS usuários
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- PASSO 3: Migrar usuários EXISTENTES de auth.users que não estão em public.users
-- Apenas migra usuários que NÃO existem por supabase_uid OU por email
INSERT INTO public.users (supabase_uid, email, name, email_verified, created_at)
SELECT 
  au.id as supabase_uid,  -- Mantém como UUID
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1)
  ) as name,
  au.email_confirmed_at IS NOT NULL as email_verified,
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu 
  WHERE pu.supabase_uid = au.id OR pu.email = au.email
);

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
-- Ver usuários migrados
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  pu.id as public_id,
  pu.supabase_uid,
  pu.email as public_email,
  pu.name,
  CASE 
    WHEN pu.id IS NULL THEN '❌ Missing'
    ELSE '✅ Synced'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON pu.supabase_uid = au.id
ORDER BY au.created_at DESC
LIMIT 10;

-- Contar sincronização
SELECT 
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  COUNT(pu.id) as synced_to_public,
  (SELECT COUNT(*) FROM auth.users) - COUNT(pu.id) as missing_users
FROM auth.users au
LEFT JOIN public.users pu ON pu.supabase_uid = au.id;

-- Verificar trigger ativo
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  CASE tgenabled
    WHEN 'O' THEN '✅ Enabled'
    WHEN 'D' THEN '❌ Disabled'
    ELSE 'Unknown'
  END as status
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
