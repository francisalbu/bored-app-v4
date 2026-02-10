-- ============================================
-- DEBUG: Ver se users antigos têm password
-- ============================================

SELECT 
  id,
  email,
  name,
  password IS NOT NULL as tem_password,
  LENGTH(password) as tamanho_password,
  created_at
FROM public.users 
ORDER BY created_at DESC 
LIMIT 10;

-- ============================================
-- Quero saber:
-- 1. Os users antigos têm password?
-- 2. Qual o tamanho da hash bcrypt?
-- ============================================
