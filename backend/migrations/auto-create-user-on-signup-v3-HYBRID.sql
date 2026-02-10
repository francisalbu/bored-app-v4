-- ============================================================================
-- VERSÃO 3: HYBRID - SECURITY DEFINER + Error Handling
-- ============================================================================
-- Esta versão combina o SECURITY DEFINER (para permissões elevadas)
-- com proteções para não bloquear o OAuth em caso de erro.
--
-- IMPORTANTE: Execute isto no Supabase SQL Editor
-- ============================================================================

-- 1️⃣ CRIAR FUNÇÃO COM SECURITY DEFINER + EXCEPTION HANDLER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER -- Executa com permissões elevadas do criador
SET search_path = public -- Evita ambiguidade de schemas
LANGUAGE plpgsql
AS $$
BEGIN
  -- Tenta criar o utilizador na tabela public.users
  BEGIN
    INSERT INTO public.users (
      supabase_uid,  -- A nossa tabela usa 'supabase_uid' (text), não 'id'
      email,
      name,
      phone,
      verified,
      points,
      role,
      avatar_url,
      notification_preferences,
      language_preference,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id::text,                                    -- UUID → text
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 
               NEW.raw_user_meta_data->>'name', 
               split_part(NEW.email, '@', 1)),         -- Fallback para nome
      NEW.phone,
      NEW.email_confirmed_at IS NOT NULL,              -- Verificado?
      0,                                                -- Pontos iniciais
      'user',                                           -- Role padrão
      NEW.raw_user_meta_data->>'avatar_url',           -- Avatar do OAuth
      jsonb_build_object(
        'email', true,
        'push', true,
        'sms', false
      ),
      'pt',                                             -- Idioma padrão
      COALESCE(NEW.created_at, NOW()),
      NOW()
    )
    ON CONFLICT (supabase_uid) 
    DO UPDATE SET
      email = EXCLUDED.email,
      name = COALESCE(EXCLUDED.name, public.users.name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
      verified = EXCLUDED.verified,
      updated_at = NOW();

  EXCEPTION
    WHEN OTHERS THEN
      -- Em caso de erro, APENAS regista no log do Postgres
      -- MAS NÃO BLOQUEIA a criação do utilizador em auth.users
      RAISE WARNING 'Erro ao criar utilizador em public.users: %. SQLSTATE: %', 
                    SQLERRM, SQLSTATE;
      -- IMPORTANTE: Retornamos NEW para permitir que o signup continue
  END;

  -- Sempre retorna NEW para não bloquear o signup
  RETURN NEW;
END;
$$;


-- 2️⃣ CONCEDER PERMISSÕES
-- ----------------------------------------------------------------------------
-- A função precisa de permissão para ser executada pelo sistema de auth
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- Concede permissão de INSERT e UPDATE na tabela public.users
-- (Necessário porque o SECURITY DEFINER vai executar com as nossas permissões)
GRANT INSERT, UPDATE ON public.users TO supabase_auth_admin;


-- 3️⃣ REMOVER TRIGGER ANTIGO (SE EXISTIR)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;


-- 4️⃣ CRIAR NOVO TRIGGER
-- ----------------------------------------------------------------------------
-- TIMING: AFTER INSERT (para ter acesso ao NEW.id gerado)
-- EVENT: INSERT (quando um novo utilizador é criado)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- 5️⃣ VERIFICAÇÃO
-- ============================================================================
-- Execute estas queries para confirmar que tudo está correto:

-- Ver a função criada
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  provolatile as volatility
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Ver o trigger criado
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Ver permissões concedidas
SELECT 
  grantee, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'users' 
  AND table_schema = 'public';


-- ============================================================================
-- 6️⃣ TESTE (DEPOIS DE APLICAR)
-- ============================================================================
/*
1. Abra um terminal e execute:
   supabase functions deploy test-trigger --no-verify-jwt

2. Ou teste com um novo login OAuth:
   - Use uma conta Google que NUNCA foi usada antes
   - Faça login na app
   - Verifique se o utilizador aparece em AMBAS as tabelas:

SELECT id, email FROM auth.users WHERE email = 'seuemail@gmail.com';
SELECT supabase_uid, email FROM public.users WHERE email = 'seuemail@gmail.com';

3. Verifique se os IDs correspondem:
   - auth.users.id (UUID) = public.users.supabase_uid (text)
*/


-- ============================================================================
-- ⚠️ NOTAS IMPORTANTES
-- ============================================================================
/*
1. SECURITY DEFINER vs SECURITY INVOKER:
   - DEFINER: Executa com permissões do criador (postgres/supabase_admin)
   - INVOKER: Executa com permissões do utilizador que chama
   
   Usamos DEFINER porque o trigger é ativado pelo sistema de auth,
   que pode não ter permissões diretas na public.users.

2. EXCEPTION HANDLER:
   É CRÍTICO ter o bloco EXCEPTION para não bloquear o OAuth.
   Se houver qualquer erro (constraint, RLS, etc), o signup continua.

3. ON CONFLICT:
   Previne erros se o utilizador já existe (edge case de retry).

4. GRANT PERMISSIONS:
   supabase_auth_admin precisa de INSERT/UPDATE na public.users
   para a função funcionar com SECURITY DEFINER.
*/
