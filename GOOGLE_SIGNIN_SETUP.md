# 🔐 Configuração de Google Sign-In com Supabase

Este guia mostra como configurar o Google OAuth no seu projeto Supabase para permitir login social.

## 📋 Pré-requisitos

- Projeto Supabase: `hnivuisqktlrusyqywaz`
- URL: https://hnivuisqktlrusyqywaz.supabase.co

## 🚀 Passos de Configuração

### 1. Aceder ao Google Cloud Console

1. Ir para: https://console.cloud.google.com/
2. Criar um novo projeto ou selecionar um existente
3. Ir para **APIs & Services** > **Credentials**

### 2. Criar OAuth 2.0 Client ID

1. Clicar em **+ CREATE CREDENTIALS** > **OAuth client ID**
2. Se aparecer aviso sobre OAuth consent screen:
   - Clicar em **CONFIGURE CONSENT SCREEN**
   - Escolher **External** (para desenvolvimento)
   - Preencher:
     - App name: `Bored App`
     - User support email: seu email
     - Developer contact information: seu email
   - Guardar e continuar
   - Em **Scopes**, adicionar:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
   - Guardar e continuar
   - Em **Test users**, adicionar os emails que vão testar
   - Guardar

3. Voltar a **Credentials** > **+ CREATE CREDENTIALS** > **OAuth client ID**
4. Selecionar:
   - Application type: **Web application**
   - Name: `Bored App Web Client`
   - Authorized JavaScript origins:
     - `http://localhost:8082`
     - `https://hnivuisqktlrusyqywaz.supabase.co`
   - Authorized redirect URIs:
     - `https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback`

5. Clicar em **CREATE**
6. **IMPORTANTE**: Copiar:
   - ✅ Client ID
   - ✅ Client Secret

### 3. Configurar no Supabase

1. Ir para: https://app.supabase.com/project/hnivuisqktlrusyqywaz/auth/providers
2. Procurar **Google** na lista de providers
3. Ativar o toggle **Enable Sign in with Google**
4. Preencher:
   - **Client ID**: colar o Client ID do passo anterior
   - **Client Secret**: colar o Client Secret do passo anterior
5. Clicar em **Save**

### 4. Configurar Redirect URLs no Supabase

1. Ir para: https://app.supabase.com/project/hnivuisqktlrusyqywaz/auth/url-configuration
2. Em **Redirect URLs**, adicionar:
   - `exp://192.168.1.137:8082/--/auth/callback` (para desenvolvimento local)
   - `rork-app://auth/callback` (para produção)
3. Guardar

## 📱 Configuração no Expo (app.json)

✅ Já está configurado!

```json
{
  "expo": {
    "scheme": "rork-app"
  }
}
```

## ✅ Testar

1. Iniciar o backend:
   ```bash
   cd /Users/francisalbu/Documents/Bored\ New\ Backend
   node server.js
   ```

2. Iniciar a app:
   ```bash
   cd /Users/francisalbu/Documents/Bored_App_v4/bored-v2-app
   npx expo start
   ```

3. Na app:
   - Ir para o ecrã de login
   - Clicar em "Continuar com o Google"
   - Fazer login com uma conta Google
   - Deverá ser redirecionado de volta para a app

## 🔍 Debug

Ver logs no terminal:
- `🔐 Starting Google Sign-In...` - Início do processo
- `OAuth success: ...` - OAuth completado
- `✅ User data refreshed` - Utilizador sincronizado

Ver logs no Supabase:
- https://app.supabase.com/project/hnivuisqktlrusyqywaz/logs/edge-logs

## 📝 Notas

- **Desenvolvimento**: Usar `exp://` scheme
- **Produção**: Configurar deep linking apropriado
- **iOS**: Poderá precisar adicionar configurações adicionais no `app.json`
- **Android**: Poderá precisar adicionar o SHA-1 fingerprint no Google Console

## 🆘 Problemas Comuns

### "Access blocked: This app's request is invalid"
- Verificar se o OAuth consent screen está configurado
- Adicionar o seu email como test user

### "Redirect URI mismatch"
- Verificar se os redirect URIs no Google Console correspondem exatamente aos do Supabase
- Incluir o protocolo (https://)

### "User not syncing to database"
- Verificar se o backend está a correr
- Ver logs do terminal para erros de sincronização
- O middleware `authenticateSupabase` automaticamente sincroniza na primeira request

## 🎯 Próximos Passos

Depois de configurar o Google Sign-In:
1. ✅ Testar o fluxo completo
2. 🔜 Configurar Apple Sign-In (apenas iOS)
3. 🔜 Configurar Facebook Login
4. 🔜 Adicionar página de perfil social
