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

export default function ConfirmBookingScreen() {
  const { experienceId, slotId, date, time, adults, price } = useLocalSearchParams<{
    experienceId: string;
    slotId: string;
    date: string;
    time: string;
    adults: string;
    price: string;
  }>();
  
  const insets = useSafeAreaInsets();

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

  const getCancellationDeadline = () => {
    const deadline = new Date(bookingDate);
    deadline.setHours(8, 30, 0, 0);
    return deadline.toLocaleDateString('en-US', {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleContinue = () => {
    // Navigate to payment screen with all the booking details
    router.push({
      pathname: '/booking/payment' as any,
      params: {
        experienceId,
        slotId,
        date,
        time,
        adults,
        price,
      },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Booking details</Text>
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

          {/* Free Cancellation */}
          <View style={styles.cancellationBox}>
            <Text style={styles.cancellationTitle}>Free cancellation</Text>
            <Text style={styles.cancellationText}>
              Cancel before {getCancellationDeadline()} for full refund.
            </Text>
          </View>
        </View>

        {/* Booking Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date</Text>
          <Text style={styles.detailText}>{formatDate(date || '')}</Text>
          <Text style={styles.detailText}>{time}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Guests</Text>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.changeLink}>Change</Text>
            </Pressable>
          </View>
          <Text style={styles.detailText}>
            {adultsCount} adult{adultsCount > 1 ? 's' : ''}
          </Text>
        </View>

        {/* Total Price */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total price</Text>
          <Text style={styles.totalValue}>€{totalPrice.toFixed(2)}</Text>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable 
          style={styles.continueButton} 
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
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
    marginBottom: 16,
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
  cancellationBox: {
    backgroundColor: colors.dark.backgroundTertiary,
    padding: 12,
    borderRadius: 12,
  },
  cancellationTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 4,
  },
  cancellationText: {
    fontSize: 13,
    color: colors.dark.textSecondary,
    lineHeight: 18,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 15,
    color: colors.dark.textSecondary,
    marginTop: 4,
  },
  changeLink: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.dark.primary,
    textDecorationLine: 'underline' as const,
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
  continueButton: {
    backgroundColor: colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
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
