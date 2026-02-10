/**
 * ESTE É O FIX CORRETO PARA O GOOGLE OAUTH
 * 
 * Cole esta função no lugar do handleGoogleSignIn atual em app/auth/index.tsx
 * 
 * IMPORTANTE: Adiciona no topo do ficheiro:
 * import * as AuthSession from 'expo-auth-session';
 */

const handleGoogleSignIn = async () => {
  try {
    setLoadingProvider('google');
    setIsLoading(true);

    console.log('🔐 Starting Google Sign-In...');

    // Request OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        skipBrowserRedirect: true, // CRITICAL: Don't let Supabase handle redirect
      },
    });

    if (error || !data?.url) {
      throw error || new Error('No OAuth URL returned');
    }

    console.log('🌐 Opening browser with AuthSession...');

    // Open browser using AuthSession (better than WebBrowser for OAuth)
    const result = await AuthSession.openAuthSessionAsync(
      data.url,
      'app.rork.bored-explorer://'
    );

    console.log('🔙 Browser result:', result.type);

    if (result.type === 'success' && result.url) {
      console.log('✅ Got redirect URL with tokens!');
      
      // Parse the URL to extract tokens
      const url = new URL(result.url);
      const fragment = url.hash.substring(1); // Remove the # 
      const params = new URLSearchParams(fragment);
      
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      console.log('🔑 Tokens found:', {
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token,
      });

      if (access_token && refresh_token) {
        // Manually set the session in Supabase
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (sessionError) {
          throw sessionError;
        }

        console.log('✅ Session set! User:', sessionData.session?.user.email);
        console.log('🏠 Redirecting to home...');

        // Navigate to home
        router.replace('/(tabs)');
      } else {
        throw new Error('No tokens in redirect URL');
      }
    } else if (result.type === 'cancel') {
      console.log('❌ User cancelled');
      Alert.alert('Cancelado', 'Login com Google foi cancelado');
    } else {
      throw new Error(`Unexpected result type: ${result.type}`);
    }
  } catch (error: any) {
    console.error('❌ Google Sign-In error:', error);
    Alert.alert('Erro', error.message || 'Falha ao entrar com Google');
  } finally {
    setIsLoading(false);
    setLoadingProvider(null);
  }
};
