# 🔍 Debug: Google OAuth "Endpoint not found"

## 🎯 O Problema
Quando clicas "Sign in with Google", aparece:
```json
{"success":false,"message":"Endpoint not found"}
```

Isto significa que o **redirect está a ir para localhost** em vez do deep link da app.

## ✅ Configurações que DEVEM estar no Supabase

### 1. Vai ao Supabase Dashboard
https://supabase.com/dashboard/project/hnivuisqktlrusyqywaz/auth/url-configuration

### 2. Verifica "Redirect URLs"
Deves ter estas URLs na lista de **Redirect URLs** permitidas:

```
boredtravel://auth/callback
boredtravel://**
exp://192.168.1.64:8081/--/auth/callback
```

### 3. Site URL
```
boredtravel://
```

## 🔧 Como Adicionar

1. Vai a **Authentication** → **URL Configuration**
2. Em **Redirect URLs**, adiciona cada URL numa linha nova:
   ```
   boredtravel://auth/callback
   boredtravel://**
   exp://192.168.1.64:8081/--/auth/callback
   ```
3. Clica em **Save**

## 📱 Verifica o Expo Development URL

No terminal onde o Expo está a correr, procura por:
```
Metro waiting on exp://192.168.1.64:8081
```

Essa URL **também precisa estar** nos Redirect URLs do Supabase!

## 🧪 Teste Rápido

Depois de adicionar os Redirect URLs:

1. Reinicia o app (fecha completamente)
2. Abre novamente
3. Tenta fazer login com Google
4. Verifica os logs no terminal (agora vai mostrar mais info)

## 🔍 O que Procurar nos Logs

Quando clicares "Sign in with Google", deves ver:
```
🔐 Starting Google Sign-In...
📱 Platform: ios
🔗 Redirect URL created: boredtravel://auth/callback
🔗 Expected format: boredtravel://auth/callback
🌐 Opening OAuth URL: https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/authorize?...
🔄 Will redirect back to: boredtravel://auth/callback
```

Se vires um erro como:
```
❌ OAuth error: invalid redirect uri
```

Significa que o `boredtravel://auth/callback` não está na lista de Redirect URLs permitidas.

## ⚠️ URLs ERRADOS (não uses)

NÃO adiciones isto:
- ❌ `localhost:3000`
- ❌ `http://localhost`
- ❌ `127.0.0.1`

Estes são para web, não para mobile!

## 🎯 Solução Alternativa: Usar Expo URL

Se o deep link `boredtravel://` não funcionar, usa o Expo development URL:

No Supabase Redirect URLs, adiciona:
```
exp://192.168.1.64:8081/--/auth/callback
exp://192.168.1.64:8081
```

E no código, muda para:
```typescript
const redirectUrl = Linking.createURL('/auth/callback', { 
  scheme: 'exp' 
});
```

## 📞 Como Saber se Funcionou

Quando funcionar corretamente:

1. Clicas "Sign in with Google"
2. Abre o browser com a página de login do Google
3. Fazes login
4. **O browser fecha sozinho**
5. **Voltas para a app automaticamente**
6. Vês "A processar autenticação..."
7. És redirecionado para a home

Se ficares preso no browser com erro 404 → os Redirect URLs não estão corretos!
