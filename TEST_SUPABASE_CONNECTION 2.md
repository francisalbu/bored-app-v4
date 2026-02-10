# Teste de Conexão Supabase

## Como testar se o Google OAuth está a funcionar

### 1. Verificar Utilizadores no Supabase
1. Acede a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Seleciona o projeto **Bored Tourist**
3. Vai para **Authentication** → **Users**
4. Verifica se há utilizadores criados

### 2. Verificar Configuração OAuth
1. No Supabase, vai para **Authentication** → **Providers** → **Google**
2. Verifica se:
   - ✅ Google provider está **Enabled**
   - ✅ **Client ID** está preenchido
   - ✅ **Client Secret** está preenchido
   - ✅ **Redirect URLs** incluem: `app.rork.bored-explorer://`

### 3. Verificar Redirect URLs
No Google Cloud Console:
1. Acede a [https://console.cloud.google.com](https://console.cloud.google.com)
2. Seleciona o projeto **Bored Tourist**
3. Vai para **APIs & Services** → **Credentials**
4. Seleciona o **OAuth 2.0 Client ID** para iOS
5. Verifica se os **Authorized redirect URIs** incluem:
   ```
   https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback
   app.rork.bored-explorer://
   ```

### 4. Testar OAuth Flow
1. Abre a app
2. Vai para Profile ou Booking (que pede login)
3. Clica em "Continue with Google"
4. Observa o que acontece:

**✅ Sucesso:**
- Abre browser com página de login Google
- Escolhes a conta
- Volta para a app
- **VERIFICA:** O utilizador apareceu no Supabase Authentication?

**❌ Erro:**
- Browser não abre → Problema na configuração do WebBrowser
- Browser abre mas dá erro → Problema no redirect URL
- Browser abre, escolhes conta, mas não volta para app → Problema no deep linking
- Volta para app mas não faz login → Problema na sincronização

### 5. Verificar Tabelas no Supabase
Execute este SQL no **SQL Editor** do Supabase:

```sql
-- Ver utilizadores na tabela auth (gerida pelo Supabase)
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as name,
  created_at,
  email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Ver utilizadores na tabela public (tua tabela custom)
SELECT 
  id,
  supabase_uid,
  email,
  name,
  created_at
FROM public.users 
ORDER BY created_at DESC 
LIMIT 5;
```

### Resultados Esperados

**Cenário 1: Utilizador não aparece em auth.users**
→ Problema: OAuth não está a funcionar
→ Solução: Verificar passos 2 e 3 acima

**Cenário 2: Utilizador aparece em auth.users mas não em public.users**
→ Problema: Falta sincronização automática
→ Solução: Executar o SQL `auto-create-user-on-signup.sql`

**Cenário 3: Utilizador aparece em ambas as tabelas mas perde sessão**
→ Problema: AuthContext não está a guardar corretamente
→ Solução: Já corrigimos com o retry logic

## Debug Logs

Se quiseres ver logs detalhados, executa a app em development mode e observa os logs no Metro:

```bash
npx expo start
```

Procura por:
- `🔐 Starting Google Sign-In...`
- `✅ OAuth callback detected!`
- `🔄 Syncing with backend...`
- `✅ User signed in and synced with backend successfully!`

Se vires erros tipo:
- `❌ OAuth error:`
- `❌ Backend did not return user data:`
- `❌ Error syncing with backend:`

Copia e cola esses erros para eu poder ajudar melhor!
