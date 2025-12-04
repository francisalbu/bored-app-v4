import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Video, ResizeMode } from 'expo-av';
import { Star, MapPin, Clock, Bookmark, Share2, MessageCircle, MessageSquare, Bot } from 'lucide-react-native';
import { router, usePathname } from 'expo-router';
import React, { useRef, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ViewToken,
  Share,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import typography from '@/constants/typography';
import { type Experience } from '@/constants/experiences';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useExperiences } from '@/hooks/useExperiences';
import apiService from '@/services/api';
import AuthBottomSheet from '@/components/AuthBottomSheet';
import { useLanguage } from '@/contexts/LanguageContext';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Lisbon center coordinates (default fallback)
const LISBON_CENTER = { latitude: 38.7223, longitude: -9.1393 };
const MAX_DISTANCE_KM = 100;

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function FeedScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showAIChat, setShowAIChat] = useState<boolean>(false);
  const [showReviews, setShowReviews] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<'nearMe' | 'availableToday'>('nearMe');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [showNoActivitiesMessage, setShowNoActivitiesMessage] = useState<boolean>(false);
  const flatListRef = useRef<FlatList>(null);
  
  // Check if we're on the home tab (feed screen is active)
  const isTabFocused = pathname === '/' || pathname === '/index';

  // Fetch experiences from API
  const { experiences: EXPERIENCES, loading: loadingExperiences, error: experiencesError } = useExperiences();

  // Request location permission and get user location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setLocationPermission(true);
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          console.log('📍 User location:', location.coords);
        } else {
          console.log('❌ Location permission denied, using Lisbon as default');
          setUserLocation(LISBON_CENTER);
        }
      } catch (error) {
        console.error('❌ Error getting location:', error);
        setUserLocation(LISBON_CENTER);
      }
    })();
  }, []);

  // Filter experiences based on selected filter
  const filteredExperiences = React.useMemo(() => {
    if (selectedFilter === 'nearMe' && userLocation) {
      // Calculate real distances from user location
      const experiencesWithDistance = EXPERIENCES.map(exp => {
        // Parse coordinates from experience (assuming they have lat/lng)
        // For now, we'll use Lisbon coordinates as default for all experiences
        // TODO: Add actual coordinates to experiences in the database
        const expLat = exp.latitude || LISBON_CENTER.latitude;
        const expLng = exp.longitude || LISBON_CENTER.longitude;
        
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          expLat,
          expLng
        );
        
        return { ...exp, calculatedDistance: distance };
      });

      // Sort by distance (closest first)
      const sorted = experiencesWithDistance.sort((a, b) => a.calculatedDistance - b.calculatedDistance);

      // Check if closest experience is more than 100km away
      const hasNearbyActivities = sorted.length > 0 && sorted[0].calculatedDistance <= MAX_DISTANCE_KM;
      setShowNoActivitiesMessage(!hasNearbyActivities);

      // If no activities nearby and user is not in Lisbon area, return all Lisbon activities
      if (!hasNearbyActivities) {
        console.log('📍 No activities within 100km, showing all Lisbon experiences');
        return sorted; // Still show Lisbon activities
      }

      // Filter only activities within 100km
      return sorted.filter(exp => exp.calculatedDistance <= MAX_DISTANCE_KM);
    } else {
      // Filter only experiences available today
      return EXPERIENCES.filter(exp => exp.availableToday);
    }
  }, [selectedFilter, EXPERIENCES, userLocation]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
      console.log('📍 Current Experience Index:', viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Reset to first item when filter changes
  React.useEffect(() => {
    setCurrentIndex(0);
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: false });
    }
  }, [selectedFilter]);

  const { toggleSave, isSaved } = useFavorites();
  const { isAuthenticated } = useAuth();

  const handleSave = async (experienceId: string) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    await toggleSave(experienceId);
  };

  const renderItem = ({ item, index }: { item: Experience; index: number }) => {
    return (
      <View style={styles.itemContainer}>
        <ExperienceCard
          experience={item}
          isActive={index === currentIndex}
          isSaved={isSaved(item.id)}
          isTabFocused={isTabFocused}
          onAIChatPress={() => setShowAIChat(true)}
          onReviewsPress={() => setShowReviews(true)}
          onSavePress={() => handleSave(item.id)}
        />
      </View>
    );
  };

  const experience = filteredExperiences[currentIndex];

  // Show loading state
  if (loadingExperiences) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>{t('feed.loading')}</Text>
      </View>
    );
  }

  // Show error state
  if (experiencesError) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{t('feed.error')}: {experiencesError}</Text>
        <Text style={styles.errorSubtext}>{t('feed.errorSubtext')}</Text>
      </View>
    );
  }

  // Show empty state
  if (filteredExperiences.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.emptyText}>{t('feed.emptyText')}</Text>
        <Text style={styles.emptySubtext}>{t('feed.emptySubtext')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={filteredExperiences}
        renderItem={renderItem}
        keyExtractor={(item) => `${selectedFilter}-${item.id}`}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        getItemLayout={(data, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
      />

      <View 
        style={[styles.filtersContainer, { paddingTop: insets.top + 16 }]} 
        pointerEvents="box-none"
      >
        <BlurView intensity={20} tint="dark" style={styles.filterBlurContainer}>
          <Pressable 
            style={[
              styles.filterButton,
              selectedFilter === 'nearMe' && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter('nearMe')}
          >
            <Text style={[
              styles.filterText,
              selectedFilter === 'nearMe' && styles.filterTextActive
            ]}>
              {t('feed.nearMe')}
            </Text>
          </Pressable>
          
          <View style={styles.filterButtonDisabledContainer}>
            <View 
              style={[
                styles.filterButton,
                styles.filterButtonDisabled
              ]}
            >
              <Text style={[
                styles.filterText,
                styles.filterTextDisabled
              ]}>
                {t('feed.availableToday')}
              </Text>
              <Text style={styles.comingSoonText}>coming soon</Text>
            </View>
          </View>
        </BlurView>
      </View>

      {/* No Activities Nearby Message */}
      {showNoActivitiesMessage && selectedFilter === 'nearMe' && (
        <View style={styles.noActivitiesOverlay}>
          <View style={styles.noActivitiesCard}>
            <View style={styles.noActivitiesContent}>
              <Text style={styles.noActivitiesEmoji}>🗺️</Text>
              <Text style={styles.noActivitiesTitle}>
                {t('feed.noActivitiesTitle')}
              </Text>
              <Text style={styles.noActivitiesSubtitle}>
                {t('feed.noActivitiesSubtitle')}
              </Text>
              <Pressable 
                style={styles.exploreLisbonButton}
                onPress={() => setShowNoActivitiesMessage(false)}
              >
                <Text style={styles.exploreLisbonButtonText}>{t('feed.exploreLisbon')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <AIChatModal
        visible={showAIChat}
        experience={experience}
        onClose={() => setShowAIChat(false)}
      />

      <ReviewsModal
        visible={showReviews}
        experience={experience}
        onClose={() => setShowReviews(false)}
      />

      <AuthBottomSheet
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </View>
  );
}

interface ExperienceCardProps {
  experience: Experience;
  isActive: boolean;
  isSaved: boolean;
  isTabFocused: boolean;
  onAIChatPress: () => void;
  onReviewsPress: () => void;
  onSavePress: () => void;
}

function ExperienceCard({ experience, isActive, isSaved, isTabFocused, onAIChatPress, onReviewsPress, onSavePress }: ExperienceCardProps) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const videoRef = useRef<Video>(null);
  const [videoReady, setVideoReady] = useState<boolean>(false);

  const handleShare = async () => {
    try {
      const shareMessage = `🎉 ${experience.title}

📍 ${experience.location}
⭐ ${experience.rating} (${experience.reviewCount} reviews)
⏱️ ${experience.duration}
💰 ${experience.currency}${experience.price}/person

${experience.description}

Book this amazing experience on BoredTourist!`;

      const result = await Share.share({
        message: shareMessage,
        title: experience.title,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log('Shared via:', result.activityType);
        } else {
          console.log('Content shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      }
    } catch (error: any) {
      console.error('Error sharing:', error.message);
    }
  };

  return (
    <View style={styles.card}>
      {experience.video ? (
        <>
          {!videoReady && (
            <ExpoImage
              source={{ uri: experience.image }}
              style={styles.cardImage}
              contentFit="cover"
            />
          )}
          <Video
            ref={videoRef}
            source={typeof experience.video === 'string' ? { uri: experience.video } : experience.video}
            style={[styles.cardImage, !videoReady && { opacity: 0 }]}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isActive && videoReady && isTabFocused}
            isLooping
            isMuted={!isTabFocused || !isActive}
            useNativeControls={false}
            onError={(error) => console.log('❌ Video Error:', error)}
            onLoad={() => {
              console.log('✅ Video Loaded:', experience.title);
              setVideoReady(true);
            }}
            onReadyForDisplay={() => {
              console.log('📹 Video Ready:', experience.title);
            }}
          />
        </>
      ) : (
        <ExpoImage
          source={{ uri: experience.image }}
          style={styles.cardImage}
          contentFit="cover"
        />
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.95)']}
        style={styles.gradient}
      />

      <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom + 60, 80) }]}>
        <View style={styles.contentWrapper}>
          <Pressable
            style={[styles.infoSection, styles.infoCard]}
            onPress={() => router.push(`/experience/${experience.id}`)}
          >
            <View style={styles.providerRow}>
              {experience.providerLogo ? (
                <Image
                  source={{ uri: experience.providerLogo }}
                  style={styles.providerLogoImage}
                  resizeMode="cover"
                  onError={(e) => console.log('❌ Logo failed to load:', experience.providerLogo, e.nativeEvent.error)}
                  onLoad={() => console.log('✅ Logo loaded:', experience.providerLogo)}
                />
              ) : (
                <View style={styles.providerAvatar}>
                  <Text style={styles.providerInitial}>
                    {experience.provider[0]}
                  </Text>
                </View>
              )}
              <Text style={styles.providerName}>{experience.provider}</Text>
            </View>
            
            <Text style={styles.title}>{experience.title}</Text>
            
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Clock size={14} color={colors.dark.textSecondary} />
                <Text style={styles.metaText}>{experience.duration}</Text>
              </View>
              <Text style={styles.metaDivider}>•</Text>
              <View style={styles.metaItem}>
                <MapPin size={14} color={colors.dark.textSecondary} />
                <Text style={styles.metaText}>{experience.distance}</Text>
              </View>
              <Text style={styles.metaDivider}>•</Text>
              <Text style={styles.price}>
                {experience.currency}{experience.price}
                <Text style={styles.priceUnit}>/{t('feed.person')}</Text>
              </Text>
            </View>
            
            <Pressable
              style={[
                styles.bookButton,
                ['12', '19', '33', '38', '40'].includes(experience.id) && styles.interestButton
              ]}
              onPress={() => {
                if (['12', '19', '33', '38', '40'].includes(experience.id)) {
                  router.push(`/experience/interest/${experience.id}`);
                } else {
                  router.push(`/booking/${experience.id}`);
                }
              }}
            >
              <Text style={styles.bookButtonText}>
                {['12', '19', '33', '38', '40'].includes(experience.id) ? "I'M INTERESTED!" : t('feed.bookNow').toUpperCase()}
              </Text>
            </Pressable>
          </Pressable>

          <View style={styles.sideActions}>
            <Pressable style={styles.sideActionButton} onPress={onAIChatPress}>
              <Bot size={28} color={colors.dark.text} />
              <Text style={styles.sideActionLabel}>AI</Text>
            </Pressable>
            <Pressable style={styles.sideActionButton} onPress={onReviewsPress}>
              <MessageCircle size={28} color={colors.dark.text} />
              <Text style={styles.sideActionLabel}>{experience.rating}</Text>
            </Pressable>
            <Pressable style={styles.sideActionButton} onPress={handleShare}>
              <Share2 size={28} color={colors.dark.text} />
              <Text style={styles.sideActionLabel}>{t('feed.share')}</Text>
            </Pressable>
            <Pressable
              style={styles.sideActionButton}
              onPress={() => {
                onSavePress();
              }}
            >
              <Bookmark
                size={28}
                color={isSaved ? colors.dark.accent : colors.dark.text}
                fill={isSaved ? colors.dark.accent : 'transparent'}
              />
              <Text style={styles.sideActionLabel}>{isSaved ? t('feed.saved') : t('feed.save')}</Text>
            </Pressable>
          </View>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: colors.dark.text,
    fontSize: 18,
    fontFamily: typography.fonts.semibold,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 18,
    fontFamily: typography.fonts.semibold,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  errorSubtext: {
    color: colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center' as const,
  },
  emptyText: {
    color: colors.dark.text,
    fontSize: 18,
    fontFamily: typography.fonts.semibold,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  emptySubtext: {
    color: colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center' as const,
  },
  itemContainer: {
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
  },
  filtersContainer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  filterBlurContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 28,
    overflow: 'hidden',
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filterButtonDisabledContainer: {
    position: 'relative' as const,
  },
  filterButtonDisabled: {
    opacity: 0.8,
    alignItems: 'center' as const,
  },
  filterTextDisabled: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  comingSoonText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  filterText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '900' as const,
  },
  filterTextActive: {
    color: 'rgba(255, 255, 255, 1)',
  },
  card: {
    flex: 1,
    backgroundColor: colors.dark.card,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute' as const,
  },
  gradient: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  bottomContainer: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  infoSection: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingTop: 220,
    paddingHorizontal: 10,
    paddingBottom: 10,
    marginBottom: 12,
  },
  sideActions: {
    gap: 22,
    alignItems: 'center',
  },
  sideActionButton: {
    alignItems: 'center',
    gap: 4,
  },
  reviewIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.dark.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideActionLabel: {
    color: colors.dark.text,
    fontSize: 11,
    fontWeight: '900' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginTop: 8,
  },
  providerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.dark.text,
  },
  providerLogoImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.dark.text,
  },
  providerInitial: {
    color: colors.dark.background,
    fontSize: 12,
    fontWeight: '900' as const,
  },
  providerName: {
    color: colors.dark.text,
    fontSize: 13,
    fontWeight: '900' as const,
  },
  title: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: colors.dark.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'nowrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    fontFamily: typography.fonts.regular,
  },
  metaDivider: {
    color: colors.dark.textTertiary,
    fontSize: 12,
  },
  price: {
    color: colors.dark.primary,
    fontSize: 18,
    fontWeight: '900' as const,
    flexShrink: 0,
  },
  priceUnit: {
    fontSize: 12,
    color: colors.dark.primary,
    fontWeight: '700' as const,
  },
  bookButton: {
    backgroundColor: colors.dark.primary,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  interestButton: {
    backgroundColor: colors.dark.primary,
  },
  bookButtonText: {
    color: colors.dark.background,
    fontSize: 15,
    fontWeight: '900' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  noExperiences: {
    color: colors.dark.textSecondary,
    fontSize: 16,
    textAlign: 'center' as const,
    marginTop: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.dark.text,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.dark.textSecondary,
  },
  chatContainer: {
    flex: 1,
    padding: 20,
  },
  chatMessage: {
    backgroundColor: colors.dark.backgroundSecondary,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  chatMessageText: {
    color: colors.dark.text,
    fontSize: 14,
    lineHeight: 20,
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.dark.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.dark.text,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: colors.dark.background,
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
  },
  statsContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  averageRatingBox: {
    alignItems: 'center',
    gap: 8,
  },
  averageRatingNumber: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: colors.dark.text,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  totalReviewsText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyReviewsText: {
    color: colors.dark.textSecondary,
    fontSize: 16,
  },
  reviewsContainer: {
    padding: 16,
  },
  reviewCard: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
  },
  reviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    color: colors.dark.background,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  reviewAuthor: {
    flex: 1,
  },
  reviewAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewName: {
    color: colors.dark.text,
    fontSize: 15,
    fontFamily: typography.fonts.semibold,
  },
  reviewDate: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewRatingText: {
    color: '#FFB800',
    fontSize: 14,
    fontFamily: typography.fonts.semibold,
  },
  reviewText: {
    color: colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  googleBadge: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  googleBadgeText: {
    color: 'white',
    fontSize: 10,
    fontFamily: typography.fonts.semibold,
  },
  verifiedBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  verifiedText: {
    color: '#10B981',
    fontSize: 12,
    fontFamily: typography.fonts.semibold,
    lineHeight: 20,
  },
  // AI Modal Styles
  aiModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  aiModalBackdrop: {
    flex: 1,
  },
  aiModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  aiModalContent: {
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  aiModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  aiHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.dark.text,
    flex: 1,
  },
  aiCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dark.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCloseButtonText: {
    fontSize: 20,
    color: colors.dark.textSecondary,
    fontFamily: typography.fonts.semibold,
  },
  aiChatContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  aiWelcomeContainer: {
    marginBottom: 20,
  },
  aiWelcomeText: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    lineHeight: 24,
    marginBottom: 20,
  },
  aiWelcomeTextBold: {
    fontWeight: '700' as const,
    color: colors.dark.text,
  },
  quickQuestionsTitle: {
    fontSize: 14,
    fontFamily: typography.fonts.semibold,
    color: colors.dark.text,
    marginBottom: 12,
  },
  quickQuestionsContainer: {
    gap: 10,
  },
  quickQuestionButton: {
    backgroundColor: colors.dark.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  quickQuestionText: {
    fontSize: 15,
    color: colors.dark.text,
    fontFamily: typography.fonts.regular,
  },
  aiChatBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 12,
    maxWidth: '80%',
  },
  aiChatBubbleUser: {
    backgroundColor: colors.dark.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiChatBubbleAI: {
    backgroundColor: colors.dark.backgroundSecondary,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  aiChatText: {
    fontSize: 15,
    lineHeight: 20,
  },
  aiChatTextUser: {
    color: colors.dark.background,
  },
  aiChatTextAI: {
    color: colors.dark.text,
  },
  aiInputContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    backgroundColor: colors.dark.card,
  },
  aiInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    backgroundColor: colors.dark.backgroundSecondary,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  aiInput: {
    flex: 1,
    color: colors.dark.text,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
  },
  aiSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSendButtonDisabled: {
    opacity: 0.4,
  },
  aiSendButtonText: {
    color: colors.dark.background,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  noActivitiesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.dark.background, // Solid black background
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 100,
  },
  noActivitiesCard: {
    borderRadius: 24,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  noActivitiesContent: {
    padding: 32,
    alignItems: 'center',
  },
  noActivitiesEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  noActivitiesTitle: {
    fontSize: 22,
    fontFamily: typography.fonts.extrabold,
    color: colors.dark.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  noActivitiesSubtitle: {
    fontSize: 16,
    fontFamily: typography.fonts.regular,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  exploreLisbonButton: {
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
  },
  exploreLisbonButtonText: {
    color: colors.dark.background,
    fontSize: 16,
    fontFamily: typography.fonts.extrabold,
    textAlign: 'center',
  },
});

interface AIChatModalProps {
  visible: boolean;
  experience: Experience;
  onClose: () => void;
}

function AIChatModal({ visible, experience, onClose }: AIChatModalProps) {
  const { t } = useLanguage();
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);
  const insets = useSafeAreaInsets();

  // Pre-fabricated questions based on experience type
  const quickQuestions = [
    t('feed.aiQuestion1'),
    t('feed.aiQuestion2'),
    t('feed.aiQuestion3'),
    t('feed.aiQuestion4'),
  ];

  const handleQuickQuestion = (question: string) => {
    setMessages([...messages, { text: question, isUser: true }]);
    
    // Simulate AI response based on question
    setTimeout(() => {
      let response = '';
      if (question.includes('included')) {
        response = `For "${experience.title}", the price includes all materials, expert instruction, and a complimentary drink. You'll also get to take home what you create! Transportation and additional food are not included.`;
      } else if (question.includes('bring')) {
        response = `Just bring yourself and your enthusiasm! We provide everything you need for "${experience.title}". Comfortable clothing is recommended. Don't forget your camera to capture the memories!`;
      } else if (question.includes('children')) {
        response = `"${experience.title}" is suitable for children aged 8 and above with adult supervision. Kids under 12 must be accompanied by a parent or guardian. We provide special equipment sized for children.`;
      } else if (question.includes('cancel')) {
        response = `You can cancel or reschedule up to 24 hours before "${experience.title}" starts for a full refund. Cancellations within 24 hours are non-refundable, but we're flexible in case of emergencies!`;
      } else {
        response = `Thanks for asking about "${experience.title}"! This is a demo response. In the full app, AI will provide detailed answers about availability, requirements, location details, and insider tips!`;
      }
      
      setMessages((prev) => [...prev, { text: response, isUser: false }]);
    }, 1000);
  };

  const handleSend = () => {
    if (message.trim()) {
      handleQuickQuestion(message);
      setMessage('');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <KeyboardAvoidingView 
        style={styles.aiModalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Pressable style={styles.aiModalBackdrop} onPress={onClose} />
        <View style={styles.aiModalContainer}>
          <View style={styles.aiModalContent}>
            {/* Header */}
            <View style={styles.aiModalHeader}>
              <View style={styles.aiHeaderLeft}>
                <View style={styles.aiIcon}>
                  <MessageCircle size={20} color={colors.dark.background} />
                </View>
                <Text style={styles.aiModalTitle}>{t('feed.aiModalTitle')}</Text>
              </View>
              <Pressable style={styles.aiCloseButton} onPress={onClose}>
                <Text style={styles.aiCloseButtonText}>✕</Text>
              </Pressable>
            </View>

            {/* Chat Messages */}
            <ScrollView 
              style={{ flex: 1 }}
              contentContainerStyle={[styles.aiChatContainer, { paddingBottom: 20 }]} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {messages.length === 0 && (
                <View style={styles.aiWelcomeContainer}>
                  <Text style={styles.aiWelcomeText}>
                    {t('feed.aiWelcome')}{' '}
                    <Text style={styles.aiWelcomeTextBold}>"{experience.title}"</Text>
                  </Text>
                  
                  {/* Quick Questions */}
                  <Text style={styles.quickQuestionsTitle}>{t('feed.quickQuestions')}</Text>
                  <View style={styles.quickQuestionsContainer}>
                    {quickQuestions.map((question, idx) => (
                      <Pressable
                        key={idx}
                        style={styles.quickQuestionButton}
                        onPress={() => handleQuickQuestion(question)}
                      >
                        <Text style={styles.quickQuestionText}>{question}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              
              {messages.map((msg, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.aiChatBubble,
                    msg.isUser ? styles.aiChatBubbleUser : styles.aiChatBubbleAI,
                  ]}
                >
                  <Text style={[
                    styles.aiChatText,
                    msg.isUser ? styles.aiChatTextUser : styles.aiChatTextAI,
                  ]}>
                    {msg.text}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Input */}
            <View style={[styles.aiInputContainer, { paddingBottom: Math.max(insets.bottom + 8, 24) }]}>
              <View style={styles.aiInputWrapper}>
                <TextInput
                  style={styles.aiInput}
                  placeholder={t('feed.aiPlaceholder')}
                  placeholderTextColor={colors.dark.textTertiary}
                  value={message}
                  onChangeText={setMessage}
                  onSubmitEditing={handleSend}
                  multiline
                  maxLength={500}
                />
                <Pressable 
                  style={[styles.aiSendButton, !message.trim() && styles.aiSendButtonDisabled]} 
                  onPress={handleSend}
                  disabled={!message.trim()}
                >
                  <Text style={styles.aiSendButtonText}>→</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface ReviewsModalProps {
  visible: boolean;
  experience: Experience;
  onClose: () => void;
}

function ReviewsModal({ visible, experience, onClose }: ReviewsModalProps) {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (visible && experience.id) {
      fetchReviews();
    }
  }, [visible, experience.id]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const response: any = await apiService.getExperienceReviews(experience.id);
      if (response.success) {
        setReviews(Array.isArray(response.data) ? response.data : []);
        setStats(response.stats || null);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t('feed.reviews')} ({stats?.total_reviews || experience.reviewCount || 0})
            </Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          {stats && (
            <View style={styles.statsContainer}>
              <View style={styles.averageRatingBox}>
                <Text style={styles.averageRatingNumber}>{stats.average_rating}</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      size={16} 
                      color="#FFB800" 
                      fill={star <= Math.round(stats.average_rating) ? "#FFB800" : "transparent"} 
                    />
                  ))}
                </View>
                <Text style={styles.totalReviewsText}>
                  {stats.total_reviews} {stats.total_reviews !== 1 ? t('feed.reviewsPlural') : t('feed.reviewSingular')}
                </Text>
              </View>
            </View>
          )}

          <ScrollView style={styles.reviewsContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>{t('feed.loadingReviews')}</Text>
              </View>
            ) : reviews.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyReviewsText}>{t('feed.noReviews')}</Text>
              </View>
            ) : (
              reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewAvatarText}>
                        {review.author.name[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.reviewAuthor}>
                      <View style={styles.reviewAuthorRow}>
                        <Text style={styles.reviewName}>{review.author.name}</Text>
                        {review.source === 'google' && (
                          <View style={styles.googleBadge}>
                            <Text style={styles.googleBadgeText}>Google</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                    </View>
                    <View style={styles.reviewRating}>
                      <Star size={16} color="#FFB800" fill="#FFB800" />
                      <Text style={styles.reviewRatingText}>{review.rating}</Text>
                    </View>
                  </View>
                  <Text style={styles.reviewText}>{review.comment}</Text>
                  {review.verified_purchase && (
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedText}>✓ {t('feed.verifiedPurchase')}</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
