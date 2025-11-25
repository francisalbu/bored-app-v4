# ✅ SCRIPT FINAL - COPIA E COLA ISTO

## Passo 1: Vai ao Supabase Dashboard
https://supabase.com/dashboard/project/hnivuisqktlrusyqywaz

## Passo 2: Clica em "SQL Editor" (no menu à esquerda)

## Passo 3: COPIA E COLA ESTE SCRIPT COMPLETO:

```sql
-- ============================================
-- SCRIPT COMPLETO - NÃO ALTERES NADA
-- ============================================

-- 1. Desativar RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Remover a coluna supabase_uid (remove todas as policies)
ALTER TABLE public.users DROP COLUMN IF EXISTS supabase_uid CASCADE;

-- 3. Recriar a coluna como UUID
ALTER TABLE public.users ADD COLUMN supabase_uid UUID;

-- 4. Adicionar UNIQUE constraint
ALTER TABLE public.users 
  ADD CONSTRAINT users_supabase_uid_unique UNIQUE (supabase_uid);

-- 5. Adicionar FOREIGN KEY para auth.users
ALTER TABLE public.users
  ADD CONSTRAINT users_supabase_uid_fkey 
  FOREIGN KEY (supabase_uid) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 6. Criar índice
CREATE INDEX idx_users_supabase_uid ON public.users(supabase_uid);

-- PRONTO! ✅
```

## Passo 4: Clica em "RUN" (botão verde no canto inferior direito)

## Passo 5: Deve aparecer "Success. No rows returned"

## ✅ ACABOU!

Agora testa no TestFlight:
- Cria uma conta nova
- Deve funcionar!

---

## 🔴 Se der erro, manda-me screenshot do erro!
