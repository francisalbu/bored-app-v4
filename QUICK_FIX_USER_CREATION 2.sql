-- ============================================
-- 🔥 QUICK FIX: Database error saving new user
-- ============================================
-- O PROBLEMA: O trigger 'on_auth_user_created' está a falhar
-- quando tenta inserir na tabela public.users
-- 
-- SOLUÇÃO: Remover o trigger problemático e/ou desabilitar RLS
-- ============================================

-- PASSO 1: Ver o que está a causar o erro
-- Corre isto primeiro para diagnóstico:

SELECT 'TRIGGERS em auth.users:' as info;
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth' AND event_object_table = 'users';

SELECT 'Estrutura da tabela public.users:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

SELECT 'RLS Status:' as info;
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users';

-- ============================================
-- PASSO 2: SOLUÇÃO RÁPIDA (executa tudo junto)
-- ============================================

-- 2.1 Desativar RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2.2 Remover trigger problemático
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2.3 Conceder permissões
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.users TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;

-- ============================================
-- ✅ TESTE AGORA!
-- ============================================
-- Vai ao Supabase Dashboard → Authentication → Users
-- Clica "Invite user" e tenta novamente
-- 
-- SE FUNCIONAR: O problema era o trigger ou RLS
-- SE NÃO FUNCIONAR: O problema é na estrutura da tabela
-- ============================================

-- PASSO 3 (OPCIONAL): Se precisares do trigger de volta
-- Corre isto DEPOIS de testares que funciona sem trigger

/*
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, email_verified, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.email_confirmed_at IS NOT NULL), false),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.users.email),
    name = COALESCE(EXCLUDED.name, public.users.name),
    email_verified = COALESCE(EXCLUDED.email_verified, public.users.email_verified),
    updated_at = NOW();
    
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
*/
