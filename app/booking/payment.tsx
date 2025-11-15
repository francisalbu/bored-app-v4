import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star } from 'lucide-react-native';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import colors from '@/constants/colors';
import { EXPERIENCES } from '@/constants/experiences';
import { useBookings } from '@/contexts/BookingsContext';
import { useAuth } from '@/contexts/AuthContext';

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
  const [couponCode, setCouponCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const experience = EXPERIENCES.find((exp) => exp.id === experienceId);
  const adultsCount = parseInt(adults || '1');
  const pricePerGuest = parseFloat(price || '0');
  const totalPrice = pricePerGuest * adultsCount;
  const bookingDate = date ? new Date(date) : new Date();

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

  const handleConfirmAndPay = async () => {
    if (!slotId) {
      Alert.alert('Error', 'Missing slot information');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to book an experience');
      return;
    }

    try {
      setIsProcessing(true);

      // Create the booking with all required data
      const result = await createBooking({
        experience_id: parseInt(experienceId),
        slot_id: parseInt(slotId),
        participants: adultsCount,
        customer_name: user.name || user.email.split('@')[0],
        customer_email: user.email,
        customer_phone: user.phone || '+351000000000', // Default phone if not provided
      });

      if (result.success) {
        Alert.alert(
          'Booking Confirmed! 🎉',
          'Your experience has been booked successfully. Check your bookings for details.',
          [
            {
              text: 'View Bookings',
              onPress: () => router.push('/(tabs)/bookings'),
            },
          ]
        );
      } else {
        Alert.alert('Booking Failed', result.error || 'Unable to complete booking. Please try again.');
      }
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Error', 'An error occurred while processing your booking.');
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

        {/* Payment Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💳 Payment will be processed securely through Stripe. Your card details are never stored on our servers.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable 
          style={[styles.confirmButton, isProcessing && styles.confirmButtonDisabled]} 
          onPress={handleConfirmAndPay}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={colors.dark.background} />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm and pay</Text>
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
    fontWeight: '600' as const,
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
    fontWeight: '700' as const,
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
    fontWeight: '600' as const,
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
    fontWeight: '700' as const,
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
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
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
    fontWeight: '700' as const,
    color: colors.dark.text,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700' as const,
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
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.dark.background,
  },
  errorText: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    textAlign: 'center' as const,
    marginTop: 32,
  },
});
