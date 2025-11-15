import { MapPin } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import colors from '@/constants/colors';
import { EXPERIENCES } from '@/constants/experiences';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const [selectedExperience, setSelectedExperience] = useState<string | null>(
    EXPERIENCES[0].id
  );

  const experience = EXPERIENCES.find((exp) => exp.id === selectedExperience);

  return (
    <View style={styles.container}>
      <View style={[styles.mapPlaceholder, { paddingTop: insets.top }]}>
        <View style={styles.mapOverlay}>
          <MapPin size={40} color={colors.dark.primary} />
          <Text style={styles.mapText}>Map View</Text>
          <Text style={styles.mapSubtext}>
            Interactive map with experience pins would be rendered here
          </Text>
        </View>

        {EXPERIENCES.slice(0, 6).map((exp, index) => (
          <Pressable
            key={`pin-${exp.id}`}
            style={[
              styles.mapPin,
              {
                left: `${20 + (index % 3) * 30}%`,
                top: `${30 + Math.floor(index / 3) * 25}%`,
              },
            ]}
            onPress={() => setSelectedExperience(exp.id)}
          >
            <View
              style={[
                styles.pinDot,
                selectedExperience === exp.id && styles.pinDotActive,
              ]}
            >
              <Text style={styles.pinPrice}>
                {exp.currency}
                {exp.price}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.handle} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsContainer}
        >
          {EXPERIENCES.map((exp) => (
            <Pressable
              key={`card-${exp.id}`}
              style={[
                styles.card,
                selectedExperience === exp.id && styles.cardActive,
              ]}
              onPress={() => setSelectedExperience(exp.id)}
            >
              <Image
                source={{ uri: exp.image }}
                style={styles.cardImage}
                contentFit="cover"
              />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {exp.title}
                </Text>
                <Text style={styles.cardLocation}>
                  📍 {exp.location} • {exp.distance}
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardRating}>⭐ {exp.rating}</Text>
                  <Text style={styles.cardPrice}>
                    {exp.currency}
                    {exp.price}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {experience && (
          <View style={styles.detailsSection}>
            <Text style={styles.detailsTitle}>{experience.title}</Text>
            <Text style={styles.detailsLocation}>
              📍 {experience.location} • {experience.distance}
            </Text>
            <Text style={styles.detailsDescription} numberOfLines={2}>
              {experience.description}
            </Text>
            <Pressable style={styles.detailsButton}>
              <Text style={styles.detailsButtonText}>View Details</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: colors.dark.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative' as const,
  },
  mapOverlay: {
    alignItems: 'center',
    gap: 8,
    opacity: 0.3,
  },
  mapText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.dark.text,
  },
  mapSubtext: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    textAlign: 'center' as const,
    maxWidth: 250,
  },
  mapPin: {
    position: 'absolute' as const,
  },
  pinDot: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.dark.backgroundTertiary,
    borderWidth: 2,
    borderColor: colors.dark.text,
  },
  pinDotActive: {
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary,
  },
  pinPrice: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.dark.text,
  },
  bottomSheet: {
    backgroundColor: colors.dark.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 90,
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.dark.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  cardsContainer: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  card: {
    width: SCREEN_WIDTH * 0.65,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardActive: {
    borderColor: colors.dark.primary,
  },
  cardImage: {
    width: '100%',
    height: 120,
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
  detailsSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.dark.text,
    marginBottom: 4,
  },
  detailsLocation: {
    fontSize: 13,
    color: colors.dark.textSecondary,
    marginBottom: 8,
  },
  detailsDescription: {
    fontSize: 13,
    color: colors.dark.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  detailsButton: {
    backgroundColor: colors.dark.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.dark.background,
  },
});
