import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, CreditCard } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useStripe } from '@stripe/stripe-react-native';

import colors from '@/constants/colors';
import { EXPERIENCES } from '@/constants/experiences';
import { useBookings } from '@/contexts/BookingsContext';
import { useAuth } from '@/contexts/AuthContext';

// Backend API URL - UPDATE WITH YOUR ACTUAL IP
const API_URL = 'http://192.168.1.137:3000'; // Change this to your computer's IP

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
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  
  const [couponCode, setCouponCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const experience = EXPERIENCES.find((exp) => exp.id === experienceId);
  const adultsCount = parseInt(adults || '1');
  const pricePerGuest = parseFloat(price || '0');
  const totalPrice = pricePerGuest * adultsCount;

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

  const handlePayWithStripe = async () => {
    if (!slotId || !user) {
      Alert.alert('Error', 'Missing required information');
      return;
    }

    try {
      setIsProcessing(true);
      console.log('🚀 Starting payment process...');

      // Step 1: Create the booking first
      console.log('📝 Creating booking...');
      const bookingResult = await createBooking({
        experience_id: parseInt(experienceId),
        slot_id: parseInt(slotId),
        participants: adultsCount,
        customer_name: user.name || user.email.split('@')[0],
        customer_email: user.email,
        customer_phone: user.phone || '+351000000000',
      });

      if (!bookingResult.success) {
        console.error('❌ Booking failed:', bookingResult.error);
        Alert.alert('Error', bookingResult.error || 'Failed to create booking');
        setIsProcessing(false);
        return;
      }

      const bookingId = bookingResult.data?.id;
      if (!bookingId) {
        console.error('❌ No booking ID received');
        Alert.alert('Error', 'Booking ID not found');
        setIsProcessing(false);
        return;
      }

      console.log('✅ Booking created with ID:', bookingId);

      // Step 2: Create payment intent from backend
      console.log('💳 Creating payment intent...');
      console.log('API URL:', API_URL);
      
      const response = await fetch(`${API_URL}/api/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: bookingId,
          amount: totalPrice,
          currency: 'eur',
          returnUrl: 'boredtourist://payment',
        }),
      });

      const data = await response.json();
      console.log('💳 Payment intent response:', data);

      if (!data.success || !data.clientSecret) {
        console.error('❌ Payment intent failed:', data);
        Alert.alert('Error', 'Failed to initialize payment. Please try again.');
        setIsProcessing(false);
        return;
      }

      console.log('✅ Payment intent created');

      // Step 3: Initialize Stripe Payment Sheet
      console.log('📱 Initializing payment sheet...');
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Bored Travel',
        paymentIntentClientSecret: data.clientSecret,
        defaultBillingDetails: {
          name: user.name || user.email.split('@')[0],
          email: user.email,
        },
        // Enable Apple Pay (iOS only)
        applePay: {
          merchantCountryCode: 'PT',
        },
        // Enable Google Pay (Android only)
        googlePay: {
          merchantCountryCode: 'PT',
          testEnv: false,
          currencyCode: 'EUR',
        },
        // Styling
        appearance: {
          colors: {
            primary: colors.dark.primary,
            background: colors.dark.card,
            componentBackground: colors.dark.background,
            componentBorder: colors.dark.border,
            componentDivider: colors.dark.border,
            primaryText: colors.dark.text,
            secondaryText: colors.dark.textSecondary,
            componentText: colors.dark.text,
            placeholderText: colors.dark.textTertiary,
          },
        },
        returnURL: 'boredtourist://payment',
      });

      if (initError) {
        console.error('❌ Payment sheet init error:', initError);
        Alert.alert('Error', initError.message);
        setIsProcessing(false);
        return;
      }

      console.log('✅ Payment sheet initialized');

      // Step 4: Present the payment sheet
      console.log('📱 Presenting payment sheet...');
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code === 'Canceled') {
          console.log('ℹ️ Payment cancelled by user');
          setIsProcessing(false);
          return;
        }
        console.error('❌ Payment error:', paymentError);
        Alert.alert('Payment Failed', paymentError.message);
        setIsProcessing(false);
        return;
      }

      // Payment successful!
      console.log('🎉 Payment succeeded!');

      // Step 5: Confirm payment on backend
      console.log('✅ Confirming payment on backend...');
      const confirmResponse = await fetch(`${API_URL}/api/payments/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId: data.paymentIntentId,
          bookingId: bookingId,
        }),
      });

      const confirmData = await confirmResponse.json();
      console.log('✅ Confirmation response:', confirmData);

      if (confirmData.success) {
        Alert.alert(
          '🎉 Payment Successful!',
          'Your booking is confirmed. Have a great experience!',
          [
            {
              text: 'View Bookings',
              onPress: () => router.push('/(tabs)/bookings'),
            },
          ]
        );
      } else {
        Alert.alert('Warning', 'Payment was processed but confirmation failed. Please contact support.');
      }

    } catch (error) {
      console.error('❌ Payment error:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Confirm and pay</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
          <Pressable style={styles.couponInput}>
            <TextInput
              style={styles.couponTextInput}
              placeholder="Enter a coupon"
              placeholderTextColor={colors.dark.textTertiary}
              value={couponCode}
              onChangeText={setCouponCode}
            />
          </Pressable>
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>€{totalPrice.toFixed(2)}</Text>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment method</Text>
          <View style={styles.paymentMethodCard}>
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodText}>
                {Platform.OS === 'ios' ? '🍎 Apple Pay' : '📱 Google Pay'}, Cards, Revolut, and more
              </Text>
              <Text style={styles.paymentMethodSubtext}>
                Choose your preferred payment method in the next step
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            🔒 Payment will be processed securely through Stripe. Your card details are never stored on our servers.
          </Text>
          <Text style={[styles.infoText, { marginTop: 8 }]}>
            Available: {Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay'}, Revolut, Stripe Link, and all major cards.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable 
          style={[styles.confirmButton, isProcessing && styles.confirmButtonDisabled]} 
          onPress={handlePayWithStripe}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.dark.background} />
              <Text style={[styles.confirmButtonText, { marginLeft: 10 }]}>Processing...</Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <CreditCard size={20} color={colors.dark.background} />
              <Text style={[styles.confirmButtonText, { marginLeft: 10 }]}>Confirm and pay</Text>
            </View>
          )}
        </Pressable>
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
    marginBottom: 12,
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
  couponInput: {
    marginTop: 8,
  },
  couponTextInput: {
    fontSize: 14,
    color: colors.dark.textTertiary,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
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
  paymentMethodCard: {
    backgroundColor: colors.dark.backgroundTertiary,
    borderRadius: 12,
    padding: 16,
  },
  paymentMethodInfo: {
    alignItems: 'center',
  },
  paymentMethodText: {
    fontSize: 15,
    color: colors.dark.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  paymentMethodSubtext: {
    fontSize: 13,
    color: colors.dark.textSecondary,
    textAlign: 'center',
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
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark.background,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
});
