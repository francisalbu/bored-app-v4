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
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { X } from 'lucide-react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import colors from '@/constants/colors';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
// import * as AuthSession from 'expo-auth-session'; // Não é necessário para este fluxo

// Permite ao WebBrowser completar a sessão quando o app reabre
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
  const [showSigningIn, setShowSigningIn] = useState(false);

  // Deep link listener to show loading and close modal when OAuth completes
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      console.log('📱 [AuthBottomSheet] Deep link received:', event.url);
      
      // If it's an OAuth callback, show loading overlay
      if (event.url.includes('code=') || event.url.includes('access_token=')) {
        console.log('✅ [AuthBottomSheet] OAuth callback detected, showing loading...');
        setShowSigningIn(true);
        
        // Hide loading and close modal after AuthContext processes the session
        setTimeout(() => {
          setShowSigningIn(false);
          onClose();
        }, 1000); // Quick transition
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, [onClose]);

  const handleGoogleSignIn = async () => {
    try {
      setLoadingProvider('google');
      setIsLoading(true);

      console.log('=== STARTING GOOGLE SIGN-IN ===');
      
      // Use the fixed redirect URL configured in Supabase
      const redirectURL = 'app.rork.bored-explorer://';
      
      console.log('Redirect URL:', redirectURL);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectURL,
          skipBrowserRedirect: false, // Let WebBrowser capture the redirect
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account', // Force account selection
          },
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }

      if (!data?.url) {
        throw new Error('No OAuth URL returned');
      }

      console.log('OAuth URL received:', data.url.substring(0, 100) + '...');
      console.log('Opening browser...');

      // Open browser with the fixed redirect URL
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectURL
      );

      console.log('=== BROWSER CLOSED ===');
      console.log('Result type:', result.type);
      console.log('Full result:', JSON.stringify(result));
      
      if (result.type === 'cancel') {
        console.log('User cancelled');
        Alert.alert('Cancelado', 'Login foi cancelado');
      } else if (result.type === 'success' && 'url' in result) {
        console.log('✅ Got callback URL:', result.url);
        
        // Show signing in overlay
        setShowSigningIn(true);
        
        // Process the URL - Supabase SDK should detect it via detectSessionInUrl
        // But we'll also manually trigger the session creation
        try {
          // Fix malformed URL
          let fixedUrl = result.url;
          if (fixedUrl.includes('app.rork.bored-explorer:?')) {
            fixedUrl = fixedUrl.replace('app.rork.bored-explorer:?', 'app.rork.bored-explorer://?');
          }
          
          const url = new URL(fixedUrl);
          const code = url.searchParams.get('code')?.replace(/%23$/, '').replace(/#$/, '');
          
          if (code) {
            console.log('🔑 Exchanging code for session...');
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (exchangeError) {
              console.error('❌ Exchange error:', exchangeError);
              // Try to get the session anyway - might already be created
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                console.log('✅ Session found after exchange error!');
                // Wait a bit for AuthContext to process
                await new Promise(resolve => setTimeout(resolve, 500));
                setShowSigningIn(false);
                onClose();
                return;
              }
              throw exchangeError;
            }
            
            console.log('✅ Session created!');
            // Wait for AuthContext to process the session (500ms is enough)
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (err) {
          console.error('❌ Error processing callback:', err);
          setShowSigningIn(false);
          Alert.alert('Erro', 'Falha ao fazer login. Tente novamente.');
          return;
        }
        
        setShowSigningIn(false);
        onClose();
      } else {
        console.log('✅ OAuth completed');
        onClose();
      }
    } catch (error: any) {
      console.error('=== GOOGLE SIGN-IN ERROR ===');
      console.error(error);
      Alert.alert('Erro', error.message || 'Falha ao entrar com Google');
    } finally {
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoadingProvider('apple');
      setIsLoading(true);

      console.log('=== STARTING APPLE SIGN-IN ===');

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('Apple credential received:', {
        user: credential.user,
        email: credential.email,
        fullName: credential.fullName,
      });

      if (credential.identityToken) {
        console.log('🔑 Signing in with Supabase using Apple token...');
        
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) {
          console.error('❌ Supabase Apple sign-in error:', error);
          throw error;
        }

        console.log('✅ Apple sign-in successful!', data.user?.email);
        
        // Update user name if provided (Apple only gives name on first sign-in)
        if (credential.fullName?.givenName || credential.fullName?.familyName) {
          const fullName = [credential.fullName.givenName, credential.fullName.familyName]
            .filter(Boolean)
            .join(' ');
          
          if (fullName) {
            await supabase.auth.updateUser({
              data: { name: fullName }
            });
          }
        }

        setShowSigningIn(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        setShowSigningIn(false);
        onClose();
        if (onSuccess) onSuccess();
      } else {
        throw new Error('No identity token received from Apple');
      }
    } catch (error: any) {
      console.error('=== APPLE SIGN-IN ERROR ===');
      console.error(error);
      
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled, don't show error
        console.log('User cancelled Apple sign-in');
      } else {
        Alert.alert('Erro', error.message || 'Falha ao entrar com Apple');
      }
    } finally {
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  const handleFacebookSignIn = async () => {
    Alert.alert('Coming Soon', 'Facebook sign in will be available soon!');
  };

  const handleEmailContinue = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setIsLoading(true);

    try {
      // Check if email exists in Supabase auth.users
      const { data, error } = await supabase.rpc('check_email_exists', { 
        email_to_check: email.toLowerCase().trim() 
      });

      if (error) {
        console.error('Error checking email:', error);
        // If RPC fails, try alternative method: attempt sign in to check if user exists
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password: 'dummy-password-to-check-existence', // This will fail but tell us if user exists
        });

        // Check error message to determine if user exists
        const userExists = signInError?.message?.includes('Invalid login credentials') || 
                          signInError?.message?.includes('Email not confirmed');

        onClose();
        if (userExists) {
          // User exists, go to login
          router.push({
            pathname: '/auth/login',
            params: { 
              email,
              returnTo: onSuccess ? 'payment' : 'home'
            },
          });
        } else {
          // User doesn't exist, go to signup
          router.push({
            pathname: '/auth/signup',
            params: { 
              email,
              returnTo: onSuccess ? 'payment' : 'home'
            },
          });
        }
        return;
      }

      onClose();

      // If we have the RPC function, use its result
      if (data === true) {
        // Email exists, redirect to login
        router.push({
          pathname: '/auth/login',
          params: { 
            email,
            returnTo: onSuccess ? 'payment' : 'home'
          },
        });
      } else {
        // Email doesn't exist, redirect to signup
        router.push({
          pathname: '/auth/signup',
          params: { 
            email,
            returnTo: onSuccess ? 'payment' : 'home'
          },
        });
      }
    } catch (error: any) {
      console.error('Error in handleEmailContinue:', error);
      Alert.alert('Error', 'Failed to verify email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Signing In Overlay */}
      {showSigningIn && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.signingInOverlay}>
            <View style={styles.signingInCard}>
              <ActivityIndicator size="large" color="#4285F4" />
              <Text style={styles.signingInText}>Signing you in...</Text>
              <Text style={styles.signingInSubtext}>Please wait</Text>
            </View>
          </View>
        </Modal>
      )}

      {/* Main Auth Modal */}
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <Pressable 
          style={styles.overlay} 
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={0}
          >
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                  <Pressable onPress={onClose} style={styles.closeButton}>
                    <X size={24} color={colors.dark.text} />
                  </Pressable>
                  <Text style={styles.headerTitle}>Sign in or sign up</Text>
                  <View style={{ width: 40 }} />
                </View>

                {/* Content - Scrollable */}
                <ScrollView
                  style={styles.scrollContent}
                  contentContainerStyle={styles.content}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                <Text style={styles.subtitle}>
                  Access your tickets easily from any device with your Bored Tourist account.
                </Text>

                {/* Social Sign In Buttons */}
                <View style={styles.socialButtons}>
                  {/* Apple Sign In - iOS only */}
                  {Platform.OS === 'ios' && (
                    <Pressable
                      style={[styles.socialButton, styles.appleButton]}
                      onPress={handleAppleSignIn}
                      disabled={isLoading}
                    >
                      {loadingProvider === 'apple' ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={styles.appleIcon}></Text>
                          <Text style={styles.socialButtonText}>Continue with Apple</Text>
                        </>
                      )}
                    </Pressable>
                  )}

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

                  {/* Continue Button */}
                  <Pressable
                    style={[styles.continueButton, (!email || isLoading) && styles.continueButtonDisabled]}
                    onPress={handleEmailContinue}
                    disabled={!email || isLoading}
                  >
                    {isLoading && loadingProvider === null ? (
                      <ActivityIndicator color={colors.dark.background} />
                    ) : (
                      <Text style={styles.continueButtonText}>Continue with email</Text>
                    )}
                  </Pressable>
                </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Pressable>
    </Modal>
    </>
  );
}

// ... (Restante dos styles omitidos)

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    width: '100%',
    maxHeight: '85%',
  },
  container: {
    backgroundColor: colors.dark.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '100%',
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
  scrollContent: {
    maxHeight: '100%',
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
  signingInOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signingInCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    minWidth: 280,
  },
  signingInText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark.text,
    marginTop: 8,
  },
  signingInSubtext: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },
});
