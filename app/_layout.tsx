import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StripeProvider } from '@stripe/stripe-react-native';
import { useFonts, Inter_300Light, Inter_400Regular, Inter_600SemiBold, Inter_800ExtraBold, Inter_900Black } from '@expo-google-fonts/inter';
import { AuthProvider } from '@/contexts/AuthContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { BookingsProvider } from '@/contexts/BookingsContext';

// Stripe publishable key - TEST MODE 🧪
// ⚠️ IMPORTANT: This is a TEST key - no real money will be charged!
// Use test cards: 4242 4242 4242 4242
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51Qe0OB2ZCSSBkVXw7lyC4hrAer9sx4A6kIfVLZlAwBaF6cNAgEiPLUUw5KlIO22txql7sG4tzUjwYY20eHoTizXn00Y2woBfvE';

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
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="info/about" options={{ headerShown: false }} />
        <Stack.Screen name="info/help" options={{ headerShown: false }} />
        <Stack.Screen name="info/terms" options={{ headerShown: false }} />
        <Stack.Screen name="info/privacy" options={{ headerShown: false }} />
        <Stack.Screen name="info/cancellation" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => {
    console.log('[Bored App] App is starting...');
    
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
