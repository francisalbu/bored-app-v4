-- ============================================================================
-- SOLUÇÃO DEFINITIVA: LIMPAR TUDO E COMEÇAR DO ZERO
-- ============================================================================
-- FUCK TRIGGERS! Vamos usar apenas o backend sync que JÁ FUNCIONA!
-- ============================================================================

-- PASSO 1: REMOVE O TRIGGER (se existir)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- PASSO 2: REMOVE A FUNÇÃO (se existir)
DROP FUNCTION IF EXISTS public.handle_new_user();

-- PASSO 3: LIMPA A TABELA users (CUIDADO - ISTO APAGA TUDO!)
-- COMENTE ESTA LINHA SE JÁ TEM USERS IMPORTANTES!
TRUNCATE TABLE public.users RESTART IDENTITY CASCADE;

-- PASSO 4: GARANTE QUE A TABELA TEM A ESTRUTURA CORRETA
-- Verifica se a coluna supabase_uid existe e é UNIQUE
DO $$ 
BEGIN
    -- Adiciona índice UNIQUE se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'users' 
        AND indexname = 'users_supabase_uid_key'
    ) THEN
        ALTER TABLE public.users ADD CONSTRAINT users_supabase_uid_key UNIQUE (supabase_uid);
    END IF;
END $$;

-- PASSO 5: CRIA UM ÍNDICE ADICIONAL PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid_email ON public.users(supabase_uid, email);

-- PASSO 6: DESATIVA RLS (já que vamos usar o backend para controlo)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- PASSO 7: REMOVE TODAS AS POLÍTICAS RLS
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.users;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

-- Verifica estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verifica índices
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users' 
    AND schemaname = 'public';

-- Verifica se RLS está desativado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users' 
    AND schemaname = 'public';

-- ============================================================================
-- TUDO LIMPO!
-- ============================================================================
-- Agora o sistema vai funcionar APENAS com o backend sync:
-- 1. User faz login OAuth
-- 2. Supabase cria em auth.users
-- 3. AuthContext chama backend /auth/supabase/me
-- 4. Backend cria/atualiza em public.users
-- 
-- SIMPLES, SEM TRIGGERS, SEM PROBLEMAS!
-- ============================================================================
