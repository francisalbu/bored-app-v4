# ❌ Problema: Google Sign-In retorna "Endpoint not found"

## 🔍 Causa
O Google OAuth não está configurado no Supabase, então quando clicas em "Sign in with Google", ele tenta redirecionar para `localhost` que não existe no mobile.

## ✅ Solução: Configurar Google OAuth no Supabase

### Passo 1: Google Cloud Console

1. Vai a https://console.cloud.google.com/
2. Cria um novo projeto ou seleciona um existente
3. Vai a **APIs & Services** → **Credentials**
4. Clica em **+ CREATE CREDENTIALS** → **OAuth client ID**
5. Tipo de aplicação: **Web application**
6. Nome: `Bored Tourist Web`
7. **Authorized redirect URIs** - adiciona:
   ```
   https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback
   ```
8. Clica em **CREATE**
9. **Guarda o Client ID e Client Secret** que aparece

### Passo 2: Supabase Dashboard

1. Vai a https://supabase.com/dashboard/project/hnivuisqktlrusyqywaz
2. Vai a **Authentication** (ícone do cadeado no menu esquerdo)
3. Clica em **Providers**
4. Procura **Google** e clica para expandir
5. **Enable Sign in with Google** → Liga o toggle
6. Cole:
   - **Client ID** (do Google Cloud Console)
   - **Client Secret** (do Google Cloud Console)
7. Em **Redirect URL**, deverá aparecer:
   ```
   https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback
   ```
8. Clica em **Save**

### Passo 3: Configurar o Redirect no App (app.json)

Edita `/Users/francisalbu/Documents/Bored_App_v4/bored-v2-app/app.json`:

```json
{
  "expo": {
    "scheme": "boredtourist",
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static"
          }
        }
      ]
    ]
  }
}
```

### Passo 4: Google Cloud Console - Configuração Mobile (iOS/Android)

Para funcionar no mobile, precisas adicionar mais um OAuth client:

#### Para iOS:
1. Google Cloud Console → **+ CREATE CREDENTIALS** → **OAuth client ID**
2. Tipo: **iOS**
3. Bundle ID: `com.francisalbu.boredexplorer` (verifica no app.json)
4. Clica em **CREATE**

#### Para Android:
1. Google Cloud Console → **+ CREATE CREDENTIALS** → **OAuth client ID**
2. Tipo: **Android**
3. Package name: `com.francisalbu.boredexplorer`
4. SHA-1: Executa no terminal:
   ```bash
   cd android
   ./gradlew signingReport
   ```
   Copia o SHA-1 do `debug` variant
5. Clica em **CREATE**

### Passo 5: Testar

1. Reinicia o app
2. Vai ao checkout como guest
3. Clica em "Sign in"
4. Clica em "Continuar com o Google"
5. Deverá abrir o browser com o login do Google
6. Após login, volta para o app automaticamente

## 🎯 Alternativa Rápida: Desativar Google OAuth (Temporário)

Se quiseres testar o resto da app sem configurar o Google, podes desativar temporariamente:

1. Em `AuthBottomSheet.tsx`, comenta o botão do Google
2. Usa apenas o email signup

## 📝 Notas

- O Supabase OAuth funciona diferente do backend Node.js
- O Supabase gere o OAuth flow completo
- O redirect vai para `boredtourist://auth/callback` (deep link)
- O callback é tratado em `app/auth/callback.tsx`

## ⚠️ Problemas Comuns

1. **"Redirect URI mismatch"**: 
   - Verifica que a URL de callback no Google Cloud Console é exatamente:
     `https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback`

2. **"Invalid client"**:
   - Verifica que copiaste o Client ID e Secret corretamente no Supabase

3. **Fica preso no browser**:
   - Verifica que o scheme `boredtourist://` está configurado no app.json
   - Rebuilda a app: `npx expo prebuild --clean`

4. **"Endpoint not found"**:
   - Significa que o Google OAuth não está ativado no Supabase
   - Segue os passos do Passo 2 acima
