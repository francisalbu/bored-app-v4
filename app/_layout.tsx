import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider } from '@/contexts/AuthContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { BookingsProvider } from '@/contexts/BookingsContext';

// Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51Qe0O1JwIDoL5bobJjmXtc84YbeYprPx35DcRALLIlqumUqrUxGY86bsxdq8xTEf7hgzjVRDAOAnlHFQkC1YW2Sx00JRhjovcc';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerBackTitle: 'Back' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
        <Stack.Screen name="auth/verify-email" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="saved-experiences" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    console.log('[Bored App] App is starting...');
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StripeProvider
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        urlScheme="boredtravel"
        merchantIdentifier="merchant.app.rork.bored-explorer"
      >
        <AuthProvider>
          <BookingsProvider>
            <FavoritesProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <RootLayoutNav />
              </GestureHandlerRootView>
            </FavoritesProvider>
          </BookingsProvider>
        </AuthProvider>
      </StripeProvider>
    </QueryClientProvider>
  );
}
