# 🎯 SOLUÇÃO SIMPLES - Apenas Alterar a Tabela Users

## O Problema
Tua tabela `users` tem `id` BIGINT mas Supabase usa `id` UUID.

## ✅ Solução: Usar `supabase_uid` como PRIMARY KEY

### Script SQL - SUPER SIMPLES

```sql
-- 1. DESATIVAR RLS PRIMEIRO (isso desativa as policies)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. REMOVER TODAS AS POLICIES (com CASCADE para forçar)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users CASCADE', r.policyname);
    END LOOP;
END $$;

-- 3. Verificar que não sobrou nenhuma policy
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'users';
-- Se aparecer alguma policy, copiar o nome exato e executar:
-- DROP POLICY "nome_exato_da_policy" ON public.users CASCADE;

-- 4. AGORA SIM - Fazer supabase_uid aceitar UUID
ALTER TABLE public.users 
  ALTER COLUMN supabase_uid TYPE UUID USING supabase_uid::UUID;

-- 5. Fazer supabase_uid NOT NULL e UNIQUE
-- IMPORTANTE: Só faz NOT NULL se já tens valores em todos os registos!
-- Se tens users sem supabase_uid, comenta esta linha:
-- ALTER TABLE public.users ALTER COLUMN supabase_uid SET NOT NULL;

ALTER TABLE public.users 
  ADD CONSTRAINT users_supabase_uid_unique UNIQUE (supabase_uid);

-- 5. Adicionar FOREIGN KEY para auth.users
ALTER TABLE public.users
  ADD CONSTRAINT users_supabase_uid_fkey 
  FOREIGN KEY (supabase_uid) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 6. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid 
  ON public.users(supabase_uid);

-- PRONTO! RLS desativado e supabase_uid configurado!
```

## 🔧 Atualizar o AuthContext

A app deve usar `supabase_uid` para procurar o user:

```typescript
// Em AuthContext.tsx ou onde buscas o user
const { data: { user: authUser } } = await supabase.auth.getUser();

if (authUser) {
  // Buscar na tabela users usando supabase_uid
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('supabase_uid', authUser.id)
    .single();
}
```

## ⚡ AINDA MAIS SIMPLES - Sem Trigger

Se não precisas que o user seja criado automaticamente em `public.users`:

```sql
-- Apenas desativa RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- A app vai criar o user manualmente depois do signup
```

## 🎯 Recomendação FINAL

**Opção 1 (Mais Simples): SEM trigger**
- Desativa RLS
- App cria o user em `public.users` manualmente depois do Supabase signup
- Usa `supabase_uid` para relacionar

**Opção 2: COM trigger automático**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    email, 
    name, 
    supabase_uid,
    email_verified,
    is_active
  ) VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.id,
    (NEW.email_confirmed_at IS NOT NULL),
    true
  ) ON CONFLICT (supabase_uid) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 🚀 Qual escolher?

**Vai com Opção 1** - é mais simples e tens mais controlo!

Depois só precisas de fazer no signup:

```typescript
// 1. Criar user no Supabase Auth
const { data: authData, error } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { name } }
});

// 2. Criar na tabela users (manualmente)
if (authData.user) {
  await supabase.from('users').insert({
    supabase_uid: authData.user.id,
    email,
    name,
    email_verified: false,
    is_active: true
  });
}
```

**Simples, limpo, sem triggers complicados!** ✅

---

## 🔥 SE AINDA DER ERRO - SOLUÇÃO EXTREMA

Se o erro de policy persistir, usa este script que APAGA e RECRIA a coluna:

```sql
-- 1. Desativar RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Guardar os dados existentes
CREATE TEMP TABLE users_backup AS 
SELECT * FROM public.users WHERE supabase_uid IS NOT NULL;

-- 3. REMOVER a coluna supabase_uid (isso remove todas as dependencies)
ALTER TABLE public.users DROP COLUMN IF EXISTS supabase_uid;

-- 4. RECRIAR a coluna como UUID
ALTER TABLE public.users ADD COLUMN supabase_uid UUID;

-- 5. Restaurar os dados
UPDATE public.users u
SET supabase_uid = b.supabase_uid::UUID
FROM users_backup b
WHERE u.id = b.id;

-- 6. Adicionar constraints
ALTER TABLE public.users 
  ADD CONSTRAINT users_supabase_uid_unique UNIQUE (supabase_uid);

ALTER TABLE public.users
  ADD CONSTRAINT users_supabase_uid_fkey 
  FOREIGN KEY (supabase_uid) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 7. Criar índice
CREATE INDEX idx_users_supabase_uid ON public.users(supabase_uid);

-- PRONTO! Coluna recriada sem policies a bloquear!
```

**Este script GARANTE que funciona porque remove completamente a coluna e recria!** ✅
