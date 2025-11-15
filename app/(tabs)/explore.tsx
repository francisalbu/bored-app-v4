import { Search } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import colors from '@/constants/colors';
import { CATEGORIES, type Experience } from '@/constants/experiences';
import { useExperiences } from '@/hooks/useExperiences';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Fetch experiences from API
  const { experiences: EXPERIENCES, loading, error } = useExperiences();

  const filteredExperiences = EXPERIENCES.filter((exp) => {
    const matchesSearch = exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
      exp.category.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const trendingExperiences = EXPERIENCES.filter(exp => exp.rating >= 4.8);

  return (
    <View style={styles.container}>
      <View style={[styles.searchContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.searchBar}>
          <Search size={20} color={colors.dark.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search experiences, places..."
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
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {CATEGORIES.map((category) => (
              <Pressable
                key={category.id}
                style={[
                  styles.categoryCard,
                  selectedCategory === category.id && styles.categoryCardActive,
                ]}
                onPress={() => setSelectedCategory(category.id)}
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔥 Trending Now</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingContainer}
          >
            {trendingExperiences.map((experience) => (
              <TrendingCard key={experience.id} experience={experience} />
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'all' ? 'All Experiences' : CATEGORIES.find(c => c.id === selectedCategory)?.name}
          </Text>
          <View style={styles.grid}>
            {filteredExperiences.map((experience) => (
              <ExperienceCard key={experience.id} experience={experience} />
            ))}
          </View>
        </View>
      </ScrollView>
      )}
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
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {experience.title}
        </Text>
        <Text style={styles.cardLocation} numberOfLines={1}>
          📍 {experience.location}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardRating}>⭐ {experience.rating}</Text>
          <Text style={styles.cardPrice}>
            {experience.currency}{experience.price}
          </Text>
        </View>
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
      <View style={styles.trendingBadge}>
        <Text style={styles.trendingBadgeText}>TRENDING</Text>
      </View>
      <View style={styles.trendingContent}>
        <Text style={styles.trendingTitle} numberOfLines={2}>
          {experience.title}
        </Text>
        <Text style={styles.trendingLocation}>📍 {experience.location}</Text>
        <View style={styles.trendingFooter}>
          <Text style={styles.trendingRating}>⭐ {experience.rating}</Text>
          <Text style={styles.trendingPrice}>
            {experience.currency}{experience.price}
          </Text>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
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
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.dark.backgroundTertiary,
    borderWidth: 2,
    borderColor: colors.dark.border,
    minWidth: 100,
  },
  categoryCardActive: {
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary,
  },
  categoryIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.dark.textSecondary,
  },
  categoryNameActive: {
    color: colors.dark.background,
  },
  trendingContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  trendingCard: {
    width: 280,
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    overflow: 'hidden',
  },
  trendingImage: {
    width: '100%',
    height: 180,
  },
  trendingBadge: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    backgroundColor: colors.dark.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendingBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: colors.dark.background,
  },
  trendingContent: {
    padding: 12,
  },
  trendingTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 6,
  },
  trendingLocation: {
    fontSize: 13,
    color: colors.dark.textSecondary,
    marginBottom: 8,
  },
  trendingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trendingRating: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.dark.text,
  },
  trendingPrice: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.dark.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 140,
  },
  cardContent: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.dark.text,
    marginBottom: 4,
    height: 36,
  },
  cardLocation: {
    fontSize: 12,
    color: colors.dark.textSecondary,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardRating: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.dark.text,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.dark.primary,
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
    textAlign: 'center',
  },
});
