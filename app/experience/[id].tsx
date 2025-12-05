import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  MessageCircle,
  Share2,
  Bookmark,
  Clock,
  Users,
  MapPin,
  Star,
  Globe,
  Footprints,
} from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Dimensions, FlatList, Linking, Alert, Share, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

import colors from '@/constants/colors';
import typography from '@/constants/typography';
import { type Experience } from '@/constants/experiences';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useAuth } from '@/contexts/AuthContext';
import apiService from '@/services/api';
import AuthBottomSheet from '@/components/AuthBottomSheet';

export default function ExperienceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAIChat, setShowAIChat] = useState(false);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const { toggleSave, isSaved } = useFavorites();
  const { isAuthenticated } = useAuth();

  // Fetch experience from API
  React.useEffect(() => {
    const fetchExperience = async () => {
      try {
        setLoading(true);
        console.log('🔄 Fetching experience:', id);
        const response = await apiService.getExperience(id);
        
        if (response.success && response.data) {
          const exp = response.data as any;
          
          console.log('📦 Raw experience data:', exp);
          console.log('📦 Images field:', exp.images);
          console.log('📦 Images type:', typeof exp.images);
          console.log('📦 Provider logo field:', exp.provider_logo);
          console.log('📦 Operator logo field:', exp.operator_logo);
          
          // Transform API data to match frontend Experience type
          const transformedExperience: Experience = {
            id: exp.id.toString(),
            title: exp.title,
            provider: exp.operator_name || 'Local Provider',
            providerLogo: exp.provider_logo || exp.operator_logo,
            rating: exp.rating || 0,
            reviewCount: exp.review_count || 0,
            location: exp.location,
            distance: exp.distance || '0km away',
            price: exp.price,
            currency: exp.currency || 'EUR',
            duration: exp.duration,
            category: exp.category || 'Experience',
            verified: exp.verified === 1 || exp.verified === true,
            instantBooking: exp.instant_booking === 1 || exp.instant_booking === true,
            availableToday: exp.available_today === 1 || exp.available_today === true,
            video: exp.video_url,
            image: exp.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
            images: Array.isArray(exp.images) ? exp.images : (exp.images ? JSON.parse(exp.images) : []),
            highlights: Array.isArray(exp.highlights) ? exp.highlights : (exp.highlights ? JSON.parse(exp.highlights) : []),
            description: exp.description,
            included: Array.isArray(exp.included) ? exp.included : (exp.included ? JSON.parse(exp.included) : []),
            whatToBring: Array.isArray(exp.what_to_bring) ? exp.what_to_bring : (exp.what_to_bring ? JSON.parse(exp.what_to_bring) : []),
            meetingPoint: exp.meeting_point || exp.location,
            languages: Array.isArray(exp.languages) ? exp.languages : (exp.languages ? JSON.parse(exp.languages) : ['Portuguese', 'English']),
            cancellationPolicy: exp.cancellation_policy || 'Free cancellation',
            importantInfo: exp.important_info || '',
            tags: Array.isArray(exp.tags) ? exp.tags : (exp.tags ? JSON.parse(exp.tags) : []),
            maxGroupSize: exp.max_group_size,
            latitude: exp.latitude,
            longitude: exp.longitude,
          };
          
          console.log('✅ Experience loaded:', transformedExperience.title);
          console.log('✅ Experience ID after transform:', transformedExperience.id, 'Type:', typeof transformedExperience.id);
          setExperience(transformedExperience);
        }
      } catch (error) {
        console.error('❌ Error fetching experience:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchExperience();
    }
  }, [id]);

  // Fetch reviews when experience is loaded
  React.useEffect(() => {
    const fetchReviews = async () => {
      if (!experience?.id) return;
      
      setReviewsLoading(true);
      try {
        const response: any = await apiService.getExperienceReviews(experience.id);
        if (response.success) {
          // Filter only text reviews (no video reviews)
          const textReviews = Array.isArray(response.data) 
            ? response.data.filter((review: any) => review.comment && review.comment.trim() !== '')
            : [];
          setReviews(textReviews);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [experience?.id]);

  // Show loading or error state with consistent background
  if (loading || !experience) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.topActions, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.dark.text} />
          </Pressable>
          <View style={styles.topRightActions}>
            <View style={styles.iconButton} />
            <View style={styles.iconButton} />
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.dark.primary} />
          ) : (
            <Text style={styles.errorText}>Experience not found</Text>
          )}
        </View>
      </View>
    );
  }

  const saved = experience ? isSaved(experience.id) : false;

  const handleSave = async () => {
    if (!experience) return;
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    await toggleSave(experience.id);
  };

  const handleShare = async () => {
    if (!experience) return;
    try {
      const shareMessage = `🎉 ${experience.title}

📍 ${experience.location}
⭐ ${experience.rating} (${experience.reviewCount} reviews)
⏱️ ${experience.duration}
💰 ${experience.currency}${experience.price}/person

${experience.description}

Book this amazing experience on BoredTourist!`;

      await Share.share({
        message: shareMessage,
        title: experience.title,
      });
    } catch (error: any) {
      console.error('Error sharing:', error.message);
    }
  };

  const handleAIChat = () => {
    setShowAIChat(true);
    // TODO: Implement AI chat modal
    Alert.alert('AI Chat', 'AI chat feature coming soon!');
  };

  const handleOpenMap = async () => {
    if (!experience) return;
    
    // Always use experience coordinates (no user location needed)
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${experience.latitude},${experience.longitude}`;
    const appleMapsUrl = `https://maps.apple.com/?ll=${experience.latitude},${experience.longitude}&q=${encodeURIComponent(experience.title)}`;

    Alert.alert(
      'Open Location',
      'Choose your preferred maps app',
      [
        {
          text: 'Google Maps',
          onPress: async () => {
            try {
              const supported = await Linking.canOpenURL(googleMapsUrl);
              if (supported) {
                await Linking.openURL(googleMapsUrl);
              } else {
                Alert.alert('Error', 'Unable to open Google Maps');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to open Google Maps');
            }
          },
        },
        {
          text: 'Apple Maps',
          onPress: async () => {
            try {
              const supported = await Linking.canOpenURL(appleMapsUrl);
              if (supported) {
                await Linking.openURL(appleMapsUrl);
              } else {
                Alert.alert('Error', 'Unable to open Apple Maps');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to open Apple Maps');
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
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

  // Prepare images for carousel - use images array or fallback to single image
  const carouselImages = loading 
    ? ['https://via.placeholder.com/800x400/1a1a1a/444444?text=Loading...'] 
    : experience?.images && experience.images.length > 0 
      ? experience.images 
      : [experience?.image || 'https://via.placeholder.com/800x400'];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ScrollView>
          <View style={styles.imageContainer}>
            <FlatList
              data={carouselImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.x / SCREEN_WIDTH
                );
                setCurrentImageIndex(index);
              }}
              scrollEventThrottle={16}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={styles.heroImage}
                  contentFit="cover"
                  placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
                  priority="high"
                />
              )}
              keyExtractor={(item, index) => `image-${index}`}
            />

            {!loading && carouselImages.length > 1 && (
              <>
                {/* Page Dots */}
                <View style={styles.imageIndicatorContainer}>
                  {carouselImages.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.imageIndicator,
                        currentImageIndex === index && styles.imageIndicatorActive,
                      ]}
                    />
                  ))}
                </View>
                
                {/* Image Counter */}
                <View style={styles.imageCounterContainer}>
                  <Text style={styles.imageCounterText}>
                    {currentImageIndex + 1} / {carouselImages.length}
                  </Text>
                </View>
              </>
            )}

            <View style={[styles.topActions, { paddingTop: insets.top + 16 }]}>
              <Pressable style={styles.iconButton} onPress={() => {
                // Safe back navigation - handle case where we came from share intent
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)');
                }
              }}>
                <ArrowLeft size={24} color={colors.dark.text} />
              </Pressable>
              <View style={styles.topRightActions}>
                <Pressable style={styles.iconButton} onPress={handleAIChat}>
                  <MessageCircle size={24} color={colors.dark.text} />
                </Pressable>
                <Pressable style={styles.iconButton} onPress={handleShare}>
                  <Share2 size={24} color={colors.dark.text} />
                </Pressable>
                <Pressable
                  style={styles.iconButton}
                  onPress={handleSave}
                >
                  <Bookmark
                    size={24}
                    color={saved ? colors.dark.accent : colors.dark.text}
                    fill={saved ? colors.dark.accent : 'transparent'}
                  />
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.content}>
            {/* Title - Big and Bold */}
            <Text style={styles.title}>{experience?.title?.toUpperCase() || 'Loading...'}</Text>

            {/* Host Info */}
            {experience && (
              <View style={styles.hostInfo}>
                {experience.providerLogo ? (
                  <Image
                    source={{ uri: experience.providerLogo }}
                    style={styles.hostLogo}
                    contentFit="contain"
                  />
                ) : (
                  <View style={styles.hostAvatar}>
                    <Text style={styles.hostInitial}>{experience.provider[0]}</Text>
                  </View>
                )}
                <Text style={styles.hostName}>Hosted by {experience.provider}</Text>
              </View>
            )}

            {/* Info Chips Row */}
            {experience && (
              <View style={styles.infoChipsRow}>
                <View style={styles.infoChip}>
                  <Clock size={16} color={colors.dark.text} />
                  <Text style={styles.infoChipText}>{experience.duration}</Text>
                </View>
                <View style={styles.infoChip}>
                  <Footprints size={16} color={colors.dark.text} />
                  <Text style={styles.infoChipText}>Walking</Text>
                </View>
                <View style={styles.infoChip}>
                  <Globe size={16} color={colors.dark.text} />
                  <Text style={styles.infoChipText}>{experience.languages?.[0] || 'English'}</Text>
                </View>
              </View>
            )}

            {/* Description */}
            {experience && (
              <Text style={styles.descriptionText}>{experience.description}</Text>
            )}

            {/* Highlights */}
            {experience && experience.highlights && experience.highlights.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Highlights</Text>
                {experience.highlights.map((highlight, index) => (
                  <View key={index} style={styles.listItem}>
                    <View style={styles.bullet} />
                    <Text style={styles.listItemText}>{highlight}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* What's Included */}
            {experience && experience.included && experience.included.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>What's included</Text>
                {experience.included.map((item, index) => (
                  <View key={index} style={styles.listItem}>
                    <View style={styles.bullet} />
                    <Text style={styles.listItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Map Preview */}
            {experience && experience.latitude && experience.longitude && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Meeting Point</Text>
                <Pressable style={styles.mapPreview} onPress={handleOpenMap}>
                  <Image
                    source={{ 
                      uri: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-l+FFD60A(${experience.longitude},${experience.latitude})/${experience.longitude},${experience.latitude},15,0/${Math.round(SCREEN_WIDTH - 48)}x180@2x?access_token=pk.eyJ1IjoiYm9yZWR0b3VyaXN0IiwiYSI6ImNtNWQ1ZWNpejAzOWoya3B1bmlxMnR2c2cifQ.Wt9HQPZ2GjWDjKvOlbMOzQ`
                    }}
                    style={styles.mapImage}
                    contentFit="cover"
                  />
                </Pressable>
                <Text style={styles.meetingPointText}>{experience.meetingPoint || experience.location}</Text>
              </View>
            )}

            {/* Reviews */}
            {experience && (
              <View style={styles.section}>
                <View style={styles.reviewsHeader}>
                  <Text style={styles.sectionTitle}>Reviews</Text>
                  <View style={styles.reviewsBadge}>
                    <Star size={16} color="#FFB800" fill="#FFB800" />
                    <Text style={styles.reviewsBadgeText}>
                      {experience.rating} ({experience.reviewCount})
                    </Text>
                  </View>
                </View>

                {reviewsLoading ? (
                  <Text style={styles.loadingText}>Loading reviews...</Text>
                ) : reviews.length === 0 ? (
                  <Text style={styles.noReviewsText}>No reviews yet</Text>
                ) : (
                  (showAllReviews ? reviews : reviews.slice(0, 3)).map((review) => (
                    <View key={review.id} style={styles.reviewCard}>
                      <View style={styles.reviewContent}>
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
                            <Star size={14} color="#FFB800" fill="#FFB800" />
                            <Text style={styles.reviewRatingText}>{review.rating}</Text>
                          </View>
                        </View>
                        <Text style={styles.reviewText}>{review.comment}</Text>
                        {review.verified_purchase && (
                          <View style={styles.verifiedBadge}>
                            <Text style={styles.verifiedText}>✓ Verified Purchase</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))
                )}

                {reviews.length > 3 && !showAllReviews && (
                  <Pressable 
                    style={styles.viewAllReviews}
                    onPress={() => setShowAllReviews(true)}
                  >
                    <Text style={styles.viewAllReviewsText}>View All {reviews.length} Reviews</Text>
                  </Pressable>
                )}

                {showAllReviews && reviews.length > 3 && (
                  <Pressable 
                    style={styles.viewAllReviews}
                    onPress={() => setShowAllReviews(false)}
                  >
                    <Text style={styles.viewAllReviewsText}>Show Less</Text>
                  </Pressable>
                )}
              </View>
            )}

            <View style={{ height: 120 }} />
          </View>
        </ScrollView>

        {experience && (() => {
          console.log('🎨 RENDERING BUTTON - ID:', experience.id, 'Type:', typeof experience.id);
          console.log('🎨 Should be INTERESTED?', experience.id === '12' || experience.id === '19');
          return null;
        })()}
        {experience && (
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.priceSection}>
              <Text style={styles.price}>
                €{experience.price}
              </Text>
              <Text style={styles.priceLabel}>/ person</Text>
            </View>
            <Pressable 
              style={[
                styles.bookButton,
                ['12', '19', '33', '38', '40'].includes(experience.id) && styles.interestButton
              ]}
              onPress={() => {
                console.log('🔍 Experience ID:', experience.id, 'Type:', typeof experience.id);
                
                if (['12', '19', '33', '38', '40'].includes(experience.id)) {
                  console.log('✅ Navigating to interest page');
                  router.push(`/experience/interest/${experience.id}`);
                } else {
                  console.log('✅ Navigating to booking page');
                  router.push(`/booking/${experience.id}`);
                }
              }}
            >
              <Text style={styles.bookButtonText}>
                {['12', '19', '33', '38', '40'].includes(experience.id) ? "I'M INTERESTED!" : "BOOK"}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <AuthBottomSheet
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  imageContainer: {
    height: SCREEN_HEIGHT * 0.45,
    position: 'relative' as const,
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.45,
  },
  imageIndicatorContainer: {
    position: 'absolute' as const,
    bottom: 70,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imageIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  imageIndicatorActive: {
    width: 32,
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary,
  },
  imageCounterContainer: {
    position: 'absolute' as const,
    bottom: 24,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  imageCounterText: {
    color: colors.dark.text,
    fontSize: 14,
    fontFamily: typography.fonts.extrabold,
    letterSpacing: 0.5,
  },
  topActions: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  topRightActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    paddingTop: 28,
  },
  title: {
    fontFamily: typography.fonts.extrabold,
    fontSize: 28,
    color: colors.dark.text,
    marginBottom: 20,
    lineHeight: 34,
    letterSpacing: 0.5,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  hostAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dark.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
  },
  hostInitial: {
    color: colors.dark.background,
    fontSize: 14,
    fontFamily: typography.fonts.extrabold,
  },
  hostName: {
    color: colors.dark.text,
    fontSize: 15,
    fontFamily: typography.fonts.regular,
  },
  // Info Chips Row
  infoChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoChipText: {
    color: colors.dark.text,
    fontSize: 14,
    fontFamily: typography.fonts.regular,
  },
  descriptionText: {
    color: colors.dark.textSecondary,
    fontSize: 15,
    fontFamily: typography.fonts.regular,
    lineHeight: 24,
    marginBottom: 24,
  },
  // Map Preview
  mapPreview: {
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    backgroundColor: colors.dark.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontSize: 32,
    fontFamily: typography.fonts.extrabold,
    color: colors.dark.primary,
  },
  priceLabel: {
    fontSize: 14,
    fontFamily: typography.fonts.regular,
    color: colors.dark.textSecondary,
  },
  bookButton: {
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  interestButton: {
    backgroundColor: colors.dark.primary,
  },
  bookButtonText: {
    color: colors.dark.background,
    fontSize: 15,
    fontFamily: typography.fonts.extrabold,
    letterSpacing: 0.5,
  },
  // Sections
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: typography.fonts.extrabold,
    color: colors.dark.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.dark.primary,
    marginTop: 8,
  },
  listItemText: {
    flex: 1,
    color: colors.dark.textSecondary,
    fontSize: 15,
    fontFamily: typography.fonts.regular,
    lineHeight: 22,
  },
  meetingPointText: {
    color: colors.dark.textSecondary,
    fontSize: 14,
    fontFamily: typography.fonts.regular,
    marginTop: 12,
  },
  // Reviews
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  reviewsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewsBadgeText: {
    color: '#FFB800',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  reviewCard: {
    marginBottom: 20,
  },
  reviewContent: {
    gap: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  googleBadge: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  googleBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600' as const,
  },
  verifiedBadge: {
    marginTop: 8,
    alignSelf: 'flex-start' as const,
  },
  verifiedText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  viewAllReviews: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center' as const,
    backgroundColor: colors.dark.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  viewAllReviewsText: {
    color: colors.dark.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  loadingText: {
    color: colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center' as const,
    padding: 20,
  },
  noReviewsText: {
    color: colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center' as const,
    padding: 20,
  },
  errorText: {
    color: colors.dark.textSecondary,
    fontSize: 16,
    textAlign: 'center' as const,
    marginTop: 100,
  },
});
