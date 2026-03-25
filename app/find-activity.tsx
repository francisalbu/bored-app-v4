import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin, ChevronDown, Heart, Star, Search } from 'lucide-react-native';
import { Image as ExpoImage } from 'expo-image';
import * as Linking from 'expo-linking';
import colors from '@/constants/colors';
import api from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Experience {
  id: string | number;
  title: string;
  description?: string;
  location: string;
  price: number;
  currency: string;
  duration?: string;
  images?: string[];
  imageUrl?: string;
  image_url?: string;
  productUrl?: string;
  rating?: number;
  reviewCount?: number;
  review_count?: number;
  source: 'database' | 'viator';
}

interface Analysis {
  type: string;
  activity: string;
  location: string;
  confidence: number;
}

interface ApiResponse {
  analysis: Analysis;
  experiences: Experience[];
  sources: {
    database: number;
    viator: number;
  };
}

export default function FindActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const instagramUrl = params.instagramUrl as string;
  const thumbnailUrl = params.thumbnail as string;
  
  // Check if data was passed from shared-content
  const preloadedExperiences = params.experiences ? JSON.parse(params.experiences as string) : null;
  const preloadedAnalysis = params.analysis ? JSON.parse(params.analysis as string) : null;
  
  const [userLocation, setUserLocation] = useState('Lisboa');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>(preloadedExperiences || []);
  const [analysis, setAnalysis] = useState<Analysis | null>(preloadedAnalysis);
  const [loading, setLoading] = useState(false); // Never show loading - data must be preloaded
  const [hasAnalyzed, setHasAnalyzed] = useState(!!preloadedExperiences);
  const [favorites, setFavorites] = useState<Set<string | number>>(new Set());
  
  const cities = ['Lisboa', 'Porto', 'Barcelona', 'Madrid', 'Paris', 'London', 'Rome', 'Amsterdam'];
  
  // Popular destinations by activity - shown automatically!
  const popularDestinations: { [key: string]: string[] } = {
    // Water Sports
    surfing: ['Peniche', 'Ericeira', 'Nazaré', 'Costa da Caparica', 'Carcavelos', 'Algarve'],
    diving: ['Sesimbra', 'Berlengas', 'Madeira', 'Açores', 'Algarve'],
    snorkeling: ['Sesimbra', 'Berlengas', 'Madeira', 'Açores', 'Algarve'],
    sailing: ['Cascais', 'Sesimbra', 'Algarve', 'Lisboa', 'Porto'],
    kayaking: ['Sesimbra', 'Arrábida', 'Peniche', 'Algarve', 'Gerês'],
    paddleboarding: ['Cascais', 'Lisboa', 'Algarve', 'Porto', 'Peniche'],
    kitesurfing: ['Costa da Caparica', 'Guincho', 'Algarve', 'Peniche'],
    
    // Mountain & Adventure
    climbing: ['Sintra', 'Cascais', 'Monsanto', 'Arrábida', 'Gerês'],
    hiking: ['Sintra', 'Arrábida', 'Gerês', 'Madeira', 'Açores', 'Serra da Estrela'],
    skiing: ['Serra da Estrela', 'Spain (Pyrenees)', 'Andorra', 'Switzerland', 'Austria'],
    snowboarding: ['Serra da Estrela', 'Spain (Pyrenees)', 'Andorra', 'Switzerland'],
    mountaineering: ['Serra da Estrela', 'Gerês', 'Madeira', 'Swiss Alps'],
    
    // Cycling & Urban
    cycling: ['Cascais', 'Lisboa', 'Porto', 'Algarve', 'Sintra', 'Alentejo'],
    biking: ['Cascais', 'Lisboa', 'Porto', 'Algarve', 'Sintra', 'Alentejo'],
    running: ['Lisboa', 'Porto', 'Cascais', 'Sintra', 'Algarve'],
    
    // Wellness & Culture
    yoga: ['Lisboa', 'Porto', 'Algarve', 'Cascais', 'Sintra', 'Comporta'],
    meditation: ['Sintra', 'Comporta', 'Alentejo', 'Gerês', 'Madeira'],
    cooking: ['Lisboa', 'Porto', 'Sintra', 'Évora', 'Algarve'],
    wine: ['Douro', 'Alentejo', 'Lisboa', 'Setúbal', 'Dão'],
    
    // Extreme Sports
    paragliding: ['Madeira', 'Algarve', 'Sintra', 'Arrábida'],
    skydiving: ['Algarve', 'Évora', 'Lisboa'],
    bungee: ['Algarve', 'Porto', 'Lisboa'],
    
    // Nature & Wildlife
    birdwatching: ['Algarve', 'Comporta', 'Berlengas', 'Açores', 'Madeira'],
    dolphin: ['Sesimbra', 'Setúbal', 'Algarve', 'Madeira', 'Açores'],
    whale: ['Açores', 'Madeira', 'Algarve'],
  };
  
  // Load recent searches
  useEffect(() => {
    loadRecentSearches();
  }, []);
  
  const loadRecentSearches = async () => {
    try {
      const searches = await AsyncStorage.getItem('recentSearches');
      if (searches) {
        setRecentSearches(JSON.parse(searches));
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  };
  
  const saveRecentSearch = async (location: string) => {
    try {
      const updated = [location, ...recentSearches.filter(s => s !== location)].slice(0, 5);
      setRecentSearches(updated);
      await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  };
  
  console.log('🎯 Find Activity params:', params);
  console.log('📦 Preloaded experiences:', preloadedExperiences?.length);
  console.log('📊 Preloaded analysis:', preloadedAnalysis);
  
  // Only fetch if no preloaded data - but DON'T navigate back, just fetch
  useEffect(() => {
    if (!preloadedExperiences && instagramUrl) {
      console.log('⚠️ No preloaded data, but we have URL - will fetch on location change');
      // Don't navigate back - user came here intentionally
      // Data will be fetched when location changes or on mount via fetchRecommendations
    }
  }, []);
  
  // Re-fetch experiences when location changes (but don't re-analyze)
  useEffect(() => {
    if (hasAnalyzed && analysis) {
      console.log('📍 Location changed to:', userLocation, '- fetching new experiences...');
      fetchRecommendations();
    }
  }, [userLocation]);
  
  const fetchRecommendations = async () => {
    if (!instagramUrl && !analysis) {
      console.error('❌ Cannot fetch: no instagramUrl or analysis');
      setLoading(false);
      return;
    }
    
    console.log('🔍 Fetching recommendations...');
    console.log('   Has analyzed:', hasAnalyzed);
    console.log('   User location:', userLocation);
    
    try {
      setLoading(true);
      
      let response;
      
      if (hasAnalyzed && analysis) {
        // Already analyzed - just search by activity in new location
        console.log('⚡ Using existing analysis, searching by activity only');
        response = await api.post('/experience-recommendations/by-activity', {
          activity: analysis.activity,
          userLocation: userLocation
        });
      } else {
        // First time - analyze video
        console.log('🎬 First time: analyzing video...');
        response = await api.post<ApiResponse>('/experience-recommendations', {
          instagramUrl: instagramUrl,
          userLocation: userLocation
        });
      }
      
      console.log('📦 Response:', response.data);
      
      if (response.data && response.data.experiences) {
        console.log('✅ Success! Experiences:', response.data.experiences.length);
        
        // Debug: log sources
        response.data.experiences.forEach((exp, i) => {
          console.log(`   ${i+1}. ${exp.title} - source: ${exp.source}`);
        });
        
        // Set analysis only on first fetch
        if (response.data.analysis) {
          setAnalysis(response.data.analysis);
        }
        
        setExperiences(response.data.experiences);
        setHasAnalyzed(true);
      } else {
        console.log('❌ No experiences in response');
        setExperiences([]);
      }
    } catch (error) {
      console.error('❌ Error fetching recommendations:', error);
      setExperiences([]);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleFavorite = (experienceId: string | number) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(experienceId)) {
        newFavorites.delete(experienceId);
      } else {
        newFavorites.add(experienceId);
      }
      return newFavorites;
    });
  };
  
  const handleExperiencePress = async (experience: Experience) => {
    console.log('🎯 Experience pressed:', experience.title, 'source:', experience.source);
    
    // Navigate to experience details
    if (experience.source === 'database') {
      console.log('✅ Opening database experience in app:', experience.id);
      router.push(`/experience/${experience.id}`);
    } else {
      // For Viator experiences, open in browser
      const url = experience.productUrl;
      if (url) {
        console.log('🌐 Opening Viator URL:', url);
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          console.error('Cannot open URL:', url);
        }
      } else {
        console.error('No product URL for Viator experience');
      }
    }
  };
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Simple header with close button */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color="#333" />
        </Pressable>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : !analysis || experiences.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No experiences found. Please try again.
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Video Frame Thumbnail - Large at top (centered, rounded) */}
          {thumbnailUrl && (
            <View style={styles.videoSection}>
              <Image
                source={{ uri: thumbnailUrl }}
                style={styles.videoThumbnail}
                resizeMode="cover"
              />
            </View>
          )}
          
          {/* Activity Detection Title */}
          {analysis && (
            <View style={styles.titleSection}>
              <Text style={styles.titleText}>
                We detected <Text style={styles.titleBold}>{analysis.activity}</Text> in this reel
              </Text>
            </View>
          )}
          
          {/* Location Dropdown */}
          <View style={styles.locationSection}>
            <Pressable 
              style={styles.locationDropdown}
              onPress={() => setShowLocationPicker(!showLocationPicker)}
            >
              <MapPin size={18} color="#666" />
              <Text style={styles.locationText}>{userLocation}</Text>
              <ChevronDown size={18} color="#666" />
            </Pressable>
            
            {/* Enhanced Location Picker Modal */}
            {showLocationPicker && (
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoid}
              >
                <View style={styles.locationPicker}>
                  {/* Search Input */}
                  <View style={styles.searchContainer}>
                    <Search size={18} color="#999" style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Type city name"
                      placeholderTextColor="#999"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoFocus
                      returnKeyType="search"
                      onSubmitEditing={() => {
                        if (searchQuery.trim()) {
                          setUserLocation(searchQuery.trim());
                          saveRecentSearch(searchQuery.trim());
                          setShowLocationPicker(false);
                          setSearchQuery('');
                        }
                      }}
                    />
                  </View>

                  <ScrollView 
                    style={styles.locationScrollView} 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && !searchQuery && (
                    <View style={styles.locationGroup}>
                      <Text style={styles.locationGroupTitle}>Recent searches</Text>
                      {recentSearches.map((city, index) => (
                        <Pressable
                          key={`recent-${index}`}
                          style={styles.cityOption}
                          onPress={() => {
                            setUserLocation(city);
                            setShowLocationPicker(false);
                            setSearchQuery('');
                          }}
                        >
                          <MapPin size={16} color="#007AFF" style={styles.locationIcon} />
                          <Text style={styles.cityOptionText}>{city}</Text>
                          {city === userLocation && <Text style={styles.checkmark}>✓</Text>}
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {/* Popular for Activity */}
                  {analysis?.activity && popularDestinations[analysis.activity.toLowerCase()] && !searchQuery && (
                    <View style={styles.locationGroup}>
                      <Text style={styles.locationGroupTitle}>Popular for {analysis.activity}</Text>
                      {popularDestinations[analysis.activity.toLowerCase()].map((city, index) => (
                        <Pressable
                          key={`popular-${index}`}
                          style={styles.cityOption}
                          onPress={() => {
                            setUserLocation(city);
                            saveRecentSearch(city);
                            setShowLocationPicker(false);
                            setSearchQuery('');
                          }}
                        >
                          <MapPin size={16} color="#007AFF" style={styles.locationIcon} />
                          <Text style={styles.cityOptionText}>{city}</Text>
                          {city === userLocation && <Text style={styles.checkmark}>✓</Text>}
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {/* All Cities or Filtered */}
                  {(searchQuery || !analysis?.activity) && (
                    <View style={styles.locationGroup}>
                      {cities
                        .filter(city => city.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(city => (
                          <Pressable
                            key={city}
                            style={[styles.cityOption, city === userLocation && styles.cityOptionSelected]}
                            onPress={() => {
                              setUserLocation(city);
                              saveRecentSearch(city);
                              setShowLocationPicker(false);
                              setSearchQuery('');
                            }}
                          >
                            <Text style={[styles.cityOptionText, city === userLocation && styles.cityOptionTextSelected]}>
                              {city}
                            </Text>
                            {city === userLocation && <Text style={styles.checkmark}>✓</Text>}
                          </Pressable>
                        ))}
                    </View>
                  )}
                  </ScrollView>
                </View>
              </KeyboardAvoidingView>
            )}
          </View>
          
          {/* Experience Cards */}
          {experiences.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No experiences found. Try a different location.
              </Text>
            </View>
          ) : (
            experiences.map((experience, index) => {
              // CRITICAL: Use images[0] for database experiences (NOT image_url which is logo)
              const getImageUrl = () => {
                console.log(`🔍 Experience: ${experience.title}`);
                console.log(`   Source: ${experience.source}`);
                console.log(`   images:`, experience.images);
                console.log(`   imageUrl:`, experience.imageUrl);
                console.log(`   image_url:`, experience.image_url);
                
                if (experience.source === 'database') {
                  // Database: MUST use images array (images[0] is experience photo)
                  if (experience.images && Array.isArray(experience.images) && experience.images.length > 0) {
                    console.log(`   ✅ Using images[0]:`, experience.images[0]);
                    return experience.images[0]; // ✅ Experience photo
                  }
                  console.error(`   ❌ NO IMAGES ARRAY FOR DATABASE EXPERIENCE!`);
                } else {
                  // Viator: use imageUrl
                  return experience.imageUrl || experience.image_url;
                }
                return null;
              };
              
              const imageUrl = getImageUrl();
              const sourceBadge = experience.source === 'database' ? 'Bored Tourist' : 'Viator';
              const isOurApp = experience.source === 'database';
              
              return (
              <Pressable
                key={`${experience.source}-${experience.id}-${index}`}
                style={styles.experienceCard}
                onPress={() => handleExperiencePress(experience)}
              >
                {/* Image on the left */}
                <View style={styles.cardImageWrapper}>
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                      <Text style={styles.placeholderText}>No Image</Text>
                    </View>
                  )}
                </View>
                
                {/* Content on the right */}
                <View style={styles.cardContent}>
                  {/* Source Badge */}
                  <View style={[styles.sourceBadge, isOurApp && styles.sourceBadgeOurs]}>
                    <Text style={[styles.sourceBadgeText, isOurApp && styles.sourceBadgeTextOurs]}>
                      {sourceBadge}
                    </Text>
                  </View>
                  
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {experience.title}
                    </Text>
                    <Pressable
                      style={styles.favoriteButton}
                      onPress={() => toggleFavorite(experience.id)}
                    >
                      <Heart
                        size={20}
                        color={favorites.has(experience.id) ? '#FF6B00' : '#ccc'}
                        fill={favorites.has(experience.id) ? '#FF6B00' : 'transparent'}
                      />
                    </Pressable>
                  </View>
                  
                  <View style={styles.cardLocation}>
                    <MapPin size={12} color="#999" />
                    <Text style={styles.cardLocationText} numberOfLines={1}>{experience.location}</Text>
                  </View>
                  
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardPrice}>
                      {experience.price}€
                    </Text>
                    
                    {(experience.rating || 0) > 0 && (
                      <View style={styles.cardRating}>
                        <Star size={14} color="#FFB800" fill="#FFB800" />
                        <Text style={styles.cardRatingText}>
                          {(experience.rating || 0).toFixed(1)}
                        </Text>
                        <Text style={styles.cardRatingLabel}>stars</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
    alignItems: 'center',
  },
  videoSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
  },
  videoThumbnail: {
    width: 140,
    height: 200,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    width: '100%',
  },
  titleText: {
    fontSize: 28,
    color: '#333',
    lineHeight: 36,
    textAlign: 'center',
    fontWeight: '400',
  },
  titleBold: {
    fontWeight: '800',
    color: '#000',
  },
  locationSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  locationDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 160,
    justifyContent: 'center',
  },
  locationText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  keyboardAvoid: {
    width: '100%',
  },
  locationPicker: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    maxHeight: 500,
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  locationScrollView: {
    maxHeight: 400,
  },
  locationGroup: {
    paddingVertical: 8,
  },
  locationGroupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationIcon: {
    marginRight: 12,
  },
  cityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  cityOptionSelected: {
    backgroundColor: '#f5f5f5',
  },
  cityOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  cityOptionTextSelected: {
    fontWeight: '600',
    color: '#FF6B00',
  },
  checkmark: {
    fontSize: 18,
    color: '#FF6B00',
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  experienceCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
    padding: 12,
  },
  cardImageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  cardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 11,
    color: '#999',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    marginRight: 8,
    lineHeight: 20,
  },
  favoriteButton: {
    padding: 4,
  },
  cardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  cardLocationText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  cardPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
  },
  cardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cardRatingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  cardRatingLabel: {
    fontSize: 13,
    color: '#999',
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    marginBottom: 6,
  },
  sourceBadgeOurs: {
    backgroundColor: '#FFF500',
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  sourceBadgeTextOurs: {
    color: '#000',
  },
});
