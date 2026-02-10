-- ============================================
-- TESTE: Supabase aceita string em coluna UUID?
-- ============================================
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================

-- TESTE: Inserir UUID como STRING (como o Supabase-js faz)
INSERT INTO public.users (
  supabase_uid,
  email,
  name,
  password,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,  -- Cast explícito
  'teste_uuid_' || floor(random() * 10000)::text || '@example.com',
  'Test UUID',
  '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJ',
  NOW(),
  NOW()
) RETURNING id, email, supabase_uid;

-- Se funcionar: Postgres aceita string → uuid
-- Se falhar: Precisamos fazer cast no backend

-- ============================================
-- CLEANUP: Apagar o user de teste
-- ============================================
DELETE FROM public.users 
WHERE email LIKE 'teste_uuid_%@example.com';
