/**
 * Auth Landing Screen
 * 
 * Initial authentication screen with social login options and email
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Enable web browser for OAuth
WebBrowser.maybeCompleteAuthSession();

export default function AuthIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoadingProvider('google');
      setIsLoading(true);

      // Create deep link redirect URL
      const redirectUrl = Linking.createURL('auth/callback');
      console.log('🔗 Redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        throw error;
      }

      // Open browser for OAuth
      if (data.url) {
        console.log('🌐 Opening OAuth URL...');
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        console.log('📱 OAuth result:', result.type);

        if (result.type === 'success') {
          console.log('✅ OAuth success! Redirecting...');
          // The callback will be handled by app/auth/callback.tsx
        } else if (result.type === 'cancel') {
          Alert.alert('Cancelado', 'Login com Google cancelado');
        }
      }
    } catch (error: any) {
      console.error('❌ Google sign in error:', error);
      Alert.alert('Erro', error.message || 'Falha ao entrar com Google');
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
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    // Navigate to email signup with the email pre-filled
    router.push({
      pathname: '/auth/signup',
      params: { email },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={colors.dark.text} />
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Entrar ou cadastrar-se</Text>
        
        <Text style={styles.subtitle}>
          Confira ou acesse seus ingressos com mais facilidade de qualquer dispositivo com sua conta GetYourGuide.
        </Text>

        {/* Social Sign In Buttons */}
        <View style={styles.socialButtons}>
          {/* Apple Sign In */}
          <Pressable
            style={[styles.socialButton, styles.appleButton]}
            onPress={handleAppleSignIn}
            disabled={isLoading}
          >
            {loadingProvider === 'apple' ? (
              <ActivityIndicator color={colors.dark.background} />
            ) : (
              <>
                <Text style={styles.appleIcon}></Text>
                <Text style={styles.socialButtonText}>Continuar com a Apple</Text>
              </>
            )}
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
                  Continuar com o Google
                </Text>
              </>
            )}
          </Pressable>

          {/* Facebook Sign In */}
          <Pressable
            style={[styles.socialButton, styles.facebookButton]}
            onPress={handleFacebookSignIn}
            disabled={isLoading}
          >
            {loadingProvider === 'facebook' ? (
              <ActivityIndicator color={colors.dark.text} />
            ) : (
              <>
                <Text style={styles.facebookIcon}>f</Text>
                <Text style={[styles.socialButtonText, styles.facebookButtonText]}>
                  Continuar com o Facebook
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email Input */}
        <View style={styles.emailSection}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Endereço de e-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite seu e-mail"
              placeholderTextColor={colors.dark.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <Pressable
            style={[styles.continueButton, !email && styles.continueButtonDisabled]}
            onPress={handleEmailContinue}
            disabled={!email || isLoading}
          >
            <Text style={styles.continueButtonText}>Continuar com e-mail</Text>
          </Pressable>
        </View>

        {/* Footer Note */}
        <Text style={styles.footerNote}>
          Ao criar uma conta, você concorda com nossos Termos de Uso e Política de Privacidade.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.dark.text,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    lineHeight: 20,
    marginBottom: 32,
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
    marginBottom: 24,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.dark.text,
  },
  input: {
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.dark.border,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.dark.text,
  },
  continueButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark.text,
  },
  footerNote: {
    fontSize: 12,
    color: colors.dark.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
