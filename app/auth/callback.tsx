/**
 * OAuth Callback Handler
 * 
 * Handles the OAuth redirect after successful authentication
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { refreshUser } = useAuth();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      console.log('🔄 Auth Callback - Processing OAuth redirect...');
      console.log('📍 URL params:', JSON.stringify(params, null, 2));
      
      // Extract code or tokens from URL params
      const code = params.code as string;
      const accessToken = params.access_token as string;
      const refreshToken = params.refresh_token as string;
      const errorParam = params.error as string;
      const errorDescription = params.error_description as string;
      
      // Check for OAuth errors
      if (errorParam) {
        console.error('❌ OAuth error:', errorParam);
        console.error('❌ Error description:', errorDescription);
        router.replace('/(tabs)/profile');
        return;
      }
      
      // Handle PKCE flow (code exchange)
      if (code) {
        console.log('🔑 Authorization code found! Exchanging for session...');
        
        const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError) {
          console.error('❌ Error exchanging code:', exchangeError);
          router.replace('/(tabs)/profile');
          return;
        }
        
        if (sessionData?.session) {
          console.log('✅ Session established via code exchange!');
          console.log('📧 Email:', sessionData.session.user.email);
          console.log('👤 User ID:', sessionData.session.user.id);
          
          // Sync with backend
          try {
            await refreshUser();
            console.log('✅ User synced with backend!');
          } catch (syncError) {
            console.log('⚠️ Backend sync failed (continuing):', syncError);
          }
          
          // Redirect to home
          console.log('🏠 Redirecting to home...');
          router.replace('/(tabs)');
          return;
        }
      }
      
      // Handle Implicit flow (direct tokens)
      if (accessToken && refreshToken) {
        console.log('🔑 Tokens found in URL params!');
        console.log('🔄 Setting session...');
        
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (sessionError) {
          console.error('❌ Error setting session:', sessionError);
          throw sessionError;
        }
        
        if (sessionData?.session) {
          console.log('✅ Session established!');
          console.log('📧 Email:', sessionData.session.user.email);
          console.log('👤 User ID:', sessionData.session.user.id);
          
          // Sync with backend (optional, continue even if it fails)
          try {
            await refreshUser();
            console.log('✅ User synced with backend!');
          } catch (syncError) {
            console.log('⚠️ Backend sync failed (continuing):', syncError);
          }
          
          // Redirect to home
          console.log('🏠 Redirecting to home...');
          router.replace('/(tabs)');
          return;
        }
      }
      
      // Fallback: No tokens in URL, check if Supabase already has a session
      console.log('⏳ No tokens in URL, checking for existing session...');
      
      // Wait a moment for Supabase to process the callback
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to get the session multiple times
      let session = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!session && attempts < maxAttempts) {
        attempts++;
        console.log(`🔄 Attempt ${attempts}/${maxAttempts} to get session...`);
        
        const { data: sessionData, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session error:', error);
        }
        
        if (sessionData?.session) {
          session = sessionData.session;
          break;
        }
        
        if (attempts < maxAttempts) {
          console.log('⏳ No session yet, waiting 500ms...');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (session) {
        console.log('✅ Found existing session!');
        console.log('📧 Email:', session.user.email);
        
        // Sync with backend
        try {
          await refreshUser();
          console.log('✅ User synced!');
        } catch (syncError) {
          console.log('⚠️ Backend sync failed (continuing):', syncError);
        }
        
        // Check if there's a success callback from the auth flow (e.g., from payment screen)
        const successCallback = (global as any).__authSuccessCallback;
        if (successCallback) {
          console.log('📞 Found auth success callback, calling it...');
          delete (global as any).__authSuccessCallback;
          successCallback();
          // Don't navigate - let the callback handle navigation
        } else {
          console.log('🏠 No callback found, navigating to home');
          router.replace('/(tabs)');
        }
      } else {
        console.log('⚠️ No session found after', maxAttempts, 'attempts');
        console.log('🔍 This might mean:');
        console.log('  - OAuth callback failed');
        console.log('  - Google OAuth not configured in Supabase');
        console.log('  - Redirect URL mismatch');
        router.replace('/(tabs)/profile');
      }
    } catch (error) {
      console.error('❌ Callback handling error:', error);
      router.replace('/(tabs)/profile');
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.dark.primary} />
      <Text style={styles.text}>Processing authentication...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    fontSize: 16,
    color: colors.dark.textSecondary,
  },
});
