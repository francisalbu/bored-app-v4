import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';

const ONBOARDING_SHOWN_KEY = '@bored_tourist_onboarding_shown';

const OTP_LENGTH = 6;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email: string }>();
  
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Start cooldown on mount
  useEffect(() => {
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
    return () => clearInterval(interval);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    
    if (numericValue.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = numericValue;
      setOtp(newOtp);
      
      // Move to next input
      if (numericValue && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
      
      // Auto-verify when all digits are entered
      if (numericValue && index === OTP_LENGTH - 1) {
        const fullOtp = newOtp.join('');
        if (fullOtp.length === OTP_LENGTH) {
          Keyboard.dismiss();
          handleVerify(fullOtp);
        }
      }
    } else if (numericValue.length === OTP_LENGTH) {
      // Handle paste
      const digits = numericValue.split('');
      setOtp(digits);
      inputRefs.current[OTP_LENGTH - 1]?.focus();
      Keyboard.dismiss();
      handleVerify(numericValue);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    
    if (code.length !== OTP_LENGTH) {
      Alert.alert('Invalid Code', 'Please enter the complete 6-digit code');
      return;
    }

    if (!email) {
      Alert.alert('Error', 'Email address is missing. Please go back and try again.');
      return;
    }

    setIsVerifying(true);
    
    try {
      console.log('🔐 Verifying OTP for:', email);
      
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: code,
        type: 'signup',
      });

      if (error) {
        console.error('❌ OTP verification error:', error);
        
        if (error.message.includes('expired')) {
          Alert.alert(
            'Code Expired',
            'This code has expired. Please request a new one.',
            [{ text: 'OK' }]
          );
        } else if (error.message.includes('invalid') || error.message.includes('Invalid')) {
          Alert.alert(
            'Invalid Code',
            'The code you entered is incorrect. Please try again.',
            [{ text: 'OK' }]
          );
          // Clear OTP inputs
          setOtp(Array(OTP_LENGTH).fill(''));
          inputRefs.current[0]?.focus();
        } else {
          Alert.alert('Error', error.message);
        }
      } else if (data.session) {
        console.log('✅ Email verified successfully!');
        setIsVerified(true);
        
        // Mark that user should see onboarding (first time user)
        try {
          await AsyncStorage.removeItem(ONBOARDING_SHOWN_KEY);
          console.log('🎯 Onboarding will be shown on first app open');
        } catch (err) {
          console.error('Error setting onboarding flag:', err);
        }
        
        // Wait a moment to show success state, then navigate
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1500);
      }
    } catch (error: any) {
      console.error('❌ Verification exception:', error);
      Alert.alert('Error', error?.message || 'Failed to verify email. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
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
      console.log('📧 Resending OTP to:', email);
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        console.error('❌ Resend error:', error);
        
        if (error.message.includes('rate limit')) {
          Alert.alert(
            'Too Many Requests', 
            'Please wait a few minutes before requesting another code.'
          );
        } else {
          Alert.alert('Error', error.message);
        }
      } else {
        Alert.alert(
          'Code Sent!', 
          'A new verification code has been sent to your email.'
        );
        
        // Clear existing OTP
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
        
        // Reset cooldown
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
      console.error('❌ Resend exception:', error);
      Alert.alert('Error', error?.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  if (isVerified) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.successContainer}>
          <View style={styles.successIconCircle}>
            <CheckCircle size={64} color={colors.dark.primary} />
          </View>
          <Text style={styles.successTitle}>Email Verified!</Text>
          <Text style={styles.successText}>Welcome to Bored Tourist</Text>
          <ActivityIndicator size="small" color={colors.dark.primary} style={{ marginTop: 20 }} />
        </View>
      </View>
    );
  }

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

        <Text style={styles.title}>Verify Your Email</Text>
        
        <Text style={styles.description}>
          We sent a 6-digit code to
        </Text>
        
        <Text style={styles.email}>{email}</Text>

        <Text style={styles.instructions}>
          Enter the code below to verify your account
        </Text>

        {/* OTP Input */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null,
                isVerifying ? styles.otpInputDisabled : null,
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={index === 0 ? OTP_LENGTH : 1}
              editable={!isVerifying}
              selectTextOnFocus
              autoFocus={index === 0}
            />
          ))}
        </View>

        {/* Verify Button */}
        <Pressable
          style={[styles.verifyButton, (isVerifying || otp.join('').length !== OTP_LENGTH) && styles.buttonDisabled]}
          onPress={() => handleVerify()}
          disabled={isVerifying || otp.join('').length !== OTP_LENGTH}
        >
          {isVerifying ? (
            <ActivityIndicator size="small" color={colors.dark.background} />
          ) : (
            <Text style={styles.verifyButtonText}>Verify Email</Text>
          )}
        </Pressable>

        {/* Resend */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code?</Text>
          <Pressable
            onPress={handleResendCode}
            disabled={isResending || resendCooldown > 0}
          >
            {isResending ? (
              <ActivityIndicator size="small" color={colors.dark.primary} />
            ) : (
              <Text style={[
                styles.resendLink,
                resendCooldown > 0 && styles.resendLinkDisabled
              ]}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            💡 Check your spam folder if you don't see the email
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
    alignItems: 'center',
  },
  iconContainer: {
    marginTop: 32,
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(207, 255, 4, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.dark.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.dark.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    textAlign: 'center',
  },
  email: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark.primary,
    marginTop: 4,
    marginBottom: 16,
  },
  instructions: {
    fontSize: 14,
    color: colors.dark.textTertiary,
    textAlign: 'center',
    marginBottom: 32,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.dark.backgroundSecondary,
    borderWidth: 2,
    borderColor: colors.dark.border,
    fontSize: 24,
    fontWeight: '700',
    color: colors.dark.text,
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: colors.dark.primary,
    backgroundColor: 'rgba(207, 255, 4, 0.1)',
  },
  otpInputDisabled: {
    opacity: 0.5,
  },
  verifyButton: {
    width: '100%',
    backgroundColor: colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark.background,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  resendText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark.primary,
  },
  resendLinkDisabled: {
    color: colors.dark.textTertiary,
  },
  helpContainer: {
    marginTop: 40,
    padding: 16,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    width: '100%',
  },
  helpText: {
    fontSize: 13,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  successIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(207, 255, 4, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.dark.text,
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    color: colors.dark.textSecondary,
  },
});
