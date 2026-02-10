import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Clock, MapPin, Star, Check, ExternalLink } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import colors from '@/constants/colors';
import apiService from '@/services/api';
import { useAnalytics } from '@/hooks/useAnalytics';

interface ViatorExperience {
  id: string;
  productCode: string;
  title: string;
  description: string;
  images: string[];
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
  duration: string;
  location: string;
  highlights: string[];
  included: string[];
  productUrl: string;
  category: string;
  tags: string[];
}

export default function ViatorExperienceScreen() {
  const { productCode } = useLocalSearchParams<{ productCode: string }>();
  const insets = useSafeAreaInsets();
  const { trackEvent, trackScreen } = useAnalytics();

  const [experience, setExperience] = useState<ViatorExperience | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (productCode) {
      loadExperience();
      trackScreen('Viator Experience Details', { productCode });
    }
  }, [productCode]);

  const loadExperience = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading Viator experience:', productCode);
      const response = await apiService.getViatorExperienceDetails(productCode);
      
      if (response.success && response.data) {
        setExperience(response.data);
        console.log('✅ Loaded Viator experience:', response.data.title);
      } else {
        throw new Error(response.error || 'Failed to load experience');
      }
    } catch (err: any) {
      console.error('❌ Error loading Viator experience:', err);
      setError(err.message || 'Failed to load experience');
      Alert.alert('Error', 'Failed to load experience details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!experience?.productUrl) return;

    try {
      trackEvent('viator_book_clicked', {
        productCode: experience.productCode,
        title: experience.title,
        price: experience.price,
      });

      const supported = await Linking.canOpenURL(experience.productUrl);
      if (supported) {
        await Linking.openURL(experience.productUrl);
      } else {
        Alert.alert('Error', 'Cannot open Viator website');
      }
    } catch (error) {
      console.error('Error opening Viator URL:', error);
      Alert.alert('Error', 'Failed to open booking page');
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.dark.primary} />
        <Text style={styles.loadingText}>Loading experience...</Text>
      </View>
    );
  }

  if (error || !experience) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Experience not found'}</Text>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveImageIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {experience.images.map((imageUrl, index) => (
              <Image
                key={index}
                source={{ 
                  uri: imageUrl,
                  cache: 'reload'
                }}
                style={styles.image}
                contentFit="cover"
                priority="high"
              />
            ))}
          </ScrollView>

          {/* Image indicators */}
          {experience.images.length > 1 && (
            <View style={styles.imageIndicators}>
              {experience.images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === activeImageIndex && styles.activeIndicator,
                  ]}
                />
              ))}
            </View>
          )}

          {/* Viator Badge */}
          <View style={styles.viatorBadge}>
            <Text style={styles.viatorBadgeText}>POWERED BY VIATOR</Text>
          </View>

          {/* Back button */}
          <Pressable
            style={[styles.headerButton, { top: insets.top + 16 }]}
            onPress={handleBack}
          >
            <ArrowLeft size={24} color="#fff" />
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>{experience.title}</Text>

          {/* Rating */}
          {experience.rating > 0 && (
            <View style={styles.ratingContainer}>
              <Star size={16} color={colors.dark.primary} fill={colors.dark.primary} />
              <Text style={styles.ratingText}>
                {experience.rating.toFixed(1)}
              </Text>
              {experience.reviewCount > 0 && (
                <Text style={styles.reviewCount}>
                  ({experience.reviewCount} reviews)
                </Text>
              )}
            </View>
          )}

          {/* Info Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Clock size={16} color={colors.dark.textSecondary} />
              <Text style={styles.infoText}>{experience.duration}</Text>
            </View>
            <View style={styles.infoItem}>
              <MapPin size={16} color={colors.dark.textSecondary} />
              <Text style={styles.infoText}>{experience.location}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ABOUT THIS EXPERIENCE</Text>
            <Text style={styles.description}>{experience.description}</Text>
          </View>

          {/* Highlights */}
          {experience.highlights && experience.highlights.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>HIGHLIGHTS</Text>
              {experience.highlights.map((highlight, index) => (
                <View key={index} style={styles.listItem}>
                  <Check size={16} color={colors.dark.primary} strokeWidth={3} />
                  <Text style={styles.listText}>{highlight}</Text>
                </View>
              ))}
            </View>
          )}

          {/* What's Included */}
          {experience.included && experience.included.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>WHAT'S INCLUDED</Text>
              {experience.included.map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <Check size={16} color={colors.dark.primary} strokeWidth={3} />
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Bottom spacing for footer */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Book Button Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>From</Text>
          <Text style={styles.price}>
            {experience.currency}{experience.price}
          </Text>
          <Text style={styles.priceLabel}>/ person</Text>
        </View>
        <Pressable style={styles.bookButton} onPress={handleBook}>
          <Text style={styles.bookButtonText}>BOOK ON VIATOR</Text>
          <ExternalLink size={16} color={colors.dark.background} style={{ marginLeft: 8 }} />
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
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2,
    position: 'relative',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  activeIndicator: {
    backgroundColor: colors.dark.primary,
    width: 20,
  },
  viatorBadge: {
    position: 'absolute',
    top: 70,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.dark.primary,
  },
  viatorBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.dark.primary,
    letterSpacing: 0.5,
  },
  headerButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.dark.text,
    marginBottom: 12,
    letterSpacing: 0.3,
    lineHeight: 36,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark.text,
  },
  reviewCount: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.dark.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.dark.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.dark.text,
    marginBottom: 12,
    letterSpacing: 1,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.dark.textSecondary,
  },
  listItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  listText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: colors.dark.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: colors.dark.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.dark.textTertiary,
  },
  price: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.dark.primary,
  },
  bookButton: {
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.dark.background,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.dark.background,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.dark.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.dark.background,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark.background,
  },
});
