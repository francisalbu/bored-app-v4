# Fix Google OAuth - Exchange Code for Session

## 🎯 Problema Identificado

O Google OAuth está a retornar um **authorization code** em vez de tokens diretamente:

```
boredtravel://auth/callback?code=f73028ad-293d-44ab-b9c7-5e0a048801b4
```

O código atual procura por `access_token` e `refresh_token`, mas recebe `code`. Precisamos **trocar o code por tokens** usando `supabase.auth.exchangeCodeForSession()`.

---

## ✅ Solução

Substitui a função `handleDeepLink` em `components/AuthBottomSheet.tsx` (linhas ~60-90):

```typescript
const handleDeepLink = async (event: { url: string }) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔗 DEEP LINK RECEIVED:', event.url);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (event.url.includes('/auth/callback') || event.url.includes('auth/callback')) {
    console.log('✅ Auth callback detected!');
    
    try {
      console.log('📍 Full URL:', event.url);
      
      const url = new URL(event.url);
      console.log('🔍 URL search:', url.search);
      
      // Extract code from URL
      const params = new URLSearchParams(url.search);
      const code = params.get('code');
      
      console.log('🔑 Found:', { hasCode: !!code });
      
      if (code) {
        console.log('🔄 Exchanging authorization code for session...');
        
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          console.error('❌ Error exchanging code:', error);
          Alert.alert('Authentication Error', 'Failed to complete sign in. Please try again.');
          return;
        }
        
        if (data.session) {
          console.log('✅✅✅ SESSION ESTABLISHED! ✅✅✅');
          console.log('📧 User:', data.session.user.email);
          console.log('👤 User ID:', data.session.user.id);
          
          // Close modal and call success callback
          onClose();
          if (onSuccess) {
            console.log('📞 Calling onSuccess callback...');
            onSuccess();
          }
        }
      } else {
        console.error('❌ No authorization code found in URL!');
        Alert.alert('Error', 'Authentication failed. No code received.');
      }
    } catch (error) {
      console.error('❌ Error processing deep link:', error);
    }
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
};
```

---

## 🔍 O Que Mudou?

### Antes ❌
```typescript
const params = new URLSearchParams(url.hash.substring(1));
const access_token = params.get('access_token');
const refresh_token = params.get('refresh_token');

if (access_token && refresh_token) {
  await supabase.auth.setSession({ access_token, refresh_token });
}
```

### Depois ✅
```typescript
const params = new URLSearchParams(url.search); // Lê query params (?code=...)
const code = params.get('code');

if (code) {
  await supabase.auth.exchangeCodeForSession(code); // Troca code por session
}
```

---

## 📝 Explicação Técnica

### PKCE Flow (Authorization Code Flow)

1. **App → Supabase**: "Quero fazer Google OAuth"
2. **Supabase → Google**: Redireciona user para login
3. **Google → App**: Retorna com `?code=xxx` (não tokens!)
4. **App → Supabase**: "Troca este code por tokens" (`exchangeCodeForSession`)
5. **Supabase**: Valida code e retorna session com tokens
6. **App**: User autenticado! ✅

### Porquê usar PKCE?

- **Mais seguro**: Tokens nunca passam pelo URL
- **Mobile-friendly**: Padrão para apps nativas
- **Supabase recomendado**: Usa este flow por padrão

---

## 🧪 Como Testar

1. **Fecha completamente a app**
2. **Reabre a app**
3. **Clica em "Sign in with Google"**
4. **Escolhe a tua conta**
5. **Clica em "Continue"**
6. **Clica em "Abrir" no popup iOS**

**Logs esperados:**
```
🔗 DEEP LINK RECEIVED: boredtravel://auth/callback?code=f73028ad...
✅ Auth callback detected!
📍 Full URL: boredtravel://auth/callback?code=f73028ad...
🔍 URL search: ?code=f73028ad...
🔑 Found: { hasCode: true }
🔄 Exchanging authorization code for session...
✅✅✅ SESSION ESTABLISHED! ✅✅✅
📧 User: francisalbu@gmail.com
📞 Calling onSuccess callback...
```

---

## ⚠️ Nota Importante

Se vires `skipBrowserRedirect: true` no código do `signInWithOAuth`, muda para `false`:

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: redirectUrl,
    skipBrowserRedirect: false, // ✅ Deixa Supabase handle o redirect
  },
});
```

---

## 🚀 Próximos Passos

Depois de corrigir:

1. **Testa Google Sign-In** ✅
2. **Confirma que não sai da app** ✅  
3. **Verifica que o user fica autenticado** ✅
4. **Commit as alterações** 📝

---

**Status:** Pronto para implementar! 🎉
