# Google OAuth Debug - URGENTE

## Problema
O Google OAuth abre a lista de contas, mas quando clica numa conta, **NÃO MOSTRA o ecrã de confirmação** e volta para o login.

Isto significa que o Google está a **REJEITAR** o pedido OAuth antes de mostrar o ecrã de consentimento.

## Causas possíveis

### 1. Redirect URI não autorizado no Google Cloud Console
O Google precisa ter o redirect URI **EXATO** na lista de URIs autorizados.

**Verificar:**
1. Vai ao [Google Cloud Console](https://console.cloud.google.com/)
2. Seleciona o projeto "Bored Tourist" (ou o projeto correto)
3. Vai para **APIs & Services** → **Credentials**
4. Clica no **OAuth 2.0 Client ID** usado no Supabase
5. Em **Authorized redirect URIs**, verifica se tem:
   ```
   https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback
   ```
   ⚠️ **IMPORTANTE**: Tem que ser EXATAMENTE este URL!

### 2. OAuth Client ID inválido no Supabase
O Client ID e Secret no Supabase podem estar errados.

**Verificar:**
1. Abre **Supabase Dashboard** → **Authentication** → **Providers**
2. Clica em **Google**
3. Verifica se:
   - **Client ID** está preenchido (formato: `XXXXXX.apps.googleusercontent.com`)
   - **Client Secret** está preenchido
   - **Enabled** está ativado ✅

### 3. OAuth Consent Screen não configurado
O Google pode não ter o OAuth Consent Screen configurado corretamente.

**Verificar:**
1. No [Google Cloud Console](https://console.cloud.google.com/)
2. Vai para **APIs & Services** → **OAuth consent screen**
3. Verifica:
   - **User Type**: Pode ser "Internal" (só emails do domínio) ou "External" (qualquer email)
   - **Application name**: "Bored Tourist" ou nome da app
   - **Authorized domains**: Adiciona `supabase.co`
   - **Status**: Se está "In Production" ou "Testing"

### 4. Scopes insuficientes
O Google pode precisar de scopes específicos.

**Verificar no Supabase:**
- Em **Google Provider**, em **Scopes**, deve ter pelo menos:
  ```
  openid email profile
  ```

## Como corrigir AGORA

### Passo 1: Verificar logs no terminal
Quando o OAuth falha, o terminal mostra o URL que foi aberto. Procura por:
```
LOG  📍 OAuth URL: https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/authorize?provider=google&redirect_to=...
```

Copia esse URL completo e verifica o `redirect_to` parameter.

### Passo 2: Testar redirect URI manualmente
1. Copia o **Redirect URI** do Supabase:
   ```
   https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback
   ```

2. Vai ao Google Cloud Console e **adiciona este URI exato** aos **Authorized redirect URIs**

3. **SALVA** e espera 1-2 minutos para propagar

4. Tenta login novamente

### Passo 3: Verificar erros específicos no Google
Se continuar a falhar:
1. Abre o browser **Safari** no Mac
2. Vai para **Develop** → **Show Web Inspector**
3. Faz login com Google no app
4. Quando o browser abrir, verifica a **Console** no Web Inspector
5. Procura por erros do tipo:
   - `redirect_uri_mismatch`
   - `invalid_client`
   - `access_denied`

### Passo 4: Criar novo OAuth Client (último recurso)
Se nada funcionar:
1. No [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. **Create Credentials** → **OAuth 2.0 Client ID**
4. Tipo: **Web application**
5. **Authorized redirect URIs**:
   ```
   https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback
   ```
6. Copia o **Client ID** e **Client Secret**
7. Cola no **Supabase** → **Authentication** → **Providers** → **Google**
8. **Save**
9. Tenta login novamente

## Teste rápido
Para confirmar que o problema é o Google OAuth:
1. Tenta fazer login com **Apple** ou **Facebook** (se configurado)
2. Se funcionarem, o problema é **específico do Google OAuth**
3. Se não funcionarem, o problema é no **Supabase redirect handling**

## Resultado esperado
Quando funcionar:
1. ✅ Abre lista de contas Google
2. ✅ Clica numa conta
3. ✅ **MOSTRA** ecrã "You're signing back in to Bored Tourist"
4. ✅ Clica "Continue"
5. ✅ Redireciona para o app com sessão ativa

---

**PRÓXIMO PASSO**: Verifica o Google Cloud Console e confirma que o Redirect URI está correto!
