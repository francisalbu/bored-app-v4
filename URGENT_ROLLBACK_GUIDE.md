# URGENTE: Recuperar OAuth Signup

## O Que Aconteceu
O script `auto-create-user-on-signup.sql` criou um trigger que está a **bloquear** o signup de novos utilizadores no Supabase. 

## Solução Imediata

### Passo 1: Remover o Trigger
1. Acede ao **Supabase Dashboard**: https://supabase.com/dashboard
2. Seleciona o projeto **Bored Tourist**
3. Vai para **SQL Editor**
4. Clica em **New Query**
5. Copia e cola o conteúdo completo do ficheiro `ROLLBACK-auto-create-user.sql`
6. Clica em **RUN** (ou Cmd/Ctrl + Enter)

### Passo 2: Verificar
Deves ver uma mensagem de sucesso e o resultado:
```
trigger_name | event_object_table
-------------|-------------------
(0 rows)
```

Isto significa que o trigger foi removido com sucesso.

### Passo 3: Testar OAuth
1. **Limpa a cache da app** (importante!)
   - iOS: Fecha a app completamente e reabre
   - Ou melhor: Reinstala a app do TestFlight
   
2. Tenta fazer login com Google novamente

3. Verifica se o utilizador foi criado:
   - Vai para **Supabase** → **Authentication** → **Users**
   - Deves ver o utilizador lá!

## Por Que Falhou?

O trigger tinha um problema: estava a tentar inserir dados na tabela `public.users` **durante** o processo de signup no `auth.users`. Isto pode causar:

1. **Deadlock** - As duas operações bloqueiam-se mutuamente
2. **Erro de permissões** - O trigger pode não ter permissões suficientes
3. **Violação de constraints** - Algum campo pode estar a falhar validação

## Próximos Passos (DEPOIS de recuperar)

Uma vez que o OAuth esteja a funcionar novamente:

### Opção A: Usar o Backend para Sincronização (RECOMENDADO)
Já tens código no `AuthContext` que sincroniza automaticamente quando o utilizador faz login. Isto funciona melhor porque:
- ✅ Mais controlo sobre erros
- ✅ Pode fazer retry se falhar
- ✅ Não bloqueia o signup
- ✅ Logs detalhados para debug

### Opção B: Melhorar o Trigger (Avançado)
Se realmente quiseres usar um trigger, precisamos de:
1. Fazer o trigger ASYNC (não bloquear)
2. Adicionar tratamento de erros robusto
3. Testar extensivamente antes de aplicar

## Verificação Final

Execute este SQL para confirmar que está tudo OK:

```sql
-- Ver últimos utilizadores criados
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Ver se há triggers problemáticos
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth';

-- Deve retornar 0 rows se o rollback funcionou
```

## Se Ainda Não Funcionar

Se após o rollback ainda não consegues criar utilizadores, verifica:

1. **Configuração OAuth no Supabase**
   - Authentication → Providers → Google → Deve estar ENABLED
   
2. **Rate Limiting**
   - O Supabase pode ter bloqueado temporariamente devido a muitas tentativas falhadas
   - Espera 5-10 minutos e tenta novamente

3. **Logs do Supabase**
   - Vai para **Logs** → **Auth Logs**
   - Procura por erros recentes
   - Partilha comigo se vires algo suspeito

## Contacto de Emergência

Se isto não resolver, podes:
1. Contactar o suporte do Supabase (eles respondem rápido!)
2. Ou criar uma nova project do Supabase (último recurso)

Mas o rollback deve funcionar! 🤞
