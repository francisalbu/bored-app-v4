# Fix Google OAuth - Configurar Redirect URL no Supabase

## 🎯 Problema Atual

O browser in-app abre, o utilizador faz login no Google, mas depois não regressa à app com a sessão iniciada.

**Causa:** O Supabase não tem o redirect URL da app configurado nas definições de autenticação.

---

## ✅ Solução: Configurar Redirect URL no Supabase

### 1. Acede ao Supabase Dashboard

1. Vai a: https://supabase.com/dashboard/project/hnivuisqktlrusyqywaz
2. Login se necessário

### 2. Configura o Redirect URL

1. No menu lateral, vai a **Authentication** → **URL Configuration**
2. Procura a secção **Redirect URLs**
3. Adiciona este URL:
   ```
   boredtourist://auth/callback
   ```
4. Clica em **Save** ou **Add URL**

### 3. Verifica Google OAuth Configuration

Ainda em **Authentication**, vai a **Providers** → **Google**:

1. Verifica que **Enabled** está ativo ✅
2. Confirma que tens:
   - Client ID (Web application)
   - Client Secret
3. **Authorized redirect URIs** deve incluir:
   ```
   https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback
   ```

---

## 🔍 Explicação Técnica

### Como Funciona o OAuth Flow

```
User clicks "Sign in with Google"
         ↓
App abre WebBrowser com URL do Google OAuth
         ↓
User faz login no Google
         ↓
Google redireciona para: boredtourist://auth/callback?access_token=...&refresh_token=...
         ↓
WebBrowser fecha e retorna à app
         ↓
App navega para app/auth/callback.tsx
         ↓
callback.tsx extrai tokens do URL e cria sessão
         ↓
User está autenticado! ✅
```

### Porquê o Redirect URL?

O Supabase precisa de saber que `boredtourist://auth/callback` é um URL seguro e autorizado para receber tokens de autenticação. Sem esta configuração, o Supabase pode:

1. Não retornar os tokens no redirect
2. Retornar um erro de "redirect_uri_mismatch"
3. Ignorar o callback completamente

---

## 🧪 Como Testar Depois de Configurar

1. Fecha completamente a app e reabre
2. Vai ao perfil ou payment screen
3. Clica em "Sign in with Google"
4. **Esperado:**
   - Browser modal abre dentro da app ✅
   - Mostra página de login do Google ✅
   - Depois de escolher conta, fecha automaticamente ✅
   - Regressa à app já com sessão iniciada ✅
   - Não sai da app em nenhum momento ✅

---

## 📝 Logs para Verificar

No Metro console, deves ver:

```
🔐 Starting Google Sign-In...
🔗 Redirect URL: boredtourist://auth/callback
🌐 Opening OAuth URL in-app...
🔙 WebBrowser result: { type: 'success', url: 'boredtourist://auth/callback?access_token=...&refresh_token=...' }
✅ OAuth completed successfully
🔄 Auth Callback - Processing OAuth redirect...
🔑 Tokens found in URL params!
🔄 Setting session...
✅ Session established!
📧 Email: user@example.com
✅ User synced with backend!
🏠 Redirecting to home...
```

---

## 🚨 Se Ainda Não Funcionar

### Opção 1: Verificar URL Configuration no Supabase

1. Dashboard → **Authentication** → **URL Configuration**
2. **Site URL:** Deve ser `boredtourist://` ou `https://yourdomain.com`
3. **Redirect URLs:** Deve incluir `boredtourist://auth/callback`

### Opção 2: Verificar Google Cloud Console

1. Vai a: https://console.cloud.google.com/apis/credentials
2. Seleciona o projeto
3. Clica no OAuth 2.0 Client ID (tipo Web application)
4. **Authorized redirect URIs** deve ter:
   ```
   https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback
   ```

### Opção 3: Limpar Cache e Reinstalar

```bash
# No terminal
cd /Users/francisalbu/Documents/Bored_App_v4/bored-v2-app
rm -rf node_modules/.cache
npx expo start -c
```

---

## 📱 Fallback: Deep Linking Manual

Se o WebBrowser não retornar os tokens automaticamente, podemos modificar o código para usar Linking listeners:

```typescript
// AuthBottomSheet.tsx - handleGoogleSignIn
useEffect(() => {
  const handleUrl = ({ url }: { url: string }) => {
    console.log('📲 Deep link received:', url);
    if (url.includes('auth/callback')) {
      // Process the callback
      router.push(url.replace('boredtourist://', '/'));
    }
  };
  
  const subscription = Linking.addEventListener('url', handleUrl);
  return () => subscription.remove();
}, []);
```

Mas isto só deve ser necessário se o WebBrowser não estiver a funcionar corretamente.

---

## ✅ Checklist

- [ ] Adicionar `boredtourist://auth/callback` aos Redirect URLs no Supabase
- [ ] Verificar que Google OAuth está habilitado no Supabase
- [ ] Verificar que o redirect URI está no Google Cloud Console
- [ ] Testar o login com Google
- [ ] Verificar logs no Metro console
- [ ] Confirmar que o utilizador fica autenticado

---

Depois de configurares o redirect URL no Supabase, **testa novamente** e diz-me o que aparece nos logs! 🚀
