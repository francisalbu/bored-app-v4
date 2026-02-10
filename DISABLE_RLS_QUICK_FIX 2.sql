-- ============================================
-- SOLUÇÃO RÁPIDA: Desabilitar RLS temporariamente
-- ============================================
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================

-- Desabilitar RLS na tabela users (temporário para debug)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Verificar
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';
-- Deve retornar: rowsecurity = false

-- ============================================
-- ✅ TESTA AGORA!
-- ============================================
-- Tenta criar um user novo na app
-- Deve funcionar!
-- ============================================
