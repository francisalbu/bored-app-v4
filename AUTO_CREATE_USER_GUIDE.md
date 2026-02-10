# Fix: Auto-Create Users in public.users on OAuth Signup

## Problema
Quando os utilizadores fazem login com Google OAuth, são criados na tabela `auth.users` do Supabase, mas **não** na tabela `public.users` que o teu backend usa. Isso causa o erro onde o utilizador é criado mas depois "desaparece".

## Solução
Criar um **Database Trigger** que automaticamente cria um registo na tabela `public.users` sempre que alguém se regista via OAuth.

## Como Aplicar a Solução

### Passo 1: Aceder ao Supabase SQL Editor
1. Vai para [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Seleciona o teu projeto **Bored Tourist**
3. No menu lateral, clica em **SQL Editor**
4. Clica em **New Query**

### Passo 2: Executar o SQL
1. Copia todo o conteúdo do ficheiro `auto-create-user-on-signup.sql`
2. Cola no SQL Editor
3. Clica em **Run** (ou pressiona `Cmd/Ctrl + Enter`)

### Passo 3: Verificar
Após executar o SQL, verifica se o trigger foi criado:

```sql
-- Ver todos os triggers
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table, 
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

Deverás ver algo como:
```
trigger_name: on_auth_user_created
event_manipulation: INSERT
event_object_table: users
action_statement: EXECUTE FUNCTION public.handle_new_user()
```

### Passo 4: Testar
1. Faz logout da app
2. Tenta fazer login com Google novamente
3. O utilizador deve ser criado automaticamente em ambas as tabelas

Para verificar:
```sql
-- Ver utilizadores na tabela auth
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Ver utilizadores na tabela public
SELECT id, supabase_uid, email, name, created_at FROM public.users ORDER BY created_at DESC LIMIT 5;
```

Os IDs devem estar sincronizados: `public.users.supabase_uid` = `auth.users.id`

## O que o Trigger Faz

1. **Detecta** quando um novo utilizador é criado em `auth.users` (via OAuth ou email)
2. **Extrai** os dados do utilizador:
   - Email de `auth.users.email`
   - Nome de `user_metadata.full_name` ou `user_metadata.name`
   - Telefone de `user_metadata.phone` (se existir)
   - Supabase UID de `auth.users.id`
3. **Cria automaticamente** um registo correspondente em `public.users`
4. **Atualiza** se o utilizador já existir (ON CONFLICT)

## Benefícios

✅ **Automático** - Não precisas de código extra no backend  
✅ **Instantâneo** - Acontece no momento do signup  
✅ **Fiável** - Usa triggers nativos do PostgreSQL  
✅ **Simples** - Uma vez configurado, funciona sempre  

## Resultado Final

Depois de aplicar esta solução:
- Fazes login com Google → Utilizador criado em `auth.users` ✅
- Trigger dispara → Utilizador criado em `public.users` ✅
- Backend encontra o utilizador → Login bem-sucedido ✅
- Perfil carrega corretamente → Problema resolvido! 🎉

## Notas Importantes

- Este trigger também funciona para **email/password** signup
- Se um utilizador já existir (mesmo `supabase_uid`), ele **atualiza** os dados em vez de dar erro
- O campo `password` é definido como `'OAUTH_USER'` para utilizadores OAuth (não é usado para autenticação)
