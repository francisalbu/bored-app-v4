-- ============================================
-- TESTE FINAL: Simular INSERT exato do backend
-- ============================================

-- Primeiro, criar um user no Supabase Auth manualmente:
-- 1. Vai a Authentication > Users > Invite User
-- 2. Email: testemanual123@example.com
-- 3. Password: TestPass123!
-- 4. Depois de criar, copia o UUID dele
-- 5. Cola aqui embaixo onde diz 'COLA_UUID_AQUI'

-- Simular o INSERT que o backend faz:
INSERT INTO public.users (
  supabase_uid,
  email,
  name,
  phone,
  password,
  created_at,
  updated_at
) VALUES (
  'COLA_UUID_AQUI',  -- ← COLA O UUID DO USER QUE CRIASTE
  'testemanual123@example.com',
  'Test Manual',
  NULL,
  '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJ',
  NOW(),
  NOW()
) RETURNING id, email, supabase_uid;

-- Se isto funcionar: problema é no código
-- Se isto falhar: mostra-me o erro EXATO
