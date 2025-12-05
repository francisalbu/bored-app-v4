import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Video, ResizeMode } from 'expo-av';
import { Star, MapPin, Clock, Bookmark, Share2, MessageCircle, MessageSquare, Search, SlidersHorizontal, Sparkles } from 'lucide-react-native';
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
  TouchableOpacity,
  Alert,
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
import { BoredAIModal } from '@/components/BoredAIModal';
import { FiltersModal, FilterOptions, PRICE_RANGES } from '@/components/FiltersModal';
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
  const [showReviews, setShowReviews] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showBoredAI, setShowBoredAI] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFiltersState] = useState<FilterOptions>({ categories: [], priceRange: null });
  const [selectedFilter, setSelectedFilter] = useState<'nearMe' | 'availableToday'>('nearMe');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [showNoActivitiesMessage, setShowNoActivitiesMessage] = useState<boolean>(false);
  const flatListRef = useRef<FlatList>(null);

  // Wrapper for setFilters with logging
  const setFilters = React.useCallback((newFilters: FilterOptions) => {
    console.log('🎯 setFilters called with:', JSON.stringify(newFilters));
    setFiltersState(newFilters);
  }, []);
  
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

  // Filter experiences based on selected filter AND user filters
  // Using the same logic as explore.tsx for category matching
  const filteredExperiences = React.useMemo(() => {
    let result = [...EXPERIENCES];

    // Apply category filters (same logic as explore.tsx)
    if (filters.categories.length > 0) {
      result = result.filter(exp => {
        return filters.categories.some(selectedCategoryId => {
          // Normalize category strings for comparison (e.g., "Mind & Body" -> "mind-body")
          const expCategory = (exp.category || '').toLowerCase().replace(/\s+&?\s+/g, '-').replace(/\s+/g, '-');
          const selectedCat = selectedCategoryId.toLowerCase();
          
          // Check if experience category matches
          const matchesCategory = expCategory === selectedCat || 
                                 expCategory.includes(selectedCat) ||
                                 (exp.category || '').toLowerCase().includes(selectedCategoryId.replace(/-/g, ' '));
          
          // Also check if any tag matches
          const matchesTag = (exp.tags || []).some(tag => {
            const normalizedTag = tag.toLowerCase().replace(/\s+&?\s+/g, '-').replace(/\s+/g, '-');
            return normalizedTag === selectedCat || 
                   normalizedTag.includes(selectedCat) ||
                   tag.toLowerCase().includes(selectedCategoryId.replace(/-/g, ' '));
          });
          
          return matchesCategory || matchesTag;
        });
      });
    }

    // Apply price range filter
    if (filters.priceRange) {
      const selectedRange = PRICE_RANGES.find(r => r.id === filters.priceRange);
      if (selectedRange) {
        result = result.filter(exp => {
          const price = exp.price || 0;
          if (selectedRange.id === 'free') {
            return price === 0;
          }
          return price >= selectedRange.min && price <= selectedRange.max;
        });
      }
    }

    // Now apply location/availability filter
    if (selectedFilter === 'nearMe' && userLocation) {
      // Calculate real distances from user location
      const experiencesWithDistance = result.map(exp => {
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
      return experiencesWithDistance.sort((a, b) => a.calculatedDistance - b.calculatedDistance);
    } else {
      // Filter only experiences available today
      return result.filter(exp => exp.availableToday);
    }
  }, [selectedFilter, EXPERIENCES, userLocation, filters]);

  // Update no activities message based on filtered results
  React.useEffect(() => {
    if (selectedFilter === 'nearMe' && filteredExperiences.length > 0) {
      const firstExp = filteredExperiences[0] as any;
      const hasNearby = firstExp.calculatedDistance ? firstExp.calculatedDistance <= MAX_DISTANCE_KM : true;
      setShowNoActivitiesMessage(!hasNearby);
    } else {
      setShowNoActivitiesMessage(false);
    }
  }, [filteredExperiences, selectedFilter]);

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
    console.log('🔄 Filters changed, resetting to first item');
    setCurrentIndex(0);
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: false });
    }
  }, [selectedFilter, filters]);

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

  // Show empty state (only if no experiences at all, not due to filters)
  if (filteredExperiences.length === 0 && filters.categories.length === 0 && !filters.priceRange) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.emptyText}>{t('feed.emptyText')}</Text>
        <Text style={styles.emptySubtext}>{t('feed.emptySubtext')}</Text>
      </View>
    );
  }

  // If filters result in no experiences, just show first experience anyway
  const displayExperiences = filteredExperiences.length > 0 ? filteredExperiences : EXPERIENCES;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={displayExperiences}
        extraData={filters}
        renderItem={renderItem}
        keyExtractor={(item) => `${selectedFilter}-${filters.categories.join('-')}-${filters.priceRange || 'all'}-${item.id}`}
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

      {/* New Clyx-style Header */}
      <View 
        style={[styles.headerContainer, { paddingTop: insets.top + 8 }]} 
        pointerEvents="box-none"
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>NEAR ME</Text>
          
          <View style={styles.headerRight}>
            <Pressable style={styles.aiButton} onPress={() => setShowBoredAI(true)}>
              <Sparkles size={20} color={colors.dark.primary} />
            </Pressable>
            <Pressable style={styles.filterIconButton} onPress={() => setShowFilters(true)}>
              <SlidersHorizontal size={20} color={colors.dark.text} />
              {(filters.categories.length > 0 || filters.priceRange) && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>
                    {filters.categories.length + (filters.priceRange ? 1 : 0)}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* No Activities Nearby Message - Fullscreen Lisbon Style */}
      {showNoActivitiesMessage && selectedFilter === 'nearMe' && (
        <View style={styles.noActivitiesOverlay}>
          <ExpoImage
            source={{ uri: 'https://storage.googleapis.com/bored_tourist_media/images/25abril.jpg' }}
            style={[styles.noActivitiesBackgroundImage, { opacity: 0.5 }]}
            contentFit="cover"
          />
          <View style={styles.noActivitiesContent}>
            <Text style={styles.noActivitiesTitle}>LISBON</Text>
            <Text style={styles.noActivitiesTitleLine2}>EXCLUSIVE</Text>
            <Text style={styles.noActivitiesSubtitle}>
              We are currently curating experiences exclusively in Lisbon. Discover what's happening in the capital.
            </Text>
            <Pressable 
              style={styles.exploreLisbonButton}
              onPress={() => setShowNoActivitiesMessage(false)}
            >
              <Text style={styles.exploreLisbonButtonText}>EXPLORE LISBON</Text>
            </Pressable>
          </View>
        </View>
      )}

      {experience && (
        <ReviewsModal
          visible={showReviews}
          experience={experience}
          onClose={() => setShowReviews(false)}
        />
      )}

      <BoredAIModal
        visible={showBoredAI}
        onClose={() => setShowBoredAI(false)}
      />

      <FiltersModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={setFilters}
        currentFilters={filters}
        experiences={EXPERIENCES}
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
  onReviewsPress: () => void;
  onSavePress: () => void;
}

function ExperienceCard({ experience, isActive, isSaved, isTabFocused, onReviewsPress, onSavePress }: ExperienceCardProps) {
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
      {/* Blurred background - frame from video/image */}
      <ExpoImage
        source={{ uri: experience.image }}
        style={styles.blurredBackground}
        contentFit="cover"
        blurRadius={50}
      />
      
      {/* Color overlay for the blurred background */}
      <View style={styles.colorOverlay} />
      
      {/* Main card container with video */}
      <Pressable 
        style={[styles.mainCard, { marginTop: 0, marginBottom: 0 }]}
        onPress={() => router.push(`/experience/${experience.id}`)}
      >
        {/* Video/Image content */}
        <View style={styles.videoWrapper}>
          {experience.video ? (
            <>
              {!videoReady && (
                <ExpoImage
                  source={{ uri: experience.image }}
                  style={styles.videoContent}
                  contentFit="cover"
                />
              )}
              <Video
                ref={videoRef}
                source={typeof experience.video === 'string' ? { uri: experience.video } : experience.video}
                style={[styles.videoContent, !videoReady && { opacity: 0 }]}
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
              style={styles.videoContent}
              contentFit="cover"
            />
          )}

          {/* Gradient overlay on video - stronger vignette at bottom */}
          <LinearGradient
            colors={['transparent', 'transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
            locations={[0, 0.35, 0.65, 1]}
            style={styles.videoGradient}
          />

          {/* Top vignette gradient */}
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.4)', 'transparent']}
            locations={[0, 0.35, 0.7]}
            style={styles.topVignette}
          />

          {/* Content overlay on video */}
          <View style={styles.cardContentOverlay}>
            <View style={styles.cardContentRow}>
              {/* Left side - Info */}
              <View style={styles.cardInfoSection}>
                {/* Title with price */}
                <Text style={styles.clyxTitle}>
                  {experience.title.toUpperCase()}{' '}
                  <Text style={styles.priceInline}>{experience.price}€/person</Text>
                </Text>
              </View>

              {/* Right side - Actions */}
              <View style={styles.clyxSideActions}>
                <Pressable style={styles.clyxSideActionButton} onPress={onReviewsPress}>
                  <MessageCircle size={24} color={colors.dark.text} />
                  <Text style={styles.clyxSideActionLabel}>{experience.rating}</Text>
                </Pressable>
                <Pressable style={styles.clyxSideActionButton} onPress={handleShare}>
                  <Share2 size={24} color={colors.dark.text} />
                  <Text style={styles.clyxSideActionLabel}>{t('feed.share')}</Text>
                </Pressable>
                <Pressable
                  style={styles.clyxSideActionButton}
                  onPress={() => onSavePress()}
                >
                  <Bookmark
                    size={24}
                    color={isSaved ? colors.dark.primary : colors.dark.text}
                    fill={isSaved ? colors.dark.primary : 'transparent'}
                  />
                  <Text style={styles.clyxSideActionLabel}>{isSaved ? t('feed.saved') : t('feed.save')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
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
  emptyStateContainer: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  emptyStateContent: {
    flex: 1,
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
  resetFiltersButton: {
    marginTop: 24,
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 180,
    alignItems: 'center' as const,
    zIndex: 100,
  },
  resetFiltersButtonText: {
    color: colors.dark.background,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  itemContainer: {
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
  },
  // New Clyx-style header
  headerContainer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    color: colors.dark.text,
    fontSize: 20,
    fontWeight: '900' as const,
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  aiButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  filterIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  filterBadge: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.dark.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.dark.background,
  },
  // Old filter styles (keeping for compatibility)
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
    color: '#FF8C00',
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
    backgroundColor: colors.dark.background,
  },
  // Blurred background that fills the whole screen
  blurredBackground: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  // Color overlay to soften the blurred background
  colorOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  // Main card in the center - FULL SCREEN
  mainCard: {
    flex: 1,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  // Wrapper for the video inside the card
  videoWrapper: {
    flex: 1,
    position: 'relative' as const,
  },
  videoContent: {
    width: '100%',
    height: '100%',
    position: 'absolute' as const,
  },
  videoGradient: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  topVignette: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: 0,
    height: '35%',
  },
  // Content overlay on top of video (provider, title, price, button, actions)
  cardContentOverlay: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  cardContentRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    gap: 16,
  },
  cardInfoSection: {
    flex: 1,
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
    height: '40%',
  },
  bottomContainer: {
    position: 'absolute' as const,
    bottom: 0,
    left: 12,
    right: 12,
    paddingHorizontal: 16,
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
  },
  infoSection: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingTop: 0,
    paddingHorizontal: 0,
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
    backgroundColor: colors.dark.background,
    zIndex: 100,
  },
  noActivitiesBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  noActivitiesGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  noActivitiesContent: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 140,
  },
  noActivitiesTitle: {
    fontSize: 52,
    fontWeight: '900' as const,
    color: colors.dark.text,
    textAlign: 'center',
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  noActivitiesTitleLine2: {
    fontSize: 52,
    fontWeight: '900' as const,
    color: colors.dark.text,
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  noActivitiesSubtitle: {
    fontSize: 16,
    fontFamily: typography.fonts.regular,
    color: colors.dark.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    maxWidth: 320,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  exploreLisbonButton: {
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
  },
  exploreLisbonButtonText: {
    color: colors.dark.background,
    fontSize: 14,
    fontWeight: '700' as const,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  // ============================================
  // CLYX-STYLE EXPERIMENTAL DESIGN
  // ============================================
  clyxTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 0,
    lineHeight: 20,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  priceInline: {
    color: '#BFFF00',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  priceTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start' as const,
    marginBottom: 8,
  },
  priceTagText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  priceTagUnit: {
    color: '#666',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  clyxBookButton: {
    backgroundColor: colors.dark.text,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  clyxBookButtonText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  clyxSideActions: {
    gap: 20,
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  clyxSideActionButton: {
    alignItems: 'center' as const,
    gap: 4,
  },
  clyxSideActionLabel: {
    color: colors.dark.text,
    fontSize: 10,
    fontWeight: '700' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

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
