-- ============================================
-- CHECK: Verificar duplicados e dados estranhos
-- ============================================

-- 1. Ver se há supabase_uid duplicados
SELECT supabase_uid, COUNT(*) as count
FROM public.users
GROUP BY supabase_uid
HAVING COUNT(*) > 1;

-- 2. Ver últimos 10 users criados
SELECT id, email, supabase_uid, created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- 3. Ver se há NULL em colunas obrigatórias
SELECT 
  COUNT(*) FILTER (WHERE supabase_uid IS NULL) as null_supabase_uid,
  COUNT(*) FILTER (WHERE email IS NULL) as null_email,
  COUNT(*) FILTER (WHERE name IS NULL) as null_name,
  COUNT(*) FILTER (WHERE password IS NULL) as null_password
FROM public.users;

-- 4. Tentar criar um user DIRETAMENTE via Supabase Auth
-- (Copia o UUID que aparecer e usa no próximo teste)
SELECT gen_random_uuid() as test_uuid;
