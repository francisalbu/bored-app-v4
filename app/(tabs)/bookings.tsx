import { Calendar, Clock, MapPin, RefreshCw, X, Star, QrCode, ChevronDown } from 'lucide-react-native';
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
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import apiService from '@/services/api';

import colors from '@/constants/colors';
import { useBookings, type Booking } from '@/contexts/BookingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_HEIGHT = 420; // Fixed height for expanded cards
const COLLAPSED_HEIGHT = 110; // Fixed collapsed height

// Dynamic collapsed height based on number of cards
const getCollapsedHeight = (totalCards: number): number => {
  if (totalCards <= 1) return COLLAPSED_HEIGHT;
  if (totalCards === 2) return 110;
  if (totalCards === 3) return 90;
  if (totalCards === 4) return 75;
  return 65; // 5 or more cards
};

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
  const [expandedCardIndex, setExpandedCardIndex] = useState<number | null>(null);
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  // Swipe gesture for switching between tabs
  const swipeAnim = useRef(new Animated.Value(0)).current;
  // Use ref to track current filter for panResponder
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes (not vertical scrolling)
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        swipeAnim.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const SWIPE_THRESHOLD = 50;
        const currentFilter = filterRef.current;
        
        if (gestureState.dx > SWIPE_THRESHOLD && currentFilter === 'past') {
          // Swipe right - go to upcoming
          setFilter('upcoming');
          setExpandedCardIndex(null);
        } else if (gestureState.dx < -SWIPE_THRESHOLD && currentFilter === 'upcoming') {
          // Swipe left - go to past
          setFilter('past');
          setExpandedCardIndex(null);
        }
        
        // Reset animation
        Animated.spring(swipeAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

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

  const handleCardPress = (index: number) => {
    setExpandedCardIndex(expandedCardIndex === index ? null : index);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>MY BOOKINGS</Text>
        <View style={styles.filterContainer}>
          <Pressable
            style={styles.filterTab}
            onPress={() => {
              setFilter('upcoming');
              setExpandedCardIndex(null);
            }}
          >
            <Text style={[
              styles.filterText,
              filter === 'upcoming' && styles.filterTextActive,
            ]}>
              Upcoming
            </Text>
            {filter === 'upcoming' && <View style={styles.filterDot} />}
          </Pressable>
          <Pressable
            style={styles.filterTab}
            onPress={() => {
              setFilter('past');
              setExpandedCardIndex(null);
            }}
          >
            <Text style={[
              styles.filterText,
              filter === 'past' && styles.filterTextActive,
            ]}>
              Past
            </Text>
            {filter === 'past' && <View style={styles.filterDot} />}
          </Pressable>
        </View>
      </View>

      {/* Swipeable Content Area */}
      <Animated.View 
        style={[styles.swipeableContent, { transform: [{ translateX: Animated.multiply(swipeAnim, 0.1) }] }]}
        {...panResponder.panHandlers}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.dark.primary} />
            <Text style={styles.loadingText}>{t('booking.loadingBookings')}</Text>
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Image 
              source={{ uri: 'https://storage.googleapis.com/bored_tourist_media/images/icon_bookings.png' }}
              style={styles.bookingsIcon}
              contentFit="contain"
            />
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
        // Apple Wallet Style Stack with ScrollView
        <ScrollView 
          style={styles.walletScrollView}
          contentContainerStyle={styles.walletScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.walletContainer, { minHeight: expandedCardIndex !== null ? CARD_HEIGHT + (filteredBookings.length - 1) * getCollapsedHeight(filteredBookings.length) + 100 : filteredBookings.length * getCollapsedHeight(filteredBookings.length) + 100 }]}>
            {filteredBookings.map((booking, index) => {
              const isExpanded = expandedCardIndex === index;
              const isTopCard = expandedCardIndex === null ? index === 0 : expandedCardIndex === index;
              
              return (
                <WalletCard
                  key={booking.id}
                  booking={booking}
                  index={index}
                  totalCards={filteredBookings.length}
                  isExpanded={isExpanded}
                  isTopCard={isTopCard}
                  expandedIndex={expandedCardIndex}
                  onPress={() => handleCardPress(index)}
                  onCancel={handleCancelBooking}
                  isCancelling={cancellingId === booking.id}
                  onWriteReview={handleOpenReviewModal}
                  insets={insets}
                />
              );
            })}
          </View>
        </ScrollView>
        )}
      </Animated.View>

      {/* Floating Help Button - hide when card is expanded */}
      {filteredBookings.length > 1 && expandedCardIndex === null && (
        <Pressable 
          style={[styles.floatingHelpButton, { bottom: insets.bottom + 100 }]}
          onPress={() => setHelpModalVisible(true)}
        >
          <Text style={styles.floatingHelpIcon}>?</Text>
        </Pressable>
      )}

      {/* Help Modal */}
      <HelpModal 
        visible={helpModalVisible} 
        onClose={() => setHelpModalVisible(false)} 
      />

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

interface WalletCardProps {
  booking: Booking;
  index: number;
  totalCards: number;
  isExpanded: boolean;
  isTopCard: boolean;
  expandedIndex: number | null;
  onPress: () => void;
  onCancel: (id: number, title: string) => void;
  isCancelling: boolean;
  onWriteReview?: (booking: Booking) => void;
  insets: { bottom: number };
}

function WalletCard({ 
  booking, 
  index, 
  totalCards, 
  isExpanded, 
  isTopCard,
  expandedIndex,
  onPress, 
  onCancel, 
  isCancelling, 
  onWriteReview,
  insets 
}: WalletCardProps) {
  const { t } = useLanguage();
  const bookingDate = new Date(booking.slot_date || booking.booking_date);
  const day = bookingDate.getDate().toString().padStart(2, '0');
  const month = bookingDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  
  const dateStr = booking.slot_date || booking.booking_date;
  const endTime = booking.slot_end_time || '23:59:59';
  const activityEndDateTime = new Date(`${dateStr}T${endTime}`);
  
  const isUpcoming = activityEndDateTime >= new Date() && booking.status !== 'cancelled';
  const isCancelled = booking.status === 'cancelled';

  // Get dynamic collapsed height based on total cards
  const collapsedHeight = getCollapsedHeight(totalCards);

  // Calculate position based on state
  let topOffset = 0;
  if (totalCards === 1) {
    topOffset = 0;
  } else if (expandedIndex !== null) {
    if (index < expandedIndex) {
      topOffset = index * collapsedHeight;
    } else if (index === expandedIndex) {
      topOffset = index * collapsedHeight;
    } else {
      // Cards below expanded card
      topOffset = expandedIndex * collapsedHeight + CARD_HEIGHT + (index - expandedIndex - 1) * collapsedHeight + 16;
    }
  } else {
    // No card expanded - stack from top
    topOffset = index * collapsedHeight;
  }

  // When only 1 card, make it fullscreen; otherwise use CARD_HEIGHT
  const cardHeight = isExpanded ? CARD_HEIGHT : collapsedHeight;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.walletCard,
        {
          top: topOffset,
          height: cardHeight,
          zIndex: isExpanded ? 100 : totalCards - index,
        },
      ]}
    >
      {/* Card Image Background */}
      <Image
        source={{ uri: booking.experience_image }}
        style={styles.walletCardImage}
        contentFit="cover"
      />
      
      {/* Gradient Overlay */}
      <LinearGradient
        colors={isExpanded ? ['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.95)'] : ['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']}
        locations={isExpanded ? [0, 0.4, 1] : [0, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Collapsed View - Just title preview */}
      {!isExpanded && (
        <View style={styles.walletCardCollapsed}>
          <View style={styles.walletCardCollapsedLeft}>
            <Text style={styles.walletCardCollapsedDay}>{day}</Text>
            <Text style={styles.walletCardCollapsedMonth}>{month}</Text>
          </View>
          <View style={styles.walletCardCollapsedRight}>
            <Text style={styles.walletCardCollapsedTitle} numberOfLines={1}>
              {booking.experience_title}
            </Text>
            <Text style={styles.walletCardCollapsedTime}>
              {booking.slot_start_time || 'Time TBD'}
            </Text>
          </View>
        </View>
      )}

      {/* Expanded View - All info at bottom with vignette */}
      {isExpanded && (
        <View style={[styles.walletCardExpanded, { paddingBottom: totalCards === 1 ? insets.bottom + 16 : 20 }]}>
          {/* Date */}
          <View style={styles.walletDateRow}>
            <Text style={styles.walletDay}>{day}</Text>
            <Text style={styles.walletMonth}>{month}</Text>
          </View>

          {/* Title */}
          <Text style={styles.walletTitle}>{booking.experience_title}</Text>
          
          {/* Details Row */}
          <Text style={styles.walletDetails}>
            {booking.slot_start_time || 'Time TBD'} • {booking.experience_location}
          </Text>
          
          {/* Info Row */}
          <View style={styles.walletInfoRow}>
            <Text style={styles.walletInfoItem}>👥 {booking.participants} {booking.participants === 1 ? 'guest' : 'guests'}</Text>
            <Text style={styles.walletInfoItem}>💰 {booking.currency}{booking.total_amount}</Text>
          </View>

          {/* Reference */}
          <Text style={styles.walletReference}>Ref: {booking.booking_reference}</Text>

          {/* Actions */}
          {isUpcoming && !isCancelled && (
            <Pressable 
              style={styles.walletCancelLink}
              onPress={() => onCancel(booking.id, booking.experience_title || 'this booking')}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color={colors.dark.textTertiary} />
              ) : (
                <Text style={styles.walletCancelText}>Cancel booking</Text>
              )}
            </Pressable>
          )}

          {!isUpcoming && !isCancelled && !booking.has_review && onWriteReview && (
            <Pressable style={styles.walletReviewButton} onPress={() => onWriteReview(booking)}>
              <Text style={styles.walletReviewText}>Write a Review</Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
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

          {!isUpcoming && !isCancelled && !booking.has_review && onWriteReview && (
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
              Linking.openURL('https://wa.me/351912345678');
            }}
          >
            <Text style={styles.helpIcon}>📱</Text>
            <View style={styles.helpTextContainer}>
              <Text style={styles.helpLabel}>Contact via WhatsApp</Text>
              <Text style={styles.helpValue}>+351 912 345 678</Text>
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
              Linking.openURL('mailto:support@boredtourist.com');
            }}
          >
            <Text style={styles.helpIcon}>✉️</Text>
            <View style={styles.helpTextContainer}>
              <Text style={styles.helpLabel}>Email Support</Text>
              <Text style={styles.helpValue}>support@boredtourist.com</Text>
            </View>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// Help Modal Component
interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
}

function HelpModal({ visible, onClose }: HelpModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.helpModalOverlay}>
        <Pressable style={styles.helpModalBackdrop} onPress={onClose} />
        <View style={[styles.helpModalContent, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
          {/* Header */}
          <View style={styles.helpModalHeader}>
            <Text style={styles.helpModalTitle}>Need Help?</Text>
            <Pressable onPress={onClose} style={styles.helpModalClose}>
              <X size={24} color={colors.dark.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.helpModalSubtitle}>
            We're here to help! Contact us through any of these channels:
          </Text>

          {/* WhatsApp */}
          <Pressable 
            style={styles.helpModalItem}
            onPress={() => {
              Linking.openURL('https://wa.me/351967407859');
              onClose();
            }}
          >
            <View style={styles.helpModalIconContainer}>
              <Text style={styles.helpModalIcon}>💬</Text>
            </View>
            <View style={styles.helpModalItemContent}>
              <Text style={styles.helpModalItemTitle}>WhatsApp</Text>
              <Text style={styles.helpModalItemValue}>+351 967 407 859</Text>
            </View>
          </Pressable>

          {/* Email */}
          <Pressable 
            style={styles.helpModalItem}
            onPress={() => {
              Linking.openURL('mailto:bookings@boredtourist.com');
              onClose();
            }}
          >
            <View style={styles.helpModalIconContainer}>
              <Text style={styles.helpModalIcon}>✉️</Text>
            </View>
            <View style={styles.helpModalItemContent}>
              <Text style={styles.helpModalItemTitle}>Email</Text>
              <Text style={styles.helpModalItemValue}>bookings@boredtourist.com</Text>
            </View>
          </Pressable>

          {/* Response Time */}
          <View style={styles.helpModalNote}>
            <Text style={styles.helpModalNoteText}>
              We typically respond within 1-2 hours during business hours (9AM - 6PM GMT)
            </Text>
          </View>
        </View>
      </View>
    </Modal>
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
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);

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
      transparent={false}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <View style={[styles.reviewModalContainer, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.reviewModalHeader}>
          <Text style={styles.reviewModalTitle}>{t('reviews.writeReview')}</Text>
          <Pressable onPress={onClose} hitSlop={20}>
            <X size={24} color={colors.dark.textSecondary} />
          </Pressable>
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={insets.top + 60}
        >
          <ScrollView 
            ref={scrollViewRef}
            style={styles.reviewModalBody}
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
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
                ref={textInputRef}
                style={styles.reviewCommentInput}
                placeholder={t('reviews.shareExperience')}
                placeholderTextColor={colors.dark.textTertiary}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={6}
                maxLength={1000}
                textAlignVertical="top"
                onFocus={() => {
                  // Scroll to show the input when keyboard appears
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }}
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
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  swipeableContent: {
    flex: 1,
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
    gap: 24,
  },
  filterTab: {
    alignItems: 'center',
  },
  filterText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.dark.textSecondary,
  },
  filterTextActive: {
    color: colors.dark.text,
    fontWeight: '700' as const,
  },
  filterDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.dark.text,
    marginTop: 6,
  },
  // Apple Wallet Style
  walletScrollView: {
    flex: 1,
  },
  walletScrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  walletContainer: {
    flex: 1,
    paddingHorizontal: 16,
    position: 'relative' as const,
  },
  walletCard: {
    position: 'absolute' as const,
    left: 16,
    right: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  walletCardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  // Collapsed state
  walletCardCollapsed: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  walletCardCollapsedLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  walletCardCollapsedDay: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: colors.dark.text,
    lineHeight: 36,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  walletCardCollapsedMonth: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.dark.text,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  walletCardCollapsedRight: {
    flex: 1,
  },
  walletCardCollapsedTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: colors.dark.text,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  walletCardCollapsedTime: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.dark.text,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Expanded state
  walletCardExpanded: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
  },
  walletDateSection: {
    marginBottom: 8,
  },
  walletDay: {
    fontSize: 56,
    fontWeight: '700' as const,
    color: colors.dark.text,
    lineHeight: 60,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  walletMonth: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.dark.primary,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  walletInfoSection: {
    marginBottom: 20,
  },
  walletTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: colors.dark.text,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  walletSubtitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: colors.dark.text,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  walletDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  walletNotchLeft: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.dark.background,
    marginLeft: -28,
  },
  walletDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 8,
    borderStyle: 'dashed' as const,
  },
  walletNotchRight: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.dark.background,
    marginRight: -28,
  },
  walletViewTicket: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  walletViewTicketText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.dark.textSecondary,
    letterSpacing: 1,
  },
  walletExtraInfo: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  walletExtraRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletExtraLabel: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },
  walletExtraValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.dark.text,
  },
  walletExtraPrice: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.dark.primary,
  },
  walletCancelLink: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  walletCancelText: {
    fontSize: 13,
    color: colors.dark.textTertiary,
    textDecorationLine: 'underline' as const,
  },
  walletReviewButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.dark.primary,
    marginTop: 8,
  },
  walletReviewText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.dark.primary,
  },
  walletReference: {
    fontSize: 14,
    color: colors.dark.primary,
    marginTop: 8,
    fontWeight: '700' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  walletDateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  walletDetails: {
    fontSize: 14,
    color: colors.dark.text,
    opacity: 0.9,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  walletInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 4,
  },
  walletInfoItem: {
    fontSize: 14,
    color: colors.dark.text,
    opacity: 0.85,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  floatingHelpButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  floatingHelpIcon: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.dark.background,
  },
  walletHelpButton: {
    backgroundColor: colors.dark.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  walletHelpText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.dark.background,
  },
  // Help Modal Styles
  helpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  helpModalBackdrop: {
    flex: 1,
  },
  helpModalContent: {
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  helpModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  helpModalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.dark.text,
  },
  helpModalClose: {
    padding: 4,
  },
  helpModalSubtitle: {
    fontSize: 15,
    color: colors.dark.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  helpModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.backgroundTertiary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  helpModalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.dark.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  helpModalIcon: {
    fontSize: 24,
  },
  helpModalItemContent: {
    flex: 1,
  },
  helpModalItemTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.dark.text,
    marginBottom: 2,
  },
  helpModalItemValue: {
    fontSize: 14,
    color: colors.dark.primary,
    fontWeight: '500' as const,
  },
  helpModalNote: {
    marginTop: 12,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  helpModalNoteText: {
    fontSize: 13,
    color: colors.dark.textTertiary,
    textAlign: 'center' as const,
    lineHeight: 18,
  },
  // Keep old styles for backwards compatibility
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
  bookingsIcon: {
    width: 300,
    height: 300,
    marginBottom: 32,
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
  ticketNotchLeft: {
    position: 'absolute',
    left: -8,
    top: '45%',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.dark.background,
    zIndex: 10,
  },
  ticketNotchRight: {
    position: 'absolute',
    right: -8,
    top: '45%',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.dark.background,
    zIndex: 10,
  },
  cardImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
  reviewModalContainer: {
    flex: 1,
    backgroundColor: colors.dark.background,
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
});
