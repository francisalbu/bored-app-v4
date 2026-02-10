import { Search, SlidersHorizontal } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import colors from '@/constants/colors';
import { CATEGORIES, type Experience } from '@/constants/experiences';
import { useExperiences } from '@/hooks/useExperiences';
import { useViatorExperiences } from '@/hooks/useViatorExperiences';
import { usePreferences } from '@/contexts/PreferencesContext';
import LocationSelectorModal from '@/components/LocationSelectorModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
// Poster-style vertical cards (3:4 aspect ratio)
const TRENDING_CARD_WIDTH = (SCREEN_WIDTH - 56) / 2.3;
const TRENDING_CARD_HEIGHT = TRENDING_CARD_WIDTH * 1.4; // 3:4 aspect ratio

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'none' | 'price-low' | 'price-high'>('none');
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('Lisbon');
  
  // Fetch experiences from API
  const { experiences: EXPERIENCES, loading, error } = useExperiences();
  
  // Fetch Viator experiences based on location and selected category
  // Pass the selected category to get relevant Viator experiences
  const { 
    experiences: viatorExperiences, 
    loading: viatorLoading 
  } = useViatorExperiences(selectedLocation, selectedCategory !== 'all' ? selectedCategory : null);
  
  // Get user preferences for sorting categories
  const { getSortedCategories } = usePreferences();

  const filteredExperiences = EXPERIENCES.filter((exp) => {
    const query = searchQuery.toLowerCase().trim();
    
    // Enhanced search: title, location, category, tags, description
    const matchesSearch = query === '' || 
      exp.title.toLowerCase().includes(query) ||
      exp.location.toLowerCase().includes(query) ||
      exp.category.toLowerCase().includes(query) ||
      exp.tags.some(tag => tag.toLowerCase().includes(query)) ||
      (exp.description && exp.description.toLowerCase().includes(query));
    
    if (selectedCategory === 'all') {
      return matchesSearch;
    }
    
    // Normalize both category strings for comparison
    const expCategory = exp.category.toLowerCase().replace(/\s+&?\s+/g, '-').replace(/\s+/g, '-');
    const selectedCat = selectedCategory.toLowerCase();
    
    // Check if experience category matches
    const matchesCategory = expCategory === selectedCat || 
                           expCategory.includes(selectedCat) ||
                           exp.category.toLowerCase().includes(selectedCategory.toLowerCase());
    
    // Also check if any tag matches
    const matchesTag = exp.tags.some(tag => {
      const normalizedTag = tag.toLowerCase().replace(/\s+&?\s+/g, '-').replace(/\s+/g, '-');
      return normalizedTag === selectedCat || tag.toLowerCase().includes(selectedCategory.toLowerCase());
    });
    
    return matchesSearch && (matchesCategory || matchesTag);
  });

  // Combine Bored and Viator experiences (Bored first, then Viator)
  const combinedExperiences = useMemo(() => {
    // Map Viator experiences to have a consistent structure
    const viatorMapped = viatorExperiences.map(exp => ({
      ...exp,
      isViator: true
    }));
    
    const boredMapped = filteredExperiences.map(exp => ({
      ...exp,
      isViator: false
    }));
    
    // Bored experiences first, then Viator
    return [...boredMapped, ...viatorMapped];
  }, [filteredExperiences, viatorExperiences]);

  // Sort combined experiences by price
  const sortedExperiences = [...combinedExperiences].sort((a, b) => {
    if (sortBy === 'price-low') {
      return (a.price || 0) - (b.price || 0);
    } else if (sortBy === 'price-high') {
      return (b.price || 0) - (a.price || 0);
    }
    return 0; // no sorting
  });

  const trendingExperiences = EXPERIENCES.filter(exp => exp.rating >= 4.8);

  // Filter categories to only show those with at least 1 experience
  const categoriesWithExperiences = useMemo(() => {
    const filtered = CATEGORIES.filter(category => {
      if (category.id === 'all') return true; // Always show "All"
      
      // Normalize category name for matching (e.g., "Mind & Body" -> "mind-body")
      const normalizedCategoryName = category.name.toLowerCase().replace(/\s+&?\s+/g, '-').replace(/\s+/g, '-');
      
      return EXPERIENCES.some(exp => {
        // Check if experience category matches
        const expCategory = exp.category.toLowerCase().replace(/\s+&?\s+/g, '-').replace(/\s+/g, '-');
        if (expCategory === normalizedCategoryName || expCategory.includes(category.id)) {
          return true;
        }
        
        // Check if any tag matches the category name
        return exp.tags.some(tag => {
          const normalizedTag = tag.toLowerCase().replace(/\s+&?\s+/g, '-').replace(/\s+/g, '-');
          return normalizedTag === normalizedCategoryName || tag.toLowerCase().includes(category.name.toLowerCase());
        });
      });
    });
    
    // Sort categories based on user preferences (favorites first)
    return getSortedCategories(filtered);
  }, [EXPERIENCES, getSortedCategories]);

  return (
    <View style={styles.container}>
      {/* Location Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity 
          style={styles.headerLocation}
          onPress={() => setShowLocationModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.headerLocationLabel}>Experiences in</Text>
          <View style={styles.headerLocationSelector}>
            <Text style={styles.headerLocationText}>{selectedLocation}</Text>
            <Ionicons name="chevron-down" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { paddingTop: 12 }]}>
        <View style={styles.searchBar}>
          <Search size={20} color={colors.dark.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search amazing experiences"
            placeholderTextColor={colors.dark.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading experiences...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Categories - Pill Style */}
        <Text style={styles.sectionTitle}>CATEGORIES</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categoriesWithExperiences.map((category) => (
            <Pressable
              key={category.id}
              style={[
                styles.categoryPill,
                selectedCategory === category.id && styles.categoryPillActive,
              ]}
              onPress={() => {
                // Toggle: if already selected, go back to 'all', otherwise select this category
                if (selectedCategory === category.id) {
                  setSelectedCategory('all');
                } else {
                  setSelectedCategory(category.id);
                }
              }}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text style={[
                styles.categoryName,
                selectedCategory === category.id && styles.categoryNameActive,
              ]}>
                {category.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* All Experiences Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'all' ? 'ALL EXPERIENCES' : CATEGORIES.find(c => c.id === selectedCategory)?.name.toUpperCase()}
          </Text>
          
          {/* Price Sort Pills */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortContainer}
          >
            <Pressable
              style={[styles.sortPill, sortBy === 'price-low' && styles.sortPillActive]}
              onPress={() => setSortBy(sortBy === 'price-low' ? 'none' : 'price-low')}
            >
              <Text style={[styles.sortText, sortBy === 'price-low' && styles.sortTextActive]}>
                Price: Low to High
              </Text>
            </Pressable>
            <Pressable
              style={[styles.sortPill, sortBy === 'price-high' && styles.sortPillActive]}
              onPress={() => setSortBy(sortBy === 'price-high' ? 'none' : 'price-high')}
            >
              <Text style={[styles.sortText, sortBy === 'price-high' && styles.sortTextActive]}>
                Price: High to Low
              </Text>
            </Pressable>
          </ScrollView>
        </View>
        
        <View style={styles.grid}>
          {sortedExperiences.map((experience) => (
            experience.isViator ? (
              <ViatorCard key={experience.id} experience={experience} />
            ) : (
              <ExperienceCard key={experience.id} experience={experience} />
            )
          ))}
        </View>

        {/* Show loading state for Viator */}
        {viatorLoading && (
          <View style={styles.viatorLoadingContainer}>
            <Text style={styles.loadingText}>Loading more options...</Text>
          </View>
        )}
      </ScrollView>
      )}

      <LocationSelectorModal
        visible={showLocationModal}
        selectedLocation={selectedLocation}
        onClose={() => setShowLocationModal(false)}
        onSelectLocation={setSelectedLocation}
      />
    </View>
  );
}

interface ExperienceCardProps {
  experience: Experience;
}

function ExperienceCard({ experience }: ExperienceCardProps) {
  const router = useRouter();
  const imageSource = experience.images && experience.images.length > 0
    ? experience.images[0]
    : { uri: experience.image };

  return (
    <Pressable 
      style={styles.card}
      onPress={() => router.push(`/experience/${experience.id}`)}
    >
      <Image
        source={imageSource}
        style={styles.cardImage}
        contentFit="cover"
      />
      {/* Gradient overlay - smooth fade for text readability */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.5, 1]}
        style={styles.cardGradient}
      />
      {/* Content inside the image */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {experience.title.toUpperCase()}
        </Text>
        <Text style={styles.cardPrice}>
          {experience.currency}{experience.price}
        </Text>
      </View>
    </Pressable>
  );
}

function TrendingCard({ experience }: ExperienceCardProps) {
  const router = useRouter();
  const imageSource = experience.images && experience.images.length > 0
    ? experience.images[0]
    : { uri: experience.image };

  return (
    <Pressable 
      style={styles.trendingCard}
      onPress={() => router.push(`/experience/${experience.id}`)}
    >
      <Image
        source={imageSource}
        style={styles.trendingImage}
        contentFit="cover"
      />
      {/* Gradient overlay - starts higher for better text readability */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.5, 1]}
        style={styles.trendingGradient}
      />
      {/* Content inside the image */}
      <View style={styles.trendingContent}>
        <Text style={styles.trendingTitle} numberOfLines={2}>
          {experience.title.toUpperCase()}
        </Text>
        <Text style={styles.trendingPrice}>
          {experience.currency}{experience.price}
        </Text>
      </View>
    </Pressable>
  );
}

interface ViatorExperienceCardProps {
  experience: {
    id: string;
    title: string;
    imageUrl: string;
    price: number;
    currency: string;
    rating: number;
    reviewCount: number;
    productUrl: string;
  };
}

function ViatorCard({ experience }: ViatorExperienceCardProps) {
  const handlePress = async () => {
    // Open Viator link in external browser since these are external experiences
    if (experience.productUrl) {
      try {
        const supported = await Linking.canOpenURL(experience.productUrl);
        if (supported) {
          await Linking.openURL(experience.productUrl);
        } else {
          console.error('Cannot open URL:', experience.productUrl);
        }
      } catch (error) {
        console.error('Error opening Viator URL:', error);
      }
    }
  };

  return (
    <Pressable 
      style={styles.card}
      onPress={handlePress}
    >
      <Image
        source={{ 
          uri: experience.imageUrl,
          cache: 'reload' // Force reload to get high quality image
        }}
        style={styles.cardImage}
        contentFit="cover"
        priority="high"
      />
      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.5, 1]}
        style={styles.cardGradient}
      />
      {/* Viator badge */}
      <View style={styles.viatorBadge}>
        <Text style={styles.viatorBadgeText}>VIATOR</Text>
      </View>
      {/* Content inside the image */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {experience.title.toUpperCase()}
        </Text>
        <View style={styles.viatorCardFooter}>
          <Text style={styles.cardPrice}>
            {experience.currency}{experience.price}
          </Text>
          {experience.rating > 0 && (
            <View style={styles.viatorRating}>
              <Text style={styles.viatorRatingText}>★ {experience.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerLocation: {
    flexDirection: 'column' as const,
    gap: 2,
  },
  headerLocationLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
  headerLocationSelector: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  headerLocationText: {
    color: colors.dark.text,
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.backgroundTertiary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.dark.text,
  },
  sortContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 8,
  },
  sortPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.dark.backgroundTertiary,
    marginRight: 8,
  },
  sortPillActive: {
    backgroundColor: colors.dark.primary,
  },
  sortText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.dark.textSecondary,
  },
  sortTextActive: {
    color: colors.dark.background,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: colors.dark.text,
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 16,
    letterSpacing: 1,
  },
  // Categories - Pill Style
  categoriesContainer: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    gap: 6,
  },
  categoryPillActive: {
    backgroundColor: colors.dark.text,
    borderColor: colors.dark.text,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.dark.text,
  },
  categoryNameActive: {
    color: colors.dark.background,
  },
  // Trending Cards - Poster Style (Vertical)
  trendingContainer: {
    paddingHorizontal: 16,
    gap: 14,
    marginBottom: 8,
  },
  trendingCard: {
    width: TRENDING_CARD_WIDTH,
    height: TRENDING_CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  trendingImage: {
    width: '100%',
    height: '100%',
    position: 'absolute' as const,
  },
  trendingGradient: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  trendingContent: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 14,
  },
  trendingTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: colors.dark.text,
    marginBottom: 6,
    letterSpacing: 0.3,
    lineHeight: 18,
  },
  trendingPrice: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.75)',
  },
  // Grid Cards - Poster Style (Vertical)
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 14,
    marginTop: 8,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.35, // Vertical aspect ratio
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute' as const,
  },
  cardGradient: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  cardContent: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
    paddingBottom: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: colors.dark.text,
    marginBottom: 4,
    letterSpacing: 0.3,
    lineHeight: 17,
  },
  cardPrice: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.75)',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: colors.dark.textSecondary,
    fontSize: 16,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 16,
    textAlign: 'center' as const,
  },
  // Viator Styles
  viatorHeader: {
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  viatorSubtitle: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.dark.textTertiary,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  viatorBadge: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viatorBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
  viatorCardFooter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  viatorRating: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viatorRatingText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#fff',
  },
  viatorLoadingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
});
