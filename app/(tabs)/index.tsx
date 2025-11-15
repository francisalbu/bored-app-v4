import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Video, ResizeMode } from 'expo-av';
import { Star, MapPin, Clock, Bookmark, Share2, MessageCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { type Experience } from '@/constants/experiences';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useExperiences } from '@/hooks/useExperiences';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showAIChat, setShowAIChat] = useState<boolean>(false);
  const [showReviews, setShowReviews] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<'nearMe' | 'availableToday'>('nearMe');
  const flatListRef = useRef<FlatList>(null);

  // Fetch experiences from API
  const { experiences: EXPERIENCES, loading: loadingExperiences, error: experiencesError } = useExperiences();

  // Filter experiences based on selected filter
  const filteredExperiences = React.useMemo(() => {
    if (selectedFilter === 'nearMe') {
      // Sort by distance (closest first) - using distance string parsing
      return [...EXPERIENCES].sort((a, b) => {
        const distA = parseInt(a.distance.replace(/[^\d]/g, '')) || 999;
        const distB = parseInt(b.distance.replace(/[^\d]/g, '')) || 999;
        return distA - distB;
      });
    } else {
      // Filter only experiences available today
      return EXPERIENCES.filter(exp => exp.availableToday);
    }
  }, [selectedFilter, EXPERIENCES]);

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
          onAIChatPress={() => setShowAIChat(true)}
          onReviewsPress={() => router.push(`/reviews/${item.id}`)}
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
        <Text style={styles.loadingText}>Loading experiences...</Text>
      </View>
    );
  }

  // Show error state
  if (experiencesError) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Error: {experiencesError}</Text>
        <Text style={styles.errorSubtext}>Please check your connection and try again</Text>
      </View>
    );
  }

  // Show empty state
  if (filteredExperiences.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.emptyText}>No experiences found</Text>
        <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
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
              Near Me
            </Text>
          </Pressable>
          
          <Pressable 
            style={[
              styles.filterButton,
              selectedFilter === 'availableToday' && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter('availableToday')}
          >
            <Text style={[
              styles.filterText,
              selectedFilter === 'availableToday' && styles.filterTextActive
            ]}>
              Available Today
            </Text>
          </Pressable>
        </BlurView>
      </View>

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

      <AuthModal
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
  onAIChatPress: () => void;
  onReviewsPress: () => void;
  onSavePress: () => void;
}

function ExperienceCard({ experience, isActive, isSaved, onAIChatPress, onReviewsPress, onSavePress }: ExperienceCardProps) {
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
            <Image
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
            shouldPlay={isActive && videoReady}
            isLooping
            isMuted={true}
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
        <Image
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
                  source={experience.providerLogo}
                  style={styles.providerLogoImage}
                  contentFit="cover"
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
                <Text style={styles.priceUnit}>/person</Text>
              </Text>
            </View>
            
            <Pressable 
              style={styles.bookButton}
              onPress={() => router.push(`/booking/${experience.id}`)}
            >
              <Text style={styles.bookButtonText}>Book Now</Text>
            </Pressable>
          </Pressable>

          <View style={styles.sideActions}>
            <Pressable style={styles.sideActionButton} onPress={onAIChatPress}>
              <MessageCircle size={28} color={colors.dark.text} />
              <Text style={styles.sideActionLabel}>AI</Text>
            </Pressable>
            <Pressable style={styles.sideActionButton} onPress={onReviewsPress}>
              <Star size={28} color={colors.dark.text} />
              <Text style={styles.sideActionLabel}>{experience.rating}</Text>
            </Pressable>
            <Pressable style={styles.sideActionButton} onPress={handleShare}>
              <Share2 size={28} color={colors.dark.text} />
              <Text style={styles.sideActionLabel}>Share</Text>
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
              <Text style={styles.sideActionLabel}>{isSaved ? 'Saved' : 'Save'}</Text>
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
    fontWeight: '600' as const,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 18,
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
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
  filterText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600' as const,
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
    padding: 10,
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
  sideActionLabel: {
    color: colors.dark.text,
    fontSize: 10,
    fontWeight: '600' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  providerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.dark.text,
  },
  providerLogoImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.text,
  },
  providerInitial: {
    color: colors.dark.background,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  providerName: {
    color: colors.dark.text,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  title: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.dark.text,
    marginBottom: 6,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  metaDivider: {
    color: colors.dark.textTertiary,
    fontSize: 12,
  },
  price: {
    color: '#00FF8C',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  priceUnit: {
    fontSize: 11,
    color: '#00FF8C',
    fontWeight: '600' as const,
  },
  bookButton: {
    backgroundColor: colors.dark.primary,
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: 'center',
  },
  bookButtonText: {
    color: colors.dark.background,
    fontSize: 14,
    fontWeight: '700' as const,
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
    fontWeight: '600' as const,
    fontSize: 14,
  },
  reviewsContainer: {
    padding: 16,
  },
  reviewCard: {
    marginBottom: 20,
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
    marginBottom: 8,
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
  reviewName: {
    color: colors.dark.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  reviewDate: {
    color: colors.dark.textSecondary,
    fontSize: 12,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewRatingText: {
    color: '#FFB800',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  reviewText: {
    color: colors.dark.textSecondary,
    fontSize: 14,
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
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
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
    fontWeight: '500' as const,
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
  // Auth Modal Styles
  authModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  authModalBackdrop: {
    flex: 1,
  },
  authModalContent: {
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  authModalHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    position: 'relative' as const,
  },
  authCloseButton: {
    position: 'absolute' as const,
    left: 20,
    top: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authCloseButtonText: {
    fontSize: 24,
    color: colors.dark.textSecondary,
    fontWeight: '400' as const,
  },
  authModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.dark.text,
  },
  authDescription: {
    fontSize: 15,
    color: colors.dark.textSecondary,
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 24,
    textAlign: 'center' as const,
  },
  authButtonsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  authButtonApple: {
    backgroundColor: colors.dark.text,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  authAppleIcon: {
    fontSize: 20,
  },
  authButtonAppleText: {
    color: colors.dark.background,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  authButtonSocial: {
    backgroundColor: colors.dark.backgroundSecondary,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  authSocialIcon: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.dark.text,
  },
  authFacebookIcon: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1877F2',
  },
  authButtonSocialText: {
    color: colors.dark.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  authDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  authDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.dark.border,
  },
  authDividerText: {
    color: colors.dark.textSecondary,
    fontSize: 14,
    paddingHorizontal: 12,
    fontWeight: '500' as const,
  },
  authEmailInput: {
    backgroundColor: colors.dark.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.dark.text,
  },
  authButtonEmail: {
    backgroundColor: colors.dark.backgroundSecondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  authButtonEmailDisabled: {
    opacity: 0.5,
  },
  authButtonEmailText: {
    color: colors.dark.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

interface AIChatModalProps {
  visible: boolean;
  experience: Experience;
  onClose: () => void;
}

function AIChatModal({ visible, experience, onClose }: AIChatModalProps) {
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);
  const insets = useSafeAreaInsets();

  // Pre-fabricated questions based on experience type
  const quickQuestions = [
    "What's included in the price?",
    "What should I bring?",
    "Is this suitable for children?",
    "Can I cancel or reschedule?",
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
      <View style={styles.aiModalOverlay}>
        <Pressable style={styles.aiModalBackdrop} onPress={onClose} />
        <KeyboardAvoidingView
          style={styles.aiModalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.aiModalContent}>
            {/* Header */}
            <View style={styles.aiModalHeader}>
              <View style={styles.aiHeaderLeft}>
                <View style={styles.aiIcon}>
                  <MessageCircle size={20} color={colors.dark.background} />
                </View>
                <Text style={styles.aiModalTitle}>Ask about this experience</Text>
              </View>
              <Pressable style={styles.aiCloseButton} onPress={onClose}>
                <Text style={styles.aiCloseButtonText}>✕</Text>
              </Pressable>
            </View>

            {/* Chat Messages */}
            <ScrollView 
              style={{ flex: 1 }}
              contentContainerStyle={styles.aiChatContainer} 
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 && (
                <View style={styles.aiWelcomeContainer}>
                  <Text style={styles.aiWelcomeText}>
                    Hi! 👋 I'm your AI assistant. Ask me anything about{' '}
                    <Text style={styles.aiWelcomeTextBold}>"{experience.title}"</Text>
                  </Text>
                  
                  {/* Quick Questions */}
                  <Text style={styles.quickQuestionsTitle}>Quick Questions:</Text>
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
            <View style={[styles.aiInputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.aiInputWrapper}>
                <TextInput
                  style={styles.aiInput}
                  placeholder="Type your question..."
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
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

function AuthModal({ visible, onClose }: AuthModalProps) {
  const [email, setEmail] = useState<string>('');

  const handleAppleSignIn = () => {
    console.log('Sign in with Apple');
    // TODO: Implement Apple Sign In
    onClose();
  };

  const handleGoogleSignIn = () => {
    console.log('Sign in with Google');
    // TODO: Implement Google Sign In
    onClose();
  };

  const handleFacebookSignIn = () => {
    console.log('Sign in with Facebook');
    // TODO: Implement Facebook Sign In
    onClose();
  };

  const handleEmailSignIn = () => {
    console.log('Sign in with email:', email);
    // TODO: Implement Email Sign In
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <View style={styles.authModalOverlay}>
        <Pressable style={styles.authModalBackdrop} onPress={onClose} />
        <View style={styles.authModalContent}>
          {/* Header */}
          <View style={styles.authModalHeader}>
            <Pressable style={styles.authCloseButton} onPress={onClose}>
              <Text style={styles.authCloseButtonText}>✕</Text>
            </Pressable>
            <Text style={styles.authModalTitle}>Entrar ou cadastrar-se</Text>
          </View>

          {/* Description */}
          <Text style={styles.authDescription}>
            Confira ou acesse seus ingressos com mais facilidade de qualquer dispositivo com sua conta BoredTourist.
          </Text>

          {/* Social Login Buttons */}
          <View style={styles.authButtonsContainer}>
            <Pressable style={styles.authButtonApple} onPress={handleAppleSignIn}>
              <Text style={styles.authAppleIcon}>🍎</Text>
              <Text style={styles.authButtonAppleText}>Continuar com a Apple</Text>
            </Pressable>

            <Pressable style={styles.authButtonSocial} onPress={handleGoogleSignIn}>
              <Text style={styles.authSocialIcon}>G</Text>
              <Text style={styles.authButtonSocialText}>Continuar com o Google</Text>
            </Pressable>

            <Pressable style={styles.authButtonSocial} onPress={handleFacebookSignIn}>
              <Text style={styles.authFacebookIcon}>f</Text>
              <Text style={styles.authButtonSocialText}>Continuar com o Facebook</Text>
            </Pressable>

            {/* Divider */}
            <View style={styles.authDividerContainer}>
              <View style={styles.authDividerLine} />
              <Text style={styles.authDividerText}>ou</Text>
              <View style={styles.authDividerLine} />
            </View>

            {/* Email Input */}
            <TextInput
              style={styles.authEmailInput}
              placeholder="Endereço de e-mail"
              placeholderTextColor={colors.dark.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            {/* Email Continue Button */}
            <Pressable 
              style={[styles.authButtonEmail, !email.trim() && styles.authButtonEmailDisabled]} 
              onPress={handleEmailSignIn}
              disabled={!email.trim()}
            >
              <Text style={styles.authButtonEmailText}>Continuar com e-mail</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface ReviewsModalProps {
  visible: boolean;
  experience: Experience;
  onClose: () => void;
}

function ReviewsModal({ visible, experience, onClose }: ReviewsModalProps) {
  const reviews = [
    {
      id: '1',
      author: 'Sarah M.',
      rating: 5,
      date: '2 days ago',
      text: 'Absolutely loved this experience! The instructor was so knowledgeable and patient. I created something I am really proud of.',
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80',
    },
    {
      id: '2',
      author: 'John D.',
      rating: 5,
      date: '1 week ago',
      text: 'One of the best activities I have done in Lisbon. Highly recommend to anyone visiting!',
      image: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=400&q=80',
    },
    {
      id: '3',
      author: 'Emma K.',
      rating: 4,
      date: '2 weeks ago',
      text: 'Great experience overall. The location was easy to find and the whole process was smooth.',
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80',
    },
  ];

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
              Reviews ({experience.reviewCount})
            </Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.reviewsContainer}>
            {reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <Image
                  source={{ uri: review.image }}
                  style={styles.reviewImage}
                  contentFit="cover"
                />
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>{review.author[0]}</Text>
                  </View>
                  <View style={styles.reviewAuthor}>
                    <Text style={styles.reviewName}>{review.author}</Text>
                    <Text style={styles.reviewDate}>{review.date}</Text>
                  </View>
                  <View style={styles.reviewRating}>
                    <Star size={16} color="#FFB800" fill="#FFB800" />
                    <Text style={styles.reviewRatingText}>{review.rating}</Text>
                  </View>
                </View>
                <Text style={styles.reviewText}>{review.text}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
