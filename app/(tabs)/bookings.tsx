import { Calendar, Clock, MapPin, RefreshCw, X } from 'lucide-react-native';
import React, { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  FlatList,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32; // 16px margin on each side

import colors from '@/constants/colors';
import { useBookings, type Booking } from '@/contexts/BookingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

type BookingFilter = 'upcoming' | 'past';

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { upcomingBookings, pastBookings, isLoading, refreshBookings, cancelBooking } = useBookings();
  const [filter, setFilter] = useState<BookingFilter>('upcoming');
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [currentTicketIndex, setCurrentTicketIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>My Bookings</Text>
        </View>
        <View style={styles.loginEmptyState}>
          <View style={styles.loginIconContainer}>
            <Text style={styles.loginIcon}>🎟️</Text>
          </View>
          <Text style={styles.loginTitle}>Your tickets await!</Text>
          <Text style={styles.loginText}>
            Sign in to access your bookings and start exploring amazing experiences
          </Text>
          <Pressable 
            style={styles.loginButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
          </Pressable>
          <Pressable 
            style={styles.signupButton}
            onPress={() => router.push('/auth/signup')}
          >
            <Text style={styles.signupButtonText}>Create Account</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const filteredBookings = filter === 'upcoming' ? upcomingBookings : pastBookings;

  const handleCancelBooking = async (bookingId: number, bookingTitle: string) => {
    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel "${bookingTitle}"? This action cannot be undone.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(bookingId);
            const result = await cancelBooking(bookingId);
            setCancellingId(null);
            
            if (result.success) {
              Alert.alert('Success', 'Booking cancelled successfully');
            } else {
              Alert.alert('Error', result.error || 'Failed to cancel booking');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <Pressable onPress={refreshBookings} disabled={isLoading}>
            <RefreshCw 
              size={20} 
              color={isLoading ? colors.dark.textTertiary : colors.dark.primary} 
            />
          </Pressable>
        </View>
        <View style={styles.filterContainer}>
          <Pressable
            style={[
              styles.filterButton,
              filter === 'upcoming' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('upcoming')}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'upcoming' && styles.filterTextActive,
              ]}
            >
              Upcoming ({upcomingBookings.length})
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.filterButton,
              filter === 'past' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('past')}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'past' && styles.filterTextActive,
              ]}
            >
              Past ({pastBookings.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.dark.primary} />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>No {filter} bookings</Text>
          <Text style={styles.emptyText}>
            {filter === 'upcoming'
              ? 'Start exploring and book your next adventure!'
              : 'Your past experiences will appear here'}
          </Text>
          <Pressable 
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/explore')}
          >
            <Text style={styles.actionButtonText}>Explore Experiences</Text>
          </Pressable>
        </View>
      ) : filter === 'upcoming' ? (
        // Carousel view for upcoming bookings (GetYourGuide style)
        <View style={styles.carouselContainer}>
          {filteredBookings.length > 1 && (
            <View style={styles.pageIndicator}>
              <Text style={styles.pageIndicatorText}>
                {currentTicketIndex + 1}/{filteredBookings.length}
              </Text>
            </View>
          )}
          {filteredBookings.length === 1 ? (
            // Single booking - centered
            <View style={styles.singleBookingContainer}>
              <BookingCard 
                booking={filteredBookings[0]}
                onCancel={handleCancelBooking}
                isCancelling={cancellingId === filteredBookings[0].id}
              />
            </View>
          ) : (
            // Multiple bookings - carousel
            <FlatList
              ref={flatListRef}
              data={filteredBookings}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToAlignment="center"
              decelerationRate="fast"
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / CARD_WIDTH);
                setCurrentTicketIndex(index);
              }}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.carouselItem}>
                  <BookingCard 
                    booking={item}
                    onCancel={handleCancelBooking}
                    isCancelling={cancellingId === item.id}
                  />
                </View>
              )}
            />
          )}
        </View>
      ) : (
        // Regular scroll view for past bookings
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {filteredBookings.map((booking) => (
            <BookingCard 
              key={booking.id} 
              booking={booking}
              onCancel={handleCancelBooking}
              isCancelling={cancellingId === booking.id}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

interface BookingCardProps {
  booking: Booking;
  onCancel: (id: number, title: string) => void;
  isCancelling: boolean;
}

function BookingCard({ booking, onCancel, isCancelling }: BookingCardProps) {
  const bookingDate = new Date(booking.slot_date || booking.booking_date);
  const formattedDate = bookingDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Check if the activity end time has passed
  // An activity is "upcoming" until the end time has been reached
  // Example: Activity ends at 12:00 → at 12:00:00 it's still upcoming, at 12:00:01 it's past
  const dateStr = booking.slot_date || booking.booking_date;
  const endTime = booking.slot_end_time || '23:59:59';
  const activityEndDateTime = new Date(`${dateStr}T${endTime}`);
  
  const isUpcoming = activityEndDateTime >= new Date() && booking.status !== 'cancelled';
  const isCancelled = booking.status === 'cancelled';

  // Get experience details for better images
  const experience = require('@/constants/experiences').EXPERIENCES.find(
    (exp: any) => exp.id === booking.experience_id.toString()
  );

  return (
    <Pressable style={styles.card}>
      <Image
        source={experience?.images?.[0] || { uri: booking.experience_image }}
        style={styles.cardImage}
        contentFit="cover"
      />
      
      {/* Provider Logo as small profile picture */}
      {experience?.providerLogo && (
        <View style={styles.providerLogoContainer}>
          <Image
            source={experience.providerLogo}
            style={styles.providerLogo}
            contentFit="contain"
          />
        </View>
      )}
      
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={[
            styles.statusBadge,
            isCancelled && styles.statusBadgeCancelled
          ]}>
            <Text style={styles.statusText}>
              {isCancelled ? '❌ Cancelled' : isUpcoming ? '⏱️ Upcoming' : 'Completed'}
            </Text>
          </View>
        </View>

        <Text style={styles.cardTitle}>{booking.experience_title}</Text>
        <Text style={styles.cardProvider}>{booking.experience_location}</Text>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Calendar size={16} color={colors.dark.textSecondary} />
            <Text style={styles.detailText}>{formattedDate}</Text>
          </View>
          <View style={styles.detailRow}>
            <Clock size={16} color={colors.dark.textSecondary} />
            <Text style={styles.detailText}>
              {booking.slot_start_time || booking.booking_time || 'Time TBD'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MapPin size={16} color={colors.dark.textSecondary} />
            <Text style={styles.detailText}>{booking.experience_location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailText}>
              👥 {booking.participants} {booking.participants === 1 ? 'person' : 'people'}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.referenceLabel}>Booking Reference</Text>
            <Text style={styles.referenceText}>{booking.booking_reference}</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Total</Text>
            <Text style={styles.price}>
              {booking.currency}{booking.total_amount}
            </Text>
          </View>
        </View>

        {isUpcoming && !isCancelled && (
          <Pressable 
            style={styles.cancelLink}
            onPress={() => onCancel(booking.id, booking.experience_title || 'this booking')}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color={colors.dark.textTertiary} />
            ) : (
              <Text style={styles.cancelLinkText}>Cancel my booking</Text>
            )}
          </Pressable>
        )}

        {!isUpcoming && !isCancelled && (
          <Pressable style={styles.reviewButton}>
            <Text style={styles.reviewButtonText}>Write a Review</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.dark.backgroundTertiary,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.dark.border,
  },
  filterButtonActive: {
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary,
  },
  filterText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.dark.textSecondary,
  },
  filterTextActive: {
    color: colors.dark.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    textAlign: 'center' as const,
    maxWidth: 250,
  },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardImage: {
    width: '100%',
    height: 180,
  },
  providerLogoContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.background,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  providerLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.dark.backgroundTertiary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.dark.text,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 4,
  },
  cardProvider: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    marginBottom: 16,
  },
  detailsContainer: {
    gap: 10,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  referenceLabel: {
    fontSize: 12,
    color: colors.dark.textTertiary,
    marginBottom: 2,
  },
  referenceText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.dark.textSecondary,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 12,
    color: colors.dark.textTertiary,
    marginBottom: 2,
  },
  price: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.dark.primary,
  },
  actionButton: {
    backgroundColor: colors.dark.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.dark.background,
  },
  reviewButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.dark.primary,
  },
  reviewButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.dark.primary,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.dark.textSecondary,
  },
  statusBadgeCancelled: {
    backgroundColor: colors.dark.backgroundTertiary,
    opacity: 0.7,
  },
  cancelLink: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelLinkText: {
    fontSize: 12,
    color: colors.dark.textTertiary,
    textDecorationLine: 'underline' as const,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  carouselContainer: {
    flex: 1,
  },
  pageIndicator: {
    position: 'absolute',
    top: 16,
    right: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 10,
  },
  pageIndicatorText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  carouselItem: {
    width: CARD_WIDTH,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  singleBookingContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  loginEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  loginIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.dark.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginIcon: {
    fontSize: 56,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  loginText: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  loginButton: {
    width: '100%',
    backgroundColor: colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: colors.dark.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.dark.background,
  },
  signupButton: {
    width: '100%',
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.dark.border,
  },
  signupButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.dark.text,
  },
});
