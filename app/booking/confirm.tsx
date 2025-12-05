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
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import colors from '@/constants/colors';
import { useBookings } from '@/contexts/BookingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useExperience } from '@/hooks/useApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

  // Always fetch from API
  const { experience, loading: isLoadingExperience } = useExperience(experienceId || '');
  
  const adultsCount = parseInt(adults || '1');
  const pricePerGuest = parseFloat(price || '0');
  const totalPrice = pricePerGuest * adultsCount;
  const bookingDate = date ? new Date(date) : new Date();

  // Show loading or error as full screen with same background
  if (isLoadingExperience || !experience) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.dark.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Confirm Booking</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {isLoadingExperience ? (
            <ActivityIndicator size="large" color={colors.dark.primary} />
          ) : (
            <Text style={styles.errorText}>Experience not found</Text>
          )}
        </View>
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

  // Format date for display
  const formatDateDisplay = () => {
    const d = new Date(date || '');
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const year = d.getFullYear();
    return { day, month, year };
  };

  const { day, month, year } = formatDateDisplay();

  // Parse time range
  const getTimeRange = () => {
    if (!time) return { start: '', end: '' };
    const [startTime] = time.split(' - ');
    // Calculate end time (add duration)
    const durationHours = parseInt(experience.duration) || 2;
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHours = hours + durationHours;
    const endTime = `${endHours.toString().padStart(2, '0')}:${(minutes || 0).toString().padStart(2, '0')}`;
    return { start: startTime, end: endTime };
  };

  const timeRange = getTimeRange();

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
        {/* Big Confirmation Card with Image */}
        <View style={styles.confirmationCard}>
          <Image
            source={
              experience.images && experience.images.length > 0
                ? experience.images[0]
                : { uri: experience.image }
            }
            style={styles.cardImage}
            contentFit="cover"
          />
          
          {/* Info overlay at bottom of card */}
          <View style={styles.cardInfoOverlay}>
            <Text style={styles.cardDate}>{day} {month} {year}</Text>
            <Text style={styles.cardTime}>{timeRange.start} – {timeRange.end}</Text>
            <Text style={styles.cardGuests}>{adultsCount} Guest{adultsCount > 1 ? 's' : ''}</Text>
            <Text style={styles.cardTitle} numberOfLines={2}>{experience.title}</Text>
            <Text style={styles.cardPrice}>€{totalPrice.toFixed(2)}</Text>
          </View>
        </View>

        {/* Booking Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Booking summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date</Text>
            <Text style={styles.summaryValue}>{formatDate(date || '')}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Time</Text>
            <Text style={styles.summaryValue}>{timeRange.start} PM – {timeRange.end} PM</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Guests</Text>
            <Text style={styles.summaryValue}>{adultsCount} adult{adultsCount > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Price Details */}
        <View style={styles.priceSection}>
          <Text style={styles.sectionTitle}>Price details</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>€{pricePerGuest.toFixed(0)} x {adultsCount} adult{adultsCount > 1 ? 's' : ''}</Text>
            <Text style={styles.priceValue}>€{totalPrice.toFixed(2)}</Text>
          </View>
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>€{totalPrice.toFixed(2)}</Text>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable 
          style={styles.continueButton} 
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue to payment</Text>
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
  // Big Confirmation Card
  confirmationCard: {
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.dark.card,
    height: 320,
  },
  cardImage: {
    width: '100%',
    height: '60%',
  },
  cardInfoOverlay: {
    padding: 16,
    paddingTop: 12,
  },
  cardDate: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: colors.dark.text,
    marginBottom: 2,
  },
  cardTime: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    marginBottom: 2,
  },
  cardGuests: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.dark.primary,
    marginBottom: 8,
  },
  cardPrice: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.dark.text,
    position: 'absolute' as const,
    right: 16,
    bottom: 16,
  },
  // Summary Section
  summarySection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: colors.dark.primary,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: colors.dark.text,
  },
  // Price Section
  priceSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 15,
    color: colors.dark.textSecondary,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: colors.dark.text,
  },
  // Total Section
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
  // Bottom Bar
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    backgroundColor: colors.dark.background,
  },
  continueButton: {
    backgroundColor: colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 30,
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
