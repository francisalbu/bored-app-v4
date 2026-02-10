# Testing Deep Link OAuth Flow

## Para Debugar o Problema

### 1. Ver os Logs
Quando a tua namorada tentar fazer login, pede-lhe para:
1. Abrir a app no TestFlight
2. Clicar em "Sign in with Google"
3. **IMEDIATAMENTE** ir às Settings do iPhone
4. Abrir a app "Console" (se tiver Xcode instalado) OU ligar o telefone ao Mac
5. Ver os logs em tempo real

### 2. Comandos Para Debugar (se tiver o telefone ligado ao Mac)

```bash
# Ver logs em tempo real do device iOS
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "BoredExplorer"' --level debug

# OU usar o iPhone Console app
# Settings > Privacy & Security > Analytics & Improvements > Analytics Data
# Procurar por "BoredExplorer"
```

### 3. O Que Procurar nos Logs

Procura por estas mensagens (na ordem):
1. `🎯 Deep link listener initialized` - Confirma que o listener foi criado
2. `🔐 Starting Google Sign-In with Supabase...`
3. `🔗 Redirect URL:` - **ESTE É IMPORTANTE!** Diz-nos qual URL está a usar
4. `🌐 Opening OAuth URL...`
5. Usuário faz login no Google
6. `🔗 Deep link received:` - **SE ESTE APARECER, o deep link funciona!**
7. `✅ OAuth callback detected!`
8. `✅✅✅ Session established successfully!`

### 4. Cenários Possíveis

#### Cenário A: Deep link NÃO é recebido
**Sintoma:** Não vês `🔗 Deep link received:` nos logs
**Problema:** iOS não está a capturar o redirect
**Solução:** O redirect URL no Supabase Dashboard precisa de match exato

#### Cenário B: Deep link é recebido mas sem código
**Sintoma:** Vês `🔗 Deep link received:` mas `🔑 Authorization code: NOT FOUND`
**Problema:** Google não está a enviar o código, ou URL está errado
**Solução:** Verificar configuração do Google Cloud Console

#### Cenário C: Código encontrado mas erro na troca
**Sintoma:** Vês `🔑 Authorization code: FOUND` mas depois erro
**Problema:** Supabase ou Google OAuth client ID incorreto
**Solução:** Verificar Google Client ID no Supabase Dashboard

### 5. URLs Possíveis que Linking.createURL Pode Gerar

No **TestFlight/Production:**
- `app.rork.bored-explorer://auth/callback`
- `exp://u.expo.dev/cd4bc13b-fb4a-4d0d-82ed-3faf6e991bba/--/auth/callback`

No **Development:**
- `exp://192.168.1.X:8081/--/auth/callback`
- `boredtourist://auth/callback`

### 6. Verificar Supabase Dashboard

Vai a: https://supabase.com/dashboard/project/YOUR_PROJECT/auth/url-configuration

E adiciona TODOS estes URLs:
```
app.rork.bored-explorer://auth/callback
boredtourist://auth/callback
exp://u.expo.dev/cd4bc13b-fb4a-4d0d-82ed-3faf6e991bba/--/auth/callback
```

### 7. Próximo Build - Add Alertas Temporários

Se não conseguires ver logs, podemos adicionar `Alert.alert()` temporários no código para debugar:

```typescript
const redirectUrl = Linking.createURL('auth/callback');
Alert.alert('Debug', `Redirect URL: ${redirectUrl}`); // Mostra na tela!
```

Assim ela pode tirar screenshot do alert e enviar-te.
