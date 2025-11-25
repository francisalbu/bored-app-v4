import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, ChevronDown } from 'lucide-react-native';
import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useStripe } from '@stripe/stripe-react-native';

import colors from '@/constants/colors';
import { EXPERIENCES } from '@/constants/experiences';
import { useBookings } from '@/contexts/BookingsContext';
import { useAuth } from '@/contexts/AuthContext';
import AuthBottomSheet from '@/components/AuthBottomSheet';

const API_URL = process.env.NODE_ENV === 'development' || __DEV__
  ? 'http://192.168.1.145:3000' 
  : 'https://bored-tourist-api.onrender.com';

// Lista de países com códigos de telefone
const COUNTRIES = [
  { code: 'PT', dialCode: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: 'ES', dialCode: '+34', flag: '🇪🇸', name: 'Spain' },
  { code: 'FR', dialCode: '+33', flag: '🇫🇷', name: 'France' },
  { code: 'GB', dialCode: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'DE', dialCode: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: 'IT', dialCode: '+39', flag: '🇮🇹', name: 'Italy' },
  { code: 'NL', dialCode: '+31', flag: '🇳🇱', name: 'Netherlands' },
  { code: 'BE', dialCode: '+32', flag: '🇧🇪', name: 'Belgium' },
  { code: 'BR', dialCode: '+55', flag: '🇧🇷', name: 'Brazil' },
  { code: 'US', dialCode: '+1', flag: '🇺🇸', name: 'United States' },
  { code: 'CA', dialCode: '+1', flag: '🇨🇦', name: 'Canada' },
  { code: 'MX', dialCode: '+52', flag: '🇲🇽', name: 'Mexico' },
  { code: 'AR', dialCode: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: 'CH', dialCode: '+41', flag: '🇨🇭', name: 'Switzerland' },
  { code: 'AT', dialCode: '+43', flag: '🇦🇹', name: 'Austria' },
  { code: 'PL', dialCode: '+48', flag: '🇵🇱', name: 'Poland' },
  { code: 'SE', dialCode: '+46', flag: '🇸🇪', name: 'Sweden' },
  { code: 'NO', dialCode: '+47', flag: '🇳🇴', name: 'Norway' },
  { code: 'DK', dialCode: '+45', flag: '🇩🇰', name: 'Denmark' },
  { code: 'FI', dialCode: '+358', flag: '🇫🇮', name: 'Finland' },
  { code: 'IE', dialCode: '+353', flag: '🇮🇪', name: 'Ireland' },
  { code: 'GR', dialCode: '+30', flag: '🇬🇷', name: 'Greece' },
  { code: 'CZ', dialCode: '+420', flag: '🇨🇿', name: 'Czech Republic' },
  { code: 'RO', dialCode: '+40', flag: '🇷🇴', name: 'Romania' },
  { code: 'AU', dialCode: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: 'NZ', dialCode: '+64', flag: '🇳🇿', name: 'New Zealand' },
  { code: 'JP', dialCode: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: 'CN', dialCode: '+86', flag: '🇨🇳', name: 'China' },
  { code: 'IN', dialCode: '+91', flag: '🇮🇳', name: 'India' },
  { code: 'ZA', dialCode: '+27', flag: '🇿🇦', name: 'South Africa' },
];

export default function PaymentScreen() {
  const { experienceId, slotId, date, time, adults, price } = useLocalSearchParams<{
    experienceId: string;
    slotId: string;
    date: string;
    time: string;
    adults: string;
    price: string;
  }>();
  
  const insets = useSafeAreaInsets();
  const { createBooking } = useBookings();
  const { user, refreshUser } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  
  const [couponCode, setCouponCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  
  // Guest checkout fields
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]); // Portugal por defeito
  const [showCountryModal, setShowCountryModal] = useState(false);
  
  // Auth bottom sheet
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  
  // Auto-fill user info when logged in
  useEffect(() => {
    if (user) {
      setGuestName(user.name || '');
      setGuestEmail(user.email || '');
      setGuestPhone(user.phone?.replace(/^\+\d+/, '') || ''); // Remove country code
      
      // Try to find user's country from phone
      if (user.phone) {
        const matchedCountry = COUNTRIES.find(c => user.phone?.startsWith(c.dialCode));
        if (matchedCountry) {
          setSelectedCountry(matchedCountry);
        }
      }
    }
  }, [user]);
  
  // Validation states with debounce
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const emailTimeoutRef = useRef<any>(null);
  const phoneTimeoutRef = useRef<any>(null);

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  const validatePhone = (phone: string) => {
    // Remove spaces and check if it has at least 9 digits
    const cleanPhone = phone.replace(/\s/g, '');
    return cleanPhone.length >= 9 && /^\d+$/.test(cleanPhone);
  };
  
  // Handle email change with debounce
  const handleEmailChange = (text: string) => {
    setGuestEmail(text);
    setEmailError(''); // Clear error while typing
    
    // Clear existing timeout
    if (emailTimeoutRef.current) {
      clearTimeout(emailTimeoutRef.current);
    }
    
    // Set new timeout - validate after 1.5s of inactivity
    if (text.length > 0) {
      emailTimeoutRef.current = setTimeout(() => {
        if (!validateEmail(text)) {
          setEmailError('Please enter a valid email');
        }
      }, 1500);
    }
  };
  
  // Handle phone change with debounce
  const handlePhoneChange = (text: string) => {
    setGuestPhone(text);
    setPhoneError(''); // Clear error while typing
    
    // Clear existing timeout
    if (phoneTimeoutRef.current) {
      clearTimeout(phoneTimeoutRef.current);
    }
    
    // Set new timeout - validate after 1.5s of inactivity
    if (text.length > 0) {
      phoneTimeoutRef.current = setTimeout(() => {
        if (!validatePhone(text)) {
          setPhoneError('Phone must have at least 9 digits');
        }
      }, 1500);
    }
  };
  
  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);
      if (phoneTimeoutRef.current) clearTimeout(phoneTimeoutRef.current);
    };
  }, []);

  const experience = EXPERIENCES.find((exp) => exp.id === experienceId);
  const adultsCount = parseInt(adults || '1');
  const pricePerGuest = parseFloat(price || '0');
  const totalPrice = pricePerGuest * adultsCount;
  
  // Check if form is valid (for guest checkout)
  const isFormValid = user || (
    guestName.trim().length > 0 &&
    validateEmail(guestEmail) &&
    validatePhone(guestPhone)
  );

  if (!experience) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Experience not found</Text>
      </View>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const validateGuestInfo = () => {
    if (!guestName.trim()) {
      Alert.alert('Required', 'Please enter your full name');
      return false;
    }
    if (!guestEmail.trim() || !validateEmail(guestEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address (e.g., name@example.com)');
      return false;
    }
    if (!guestPhone.trim() || !validatePhone(guestPhone)) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number (at least 9 digits)');
      return false;
    }
    return true;
  };

  const handlePayment = async () => {
    if (isProcessing) return;
    
    console.log('🔵 [PAYMENT] User clicked Pay button');
    console.log('🔵 [PAYMENT] slotId:', slotId, 'user:', user?.email);
    
    // Check if user is authenticated or has guest info
    const isGuest = !user;
    let customerName, customerEmail, customerPhone;
    
    if (isGuest) {
      if (!validateGuestInfo()) {
        return;
      }
      customerName = guestName;
      customerEmail = guestEmail;
      customerPhone = guestPhone;
      console.log('🔵 [PAYMENT] Guest checkout:', customerEmail);
    } else {
      customerName = user.name || user.email.split('@')[0];
      customerEmail = user.email;
      customerPhone = user.phone || '+351000000000';
      console.log('🔵 [PAYMENT] Authenticated user:', customerEmail);
    }
    
    if (!slotId) {
      console.log('❌ [PAYMENT] Missing slotId');
      Alert.alert('Error', 'Missing required information');
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Create payment intent FIRST (without booking)
      console.log('� [PAYMENT] Step 1: Creating payment intent...');
      console.log('🔵 [PAYMENT] URL:', `${API_URL}/api/payments/create-intent`);
      console.log('🔵 [PAYMENT] Amount:', totalPrice);
      
      const response = await fetch(`${API_URL}/api/payments/create-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalPrice,
          currency: 'eur',
        }),
      });

      const data = await response.json();
      console.log('🔵 [PAYMENT] Payment intent response:', data);

      if (!data.success || !data.clientSecret) {
        console.log('❌ [PAYMENT] Payment intent failed:', data);
        Alert.alert('Error', 'Failed to initialize payment');
        setIsProcessing(false);
        return;
      }

      console.log('✅ [PAYMENT] Got clientSecret:', data.clientSecret.substring(0, 20) + '...');
      const secret = data.clientSecret;
      const paymentIntentId = data.paymentIntentId;
      setClientSecret(secret);

      // Step 2: Initialize payment sheet
      console.log('🔵 [PAYMENT] Step 2: Initializing payment sheet...');
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Bored Explorer',
        paymentIntentClientSecret: secret,
        defaultBillingDetails: {
          name: customerName,
          email: customerEmail,
        },
        returnURL: 'boredtourist://payment',
        applePay: {
          merchantCountryCode: 'PT',
        },
        googlePay: {
          merchantCountryCode: 'PT',
          testEnv: false,
        },
      });

      if (initError) {
        console.log('❌ [PAYMENT] initPaymentSheet error:', initError);
        Alert.alert('Error', initError.message);
        setIsProcessing(false);
        return;
      }

      console.log('✅ [PAYMENT] Payment sheet initialized successfully!');

      // Step 3: Present payment sheet
      console.log('🔵 [PAYMENT] Step 3: Presenting payment sheet...');
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        console.log('❌ [PAYMENT] presentPaymentSheet error:', presentError);
        
        if (presentError.code !== 'Canceled') {
          Alert.alert('Payment Failed', presentError.message);
        } else {
          console.log('ℹ️ [PAYMENT] User cancelled payment');
        }
        setIsProcessing(false);
        return;
      }

      // 🎉 Payment successful! NOW create the booking
      console.log('🎉 [PAYMENT] Payment successful! Creating booking now...');
      console.log('🔵 [PAYMENT] Customer:', { name: customerName, email: customerEmail, phone: customerPhone });
      
      const bookingResult = await createBooking({
        experience_id: parseInt(experienceId),
        slot_id: parseInt(slotId),
        participants: adultsCount,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: `${selectedCountry.dialCode}${guestPhone}`.replace(/\s/g, ''),
      });

      if (!bookingResult.success || !bookingResult.data?.id) {
        console.log('❌ [PAYMENT] Booking creation failed after payment:', bookingResult.error);
        Alert.alert('Warning', 'Payment was successful but booking creation failed. Please contact support with payment ID: ' + paymentIntentId);
        setIsProcessing(false);
        return;
      }

      const newBookingId = bookingResult.data.id;
      console.log('✅ [PAYMENT] Booking created:', newBookingId);
      setBookingId(newBookingId);

        // Show success message with account creation prompt for guests
        if (isGuest) {
          Alert.alert(
            '✅ Booking Confirmed!',
            'Your booking is confirmed! Check your email for details.\n\n💡 Create an account to:\n• Track all your bookings\n• Get exclusive deals\n• Faster future checkouts',
            [
              { 
                text: 'Maybe Later', 
                style: 'cancel',
                onPress: () => router.push('/(tabs)/index' as any)
              },
              { 
                text: 'Create Account', 
                onPress: () => {
                  // Open auth sheet with Google OAuth option
                  setShowAuthSheet(true);
                }
              }
            ]
          );
        } else {
          Alert.alert(
            'Payment Successful!',
            'Your booking is confirmed. Check your email for details.',
            [{ 
              text: 'OK', 
              onPress: () => router.push('/(tabs)/bookings' as any)
            }]
          );
        }
    } catch (error) {
      console.error('❌ [PAYMENT] Error:', error);
      Alert.alert('Error', 'Failed to process payment');
      setIsProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Confirm and pay</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Experience Card */}
        <View style={styles.card}>
          <View style={styles.experienceHeader}>
            <Image
              source={
                experience.images && experience.images.length > 0
                  ? experience.images[0]
                  : { uri: experience.image }
              }
              style={styles.experienceImage}
              contentFit="cover"
            />
            <View style={styles.experienceInfo}>
              <Text style={styles.experienceTitle} numberOfLines={2}>
                {experience.title}
              </Text>
              <View style={styles.ratingRow}>
                <Star size={14} color={colors.dark.primary} fill={colors.dark.primary} />
                <Text style={styles.ratingText}>
                  {experience.rating} ({experience.reviewCount})
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Booking Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date</Text>
            <Text style={styles.summaryValue}>{formatDate(date || '')}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Time</Text>
            <Text style={styles.summaryValue}>{time}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Guests</Text>
            <Text style={styles.summaryValue}>{adultsCount} adult{adultsCount > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Price Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price details</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              €{pricePerGuest} x {adultsCount} adult{adultsCount > 1 ? 's' : ''}
            </Text>
            <Text style={styles.priceValue}>€{totalPrice.toFixed(2)}</Text>
          </View>
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>€{totalPrice.toFixed(2)}</Text>
        </View>

        {/* Contact Information Form */}
        <View style={styles.guestSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.guestTitle}>Contact Information</Text>
            {user && (
              <View style={styles.authBadge}>
                <Text style={styles.authBadgeText}>✓ Signed in</Text>
              </View>
            )}
          </View>
          <Text style={styles.guestSubtitle}>
            {user 
              ? 'Your booking will be saved to your account' 
              : "We'll send your booking confirmation to this email"}
          </Text>
          
          {!user && (
            <View style={styles.loginPromptTop}>
              <Text style={styles.loginPromptText}>
                Already have an account?{' '}
              </Text>
              <Pressable onPress={() => setShowAuthSheet(true)}>
                <Text style={styles.loginLink}>Sign in</Text>
              </Pressable>
            </View>
          )}
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor={colors.dark.textTertiary}
                value={guestName}
                onChangeText={setGuestName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={[
                  styles.input,
                  emailError && styles.inputError,
                  guestEmail.length > 0 && !emailError && validateEmail(guestEmail) && styles.inputValid,
                ]}
                placeholder="john@example.com"
                placeholderTextColor={colors.dark.textTertiary}
                value={guestEmail}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {emailError && (
                <Text style={styles.validationError}>{emailError}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <View style={[
                styles.phoneInputContainer,
                phoneError && styles.inputError,
                guestPhone.length > 0 && !phoneError && validatePhone(guestPhone) && styles.inputValid,
              ]}>
                <Pressable 
                  style={styles.countrySelector}
                  onPress={() => setShowCountryModal(true)}
                >
                  <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                  <Text style={styles.countryCode}>{selectedCountry.dialCode}</Text>
                  <ChevronDown size={16} color={colors.dark.textSecondary} />
                </Pressable>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="912 345 678"
                  placeholderTextColor={colors.dark.textTertiary}
                  value={guestPhone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                />
              </View>
              {phoneError && (
                <Text style={styles.validationError}>{phoneError}</Text>
              )}
            </View>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            🔒 Secure payment through Stripe
          </Text>
          <Text style={[styles.infoText, { marginTop: 8 }]}>
            Supports Apple Pay, Google Pay, cards, and more
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable 
          style={[
            styles.confirmButton, 
            (!isFormValid || isProcessing) && styles.confirmButtonDisabled
          ]} 
          onPress={handlePayment}
          disabled={!isFormValid || isProcessing}
        >
          {isProcessing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.dark.background} />
              <Text style={[styles.confirmButtonText, { marginLeft: 10 }]}>Processing...</Text>
            </View>
          ) : (
            <Text style={styles.confirmButtonText}>Pay €{totalPrice.toFixed(2)}</Text>
          )}
        </Pressable>
      </View>
      
      {/* Auth Bottom Sheet for Guest Sign In */}
      <AuthBottomSheet 
        visible={showAuthSheet} 
        onClose={() => setShowAuthSheet(false)}
        onSuccess={async () => {
          console.log('🎉 Auth successful! Staying on payment screen...');
          // Navigate back to this payment screen with all params
          router.replace({
            pathname: '/booking/payment',
            params: {
              experienceId,
              slotId,
              date,
              time,
              adults,
              price,
            },
          });
        }}
      />
      
      {/* Country Selector Modal */}
      <Modal
        visible={showCountryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <Pressable onPress={() => setShowCountryModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.countryItem,
                    selectedCountry.code === item.code && styles.countryItemSelected
                  ]}
                  onPress={() => {
                    setSelectedCountry(item);
                    setShowCountryModal(false);
                  }}
                >
                  <Text style={styles.countryItemFlag}>{item.flag}</Text>
                  <Text style={styles.countryItemName}>{item.name}</Text>
                  <Text style={styles.countryItemCode}>{item.dialCode}</Text>
                </Pressable>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark.text,
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.dark.card,
    margin: 16,
    borderRadius: 16,
    padding: 16,
  },
  experienceHeader: {
    flexDirection: 'row',
  },
  experienceImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
  },
  experienceInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  experienceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark.text,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark.text,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: colors.dark.textSecondary,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.dark.text,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceLabel: {
    fontSize: 15,
    color: colors.dark.textSecondary,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.dark.text,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark.text,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.dark.primary,
  },
  infoBox: {
    margin: 16,
    padding: 16,
    backgroundColor: colors.dark.backgroundTertiary,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 13,
    color: colors.dark.textSecondary,
    lineHeight: 18,
  },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    backgroundColor: colors.dark.background,
  },
  confirmButton: {
    backgroundColor: colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark.background,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    marginTop: 32,
  },
  guestSection: {
    margin: 16,
    padding: 20,
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.dark.primary + '40',
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark.text,
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.dark.background,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.dark.text,
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  inputValid: {
    borderColor: '#10B981',
    borderWidth: 2,
  },
  validationError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authBadge: {
    backgroundColor: colors.dark.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  authBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark.primary,
  },
  loginPromptTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginPromptText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark.primary,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.background,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: colors.dark.border,
    gap: 6,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark.text,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.dark.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.dark.text,
  },
  modalClose: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.dark.textSecondary,
    width: 32,
    height: 32,
    textAlign: 'center',
    lineHeight: 32,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border + '30',
  },
  countryItemSelected: {
    backgroundColor: colors.dark.primary + '20',
  },
  countryItemFlag: {
    fontSize: 28,
    width: 40,
  },
  countryItemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.dark.text,
  },
  countryItemCode: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.dark.textSecondary,
  },
});
