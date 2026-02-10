# Google OAuth - Solução Simplificada ✅

## O Problema
Estávamos tentando fazer manualmente a troca do código OAuth, quando o Supabase já faz isso automaticamente em segundo plano.

## A Solução
Deixar o Supabase SDK fazer todo o trabalho e apenas reagir quando a sessão estiver pronta.

---

## 1. Configuração no Supabase Dashboard

### Redirect URLs
Vá para: **Authentication > URL Configuration**

Adicione apenas a URL base:
```
boredtourist://
```

**NÃO** use caminhos específicos como `boredtourist://auth/callback` - o Supabase vai gerenciar isso.

---

## 2. Mudanças no Código

### ✅ AuthBottomSheet.tsx
- **Antes**: `redirectTo: 'boredtourist://auth/callback'`
- **Depois**: `redirectTo: Linking.createURL('/')`
- **Removido**: Todo o código manual de troca de código (exchangeCodeForSession)
- **Agora**: Apenas abre o browser e fecha o modal. O Supabase faz o resto.

### ✅ SupabaseAuthContext.tsx
- Já tem o `onAuthStateChange` configurado corretamente
- Quando o Supabase completar o OAuth, este listener dispara automaticamente
- Atualiza o estado do usuário e a app reage

### ⚠️ callback.tsx (Opcional - pode remover)
- Este arquivo pode ser removido ou renomeado
- O Supabase não precisa de uma tela específica de callback
- O redirect deve apenas reabrir o app

---

## 3. Fluxo Correto

### Quando o usuário clica em "Continue with Google":

1. **App abre o browser** com a URL do Google OAuth
2. **Usuário autentica** e escolhe a conta
3. **Google redireciona** para `boredtourist://` com o código
4. **Supabase SDK** automaticamente:
   - Captura o código da URL
   - Troca por tokens
   - Estabelece a sessão
5. **`onAuthStateChange` dispara** no SupabaseAuthContext
6. **App atualiza** automaticamente e mostra o perfil do usuário

---

## 4. Como Testar em Development

```bash
# Inicie o servidor Expo
npx expo start

# Abra no simulador iOS ou dispositivo
# Tente fazer login com Google
# Verifique os logs no console
```

### Logs esperados:
```
🔐 Starting Google Sign-In with Supabase...
🔗 Redirect URL: boredtourist://
🌐 Opening OAuth URL...
🔙 Browser closed, result type: success
✅ OAuth flow completed! Supabase will handle the rest.
⏳ Waiting for onAuthStateChange to fire...
🔐 Auth state changed: SIGNED_IN Session exists
```

---

## 5. Build para TestFlight

Depois de testar e confirmar que funciona em dev:

```bash
# Fazer commit das mudanças
git add .
git commit -m "fix: Simplify Google OAuth - let Supabase handle code exchange"

# Fazer o build
eas build --platform ios
```

---

## 6. Troubleshooting

### Se ainda não funcionar:

1. **Verifique a Supabase Dashboard**:
   - Google OAuth está habilitado?
   - Redirect URL está correto: `boredtourist://`

2. **Verifique o app.json**:
   ```json
   {
     "expo": {
       "scheme": "boredtourist"
     }
   }
   ```

3. **Verifique os logs**:
   - Procure por "Auth state changed"
   - Se não aparecer, o Supabase não está capturando o redirect

4. **Teste o deep linking**:
   ```bash
   # Abra o app com uma URL de teste
   xcrun simctl openurl booted boredtourist://test
   ```

---

## Mudanças Feitas

### ✅ components/AuthBottomSheet.tsx
- Usa `Linking.createURL('/')` para redirect
- Remove código manual de troca de código
- Apenas abre browser e fecha modal
- Deixa o Supabase SDK fazer o trabalho

### ✅ app/(tabs)/profile.tsx
- Adiciona `onSuccess` callback (mas pode não ser necessário)
- O `onAuthStateChange` deve ser suficiente

### ⚠️ app/auth/callback.tsx
- Pode ser removido (opcional)
- O Supabase não precisa disso

---

## Próximos Passos

1. ✅ Código simplificado
2. 🔄 Testar em development
3. 🚀 Build para TestFlight
4. ✨ Celebrar! 🎉
