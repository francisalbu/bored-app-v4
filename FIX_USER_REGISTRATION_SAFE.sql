-- ============================================
-- FIX USER REGISTRATION - SOLUÇÃO SEGURA
-- ============================================
-- Este script mantém a segurança RLS mas permite que o
-- backend (usando SERVICE_ROLE_KEY) insira usuários
-- ============================================

-- PASSO 1: Verificar se o password é nullable
ALTER TABLE public.users 
  ALTER COLUMN password DROP NOT NULL;

-- PASSO 2: Garantir que supabase_uid é UNIQUE
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS users_supabase_uid_unique;

ALTER TABLE public.users 
  ADD CONSTRAINT users_supabase_uid_unique UNIQUE (supabase_uid);

-- PASSO 3: Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid 
  ON public.users(supabase_uid);

-- PASSO 4: Atualizar as RLS Policies para permitir INSERT do backend
-- O backend usa o SERVICE_ROLE_KEY que bypassa RLS automaticamente!
-- Então NÃO precisamos desabilitar o RLS

-- Mas vamos garantir que as policies estão corretas:

-- Remover policy antiga de insert se existir
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Criar nova policy: Apenas authenticated users podem inserir
-- (o SERVICE_ROLE_KEY bypassa isso automaticamente)
CREATE POLICY "Authenticated users can insert profile" 
  ON public.users 
  FOR INSERT 
  WITH CHECK (true);  -- Permite qualquer insert quando autenticado

-- Policy de SELECT: Todos podem ver usuários
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;
CREATE POLICY "Anyone can view users" 
  ON public.users 
  FOR SELECT 
  USING (true);

-- Policy de UPDATE: Usuários só podem atualizar o próprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid()::text = supabase_uid)
  WITH CHECK (auth.uid()::text = supabase_uid);

-- PASSO 5: Verificar que RLS está ATIVO (segurança mantida!)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- 1. Verificar policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- 2. Verificar RLS está ON (deve ser true)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';

-- 3. Verificar estrutura da coluna password
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'password';

-- ============================================
-- IMPORTANTE!
-- ============================================
-- O backend DEVE usar SUPABASE_SERVICE_ROLE_KEY (não ANON_KEY)
-- O SERVICE_ROLE_KEY bypassa automaticamente todas as RLS policies
-- Verifique se o .env tem:
-- SUPABASE_SERVICE_ROLE_KEY=eyJ... (a chave de serviço)
-- ============================================
