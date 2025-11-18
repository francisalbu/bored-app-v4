/**
 * Auth Bottom Sheet Component
 * 
 * Modal bottom sheet with social login options
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();

interface AuthBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function AuthBottomSheet({ visible, onClose }: AuthBottomSheetProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoadingProvider('google');
      setIsLoading(true);

      // Check if Google is configured in Supabase
      console.log('🔐 Starting Google Sign-In...');
      console.log('📱 Platform:', Platform.OS);
      
      const redirectUrl = Linking.createURL('auth/callback');
      console.log('🔗 Redirect URL created:', redirectUrl);
      console.log('🔗 Expected format: boredtravel://auth/callback');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error('❌ OAuth error:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        Alert.alert(
          'Erro OAuth',
          `${error.message}\n\nVerifique:\n1. Google OAuth configurado no Supabase\n2. Redirect URL: ${redirectUrl}`
        );
        throw error;
      }

      if (data.url) {
        console.log('🌐 Opening OAuth URL:', data.url);
        console.log('🔄 Will redirect back to:', redirectUrl);
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        console.log('📱 OAuth result:', result);

        if (result.type === 'success') {
          console.log('✅ OAuth success! URL:', result.url);
          onClose();
          // Navigation will be handled by app/auth/callback.tsx
        } else if (result.type === 'cancel') {
          console.log('⚠️ OAuth cancelled by user');
          Alert.alert('Cancelado', 'Login com Google cancelado');
        } else {
          console.log('⚠️ OAuth result type:', result.type);
        }
      }
    } catch (error: any) {
      console.error('❌ Google sign in error:', error);
      Alert.alert(
        'Erro', 
        error.message || 'Falha ao entrar com Google. Verifique se o Google OAuth está configurado no Supabase.'
      );
    } finally {
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  const handleAppleSignIn = async () => {
    Alert.alert('Em breve', 'Apple sign in estará disponível em breve!');
  };

  const handleFacebookSignIn = async () => {
    Alert.alert('Em breve', 'Facebook sign in estará disponível em breve!');
  };

  const handleEmailContinue = () => {
    if (!email) {
      Alert.alert('Erro', 'Por favor insira o seu email');
      return;
    }

    onClose();
    router.push({
      pathname: '/auth/signup',
      params: { email },
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
            <Text style={styles.headerTitle}>Entrar ou cadastrar-se</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.subtitle}>
              Confira ou acesse seus ingressos com mais facilidade de qualquer dispositivo com sua conta Bored Tourist.
            </Text>

            {/* Social Sign In Buttons */}
            <View style={styles.socialButtons}>
              {/* Apple Sign In - TEMPORARIAMENTE DESATIVADO */}
              <Pressable
                style={[styles.socialButton, styles.appleButton, { opacity: 0.5 }]}
                disabled={true}
              >
                <Text style={styles.appleIcon}></Text>
                <Text style={styles.socialButtonText}>Continuar com a Apple (em breve)</Text>
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

              {/* Facebook Sign In - TEMPORARIAMENTE DESATIVADO */}
              <Pressable
                style={[styles.socialButton, styles.facebookButton, { opacity: 0.5 }]}
                disabled={true}
              >
                <Text style={styles.facebookIcon}>f</Text>
                <Text style={[styles.socialButtonText, styles.facebookButtonText]}>
                  Continuar com o Facebook (em breve)
                </Text>
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
              <TextInput
                style={styles.input}
                placeholder="Endereço de e-mail"
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
                <Text style={styles.continueButtonText}>Continuar com e-mail</Text>
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
