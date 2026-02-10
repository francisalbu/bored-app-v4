import { Video, ResizeMode } from 'expo-av';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Heart, MessageCircle, Share2, Bookmark, MoreVertical } from 'lucide-react-native';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Dimensions,
  FlatList,
  ViewToken,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import colors from '@/constants/colors';
import { EXPERIENCES } from '@/constants/experiences';
import apiService from '@/services/api';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface Review {
  id: string;
  type: 'video' | 'photo';
  video?: any;
  photos?: any[];
  user: {
    name: string;
    username: string;
    avatar?: string;
  };
  rating: number;
  caption: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  isBookmarked: boolean;
}

// Transform API review to app Review format
const transformApiReview = (apiReview: any): Review => {
  return {
    id: apiReview.id.toString(),
    type: 'photo', // For now, all reviews are photos
    photos: [], // No photos from API yet
    user: {
      name: apiReview.author?.name || 'Anonymous',
      username: `@${apiReview.author?.name?.toLowerCase().replace(/\s+/g, '')}` || '@user',
    },
    rating: apiReview.rating || 5,
    caption: apiReview.comment || '',
    likes: 0, // Not available from API
    comments: 0, // Not available from API
    isLiked: false,
    isBookmarked: false,
  };
};

export default function VideoReviewsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<{ [key: string]: number }>({});
  const [expandedCaptions, setExpandedCaptions] = useState<{ [key: string]: boolean }>({});
  const videoRefs = useRef<{ [key: string]: Video | null }>({});

  const experience = EXPERIENCES.find((exp) => exp.id === id);

  // Fetch reviews from API
  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        console.log('📦 Fetching reviews for experience:', id);
        const response: any = await apiService.getExperienceReviews(id);
        
        if (response.success && Array.isArray(response.data)) {
          console.log('✅ Reviews loaded:', response.data.length);
          const transformedReviews = response.data.map(transformApiReview);
          setReviews(transformedReviews);
        } else {
          console.log('⚠️ No reviews found');
          setReviews([]);
        }
      } catch (error) {
        console.error('❌ Error fetching reviews:', error);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [id]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index ?? 0;
      setActiveIndex(newIndex);
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 80,
  };

  const handleLike = (reviewId: string) => {
    setReviews(prev =>
      prev.map(review =>
        review.id === reviewId
          ? {
              ...review,
              isLiked: !review.isLiked,
              likes: review.isLiked ? review.likes - 1 : review.likes + 1,
            }
          : review
      )
    );
  };

  const handleBookmark = (reviewId: string) => {
    setReviews(prev =>
      prev.map(review =>
        review.id === reviewId
          ? { ...review, isBookmarked: !review.isBookmarked }
          : review
      )
    );
  };

  const handleNextPhoto = (reviewId: string, totalPhotos: number) => {
    setCurrentPhotoIndex(prev => ({
      ...prev,
      [reviewId]: ((prev[reviewId] || 0) + 1) % totalPhotos,
    }));
  };

  const handlePrevPhoto = (reviewId: string, totalPhotos: number) => {
    setCurrentPhotoIndex(prev => ({
      ...prev,
      [reviewId]: ((prev[reviewId] || 0) - 1 + totalPhotos) % totalPhotos,
    }));
  };

  const toggleCaption = (reviewId: string) => {
    setExpandedCaptions(prev => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  const truncateText = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const renderReview = ({ item, index }: { item: Review; index: number }) => {
    const isActive = index === activeIndex;
    const photoIndex = currentPhotoIndex[item.id] || 0;
    const isExpanded = expandedCaptions[item.id] || false;
    const shouldShowReadMore = item.caption.length > 120;

    return (
      <View style={styles.videoContainer}>
        {item.type === 'video' && item.video ? (
          <Video
            ref={(ref) => {
              videoRefs.current[item.id] = ref;
            }}
            source={item.video}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            isLooping
            shouldPlay={isActive}
            isMuted={false}
            volume={1.0}
          />
        ) : item.type === 'photo' && item.photos ? (
          <>
            <Image
              source={item.photos[photoIndex]}
              style={styles.video}
              contentFit="cover"
            />
            {item.photos.length > 1 && (
              <>
                <Pressable
                  style={styles.photoNavLeft}
                  onPress={() => handlePrevPhoto(item.id, item.photos!.length)}
                >
                  <View style={styles.photoNavButton} />
                </Pressable>
                <Pressable
                  style={styles.photoNavRight}
                  onPress={() => handleNextPhoto(item.id, item.photos!.length)}
                >
                  <View style={styles.photoNavButton} />
                </Pressable>
                <View style={styles.photoIndicators}>
                  {item.photos.map((_, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.photoIndicator,
                        idx === photoIndex && styles.photoIndicatorActive,
                      ]}
                    />
                  ))}
                </View>
              </>
            )}
          </>
        ) : null}

        {/* Top Overlay */}
        <View style={[styles.topOverlay, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="white" />
          </Pressable>
          <Text style={styles.headerTitle}>Reviews</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Bottom Overlay with User Info and Actions */}
        <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + 20 }]}>
          {/* Left Side - User Info */}
          <View style={styles.userInfo}>
            <Pressable 
              style={styles.userHeader}
              onPress={() => {
                // Navigate to user profile - you can implement this route
                console.log('Navigate to user profile:', item.user.username);
                // router.push(`/profile/${item.user.username}`);
              }}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.user.name[0]}</Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{item.user.name}</Text>
                <Text style={styles.username}>{item.user.username}</Text>
              </View>
              <Pressable 
                style={styles.followButton}
                onPress={(e) => {
                  e.stopPropagation();
                  console.log('Follow/Unfollow:', item.user.username);
                }}
              >
                <Text style={styles.followButtonText}>Follow</Text>
              </Pressable>
            </Pressable>
            
            <View style={styles.captionContainer}>
              <View>
                <Text style={styles.caption}>
                  {isExpanded ? item.caption : truncateText(item.caption)}
                </Text>
                {shouldShowReadMore && (
                  <Pressable onPress={() => toggleCaption(item.id)}>
                    <Text style={styles.readMoreText}>
                      {isExpanded ? 'Show Less' : 'Read More'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
            
            {experience && (
              <View style={styles.experienceTag}>
                <Text style={styles.experienceTagText}>
                  📍 {experience.title}
                </Text>
              </View>
            )}
          </View>

          {/* Right Side Actions */}
          <View style={styles.rightActions}>
            <Pressable
              style={styles.actionButton}
              onPress={() => handleLike(item.id)}
            >
              <Heart
                size={32}
                color="white"
                fill={item.isLiked ? 'white' : 'transparent'}
                strokeWidth={item.isLiked ? 0 : 2}
              />
              <Text style={styles.actionText}>{item.likes}</Text>
            </Pressable>

            <Pressable style={styles.actionButton}>
              <MessageCircle size={32} color="white" strokeWidth={2} />
              <Text style={styles.actionText}>{item.comments}</Text>
            </Pressable>

            <Pressable
              style={styles.actionButton}
              onPress={() => handleBookmark(item.id)}
            >
              <Bookmark
                size={32}
                color="white"
                fill={item.isBookmarked ? 'white' : 'transparent'}
                strokeWidth={item.isBookmarked ? 0 : 2}
              />
            </Pressable>

            <Pressable style={styles.actionButton}>
              <Share2 size={32} color="white" strokeWidth={2} />
            </Pressable>

            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>⭐ {item.rating}.0</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.dark.primary} />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  if (!experience) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Experience not found</Text>
      </View>
    );
  }

  if (reviews.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.topOverlay, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="white" />
          </Pressable>
          <Text style={styles.headerTitle}>Reviews</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.noReviewsText}>No reviews yet for this experience</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={reviews}
        renderItem={renderReview}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        removeClippedSubviews
        maxToRenderPerBatch={2}
        windowSize={3}
      />
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
    fontSize: 16,
    marginTop: 16,
  },
  noReviewsText: {
    color: colors.dark.textSecondary,
    fontSize: 16,
    textAlign: 'center' as const,
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'relative' as const,
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  topOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: 'white',
  },
  bottomOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.dark.background,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  userDetails: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 2,
  },
  username: {
    color: 'white',
    fontSize: 13,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  followButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 6,
  },
  followButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  captionContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  caption: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  readMoreText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 4,
    opacity: 0.9,
  },
  experienceTag: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start' as const,
    marginBottom: 4,
  },
  experienceTagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  rightActions: {
    alignItems: 'center',
    gap: 20,
    marginBottom: 8,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  ratingBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  ratingText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  photoNavLeft: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: '40%',
    justifyContent: 'center',
    paddingLeft: 20,
  },
  photoNavRight: {
    position: 'absolute' as const,
    right: 0,
    top: 0,
    bottom: 0,
    width: '40%',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  photoNavButton: {
    width: 40,
    height: 40,
    opacity: 0,
  },
  photoIndicators: {
    position: 'absolute' as const,
    top: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  photoIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  photoIndicatorActive: {
    backgroundColor: 'white',
    width: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    textAlign: 'center' as const,
    marginTop: 32,
  },
});
