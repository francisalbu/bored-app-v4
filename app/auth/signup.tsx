import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import Svg, { Path } from 'react-native-svg';
// Google Icon Component (Official Google "G" logo)
const GoogleIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </Svg>
);
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Mail, Lock, ArrowLeft } from 'lucide-react-native';
import colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const params = useLocalSearchParams();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showSigningIn, setShowSigningIn] = useState(false);
  
  // Pre-fill email if passed as parameter
  useEffect(() => {
    if (params.email && typeof params.email === 'string') {
      setEmail(params.email);
    }
  }, [params.email]);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    const result = await register(name, email, password);
    setIsLoading(false);

    if (result.success) {
      // Check if email confirmation is needed
      if (result.needsEmailConfirmation) {
        console.log('📧 Redirecting to email verification');
        router.push({
          pathname: '/auth/verify-email',
          params: { email: result.email || email },
        });
      } else {
        // Registration complete, go to home
        router.replace('/(tabs)');
      }
    } else {
      Alert.alert('Signup Failed', result.error || 'Failed to create account');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);

      const redirectURL = 'app.rork.bored-explorer://';
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectURL,
          skipBrowserRedirect: false,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No OAuth URL returned');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectURL);
      
      if (result.type === 'cancel') {
        Alert.alert('Cancelled', 'Login was cancelled');
      } else if (result.type === 'success' && 'url' in result) {
        setShowSigningIn(true);
        
        try {
          let fixedUrl = result.url;
          if (fixedUrl.includes('app.rork.bored-explorer:?')) {
            fixedUrl = fixedUrl.replace('app.rork.bored-explorer:?', 'app.rork.bored-explorer://?');
          }
          
          const url = new URL(fixedUrl);
          const code = url.searchParams.get('code')?.replace(/%23$/, '').replace(/#$/, '');
          
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (exchangeError) {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) throw exchangeError;
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (err) {
          setShowSigningIn(false);
          Alert.alert('Error', 'Failed to sign in. Please try again.');
          return;
        }
        
        setShowSigningIn(false);
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign in with Google');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.dark.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to start your adventure</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <User size={20} color={colors.dark.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={colors.dark.textTertiary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
            />
          </View>

          <View style={styles.inputContainer}>
            <Mail size={20} color={colors.dark.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.dark.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color={colors.dark.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.dark.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
            />
          </View>

          <Pressable
            style={[styles.signupButton, isLoading && styles.signupButtonDisabled]}
            onPress={handleSignup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.dark.background} />
            ) : (
              <Text style={styles.signupButtonText}>Create Account</Text>
            )}
          </Pressable>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By signing up, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Apple Sign In - iOS only - Using native button */}
          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={12}
              style={{ width: '100%', height: 56, marginBottom: 12 }}
              onPress={async () => {
                try {
                  setIsLoading(true);
                  const credential = await AppleAuthentication.signInAsync({
                    requestedScopes: [
                      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                      AppleAuthentication.AppleAuthenticationScope.EMAIL,
                    ],
                  });
                  if (!credential.identityToken) throw new Error('No identity token received from Apple');
                  const { data, error } = await supabase.auth.signInWithIdToken({
                    provider: 'apple',
                    token: credential.identityToken,
                  });
                  if (error) throw error;
                  if (credential.fullName?.givenName || credential.fullName?.familyName) {
                    const fullName = [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ');
                    if (fullName) await supabase.auth.updateUser({ data: { name: fullName } });
                  }
                  router.replace('/(tabs)');
                } catch (error: any) {
                  Alert.alert('Sign-Up Failed', error.message || 'Unable to sign up with Apple. Please try again or use another method.');
                } finally {
                  setIsLoading(false);
                }
              }}
            />
          )}
          <Pressable
            style={[styles.socialButton, styles.googleButton, isGoogleLoading && styles.googleButtonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#4285F4" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <GoogleIcon size={20} />
                <Text style={{ color: '#000', fontSize: 19, fontWeight: '600', marginLeft: 12 }}>Continue with Google</Text>
              </View>
            )}
          </Pressable>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.loginLink}>Sign In</Text>
            </Pressable>
          </View>

          {showSigningIn && (
            <View style={styles.signingInOverlay}>
              <View style={styles.signingInBox}>
                <ActivityIndicator size="large" color={colors.dark.primary} />
                <Text style={styles.signingInText}>Signing you in...</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  titleContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.dark.textSecondary,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.dark.text,
  },
  signupButton: {
    backgroundColor: colors.dark.primary,
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.dark.background,
  },
  termsContainer: {
    marginTop: 8,
  },
  termsText: {
    fontSize: 12,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: colors.dark.primary,
    fontWeight: '600' as const,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    color: colors.dark.primary,
    fontWeight: '700' as const,
  },
  socialButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 0,
  },
  socialButtonText: {
    fontSize: 19,
    fontWeight: '600',
    color: colors.dark.background,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.dark.text,
  },
  signingInOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  signingInBox: {
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  signingInText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.dark.text,
  },
});
