import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin, Clock, Euro, Users } from 'lucide-react-native';
import colors from '@/constants/colors';
import api from '@/services/api';

interface Experience {
  id: number;
  title: string;
  description: string;
  location: string;
  price: number;
  currency: string;
  duration: string;
  category: string;
  image_url?: string;
  rating: number;
  review_count: number;
  max_group_size?: number;
  instant_booking: boolean;
}

export default function FindActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const activity = (params.activity as string) || 'surf'; // Fallback to 'surf' if undefined
  const [selectedCity, setSelectedCity] = useState('Lisboa');
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  
  console.log('🎯 Activity finder params:', params);
  console.log('🎯 Activity:', activity);
  
  const cities = ['Lisboa']; // Por agora só Lisboa
  
  useEffect(() => {
    fetchExperiences();
  }, [activity, selectedCity]);
  
  const fetchExperiences = async () => {
    if (!activity || activity.trim() === '') {
      console.error('❌ No activity provided');
      setExperiences([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔍 Fetching experiences for:', activity, 'in', selectedCity);
      
      const response = await api.get('/experiences/find-similar', {
        params: {
          activity: activity.trim(),
          city: selectedCity,
          limit: 3
        }
      });
      
      console.log('📦 Response:', response);
      console.log('📦 Response data:', response?.data);
      
      if (response?.data?.success) {
        console.log('✅ Experiences found:', response.data.data?.length);
        setExperiences(response.data.data || []);
      } else {
        console.log('❌ No success in response');
        setExperiences([]);
      }
    } catch (error) {
      console.error('Error fetching experiences:', error);
      setExperiences([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleExperiencePress = (experienceId: number) => {
    // Navigate to experience details
    router.push(`/experience/${experienceId}`);
  };
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Find {activity}</Text>
          <Text style={styles.headerSubtitle}>in your city</Text>
        </View>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color="#fff" />
        </Pressable>
      </View>
      
      {/* City Filter */}
      <View style={styles.cityFilter}>
        <Text style={styles.filterLabel}>City</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityChipsContainer}
        >
          {cities.map((city) => (
            <Pressable
              key={city}
              style={[
                styles.cityChip,
                selectedCity === city && styles.cityChipSelected
              ]}
              onPress={() => setSelectedCity(city)}
            >
              <Text style={[
                styles.cityChipText,
                selectedCity === city && styles.cityChipTextSelected
              ]}>
                {city}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      
      {/* Results */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.dark.primary} />
            <Text style={styles.loadingText}>Finding activities...</Text>
          </View>
        ) : experiences.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No {activity} experiences found in {selectedCity}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultsCount}>
              {experiences.length} {activity} {experiences.length === 1 ? 'experience' : 'experiences'} in {selectedCity}
            </Text>
            
            {experiences.map((experience) => (
              <Pressable
                key={experience.id}
                style={styles.experienceCard}
                onPress={() => handleExperiencePress(experience.id)}
              >
                {/* Image */}
                {experience.image_url ? (
                  <Image
                    source={{ uri: experience.image_url }}
                    style={styles.experienceImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.experienceImage, styles.experienceImagePlaceholder]}>
                    <Text style={styles.placeholderEmoji}>🏄</Text>
                  </View>
                )}
                
                {/* Content */}
                <View style={styles.experienceContent}>
                  <Text style={styles.experienceTitle}>{experience.title}</Text>
                  <Text style={styles.experienceDescription} numberOfLines={2}>
                    {experience.description}
                  </Text>
                  
                  {/* Info Row */}
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <MapPin size={14} color="#999" />
                      <Text style={styles.infoText}>{experience.location}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Clock size={14} color="#999" />
                      <Text style={styles.infoText}>{experience.duration}</Text>
                    </View>
                  </View>
                  
                  {/* Bottom Row */}
                  <View style={styles.bottomRow}>
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceLabel}>From</Text>
                      <Text style={styles.price}>
                        €{experience.price.toFixed(0)}
                      </Text>
                    </View>
                    
                    {experience.instant_booking && (
                      <View style={styles.instantBadge}>
                        <Text style={styles.instantBadgeText}>Instant Booking</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.dark.text,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityFilter: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  cityChipsContainer: {
    paddingHorizontal: 20,
  },
  cityChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.dark.backgroundSecondary,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  cityChipSelected: {
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary,
  },
  cityChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark.text,
  },
  cityChipTextSelected: {
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    textAlign: 'center',
  },
  resultsCount: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    marginBottom: 20,
  },
  experienceCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  experienceImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.dark.backgroundSecondary,
  },
  experienceImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
  },
  experienceContent: {
    padding: 16,
  },
  experienceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark.text,
    marginBottom: 8,
  },
  experienceDescription: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: colors.dark.textSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  priceLabel: {
    fontSize: 13,
    color: colors.dark.textSecondary,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.dark.primary,
  },
  instantBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.dark.primary,
    borderRadius: 8,
  },
  instantBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
});
