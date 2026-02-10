-- ============================================
-- TESTE FINAL: Inserir exatamente como o backend faz
-- ============================================

-- Simular EXATAMENTE o que o backend está a tentar fazer:
DO $$
DECLARE
  test_uuid text := 'df959758-239e-49fb-93e7-c6c83ffc93e1'; -- UUID de um user existente
  test_email text := 'teste_backend_' || floor(random() * 10000)::text || '@example.com';
  test_password text := '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJ';
BEGIN
  -- Tentar inserir com supabase_uid como TEXT (como o backend envia)
  INSERT INTO public.users (
    supabase_uid,
    email,
    name,
    password,
    created_at,
    updated_at
  ) VALUES (
    test_uuid,  -- STRING, não UUID cast
    test_email,
    'Test Backend Simulation',
    test_password,
    NOW(),
    NOW()
  );
  
  RAISE NOTICE 'SUCCESS: User inserted with string UUID';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERROR: %', SQLERRM;
END $$;

-- Verificar se criou
SELECT id, email, supabase_uid 
FROM public.users 
WHERE email LIKE 'teste_backend_%@example.com'
ORDER BY created_at DESC
LIMIT 1;
