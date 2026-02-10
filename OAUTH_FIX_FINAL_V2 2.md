# SOLUÇÃO FINAL: Auto-Sync de Utilizadores OAuth

## O que aconteceu

1. ✅ OAuth estava a funcionar - utilizadores eram criados em `auth.users`
2. ❌ Tentámos criar um trigger SQL mas tinha um bug (SECURITY DEFINER)
3. ✅ Fizemos rollback - OAuth voltou a funcionar
4. 🎯 Agora temos a versão CORRIGIDA do trigger

## O Problema Original

Quando fazes login com Google:
- ✅ Utilizador é criado em `auth.users` (Supabase)
- ❌ Utilizador NÃO é criado em `public.users` (tua tabela)
- ❌ Backend procura em `public.users` e não encontra
- ❌ Login "funciona" mas depois perde a sessão

## A Solução

Um Database Trigger que cria automaticamente o utilizador em `public.users` quando ele é criado em `auth.users`.

## Como Aplicar (Versão Corrigida)

### Passo 1: Verificar que o rollback foi aplicado
No Supabase SQL Editor, executa:

```sql
-- Deve retornar 0 rows (trigger removido)
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```

### Passo 2: Aplicar a versão corrigida
1. Abre o ficheiro `auto-create-user-on-signup-v2-FIXED.sql`
2. Copia TODO o conteúdo
3. No Supabase SQL Editor, cola e executa
4. Deve ver: "Success. No rows returned"

### Passo 3: Verificar que funcionou
```sql
-- Deve retornar 1 row
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

### Passo 4: Testar com novo utilizador
1. **IMPORTANTE:** Usa uma nova conta Google que NUNCA tenha feito login antes
2. Faz login na app
3. Verifica no Supabase:

```sql
-- Ver último utilizador criado no auth
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 1;

-- Ver último utilizador criado no public (deve aparecer!)
SELECT id, supabase_uid, email, name, created_at 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 1;
```

Os IDs devem corresponder: `public.users.supabase_uid` = `auth.users.id`

## O que mudou na versão corrigida?

### ❌ Versão antiga (causava erro):
```sql
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
...
$$ LANGUAGE plpgsql SECURITY DEFINER;  -- ❌ Isto bloqueava!
```

### ✅ Versão nova (funciona):
```sql
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY INVOKER  -- ✅ Mudámos para INVOKER
SET search_path = public
LANGUAGE plpgsql
AS $$
...
EXCEPTION
  WHEN OTHERS THEN
    -- ✅ Adicionámos error handling
    RAISE WARNING 'Error: %', SQLERRM;
    RETURN NEW;
END;
$$;
```

**Principais diferenças:**
1. `SECURITY INVOKER` em vez de `SECURITY DEFINER` - evita problemas de permissões
2. `SET search_path = public` - garante que usa o schema correto
3. `EXCEPTION` handler - se falhar, não bloqueia o signup
4. Permissões mais específicas (só INSERT, UPDATE em vez de ALL)

## Resultado Final

Depois de aplicar isto:

1. ✅ Fazes login com Google
2. ✅ Utilizador criado em `auth.users`
3. ✅ **Trigger dispara automaticamente**
4. ✅ Utilizador criado em `public.users`
5. ✅ Backend encontra o utilizador
6. ✅ Login completo e sessão mantém-se!
7. ✅ Profile carrega corretamente

## Notas Importantes

- ⚠️ **Para testar:** Usa uma conta Google NOVA (nunca usada antes)
- ⚠️ Se já tens utilizadores em `auth.users` sem correspondência em `public.users`, vou criar um script de migração separado
- ✅ Este trigger também funciona para email/password signup
- ✅ Se o utilizador já existir, apenas atualiza os dados (ON CONFLICT)

## Troubleshooting

### Se o trigger não disparar:
```sql
-- Ver erros/warnings
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%handle_new_user%';
```

### Se continuar a dar erro:
```sql
-- Ver permissões
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name='users' AND grantee='supabase_auth_admin';
```

## Próximos Passos

Depois de confirmar que funciona:
1. ✅ Fazer commit do código
2. ✅ Fazer novo build para TestFlight
3. ✅ Testar no TestFlight com conta Google nova
4. 🎉 Problema resolvido!
