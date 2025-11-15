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
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Dimensions, FlatList, Linking, Alert, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import colors from '@/constants/colors';
import { type Experience } from '@/constants/experiences';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useAuth } from '@/contexts/AuthContext';
import apiService from '@/services/api';

export default function ExperienceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAIChat, setShowAIChat] = useState(false);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  
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
          
          // Transform API data to match frontend Experience type
          const transformedExperience: Experience = {
            id: exp.id.toString(),
            title: exp.title,
            provider: exp.operator_name || 'Local Provider',
            providerLogo: exp.operator_logo || exp.provider_logo,
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

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>Loading...</Text>
      </View>
    );
  }

  if (!experience) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>Experience not found</Text>
      </View>
    );
  }

  const saved = isSaved(experience.id);

  const handleSave = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to save experiences',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth/login' as any) }
        ]
      );
      return;
    }
    await toggleSave(experience.id);
  };

  const handleShare = async () => {
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
    const googleMapsUrl = experience.id === '0' 
      ? 'https://maps.app.goo.gl/zKktCEzgxqerFxKT6'
      : `https://www.google.com/maps/search/?api=1&query=${experience.latitude},${experience.longitude}`;
    
    const appleMapsUrl = experience.id === '0'
      ? `https://maps.apple.com/?address=Costa+da+Caparica,Portugal`
      : `https://maps.apple.com/?ll=${experience.latitude},${experience.longitude}`;

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

  const reviews = [
    {
      id: '1',
      author: 'Sarah M.',
      rating: 5,
      date: '2 days ago',
      text: 'Absolutely loved this experience! The instructor was so knowledgeable and patient.',
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80',
    },
    {
      id: '2',
      author: 'John D.',
      rating: 5,
      date: '1 week ago',
      text: 'One of the best activities. Highly recommend!',
      image: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=400&q=80',
    },
  ];

  // Prepare images for carousel - use images array or fallback to single image
  const carouselImages = experience.images && experience.images.length > 0 
    ? experience.images 
    : [experience.image];

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

            {carouselImages.length > 1 && (
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
            )}

            <View style={[styles.topActions, { paddingTop: insets.top + 16 }]}>
              <Pressable style={styles.iconButton} onPress={() => router.back()}>
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
            <Text style={styles.title}>{experience.title}</Text>

            <View style={styles.hostInfo}>
              <View style={styles.hostAvatar}>
                <Text style={styles.hostInitial}>{experience.provider[0]}</Text>
              </View>
              <Text style={styles.hostName}>Hosted by {experience.provider}</Text>
            </View>

            <View style={styles.locationRow}>
              <MapPin size={16} color={colors.dark.textSecondary} />
              <Text style={styles.locationText}>
                {experience.location} • {experience.distance}
              </Text>
            </View>

            <View style={styles.ratingRow}>
              <Star size={16} color="#FFB800" fill="#FFB800" />
              <Text style={styles.ratingText}>
                {experience.rating} ({experience.reviewCount} reviews)
              </Text>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Clock size={24} color={colors.dark.primary} />
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>{experience.duration}</Text>
              </View>
              <View style={styles.statCard}>
                <Users size={24} color={colors.dark.primary} />
                <Text style={styles.statLabel}>Group size</Text>
                <Text style={styles.statValue}>Max {experience.maxGroupSize || 12}</Text>
              </View>
              <Pressable style={styles.statCard} onPress={handleOpenMap}>
                <MapPin size={24} color={colors.dark.primary} />
                <Text style={styles.statLabel}>View on Map</Text>
                <Text style={styles.statValue}>{experience.location}</Text>
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this experience</Text>
              <Text style={styles.descriptionText}>{experience.description}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Highlights</Text>
              {experience.highlights.map((highlight, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.bullet} />
                  <Text style={styles.listItemText}>{highlight}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What&apos;s included</Text>
              {experience.included.map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.bullet} />
                  <Text style={styles.listItemText}>{item}</Text>
                </View>
              ))}
            </View>

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

              {reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <Image
                    source={{ uri: review.image }}
                    style={styles.reviewImage}
                    contentFit="cover"
                  />
                  <View style={styles.reviewContent}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>{review.author[0]}</Text>
                      </View>
                      <View style={styles.reviewAuthor}>
                        <Text style={styles.reviewName}>{review.author}</Text>
                        <Text style={styles.reviewDate}>{review.date}</Text>
                      </View>
                      <View style={styles.reviewRating}>
                        <Star size={14} color="#FFB800" fill="#FFB800" />
                        <Text style={styles.reviewRatingText}>{review.rating}</Text>
                      </View>
                    </View>
                    <Text style={styles.reviewText}>{review.text}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={{ height: 120 }} />
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.priceSection}>
            <Text style={styles.price}>
              {experience.currency}
              {experience.price}
            </Text>
            <Text style={styles.priceLabel}>per person</Text>
          </View>
          <Pressable 
            style={styles.bookButton}
            onPress={() => router.push(`/booking/${experience.id}`)}
          >
            <Text style={styles.bookButtonText}>Book Now</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  imageContainer: {
    height: 400,
    position: 'relative' as const,
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: 400,
  },
  imageIndicatorContainer: {
    position: 'absolute' as const,
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  imageIndicatorActive: {
    backgroundColor: colors.dark.primary,
    width: 24,
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
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 16,
    lineHeight: 36,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  hostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostInitial: {
    color: colors.dark.background,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  hostName: {
    color: colors.dark.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  locationText: {
    color: colors.dark.textSecondary,
    fontSize: 14,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  ratingText: {
    color: colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  statLabel: {
    color: colors.dark.textSecondary,
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center' as const,
  },
  statValue: {
    color: colors.dark.text,
    fontSize: 13,
    fontWeight: '600' as const,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 16,
  },
  descriptionText: {
    color: colors.dark.textSecondary,
    fontSize: 15,
    lineHeight: 24,
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
    lineHeight: 22,
  },
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
  reviewImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 12,
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
  bottomBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: colors.dark.card,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  priceSection: {
    flex: 1,
  },
  price: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#00FF8C',
  },
  priceLabel: {
    fontSize: 13,
    color: colors.dark.textSecondary,
  },
  bookButton: {
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 28,
  },
  bookButtonText: {
    color: colors.dark.background,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  errorText: {
    color: colors.dark.textSecondary,
    fontSize: 16,
    textAlign: 'center' as const,
    marginTop: 100,
  },
});
