import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StripeProvider } from '@stripe/stripe-react-native';
import { useFonts, Inter_300Light, Inter_400Regular, Inter_600SemiBold, Inter_800ExtraBold, Inter_900Black } from '@expo-google-fonts/inter';
import { PostHogProvider } from 'posthog-react-native';
import { AuthProvider } from '@/contexts/AuthContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { BookingsProvider } from '@/contexts/BookingsContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { useShareIntent } from 'expo-share-intent';
import AnimatedSplash from '@/components/AnimatedSplash';

// Stripe publishable key - LIVE MODE 💰
// ⚠️ IMPORTANT: This is a LIVE key - real money will be charged!
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51Qe0O1JwIDoL5bobJjmXtc84YbeYprPx35DcRALLIlqumUqrUxGY86bsxdq8xTEf7hgzjVRDAOAnlHFQkC1YW2Sx00JRhjovcc';

// PostHog configuration
const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY || '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

// PostHog options with Session Replay DISABLED for stability
const POSTHOG_OPTIONS = {
  host: POSTHOG_HOST,
  // Disable Session Replay temporarily to debug crash
  enableSessionReplay: false,
  // sessionReplayConfig: {
  //   // Mask text inputs for privacy (passwords always masked)
  //   maskAllTextInputs: true,
  //   // Mask images for privacy
  //   maskAllImages: false, // Set to false to see experience images in replays
  //   // Capture logs automatically (Android only - Native Logcat)
  //   captureLog: true,
  //   // Capture network telemetry (iOS only - metrics like speed, size, response code)
  //   captureNetworkTelemetry: true,
  //   // Throttling delay to reduce snapshots and performance impact
  //   // Lower = more snapshots but higher performance impact
  //   throttleDelayMs: 1000, // 1 second between snapshots
  // },
};

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="experience" options={{ headerShown: false }} />
        <Stack.Screen name="booking" options={{ headerShown: false }} />
        <Stack.Screen name="reviews" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
        <Stack.Screen name="auth/verify-email" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="saved-experiences" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="info/about" options={{ headerShown: false }} />
        <Stack.Screen name="info/help" options={{ headerShown: false }} />
        <Stack.Screen name="info/terms" options={{ headerShown: false }} />
        <Stack.Screen name="info/privacy" options={{ headerShown: false }} />
        <Stack.Screen name="info/cancellation" options={{ headerShown: false }} />
        <Stack.Screen name="shared-content" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const [fontsLoaded] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_800ExtraBold,
    Inter_900Black,
  });
  // Handle shared content from other apps (TikTok, Instagram, etc.)
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({
    debug: true,
    resetOnBackground: false, // Don't reset on background - causes issues with navigation
  });

  // Navigate to shared-content screen when share intent is received
  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      console.log('📤 [ROOT] Share intent received:', shareIntent);
      
      // Extract URL or text from the shared content
      const sharedUrl = shareIntent.webUrl || shareIntent.text || '';
      const sharedText = shareIntent.text || '';
      
      console.log('📤 [ROOT] Navigating to shared-content with:', { sharedUrl, sharedText });
      
      // Navigate to the shared content screen
      router.push({
        pathname: '/shared-content',
        params: { 
          url: sharedUrl,
          text: sharedText
        }
      });
      
      // Reset the share intent after a delay to ensure navigation completes
      setTimeout(() => {
        resetShareIntent();
      }, 500);
    }
  }, [hasShareIntent, shareIntent]);

  useEffect(() => {
    console.log('[Bored App] App is starting...');
    
    // Listen for deep links (OAuth callbacks)
    const handleDeepLink = async (event: { url: string }) => {
      console.log('🔗 [ROOT] Deep link received:', event.url);
      
      // Check if it's a shared content URL (from TikTok, Instagram, etc.)
      if (event.url.includes('share') || event.url.includes('shared-content')) {
        console.log('📤 [ROOT] Shared content detected!');
        const url = new URL(event.url);
        const sharedUrl = url.searchParams.get('url');
        const sharedText = url.searchParams.get('text');
        
        if (sharedUrl || sharedText) {
          router.push({
            pathname: '/shared-content',
            params: { url: sharedUrl || '', text: sharedText || '' }
          });
        }
        return;
      }
      
      // Check if it's an OAuth callback
      if (event.url.includes('code=') || event.url.includes('access_token')) {
        console.log('✅ [ROOT] OAuth callback detected! Processing...');
        
        try {
          // Fix malformed URL: app.rork.bored-explorer:?code=... → app.rork.bored-explorer://?code=...
          let fixedUrl = event.url;
          if (fixedUrl.includes('app.rork.bored-explorer:?')) {
            fixedUrl = fixedUrl.replace('app.rork.bored-explorer:?', 'app.rork.bored-explorer://?');
            console.log('🔧 [ROOT] Fixed malformed URL');
          }
          
          // Extract code from URL for PKCE flow
          const url = new URL(fixedUrl);
          const code = url.searchParams.get('code');
          
          if (code) {
            // Remove the trailing # if present
            const cleanCode = code.replace(/%23$/, '').replace(/#$/, '');
            console.log('🔑 [ROOT] Found auth code, exchanging for session...');
            
            const { data, error } = await supabase.auth.exchangeCodeForSession(cleanCode);
            
            if (error) {
              console.error('❌ [ROOT] Error exchanging code:', error);
              console.error('Error details:', JSON.stringify(error, null, 2));
            } else if (data.session) {
              console.log('✅ [ROOT] Session created successfully!');
              console.log('User:', data.session.user.email);
            }
          } else {
            console.log('ℹ️ [ROOT] No code in URL, might be implicit flow');
          }
        } catch (err) {
          console.error('❌ [ROOT] Exception processing deep link:', err);
        }
      }
    };
    
    // Subscribe to deep link events
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🔗 [ROOT] Initial URL:', url);
        handleDeepLink({ url });
      }
    });
    
    // Wake up the backend server (Render free tier sleeps after 15min)
    const wakeUpServer = async () => {
      try {
        const API_URL = (process.env.NODE_ENV === 'development' || __DEV__) 
          ? 'http://192.168.1.145:3000' 
          : 'https://bored-tourist-api.onrender.com';
        
        console.log('[Bored App] Waking up backend server...');
        await fetch(`${API_URL}/health`, { method: 'GET' });
        console.log('[Bored App] Backend server is awake!');
      } catch (error) {
        console.log('[Bored App] Failed to wake server (might still be starting):', error);
      }
    };
    
    wakeUpServer();
    
    // Cleanup
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      console.log('✅ [Bored App] Inter fonts loaded successfully!');
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  // Core app content without PostHog
  const AppContent = (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <StripeProvider
          publishableKey={STRIPE_PUBLISHABLE_KEY}
          urlScheme="boredtourist"
          merchantIdentifier="merchant.app.rork.bored-explorer"
        >
          <AuthProvider>
            <PreferencesProvider>
              <BookingsProvider>
                <FavoritesProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <RootLayoutNav />
                    {showSplash && (
                      <AnimatedSplash onFinish={() => setShowSplash(false)} />
                    )}
                  </GestureHandlerRootView>
                </FavoritesProvider>
              </BookingsProvider>
            </PreferencesProvider>
          </AuthProvider>
        </StripeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );

  // Only wrap with PostHog if API key is available
  if (POSTHOG_API_KEY && POSTHOG_API_KEY.length > 0) {
    return (
      <PostHogProvider apiKey={POSTHOG_API_KEY} options={POSTHOG_OPTIONS}>
        {AppContent}
      </PostHogProvider>
    );
  }

  // Return without PostHog if no API key
  return AppContent;
}
