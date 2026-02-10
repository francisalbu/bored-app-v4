-- ============================================
-- TESTE DIRETO: Inserir user manualmente
-- ============================================
-- Execute no Supabase Dashboard > SQL Editor
-- Isto vai mostrar o ERRO EXATO
-- ============================================

-- TESTE 1: Inserir um user diretamente
INSERT INTO public.users (
  supabase_uid,
  email,
  name,
  password,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid()::text,
  'teste_manual_' || floor(random() * 10000)::text || '@example.com',
  'Test User Manual',
  '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJ',  -- Fake bcrypt hash
  NOW(),
  NOW()
);

-- Se der erro, copia a mensagem COMPLETA e envia para mim
-- Se funcionar, significa que o backend está a enviar dados errados

-- ============================================
-- TESTE 2: Ver se há users existentes
-- ============================================
SELECT id, email, name, supabase_uid, created_at 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 5;

-- ============================================
-- TESTE 3: Ver TODAS as colunas e constraints
-- ============================================
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;
