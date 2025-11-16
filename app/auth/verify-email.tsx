import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react-native';
import colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email: string }>();
  
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleOpenEmail = async () => {
    try {
      // Try to open the default email app
      const canOpen = await Linking.canOpenURL('message://');
      if (canOpen) {
        await Linking.openURL('message://');
      } else {
        // Fallback to gmail or other email apps
        Alert.alert(
          'Open Email App',
          'Please open your email app to verify your account',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error opening email:', error);
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) {
      Alert.alert('Please Wait', `You can resend in ${resendCooldown} seconds`);
      return;
    }

    if (!email) {
      Alert.alert('Error', 'Email address is missing. Please go back and try signing up again.');
      return;
    }

    setIsResending(true);
    
    try {
      console.log('Attempting to resend confirmation email to:', email);
      
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      console.log('Resend response:', { data, error });

      if (error) {
        console.error('Resend error:', error);
        
        // Provide more helpful error messages
        if (error.message.includes('Email rate limit exceeded')) {
          Alert.alert(
            'Too Many Requests', 
            'Please wait a few minutes before requesting another confirmation email.'
          );
        } else if (error.message.includes('not found')) {
          Alert.alert(
            'Configuration Error',
            'Email confirmation is not properly configured. Please contact support or try signing in directly if you\'ve already confirmed your email.'
          );
        } else {
          Alert.alert('Error', error.message || 'Failed to resend confirmation email');
        }
      } else {
        Alert.alert(
          'Email Sent!', 
          'Check your inbox for the confirmation link. It may take a few minutes to arrive.'
        );
        
        // Set cooldown for 60 seconds
        setResendCooldown(60);
        const interval = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (error: any) {
      console.error('Resend exception:', error);
      Alert.alert(
        'Error', 
        error?.message || 'Failed to resend email. Please try again later.'
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.dark.text} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Mail size={48} color={colors.dark.primary} />
          </View>
        </View>

        <Text style={styles.title}>Check Your Email</Text>
        
        <Text style={styles.description}>
          We sent a confirmation link to
        </Text>
        
        <Text style={styles.email}>{email}</Text>

        <Text style={styles.instructions}>
          Click the link in the email to verify your account and start exploring amazing experiences!
        </Text>

        <View style={styles.buttons}>
          <Pressable
            style={styles.primaryButton}
            onPress={handleOpenEmail}
          >
            <Mail size={20} color={colors.dark.background} />
            <Text style={styles.primaryButtonText}>Open Email App</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, (isResending || resendCooldown > 0) && styles.buttonDisabled]}
            onPress={handleResendEmail}
            disabled={isResending || resendCooldown > 0}
          >
            {isResending ? (
              <ActivityIndicator size="small" color={colors.dark.primary} />
            ) : (
              <>
                <RefreshCw size={20} color={colors.dark.primary} />
                <Text style={styles.secondaryButtonText}>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email'}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already confirmed your email?</Text>
          <Pressable onPress={() => router.replace('/auth/login')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </Pressable>
        </View>

        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            💡 Tip: Check your spam folder if you don't see the email
          </Text>
        </View>
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
    paddingHorizontal: 16,
    paddingTop: 16,
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
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${colors.dark.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.dark.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  instructions: {
    fontSize: 14,
    color: colors.dark.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  buttons: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.dark.primary,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark.background,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: colors.dark.border,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  divider: {
    marginVertical: 32,
  },
  dividerLine: {
    height: 1,
    backgroundColor: colors.dark.border,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginBottom: 24,
  },
  footerText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    color: colors.dark.primary,
    fontWeight: '700',
  },
  helpContainer: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 16,
  },
  helpText: {
    fontSize: 13,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
