import { Calendar, Clock, MapPin, RefreshCw, X, Star, Users } from 'lucide-react-native';
import React, { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Linking,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import apiService from '@/services/api';

import colors from '@/constants/colors';
import { useBookings, type Booking } from '@/contexts/BookingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

type BookingFilter = 'upcoming' | 'past';

export default function BookingsScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { upcomingBookings, pastBookings, isLoading, refreshBookings, cancelBooking } = useBookings();
  const [filter, setFilter] = useState<BookingFilter>('upcoming');
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>{t('booking.myBookings')}</Text>
        </View>
        <View style={styles.loginEmptyState}>
          <View style={styles.loginIconContainer}>
            <Text style={styles.loginIcon}>🎟️</Text>
          </View>
          <Text style={styles.loginTitle}>{t('booking.yourTicketsAwait')}</Text>
          <Text style={styles.loginText}>
            {t('booking.signInToAccess')}
          </Text>
          <Pressable 
            style={styles.loginButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.loginButtonText}>{t('auth.signIn')}</Text>
          </Pressable>
          <Pressable 
            style={styles.signupButton}
            onPress={() => router.push('/auth/signup')}
          >
            <Text style={styles.signupButtonText}>{t('auth.createAccount')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const filteredBookings = filter === 'upcoming' ? upcomingBookings : pastBookings;

  const handleCancelBooking = async (bookingId: number, bookingTitle: string) => {
    Alert.alert(
      t('booking.cancelBooking'),
      t('booking.cancelConfirmation', { title: bookingTitle }),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('booking.yesCancel'),
          style: 'destructive',
          onPress: async () => {
            setCancellingId(bookingId);
            const result = await cancelBooking(bookingId);
            setCancellingId(null);
            
            if (result.success) {
              Alert.alert(t('common.success'), t('booking.cancelSuccess'));
            } else {
              Alert.alert(t('common.error'), result.error || t('booking.cancelError'));
            }
          },
        },
      ]
    );
  };

  const handleOpenReviewModal = (booking: Booking) => {
    setSelectedBookingForReview(booking);
    setReviewModalVisible(true);
  };

  const handleCloseReviewModal = () => {
    setReviewModalVisible(false);
    setSelectedBookingForReview(null);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{t('booking.myBookings')}</Text>
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
              {t('booking.upcoming')} ({upcomingBookings.length})
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
              {t('booking.past')} ({pastBookings.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.dark.primary} />
          <Text style={styles.loadingText}>{t('booking.loadingBookings')}</Text>
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarMonth}>JUL</Text>
              <Text style={styles.calendarYear}>2024</Text>
            </View>
            <View style={styles.calendarBody}>
              <Text style={styles.calendarDay}>17</Text>
            </View>
          </View>
          <Text style={styles.emptyTitle}>No {filter} bookings</Text>
          <Text style={styles.emptyText}>
            {filter === 'upcoming'
              ? 'Start exploring and book your next adventure!'
              : 'Your past experiences will appear here'}
          </Text>
          <Pressable 
            style={styles.exploreButton}
            onPress={() => router.push('/(tabs)/' as any)}
          >
            <Text style={styles.exploreButtonText}>Explore Experiences</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.carouselContainer}>
          {/* Carousel Counter */}
          {filteredBookings.length > 1 && (
            <View style={styles.carouselCounter}>
              <Text style={styles.carouselCounterText}>
                {currentIndex + 1}/{filteredBookings.length}
              </Text>
            </View>
          )}
          
          {/* Tickets Carousel */}
          <FlatList
            ref={flatListRef}
            data={filteredBookings}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + 16}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselContent}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 16));
              setCurrentIndex(index);
            }}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item: booking }) => (
              <TicketCard 
                booking={booking}
                onCancel={handleCancelBooking}
                isCancelling={cancellingId === booking.id}
                onWriteReview={handleOpenReviewModal}
              />
            )}
          />
          
          {/* Fixed Help Section */}
          {filter === 'upcoming' && (
            <View style={styles.helpSection}>
              <Text style={styles.helpSectionTitle}>Need Help?</Text>
              <View style={styles.helpButtons}>
                <Pressable 
                  style={styles.helpButton}
                  onPress={() => Linking.openURL('https://wa.me/351967407859')}
                >
                  <Text style={styles.helpButtonIcon}>📱</Text>
                  <Text style={styles.helpButtonText}>WhatsApp</Text>
                </Pressable>
                <Pressable 
                  style={styles.helpButton}
                  onPress={() => Linking.openURL('mailto:bookings@boredtourist.com')}
                >
                  <Text style={styles.helpButtonIcon}>✉️</Text>
                  <Text style={styles.helpButtonText}>Email</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Review Modal */}
      {selectedBookingForReview && (
        <ReviewModal
          visible={reviewModalVisible}
          booking={selectedBookingForReview}
          onClose={handleCloseReviewModal}
          onSubmitSuccess={() => {
            handleCloseReviewModal();
            refreshBookings();
          }}
        />
      )}
    </View>
  );
}

interface TicketCardProps {
  booking: Booking;
  onCancel: (id: number, title: string) => void;
  isCancelling: boolean;
  onWriteReview?: (booking: Booking) => void;
}

function TicketCard({ booking, onCancel, isCancelling, onWriteReview }: TicketCardProps) {
  const { t } = useLanguage();
  const bookingDate = new Date(booking.slot_date || booking.booking_date);
  const formattedDate = bookingDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const dateStr = booking.slot_date || booking.booking_date;
  const endTime = booking.slot_end_time || '23:59:59';
  const activityEndDateTime = new Date(`${dateStr}T${endTime}`);
  
  const isUpcoming = activityEndDateTime >= new Date() && booking.status !== 'cancelled';
  const isCancelled = booking.status === 'cancelled';

  // Format time display
  const formatTime = (time: string | undefined) => {
    if (!time) return 'TBD';
    return time.substring(0, 5); // HH:MM
  };

  return (
    <View style={styles.ticketCard}>
      {/* Ticket Image Header */}
      <View style={styles.ticketImageContainer}>
        <Image
          source={{ uri: booking.experience_image }}
          style={styles.ticketImage}
          contentFit="cover"
        />
        {/* Status Badge */}
        <View style={[
          styles.ticketStatusBadge,
          isCancelled && styles.ticketStatusCancelled,
          !isUpcoming && !isCancelled && styles.ticketStatusCompleted
        ]}>
          <Text style={styles.ticketStatusText}>
            {isCancelled ? '❌ Cancelled' : isUpcoming ? '🎫 Upcoming' : '✅ Completed'}
          </Text>
        </View>
      </View>

      {/* Ticket Content */}
      <View style={styles.ticketContent}>
        <Text style={styles.ticketTitle} numberOfLines={2}>{booking.experience_title}</Text>
        
        {/* Details Grid */}
        <View style={styles.ticketDetails}>
          <View style={styles.ticketDetailRow}>
            <Calendar size={16} color={colors.dark.textSecondary} />
            <Text style={styles.ticketDetailText}>{formattedDate}</Text>
          </View>
          <View style={styles.ticketDetailRow}>
            <Clock size={16} color={colors.dark.textSecondary} />
            <Text style={styles.ticketDetailText}>{formatTime(booking.slot_start_time || booking.booking_time)}</Text>
          </View>
          <View style={styles.ticketDetailRow}>
            <Users size={16} color={colors.dark.textSecondary} />
            <Text style={styles.ticketDetailText}>{booking.participants} {booking.participants === 1 ? 'person' : 'people'}</Text>
          </View>
        </View>

        {/* Meeting Point */}
        <Pressable 
          style={styles.meetingPointBox}
          onPress={() => {
            const address = encodeURIComponent(booking.experience_location || 'Lisbon, Portugal');
            Linking.openURL(`https://maps.google.com/?q=${address}`);
          }}
        >
          <MapPin size={18} color={colors.dark.primary} />
          <View style={styles.meetingPointContent}>
            <Text style={styles.meetingPointLabel}>Meeting Point</Text>
            <Text style={styles.meetingPointAddress} numberOfLines={1}>{booking.experience_location}</Text>
          </View>
        </Pressable>

        {/* Dashed Separator */}
        <View style={styles.ticketSeparator}>
          <View style={styles.ticketNotchLeft} />
          <View style={styles.ticketDashedLine} />
          <View style={styles.ticketNotchRight} />
        </View>

        {/* Footer */}
        <View style={styles.ticketFooter}>
          <View>
            <Text style={styles.ticketRefLabel}>Booking Reference</Text>
            <Text style={styles.ticketRefValue}>{booking.booking_reference}</Text>
          </View>
          <View style={styles.ticketPriceBox}>
            <Text style={styles.ticketPriceLabel}>Total</Text>
            <Text style={styles.ticketPrice}>{booking.currency}{booking.total_amount}</Text>
          </View>
        </View>

        {/* Action Button */}
        {isUpcoming && !isCancelled && (
          <Pressable 
            style={styles.ticketCancelButton}
            onPress={() => onCancel(booking.id, booking.experience_title || 'this booking')}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color={colors.dark.textTertiary} />
            ) : (
              <Text style={styles.ticketCancelText}>Cancel my booking</Text>
            )}
          </Pressable>
        )}

        {!isUpcoming && !isCancelled && onWriteReview && (
          <Pressable style={styles.ticketReviewButton} onPress={() => onWriteReview(booking)}>
            <Text style={styles.ticketReviewText}>Write a Review</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

interface BookingCardProps {
  booking: Booking;
  onCancel: (id: number, title: string) => void;
  isCancelling: boolean;
  onWriteReview?: (booking: Booking) => void;
}

function BookingCard({ booking, onCancel, isCancelling, onWriteReview }: BookingCardProps) {
  const { t } = useLanguage();
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

  return (
    <View style={styles.bookingContainer}>
      {/* Main Ticket Card */}
      <View style={styles.card}>
        {/* Ticket notches */}
        <View style={styles.ticketNotchLeft} />
        <View style={styles.ticketNotchRight} />
        
        <Image
          source={{ uri: booking.experience_image }}
          style={styles.cardImage}
          contentFit="cover"
        />
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[
              styles.statusBadge,
              isCancelled && styles.statusBadgeCancelled
            ]}>
              <Text style={styles.statusText}>
                {isCancelled ? '❌ Cancelled' : isUpcoming ? '⏱️ Upcoming' : '✅ Completed'}
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
              <Text style={styles.detailText} numberOfLines={1}>{booking.experience_location}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.guestsText}>
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

          {!isUpcoming && !isCancelled && onWriteReview && (
            <Pressable style={styles.reviewButton} onPress={() => onWriteReview(booking)}>
              <Text style={styles.reviewButtonText}>Write a Review</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Help & Contact Section - Separate card below */}
      {isUpcoming && !isCancelled && (
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          
          <Pressable 
            style={styles.helpItem}
            onPress={() => {
              Linking.openURL('https://wa.me/351967407859');
            }}
          >
            <Text style={styles.helpIcon}>📱</Text>
            <View style={styles.helpTextContainer}>
              <Text style={styles.helpLabel}>Contact via WhatsApp</Text>
              <Text style={styles.helpValue}>+351 967 407 859</Text>
            </View>
          </Pressable>

          <Pressable 
            style={styles.helpItem}
            onPress={() => {
              const address = encodeURIComponent(booking.experience_location || 'Lisbon, Portugal');
              Linking.openURL(`https://maps.google.com/?q=${address}`);
            }}
          >
            <Text style={styles.helpIcon}>📍</Text>
            <View style={styles.helpTextContainer}>
              <Text style={styles.helpLabel}>Meeting Point</Text>
              <Text style={styles.helpValue} numberOfLines={1}>{booking.experience_location}</Text>
            </View>
          </Pressable>

          <Pressable 
            style={styles.helpItem}
            onPress={() => {
              Linking.openURL('mailto:bookings@boredtourist.com');
            }}
          >
            <Text style={styles.helpIcon}>✉️</Text>
            <View style={styles.helpTextContainer}>
              <Text style={styles.helpLabel}>Email Support</Text>
              <Text style={styles.helpValue}>bookings@boredtourist.com</Text>
            </View>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// Review Modal Component
interface ReviewModalProps {
  visible: boolean;
  booking: Booking;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

function ReviewModal({ visible, booking, onClose, onSubmitSuccess }: ReviewModalProps) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert(t('common.error'), t('reviews.ratingRequired'));
      return;
    }

    if (comment.trim().length < 10) {
      Alert.alert(t('common.error'), t('reviews.commentTooShort'));
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await apiService.createReview({
        experienceId: booking.experience_id.toString(),
        bookingId: booking.id,
        rating,
        comment: comment.trim(),
      });

      if (response.success) {
        Alert.alert(t('common.success'), t('reviews.thankYou'));
        setRating(0);
        setComment('');
        onSubmitSuccess();
      } else {
        Alert.alert(t('common.error'), response.error || t('reviews.submitError'));
      }
    } catch (error: any) {
      console.error('Error submitting review:', error);
      Alert.alert(t('common.error'), error.message || t('reviews.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.reviewModalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.reviewModalBackdrop} onPress={onClose} />
        <View style={[styles.reviewModalContent, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
          {/* Header */}
          <View style={styles.reviewModalHeader}>
            <Text style={styles.reviewModalTitle}>{t('reviews.writeReview')}</Text>
            <Pressable onPress={onClose}>
              <X size={24} color={colors.dark.textSecondary} />
            </Pressable>
          </View>

          <ScrollView 
            style={styles.reviewModalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Experience Info */}
            <View style={styles.reviewExperienceInfo}>
              <Text style={styles.reviewExperienceTitle}>{booking.experience_title}</Text>
              <Text style={styles.reviewExperienceDate}>
                {new Date(booking.slot_date || booking.booking_date).toLocaleDateString()}
              </Text>
            </View>

            {/* Rating Stars */}
            <View style={styles.reviewRatingSection}>
              <Text style={styles.reviewSectionLabel}>{t('reviews.yourRating')}</Text>
              <View style={styles.reviewStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.reviewStar}
                  >
                    <Star
                      size={40}
                      color={star <= rating ? '#FFB800' : colors.dark.textTertiary}
                      fill={star <= rating ? '#FFB800' : 'transparent'}
                    />
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Comment */}
            <View style={styles.reviewCommentSection}>
              <Text style={styles.reviewSectionLabel}>{t('reviews.yourReview')}</Text>
              <TextInput
                style={styles.reviewCommentInput}
                placeholder={t('reviews.shareExperience')}
                placeholderTextColor={colors.dark.textTertiary}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={6}
                maxLength={1000}
                textAlignVertical="top"
              />
              <Text style={styles.reviewCharCount}>
                {comment.length}/1000
              </Text>
            </View>

            {/* Submit Button */}
            <Pressable
              style={[
                styles.reviewSubmitButton,
                (rating === 0 || comment.trim().length < 10 || isSubmitting) && styles.reviewSubmitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={rating === 0 || comment.trim().length < 10 || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.dark.background} />
              ) : (
                <Text style={styles.reviewSubmitButtonText}>{t('reviews.submit')}</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
    fontWeight: '900' as const,
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
    fontWeight: '900' as const,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  calendarContainer: {
    width: 140,
    height: 140,
    backgroundColor: colors.dark.backgroundTertiary,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  calendarHeader: {
    backgroundColor: '#8B0000',
    paddingVertical: 10,
    alignItems: 'center',
  },
  calendarMonth: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  calendarYear: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  calendarBody: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDay: {
    fontSize: 56,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: colors.dark.text,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 280,
  },
  exploreButton: {
    backgroundColor: colors.dark.primary,
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 16,
    shadowColor: colors.dark.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
    maxWidth: 320,
  },
  exploreButtonText: {
    fontSize: 17,
    fontWeight: '900' as const,
    color: colors.dark.background,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    overflow: 'visible',
    marginBottom: 16,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  oldProviderLogoContainer: {
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
  oldProviderLogo: {
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
    fontWeight: '900' as const,
    color: colors.dark.text,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
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
    fontWeight: '900' as const,
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
    fontWeight: '900' as const,
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
    fontWeight: '900' as const,
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
    fontWeight: '900' as const,
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
  bookingContainer: {
    marginBottom: 8,
  },
  guestsText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },
  helpCard: {
    backgroundColor: colors.dark.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 16,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  helpIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  helpTextContainer: {
    flex: 1,
  },
  helpLabel: {
    fontSize: 12,
    color: colors.dark.textTertiary,
    marginBottom: 2,
  },
  helpValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.dark.primary,
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
  // Review Modal Styles
  reviewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  reviewModalBackdrop: {
    flex: 1,
  },
  reviewModalContent: {
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  reviewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  reviewModalTitle: {
    fontSize: 20,
    fontWeight: '900' as const,
    color: colors.dark.text,
  },
  reviewModalBody: {
    flex: 1,
    paddingHorizontal: 20,
  },
  reviewExperienceInfo: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  reviewExperienceTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 4,
  },
  reviewExperienceDate: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },
  reviewRatingSection: {
    paddingVertical: 24,
  },
  reviewSectionLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 16,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  reviewStar: {
    padding: 4,
  },
  reviewCommentSection: {
    paddingBottom: 24,
  },
  reviewCommentInput: {
    backgroundColor: colors.dark.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    color: colors.dark.text,
    fontSize: 15,
    minHeight: 150,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  reviewCharCount: {
    fontSize: 12,
    color: colors.dark.textTertiary,
    textAlign: 'right' as const,
    marginTop: 8,
  },
  reviewSubmitButton: {
    backgroundColor: colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewSubmitButtonDisabled: {
    opacity: 0.5,
  },
  reviewSubmitButtonText: {
    color: colors.dark.background,
    fontSize: 16,
    fontWeight: '900' as const,
  },
  // Carousel Styles
  carouselContainer: {
    flex: 1,
  },
  carouselCounter: {
    position: 'absolute',
    top: 16,
    right: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 10,
  },
  carouselCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  carouselContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  // Ticket Card Styles
  ticketCard: {
    width: CARD_WIDTH,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 16,
  },
  ticketImageContainer: {
    height: 180,
    position: 'relative',
  },
  ticketImage: {
    width: '100%',
    height: '100%',
  },
  providerLogoContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  providerLogo: {
    width: '100%',
    height: '100%',
  },
  ticketStatusBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ticketStatusCancelled: {
    backgroundColor: 'rgba(220,38,38,0.8)',
  },
  ticketStatusCompleted: {
    backgroundColor: 'rgba(34,197,94,0.8)',
  },
  ticketStatusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  ticketContent: {
    padding: 16,
  },
  ticketTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: colors.dark.text,
    marginBottom: 12,
  },
  ticketDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  ticketDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketDetailText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },
  meetingPointBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,255,140,0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,255,140,0.3)',
    marginBottom: 16,
  },
  meetingPointContent: {
    flex: 1,
  },
  meetingPointLabel: {
    fontSize: 12,
    color: colors.dark.primary,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  meetingPointAddress: {
    fontSize: 14,
    color: colors.dark.text,
  },
  ticketSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  ticketNotchLeft: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.dark.background,
    marginLeft: -24,
  },
  ticketDashedLine: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginHorizontal: 8,
  },
  ticketNotchRight: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.dark.background,
    marginRight: -24,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  ticketRefLabel: {
    fontSize: 11,
    color: colors.dark.textTertiary,
    marginBottom: 2,
  },
  ticketRefValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.dark.text,
  },
  ticketPriceBox: {
    alignItems: 'flex-end',
  },
  ticketPriceLabel: {
    fontSize: 11,
    color: colors.dark.textTertiary,
  },
  ticketPrice: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: colors.dark.primary,
  },
  ticketCancelButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  ticketCancelText: {
    fontSize: 14,
    color: colors.dark.textTertiary,
    textDecorationLine: 'underline',
  },
  ticketReviewButton: {
    marginTop: 16,
    backgroundColor: colors.dark.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  ticketReviewText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.dark.background,
  },
  // Help Section Styles
  helpSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  helpSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 12,
  },
  helpButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  helpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.dark.backgroundTertiary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  helpButtonIcon: {
    fontSize: 18,
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.dark.text,
  },
});
