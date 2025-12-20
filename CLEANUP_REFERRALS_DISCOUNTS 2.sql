-- ============================================
-- CLEANUP: Remove Referrals & Discounts Tables
-- ============================================
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================

-- PASSO 1: Drop tabelas de referrals
DROP TABLE IF EXISTS public.referral_stats CASCADE;
DROP TABLE IF EXISTS public.referrals CASCADE;

-- PASSO 2: Drop tabelas de discounts/coupons
DROP TABLE IF EXISTS public.discount_coupons CASCADE;

-- PASSO 3: Verificar que as tabelas foram removidas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('referral_stats', 'referrals', 'discount_coupons');
-- Deve retornar vazio (0 rows)

-- ============================================
-- ✅ PRONTO! 
-- ============================================
-- Tabelas de referrals e discounts removidas
-- ============================================
