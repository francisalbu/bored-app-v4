# 🔥 FIX CRÍTICO - Auth não funciona

## 🎯 Problema
**"Database error creating new user"** - O Supabase não consegue criar utilizadores.

## ✅ Solução URGENTE

### 1. **Ir ao Supabase Dashboard AGORA**

https://supabase.com/dashboard/project/hnivuisqktlrusyqywaz

### 2. **Authentication > Settings**

#### Email Auth:
- ✅ **Enable Email Signup** - ATIVAR
- ✅ **Confirm Email** - DESATIVAR (por agora, para debug)
- ✅ **Enable Email Confirmations** - DESATIVAR

#### Google OAuth:
- ✅ **Enabled** - ATIVAR
- Client ID: (já deve estar configurado)
- Client Secret: (já deve estar configurado)

### 3. **SQL Editor - Executar ESTE script**

```sql
-- 1. DESATIVAR RLS na tabela users (JÁ EXISTE)
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

-- 2. Ver a estrutura da tua tabela users
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users';

-- 3. Remover triggers antigos que podem estar a dar conflito
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 4. Criar trigger CORRETO para a TUA estrutura de users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir na tabela public.users quando auth.users criar user
  -- NOTA: O teu id é BIGINT (auto-increment) e supabase_uid guarda o UUID
  INSERT INTO public.users (
    email, 
    name, 
    supabase_uid,
    email_verified,
    is_active,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name', 
      NEW.raw_user_meta_data->>'full_name', 
      SPLIT_PART(NEW.email, '@', 1)
    ),
    NEW.id::TEXT,  -- UUID do Supabase como TEXT em supabase_uid
    (NEW.email_confirmed_at IS NOT NULL),  -- true se email confirmado
    true,  -- is_active = true por padrão
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO NOTHING;  -- Ignora se email já existir
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro mas não falha o signup
    RAISE WARNING 'Erro ao criar user em public.users: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Verificar users existentes
SELECT COUNT(*) as total_users_auth FROM auth.users;
SELECT COUNT(*) as total_users_public FROM public.users;

-- 7. CRITICAL: Sincronizar users de auth.users para public.users
INSERT INTO public.users (email, name, supabase_uid, email_verified, is_active, created_at, updated_at)
SELECT 
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', SPLIT_PART(au.email, '@', 1)),
  au.id::TEXT,
  (au.email_confirmed_at IS NOT NULL),
  true,
  au.created_at,
  au.updated_at
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.supabase_uid = au.id::TEXT)
ON CONFLICT (email) DO NOTHING;
```

### 4. **Authentication > URL Configuration**

**Redirect URLs** (adicionar TODAS):
```
boredtourist://
boredtourist://auth/callback
exp://192.168.1.145:8081
exp://192.168.1.145:8081/--/auth/callback
http://localhost:8081
```

**Site URL**:
```
boredtourist://
```

### 5. **Testar no SQL Editor**

```sql
-- Tentar criar um user manualmente para ver o erro exato
SELECT auth.signup(
  '{"email": "teste@teste.com", "password": "teste123"}'::jsonb
);

-- Ver o último erro
SELECT * FROM auth.audit_log_entries 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 🔧 Se AINDA não funcionar

### Opção A: Desabilitar Email Confirmation TOTALMENTE

No Dashboard > Authentication > Settings:
- **Confirm email**: DESATIVAR
- **Secure email change**: DESATIVAR  
- **Enable email confirmations**: DESATIVAR

### Opção B: Simplificar - Remover trigger

```sql
-- Remover o trigger problemático
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Desativar RLS
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
```

### Opção C: Reset TOTAL (último recurso)

```sql
-- CUIDADO: Isto apaga TUDO
DELETE FROM auth.users;
DELETE FROM public.profiles;

-- Reiniciar sequences
ALTER SEQUENCE IF EXISTS auth.refresh_tokens_id_seq RESTART WITH 1;
```

---

## 🧪 Teste Rápido

Depois de aplicar as correções:

1. **Tentar criar conta com email**:
   - Email: `teste123@teste.com`
   - Password: `teste123`
   - Nome: `Teste User`

2. **Ver se aparece erro** - Se sim, mandar screenshot

3. **Ver no Dashboard** > Authentication > Users
   - O user deve aparecer

4. **Tentar login com Google**
   - Deve funcionar sem loops

---

## 📱 Depois de corrigir no Supabase

```bash
# Fazer novo build
eas build --platform ios

# Aguardar o build completar
# Upload para TestFlight
# Testar no dispositivo real
```

---

## ⚠️ CRITICAL: O que está a falhar

O erro **"Database error creating new user"** significa:

1. ❌ Supabase não consegue INSERT em `auth.users`
2. ❌ Ou não consegue criar o profile em `public.profiles`
3. ❌ Ou o trigger está a dar erro
4. ❌ Ou RLS está a bloquear

**A solução é desativar RLS e simplificar o trigger.**

---

## 🎯 Resultado Esperado

Depois de aplicar isto:

✅ Email signup funciona
✅ Email login funciona
✅ Google OAuth funciona
✅ Sem loops
✅ User aparece no Dashboard

---

## 🔍 DEBUG: Ver qual é o erro EXATO

Depois de executar o script acima, faz este teste:

```sql
-- Tentar criar um user de teste
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'teste@teste.com',
  crypt('teste123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Teste User"}',
  NOW(),
  NOW(),
  '',
  ''
);

-- Se der erro, VER O ERRO AQUI:
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%INSERT INTO%users%' 
ORDER BY calls DESC LIMIT 5;
```

---

## ⚡ QUICK FIX - Se ainda não funcionar

**OPÇÃO MAIS SIMPLES: Ignorar a tabela public.users**

```sql
-- Remover o trigger totalmente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Desativar RLS
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

-- A app vai usar APENAS auth.users do Supabase
-- Não precisa de public.users para funcionar
```

Depois disto, **testar imediatamente** no TestFlight.

---

**AGORA VAI LÁ E APLICA ISTO! 🚀**

**Passos EXATOS:**
1. ✅ Dashboard > SQL Editor
2. ✅ Copiar e colar o script do ponto 3
3. ✅ Run
4. ✅ Ver se dá erro
5. ✅ Se der erro, MANDAR SCREENSHOT
6. ✅ Se não der erro, testar signup no TestFlight
