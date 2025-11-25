-- ============================================================================
-- SOLUÇÃO EMERGÊNCIA: DESATIVAR RLS + SIMPLIFICAR TRIGGER
-- ============================================================================
-- Esta é uma solução TEMPORÁRIA para debug
-- Vamos DESATIVAR RLS na tabela users para ver se é isso que está a bloquear
-- ============================================================================

-- PASSO 1: DESATIVA RLS (TEMPORARIAMENTE)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- PASSO 2: DROP todas as políticas RLS (vamos recriar depois)
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.users;

-- PASSO 3: REMOVE trigger antigo (se existir)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- PASSO 4: CRIA FUNÇÃO SUPER SIMPLES (SEM EXCEPTION HANDLER - queremos VER o erro!)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log básico
  RAISE NOTICE 'TRIGGER DISPARADO! User: %, ID: %', NEW.email, NEW.id;

  -- Insert SUPER SIMPLES
  INSERT INTO public.users (
    supabase_uid,
    email,
    name
  )
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (supabase_uid) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RAISE NOTICE 'USER INSERIDO COM SUCESSO! supabase_uid: %', NEW.id::text;
  
  RETURN NEW;
END;
$$;

-- PASSO 5: CRIA TRIGGER
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- PASSO 6: CONCEDE TODAS AS PERMISSÕES POSSÍVEIS
GRANT ALL ON public.users TO supabase_auth_admin;
GRANT ALL ON public.users TO postgres;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT ALL ON SEQUENCE public.users_id_seq TO supabase_auth_admin;
GRANT ALL ON SEQUENCE public.users_id_seq TO postgres;
GRANT ALL ON SEQUENCE public.users_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.users_id_seq TO anon;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

-- Verifica se RLS está desativado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';
-- Deve retornar: rowsecurity = false

-- Verifica se função existe
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname = 'handle_new_user';
-- Deve retornar: handle_new_user | true

-- Verifica se trigger existe
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
-- Deve retornar: on_auth_user_created | O

-- ============================================================================
-- TESTE AGORA!
-- ============================================================================
-- 1. Execute este script COMPLETO no SQL Editor
-- 2. Faça login com uma conta Google NOVA
-- 3. Verifique: SELECT * FROM public.users ORDER BY created_at DESC LIMIT 5;
-- 4. Se AINDA NÃO funcionar, vá para Dashboard → Logs → Postgres Logs
--    e procure por "TRIGGER DISPARADO" ou mensagens de erro
-- ============================================================================
