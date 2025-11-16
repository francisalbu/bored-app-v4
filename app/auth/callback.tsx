/**
 * OAuth Callback Handler
 * 
 * Handles the OAuth redirect after successful authentication
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Linking } from 'react-native';
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
      console.log('🔄 Auth Callback - Starting...');
      
      // Add URL listener to catch the deep link
      const handleUrl = async (event: { url: string }) => {
        console.log('📍 Captured URL from listener:', event.url);
        await processUrl(event.url);
      };
      
      const subscription = Linking.addEventListener('url', handleUrl);
      
      // Also try to get initial URL
      const initialUrl = await Linking.getInitialURL();
      console.log('📍 Initial URL:', initialUrl);
      
      if (initialUrl) {
        await processUrl(initialUrl);
      } else {
        console.log('⚠️ No initial URL, waiting for event...');
      }
      
      // Clean up listener after 5 seconds
      setTimeout(() => {
        subscription.remove();
      }, 5000);
      
    } catch (error) {
      console.error('❌ Callback handling error:', error);
      router.replace('/(tabs)/profile');
    }
  };
  
  const processUrl = async (url: string) => {
    try {
      console.log('🔍 Processing URL:', url);
      
      // Extract tokens from URL hash fragment
      if (url && url.includes('#')) {
        console.log('🔍 Parsing hash fragment...');
        const hashPart = url.split('#')[1];
        const hashParams = new URLSearchParams(hashPart);
        
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        console.log('🔑 Access token found:', accessToken ? 'YES' : 'NO');
        console.log('🔄 Refresh token found:', refreshToken ? 'YES' : 'NO');
        
        if (accessToken && refreshToken) {
          console.log('✅ Setting session with extracted tokens...');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('❌ Error setting session:', error);
          } else {
            console.log('✅ Session set successfully!');
            console.log('📧 Email:', data.session?.user.email);
            console.log('👤 Supabase User ID:', data.session?.user.id);
            
            // Sync with backend
            console.log('🔄 Syncing with backend...');
            try {
              await refreshUser();
              console.log('✅ User synced! Redirecting to home...');
              router.replace('/(tabs)');
              return;
            } catch (syncError) {
              console.error('❌ Sync error:', syncError);
              console.log('⚠️ Continuing anyway...');
              router.replace('/(tabs)');
              return;
            }
          }
        }
      }
      
      // Fallback: Wait for Supabase to process the OAuth redirect automatically
      console.log('⏳ Waiting for Supabase to auto-process...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to get the session multiple times if needed
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
          console.log('⏳ No session yet, waiting 1s...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (session) {
        console.log('✅ OAuth session established!');
        console.log('📧 Email:', session.user.email);
        console.log('👤 Supabase User ID:', session.user.id);
        console.log('🔑 Token (first 20 chars):', session.access_token.substring(0, 20) + '...');
        
        // Refresh user data to sync with backend
        console.log('🔄 Syncing with backend...');
        try {
          await refreshUser();
          console.log('✅ User synced! Redirecting to home...');
          router.replace('/(tabs)');
        } catch (syncError) {
          console.error('❌ Sync error:', syncError);
          console.log('⚠️ Continuing anyway, user may need to refresh...');
          router.replace('/(tabs)');
        }
      } else {
        console.log('⚠️ No session found after', maxAttempts, 'attempts');
        console.log('🔍 Redirecting to profile to try manual login...');
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
      <Text style={styles.text}>A processar autenticação...</Text>
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
