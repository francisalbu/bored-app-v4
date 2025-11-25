/**
 * Auth Bottom Sheet Component
 * Bottom sheet with social login options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';
import colors from '@/constants/colors';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

// Complete the auth session when returning to app
WebBrowser.maybeCompleteAuthSession();

interface AuthBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Optional callback for successful auth
}

export default function AuthBottomSheet({ visible, onClose, onSuccess }: AuthBottomSheetProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  // Listen for OAuth callback deep links - SIMPLIFIED
  // Let Supabase handle the code exchange automatically!
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      console.log('🔗 Deep link received:', event.url);
      
      // Parse the URL to check for OAuth parameters
      const url = event.url;
      
      // Check if this is an OAuth callback (will have either access_token or code)
      if (url && (url.includes('access_token') || url.includes('code='))) {
        console.log('✅ OAuth callback detected! Supabase will handle the session.');
        
        // Give Supabase a moment to process the session
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Close the modal - the auth context listener will handle the rest
        onClose();
        
        console.log('⏳ Waiting for onAuthStateChange to fire...');
      }
    };

    // Subscribe to URL events
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Cleanup subscription
    return () => {
      subscription.remove();
    };
  }, [onClose]);

  const handleGoogleSignIn = async () => {
    try {
      setLoadingProvider('google');
      setIsLoading(true);

      console.log('🔐 Starting Google Sign-In with Supabase...');
      
      // Use the EXACT redirect URL configured in Supabase
      // For TestFlight/production, use the custom scheme
      const redirectUrl = 'app.rork.bored-explorer://';
      
      console.log('🔗 Redirect URL:', redirectUrl);
      
      // Use Supabase OAuth with automatic redirect handling
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: 'select_account', // Always show account selection
          },
        },
      });

      if (error) {
        console.error('❌ OAuth error:', error);
        Alert.alert('Error', 'Failed to start Google sign in: ' + error.message);
        return;
      }

      if (!data?.url) {
        console.error('❌ No OAuth URL returned');
        Alert.alert('Error', 'Unable to start authentication.');
        return;
      }

      console.log('🌐 Opening OAuth URL...');
      console.log('📍 OAuth URL:', data.url);
      
      // Open the browser - Let Supabase handle the code exchange automatically!
      // The onAuthStateChange listener will catch when the session is ready
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      
      console.log('🔙 Browser closed, result type:', result.type);
      
      if (result.type === 'success') {
        console.log('✅ OAuth flow completed! Supabase will handle the rest.');
        console.log('⏳ Waiting for onAuthStateChange to fire...');
        
        // Close the modal - the auth context will update automatically
        onClose();
        
      } else if (result.type === 'cancel') {
        console.log('ℹ️ User cancelled OAuth');
      } else {
        console.log('⚠️ OAuth did not complete, type:', result.type);
      }

    } catch (error: any) {
      console.error('❌ Google sign in error:', error);
      Alert.alert('Error', error.message || 'Failed to sign in with Google.');
    } finally {
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  const handleAppleSignIn = async () => {
    Alert.alert('Coming Soon', 'Apple sign in will be available soon!');
  };

  const handleFacebookSignIn = async () => {
    Alert.alert('Coming Soon', 'Facebook sign in will be available soon!');
  };

  const handleEmailContinue = () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    onClose();
    // Route to login page (not signup) - users with existing accounts want to sign in
    router.push({
      pathname: '/auth/login',
      params: { 
        email,
        returnTo: onSuccess ? 'payment' : 'home' // Tell login where to go after success
      },
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.overlay} 
        onPress={onClose}
      >
        <Pressable 
          style={styles.container}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.dark.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Sign in or sign up</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.subtitle}>
              Access your tickets easily from any device with your Bored Tourist account.
            </Text>

            {/* Social Sign In Buttons */}
            <View style={styles.socialButtons}>
              {/* Apple Sign In - TEMPORARILY DISABLED */}
              <Pressable
                style={[styles.socialButton, styles.appleButton, { opacity: 0.5 }]}
                disabled={true}
              >
                <Text style={styles.appleIcon}></Text>
                <Text style={styles.socialButtonText}>Continue with Apple (coming soon)</Text>
              </Pressable>

              {/* Google Sign In */}
              <Pressable
                style={[styles.socialButton, styles.googleButton]}
                onPress={handleGoogleSignIn}
                disabled={isLoading}
              >
                {loadingProvider === 'google' ? (
                  <ActivityIndicator color={colors.dark.text} />
                ) : (
                  <>
                    <Text style={styles.googleIcon}>G</Text>
                    <Text style={[styles.socialButtonText, styles.googleButtonText]}>
                      Continue with Google
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Facebook Sign In - TEMPORARILY DISABLED */}
              <Pressable
                style={[styles.socialButton, styles.facebookButton, { opacity: 0.5 }]}
                disabled={true}
              >
                <Text style={styles.facebookIcon}>f</Text>
                <Text style={[styles.socialButtonText, styles.facebookButtonText]}>
                  Continue with Facebook (coming soon)
                </Text>
              </Pressable>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email Input */}
            <View style={styles.emailSection}>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={colors.dark.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />

              <Pressable
                style={[styles.continueButton, (!email || isLoading) && styles.continueButtonDisabled]}
                onPress={handleEmailContinue}
                disabled={!email || isLoading}
              >
                <Text style={styles.continueButtonText}>Continue with email</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.dark.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark.text,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  socialButtons: {
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 12,
    gap: 12,
  },
  appleButton: {
    backgroundColor: '#fff',
  },
  googleButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.dark.border,
  },
  facebookButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.dark.border,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark.background,
  },
  googleButtonText: {
    color: colors.dark.text,
  },
  facebookButtonText: {
    color: colors.dark.text,
  },
  appleIcon: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.dark.background,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
    fontFamily: Platform.select({ ios: 'System', android: 'Roboto' }),
  },
  facebookIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1877F2',
    fontFamily: Platform.select({ ios: 'System', android: 'Roboto' }),
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.dark.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: colors.dark.textTertiary,
  },
  emailSection: {
    gap: 12,
  },
  input: {
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.dark.border,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.dark.text,
    backgroundColor: colors.dark.card,
  },
  continueButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.dark.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark.background,
  },
});
