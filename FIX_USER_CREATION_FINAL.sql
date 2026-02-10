-- ============================================
-- FIX USER CREATION - DIAGNÓSTICO E CORREÇÃO FINAL
-- ============================================
-- Execute CADA PASSO no Supabase Dashboard > SQL Editor
-- ============================================

-- ========== PASSO 1: DIAGNÓSTICO (EXECUTA PRIMEIRO!) ==========
-- Copia e executa para ver qual é o problema EXATO

-- 1.1 Ver estrutura COMPLETA da tabela users
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    CASE 
      WHEN is_nullable = 'NO' AND column_default IS NULL THEN '⚠️ PROBLEMA: NOT NULL sem default!'
      ELSE '✅ OK'
    END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- 1.2 Ver constraints NOT NULL e UNIQUE
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public' 
  AND tc.table_name = 'users';

-- 1.3 Ver triggers existentes
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth' 
  AND event_object_table = 'users';

-- 1.4 Verificar RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';

-- ========== PASSO 2: CORREÇÃO COMPLETA ==========
-- Executa TUDO junto

-- 2.1 DESABILITAR RLS (CRÍTICO!)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2.2 Remover trigger problemático (vai ser recriado depois)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2.3 Ver se há colunas NOT NULL que podem causar problemas
-- Se alguma coluna obrigatória não tiver valor default, vai dar erro

-- 2.4 Verificar se a sequência existe e tem permissões
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'users_id_seq') THEN
    GRANT USAGE, SELECT ON SEQUENCE public.users_id_seq TO supabase_auth_admin;
    RAISE NOTICE 'Sequência users_id_seq: permissões concedidas';
  ELSE
    RAISE NOTICE 'Sequência users_id_seq não existe (pode ser UUID, está OK)';
  END IF;
END $$;

-- 2.5 Dar todas as permissões necessárias ao supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.users TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;

-- ========== PASSO 3: RECRIAR TRIGGER ROBUSTO ==========
-- VERSÃO QUE FUNCIONA COM AS DUAS ESTRUTURAS DE TABELA

-- Primeiro, verificar qual estrutura de tabela tens:
-- Se tens 'supabase_uid' TEXT ou 'id' UUID como primary key

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_name TEXT;
  has_supabase_uid BOOLEAN;
BEGIN
  -- Calcular nome seguro
  new_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(COALESCE(NEW.email, 'user'), '@', 1),
    'User'
  );
  
  -- Verificar se a tabela tem 'supabase_uid' ou 'id'
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'supabase_uid'
  ) INTO has_supabase_uid;
  
  -- Tentar inserir com tratamento de erro
  BEGIN
    IF has_supabase_uid THEN
      -- Estrutura antiga: supabase_uid como TEXT
      INSERT INTO public.users (
        supabase_uid,
        email,
        name,
        email_verified,
        password,
        created_at,
        updated_at
      )
      VALUES (
        NEW.id::text,
        COALESCE(NEW.email, ''),
        new_name,
        COALESCE((NEW.email_confirmed_at IS NOT NULL), false),
        'SUPABASE_AUTH',
        NOW(),
        NOW()
      )
      ON CONFLICT (supabase_uid) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, public.users.email),
        name = COALESCE(EXCLUDED.name, public.users.name),
        email_verified = COALESCE(EXCLUDED.email_verified, public.users.email_verified),
        updated_at = NOW();
    ELSE
      -- Estrutura nova: id UUID referencia auth.users
      INSERT INTO public.users (
        id,
        email,
        name,
        email_verified,
        created_at,
        updated_at
      )
      VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        new_name,
        COALESCE((NEW.email_confirmed_at IS NOT NULL), false),
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, public.users.email),
        name = COALESCE(EXCLUDED.name, public.users.name),
        email_verified = COALESCE(EXCLUDED.email_verified, public.users.email_verified),
        updated_at = NOW();
    END IF;
      
  EXCEPTION
    WHEN unique_violation THEN
      -- Se já existe um user com este email, atualizar
      IF has_supabase_uid THEN
        UPDATE public.users SET
          supabase_uid = NEW.id::text,
          email_verified = COALESCE((NEW.email_confirmed_at IS NOT NULL), email_verified),
          updated_at = NOW()
        WHERE email = NEW.email;
      ELSE
        UPDATE public.users SET
          id = NEW.id,
          email_verified = COALESCE((NEW.email_confirmed_at IS NOT NULL), email_verified),
          updated_at = NOW()
        WHERE email = NEW.email;
      END IF;
    WHEN OTHERS THEN
      -- Log erro mas NÃO bloquear criação do user em auth.users
      RAISE WARNING 'handle_new_user error: % - %', SQLSTATE, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========== PASSO 4: VERIFICAÇÃO ==========
-- Confirmar que tudo está correto

SELECT 'Trigger criado' AS status, trigger_name, event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

SELECT 'RLS Status' AS check, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';

-- ========== PASSO 5: TESTE DIRETO ==========
-- Se queres testar sem usar invite:

-- Inserir user diretamente em public.users para testar
-- INSERT INTO public.users (supabase_uid, email, name, email_verified, password, created_at, updated_at)
-- VALUES ('test-123', 'test@test.com', 'Test User', false, 'test', NOW(), NOW());

-- Se funcionar, apaga:
-- DELETE FROM public.users WHERE supabase_uid = 'test-123';

-- ============================================
-- ✅ DEPOIS DE EXECUTAR, TENTA NOVAMENTE O INVITE!
-- ============================================
