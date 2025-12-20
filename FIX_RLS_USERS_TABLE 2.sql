-- ============================================
-- FIX RLS POLICIES FOR USERS TABLE
-- ============================================
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================

-- PASSO 1: Verificar estado atual do RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';
-- Se rowsecurity = true, RLS está ativo

-- PASSO 2: Ver políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- PASSO 3: Remover todas as políticas antigas
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;

-- PASSO 4: Criar política que permite ao SERVICE_ROLE_KEY inserir
-- (O backend usa SERVICE_ROLE_KEY, que bypassa RLS automaticamente)
-- Mas vamos garantir que está correto:

-- Política para permitir que authenticated users vejam seu próprio perfil
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid()::text = supabase_uid);

-- Política para permitir que authenticated users atualizem seu próprio perfil  
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid()::text = supabase_uid)
WITH CHECK (auth.uid()::text = supabase_uid);

-- PASSO 5: Verificar estrutura da coluna password
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name IN ('password', 'supabase_uid', 'email');

-- ============================================
-- ✅ IMPORTANTE!
-- ============================================
-- O SERVICE_ROLE_KEY (usado pelo backend) bypassa RLS automaticamente
-- Não precisa de políticas de INSERT para o backend
-- As políticas acima são apenas para users autenticados via app
-- ============================================
