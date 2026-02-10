-- ============================================================================
-- SOLUÇÃO FINAL SEM TRIGGERS - USA SUPABASE REALTIME/WEBHOOKS
-- ============================================================================
-- Como não podemos modificar a tabela auth.users (é do sistema),
-- vamos usar uma abordagem DIFERENTE e OFICIAL do Supabase
-- ============================================================================

-- ============================================================================
-- ABORDAGEM 1: FUNÇÃO QUE O BACKEND CHAMA (MAIS SIMPLES)
-- ============================================================================
-- Esta função vai ser chamada pelo backend quando um user faz OAuth login

CREATE OR REPLACE FUNCTION public.sync_auth_user(
  p_supabase_uid text,
  p_email text,
  p_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id bigint;
  v_result json;
BEGIN
  -- Insere ou atualiza o user
  INSERT INTO public.users (
    supabase_uid,
    email,
    name,
    avatar,
    email_verified,
    created_at,
    updated_at
  )
  VALUES (
    p_supabase_uid,
    p_email,
    COALESCE(p_name, split_part(p_email, '@', 1)),
    p_avatar_url,
    true,  -- OAuth users são sempre verificados
    NOW(),
    NOW()
  )
  ON CONFLICT (supabase_uid) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    avatar = COALESCE(EXCLUDED.avatar, public.users.avatar),
    updated_at = NOW()
  RETURNING id INTO v_user_id;

  -- Busca o user completo
  SELECT json_build_object(
    'id', id,
    'supabase_uid', supabase_uid,
    'email', email,
    'name', name,
    'avatar', avatar,
    'role', role,
    'created_at', created_at
  ) INTO v_result
  FROM public.users
  WHERE id = v_user_id;

  RETURN v_result;
END;
$$;

-- Concede permissões
GRANT EXECUTE ON FUNCTION public.sync_auth_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_auth_user TO anon;

COMMENT ON FUNCTION public.sync_auth_user IS 
'Sincroniza um user do auth.users para public.users. 
Chamada pelo backend após OAuth login bem-sucedido.';

-- ============================================================================
-- TESTE A FUNÇÃO
-- ============================================================================
-- Execute isto para testar (substitua pelos valores reais):
/*
SELECT public.sync_auth_user(
  'uuid-do-user-aqui'::text,
  'teste@gmail.com',
  'Nome do User',
  'https://url-da-foto.jpg'
);
*/

-- ============================================================================
-- PRÓXIMO PASSO: MODIFICAR O BACKEND
-- ============================================================================
-- Agora você precisa chamar esta função no backend quando o OAuth terminar
-- Vou criar o código para você adicionar no AuthContext ou no backend
-- ============================================================================
