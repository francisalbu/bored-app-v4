import { Bookmark, MapPin, Star, Clock } from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import colors from '@/constants/colors';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useExperiences } from '@/hooks/useExperiences';
import type { Experience } from '@/constants/experiences';

export default function SavedTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { savedExperiences, isLoading: favLoading, refreshSaved, toggleSave } = useFavorites();
  const { experiences, loading: expLoading } = useExperiences();

  useEffect(() => {
    refreshSaved();
  }, []);

  const isLoading = favLoading || expLoading;

  // Get full experience details for saved IDs from API data
  const savedExperienceDetails = experiences.filter(exp => 
    savedExperiences.includes(exp.id)
  );

  const handleRemoveFavorite = async (experienceId: string, event: any) => {
    // Prevent navigation to experience detail
    event.stopPropagation();
    await toggleSave(experienceId);
  };

  const renderExperience = ({ item }: { item: Experience }) => (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/experience/${item.id}` as any)}
    >
      <Image
        source={item.images && item.images.length > 0 ? item.images[0] : { uri: item.image }}
        style={styles.cardImage}
        contentFit="cover"
      />
      
      <View style={styles.cardContent}>
        <View style={styles.providerRow}>
          {item.providerLogo ? (
            <Image
              source={item.providerLogo}
              style={styles.providerLogo}
              contentFit="cover"
            />
          ) : (
            <View style={styles.providerAvatar}>
              <Text style={styles.providerInitial}>{item.provider[0]}</Text>
            </View>
          )}
          <Text style={styles.providerName}>{item.provider}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Star size={14} color={colors.dark.accent} fill={colors.dark.accent} />
            <Text style={styles.metaText}>{item.rating}</Text>
          </View>
          <Text style={styles.metaDivider}>•</Text>
          <View style={styles.metaItem}>
            <Clock size={14} color={colors.dark.textSecondary} />
            <Text style={styles.metaText}>{item.duration}</Text>
          </View>
          <Text style={styles.metaDivider}>•</Text>
          <View style={styles.metaItem}>
            <MapPin size={14} color={colors.dark.textSecondary} />
            <Text style={styles.metaText}>{item.distance}</Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {item.currency}{item.price}
            <Text style={styles.priceUnit}>/person</Text>
          </Text>
          <Pressable 
            style={styles.bookmarkBadge}
            onPress={(e) => handleRemoveFavorite(item.id, e)}
          >
            <Bookmark size={16} color={colors.dark.accent} fill={colors.dark.accent} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Experiences</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.dark.primary} />
          <Text style={styles.loadingText}>Loading saved experiences...</Text>
        </View>
      ) : savedExperienceDetails.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Bookmark size={64} color={colors.dark.textTertiary} />
          <Text style={styles.emptyTitle}>No Saved Experiences</Text>
          <Text style={styles.emptyText}>
            Start exploring and save your favorite experiences to see them here!
          </Text>
          <Pressable
            style={styles.exploreButton}
            onPress={() => router.push('/(tabs)/explore' as any)}
          >
            <Text style={styles.exploreButtonText}>Explore Experiences</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={savedExperienceDetails}
          renderItem={renderExperience}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900' as const,
    color: colors.dark.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900' as const,
    color: colors.dark.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  exploreButton: {
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: colors.dark.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  cardContent: {
    padding: 16,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  providerLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  providerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerInitial: {
    fontSize: 14,
    fontWeight: '900' as const,
    color: colors.dark.background,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '900' as const,
    color: colors.dark.textSecondary,
  },
  title: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: colors.dark.text,
    marginBottom: 12,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.dark.textSecondary,
  },
  metaDivider: {
    fontSize: 12,
    color: colors.dark.textTertiary,
    marginHorizontal: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 20,
    fontWeight: '900' as const,
    color: colors.dark.primary,
  },
  priceUnit: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.dark.textSecondary,
  },
  bookmarkBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 255, 140, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
