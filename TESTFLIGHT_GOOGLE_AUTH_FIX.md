# 🔧 TestFlight Google OAuth Fix

## ❌ Problema
Erro "Authentication Error - No authorization code received" quando tenta fazer Google Sign-In via TestFlight.

## ✅ Solução

### 1. **Atualizar Supabase Redirect URIs**

Vai ao **Supabase Dashboard** → **Authentication** → **URL Configuration**:

Adiciona estes **Redirect URLs** (um por linha):

```
boredtourist://auth/callback
app.rork.bored-explorer://auth/callback
https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback
exp://192.168.1.145:8081/--/auth/callback
```

**Explicação:**
- `boredtourist://` → Para desenvolvimento local
- `app.rork.bored-explorer://` → Para TestFlight e Production (usa o bundle identifier)
- `https://...supabase.co/auth/v1/callback` → Para web/fallback
- `exp://...` → Para Expo Go (desenvolvimento)

---

### 2. **Atualizar Google Cloud Console**

Vai ao **Google Cloud Console** → **APIs & Services** → **Credentials** → **OAuth 2.0 Client IDs**:

No teu **iOS OAuth Client**, adiciona estes **Authorized redirect URIs**:

```
app.rork.bored-explorer://auth/callback
boredtourist://auth/callback
https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback
```

---

### 3. **Verificar Info.plist (iOS)**

Certifica-te que o ficheiro `ios/BoredExplorer/Info.plist` tem os URL schemes:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>boredtourist</string>
      <string>app.rork.bored-explorer</string>
    </array>
  </dict>
</array>
```

---

### 4. **Rebuild e Deploy**

Depois de fazer estas alterações:

```bash
# Commit as mudanças
git add .
git commit -m "🔧 Fix Google OAuth for TestFlight"
git push

# Rebuild para TestFlight
npx eas build --platform ios --profile production
```

---

## 🧪 Como Testar

1. **Development (Expo Go)**: Usa `boredtourist://`
2. **TestFlight/Production**: Usa `app.rork.bored-explorer://`

O código agora detecta automaticamente qual esquema usar baseado no `__DEV__`.

---

## 📝 Código Atualizado

### `components/AuthBottomSheet.tsx`
```typescript
// Get the correct redirect URL based on environment
const redirectUrl = __DEV__ 
  ? 'boredtourist://auth/callback'
  : 'app.rork.bored-explorer://auth/callback';
```

### `app.json`
```json
"scheme": ["boredtourist", "app.rork.bored-explorer"]
```

---

## ⚠️ IMPORTANTE

Depois de atualizar o Supabase e Google Cloud Console, **espera 5-10 minutos** para as alterações propagarem.

Depois faz um **novo build** e envia para TestFlight.

---

## 🐛 Debug

Se continuar a dar erro, verifica nos logs:

```
🔗 Redirect URL: app.rork.bored-explorer://auth/callback
🏗️ Environment: Production
```

Se vires `Development` quando estás no TestFlight, o `__DEV__` não está a funcionar corretamente.

---

## 📞 URLs de Redirect Completos

**Supabase:**
- `https://hnivuisqktlrusyqywaz.supabase.co`

**Redirect URIs a adicionar:**
1. `app.rork.bored-explorer://auth/callback` ← **PRINCIPAL PARA TESTFLIGHT**
2. `boredtourist://auth/callback`
3. `https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback`
4. `exp://192.168.1.145:8081/--/auth/callback`

---

✅ Com estas alterações, o Google OAuth vai funcionar tanto em desenvolvimento como no TestFlight!
