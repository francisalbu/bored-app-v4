# CONFIGURAÇÃO CRÍTICA - Supabase Redirect URLs

## O Problema Identificado

O Google está a redirecionar para `hnivuisqktlrusyqywaz.supabase.co`, mas o Supabase não está a fazer redirect de volta para a app porque o URL scheme não está configurado corretamente.

## SOLUÇÃO: Configurar Redirect URLs no Supabase Dashboard

### 1. Ir ao Supabase Dashboard
https://supabase.com/dashboard/project/hnivuisqktlrusyqywaz/auth/url-configuration

### 2. Na seção "Redirect URLs", ADICIONAR estes URLs:

```
app.rork.bored-explorer://auth/callback
app.rork.bored-explorer://**
boredtourist://auth/callback
exp://u.expo.dev/cd4bc13b-fb4a-4d0d-82ed-3faf6e991bba/--/auth/callback
```

### 3. Na seção "Site URL", configurar:
```
app.rork.bored-explorer://
```

### 4. IMPORTANTE: Wildcards
Adiciona também com wildcard para aceitar qualquer path:
```
app.rork.bored-explorer://**
```

## Por Que Isto É Necessário?

Quando o Google redireciona para:
```
https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback?code=XXX
```

O Supabase processa o código e depois **tenta redirecionar** para o `redirectTo` que enviámos.

Se o `redirectTo` NÃO estiver na lista de URLs autorizados, o Supabase **BLOQUEIA** o redirect por segurança!

## Fluxo Correto Após Configuração:

1. ✅ App → Google OAuth
2. ✅ Google → `supabase.co/auth/v1/callback?code=XXX`
3. ✅ Supabase valida o código
4. ✅ Supabase redireciona para `app.rork.bored-explorer://auth/callback?code=XXX`
5. ✅ iOS detecta o URL scheme
6. ✅ App abre e deep link listener captura
7. ✅ `exchangeCodeForSession(code)`
8. ✅ LOGIN COMPLETO!

## Screenshot das Configurações

Vai a:
**Authentication > URL Configuration**

E deve parecer algo assim:

```
Site URL: app.rork.bored-explorer://

Redirect URLs:
• app.rork.bored-explorer://auth/callback
• app.rork.bored-explorer://**
• boredtourist://auth/callback
• exp://u.expo.dev/cd4bc13b-fb4a-4d0d-82ed-3faf6e991bba/--/auth/callback
```

## MUITO IMPORTANTE

Depois de adicionar os URLs, clica em **SAVE** no Supabase Dashboard!

As mudanças são imediatas, não precisas de fazer novo build!
