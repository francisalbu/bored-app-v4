# FIX PARA GOOGLE OAUTH - USAR EXPO AUTH SESSION

O problema é que `WebBrowser.openAuthSessionAsync` não está a passar os tokens de volta corretamente para o app.

## Solução:

Usar `expo-auth-session` que é o método recomendado pela Expo para OAuth:

```typescript
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const handleGoogleSignIn = async () => {
  try {
    setLoadingProvider('google');
    setIsLoading(true);

    // Get OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        skipBrowserRedirect: true, // Important!
      },
    });

    if (error || !data?.url) throw error || new Error('No URL');

    // Open browser with AuthSession (handles redirect automatically)
    const result = await AuthSession.openAuthSessionAsync(
      data.url,
      'app.rork.bored-explorer://'
    );

    if (result.type === 'success' && result.url) {
      // Extract params from the URL
      const url = new URL(result.url);
      const params = new URLSearchParams(url.hash.substring(1));
      
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (access_token && refresh_token) {
        // Set session manually
        const { error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (sessionError) throw sessionError;

        router.replace('/(tabs)');
      }
    }
  } catch (error: any) {
    Alert.alert('Erro', error.message);
  } finally {
    setIsLoading(false);
    setLoadingProvider(null);
  }
};
```

**IMPORTANTE**: No Supabase, o Redirect URL deve estar configurado como:
```
app.rork.bored-explorer://
```

Sem nenhum path adicional!
