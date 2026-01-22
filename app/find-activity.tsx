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
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin, ChevronDown, Heart, Star, Search, Edit3, Check } from 'lucide-react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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
  fullActivity?: string; // Original detailed activity from reel
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
  const rawPreloadedAnalysis = params.analysis ? JSON.parse(params.analysis as string) : null;
  
  // Process preloaded analysis to ensure fullActivity and base activity are set
  const preloadedAnalysis = rawPreloadedAnalysis ? {
    ...rawPreloadedAnalysis,
    fullActivity: rawPreloadedAnalysis.fullActivity || rawPreloadedAnalysis.activity, // Ensure fullActivity is set
    activity: rawPreloadedAnalysis.activity // Base activity (already processed in shared-content)
  } : null;
  
  const [userLocation, setUserLocation] = useState('Lisboa');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showNearYouDropdown, setShowNearYouDropdown] = useState(false);
  const [nearYouSearch, setNearYouSearch] = useState('');
  const [globalCityResults, setGlobalCityResults] = useState<Array<{name: string, country: string}>>([]);
  const [searchingCities, setSearchingCities] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSpecificLocation, setIsSpecificLocation] = useState(false); // Track if viewing specific location
  
  // Separate states for 3 sections
  const [nearYouExperiences, setNearYouExperiences] = useState<Experience[]>(preloadedExperiences || []); // Preloaded goes to Near You initially
  const [reelExperiences, setReelExperiences] = useState<Experience[]>([]); // Will be fetched separately
  const [suggestedLocations, setSuggestedLocations] = useState<string[]>([]);
  
  const [experiences, setExperiences] = useState<Experience[]>(preloadedExperiences || []); // Keep for compatibility
  const [analysis, setAnalysis] = useState<Analysis | null>(preloadedAnalysis);
  const [loading, setLoading] = useState(false); // Never show loading - data must be preloaded
  const [hasAnalyzed, setHasAnalyzed] = useState(!!preloadedExperiences);
  const [hasFetchedSections, setHasFetchedSections] = useState(false); // Track if we've fetched the 3 sections
  const [favorites, setFavorites] = useState<Set<string | number>>(new Set());
  
  const cities = ['New York', 'Los Angeles', 'Miami', 'Washington DC', 'Boston', 'Atlanta', 'Lisboa', 'Porto', 'Barcelona', 'Madrid', 'Paris', 'London', 'Rome', 'Amsterdam'];
  
  // Search for cities globally using Google Places Autocomplete API via backend
  const searchGlobalCities = async (query: string) => {
    if (query.length < 2) {
      setGlobalCityResults([]);
      return;
    }
    
    setSearchingCities(true);
    try {
      // Call backend API that uses Google Places Autocomplete
      const response = await fetch(
        `https://bored-tourist-api.onrender.com/api/places/autocomplete?input=${encodeURIComponent(query)}&types=(cities)`
      );
      
      const data = await response.json();
      
      if (data.predictions) {
        const results = data.predictions.map((prediction: any) => {
          // Extract city and country from structured_formatting
          const mainText = prediction.structured_formatting?.main_text || prediction.description.split(',')[0];
          const secondaryText = prediction.structured_formatting?.secondary_text || 
                              prediction.description.split(',').slice(1).join(',').trim();
          
          return {
            name: mainText,
            country: secondaryText,
            placeId: prediction.place_id
          };
        }).slice(0, 8);
        
        setGlobalCityResults(results);
      }
    } catch (error) {
      console.error('Error searching cities:', error);
      // Fallback to simple local filtering if API fails
      const filtered = cities
        .filter(city => city.toLowerCase().includes(query.toLowerCase()))
        .map(city => ({ name: city, country: '', placeId: '' }));
      setGlobalCityResults(filtered);
    } finally {
      setSearchingCities(false);
    }
  };
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (nearYouSearch) {
        searchGlobalCities(nearYouSearch);
      } else {
        setGlobalCityResults([]);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [nearYouSearch]);
  
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
  
  // Extract base activity from detailed description (e.g., "snorkeling with giant manta rays" -> "snorkeling")
  const getBaseActivity = (activityString: string): string => {
    const activity = activityString.toLowerCase();
    
    // Common activity patterns
    if (activity.includes('snorkel')) return 'snorkeling';
    if (activity.includes('dive') || activity.includes('diving')) return 'diving';
    if (activity.includes('surf')) return 'surfing';
    if (activity.includes('kayak')) return 'kayaking';
    if (activity.includes('paddle')) return 'paddleboarding';
    if (activity.includes('hike') || activity.includes('hiking')) return 'hiking';
    if (activity.includes('climb')) return 'climbing';
    if (activity.includes('bike') || activity.includes('cycling')) return 'biking';
    if (activity.includes('ski')) return 'skiing';
    if (activity.includes('snowboard')) return 'snowboarding';
    
    // Return first word if no pattern match
    return activity.split(' ')[0];
  };
  
  // Sort experiences: Bored Tourist first, then by rating
  const sortExperiences = (exps: Experience[]): Experience[] => {
    return [...exps].sort((a, b) => {
      // Bored Tourist always first
      if (a.source === 'database' && b.source !== 'database') return -1;
      if (a.source !== 'database' && b.source === 'database') return 1;
      
      // Then by rating
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      return ratingB - ratingA;
    });
  };
  
  console.log('🎯 Find Activity params:', params);
  console.log('📦 Preloaded experiences:', preloadedExperiences?.length);
  console.log('📊 Preloaded analysis:', preloadedAnalysis);
  
  // Initial fetch: when we have preloaded data, fetch the 3 sections properly
  useEffect(() => {
    if (preloadedAnalysis && !hasFetchedSections) {
      console.log('🚀 Have preloaded analysis, fetching 3 sections...');
      fetchRecommendations();
      setHasFetchedSections(true);
    } else if (!preloadedExperiences && instagramUrl && !hasFetchedSections) {
      console.log('⚠️ No preloaded data, but we have URL - will fetch');
      fetchRecommendations();
      setHasFetchedSections(true);
    }
  }, [preloadedAnalysis]);
  
  // Re-fetch experiences when user manually changes location
  useEffect(() => {
    if (hasAnalyzed && analysis && hasFetchedSections) {
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
      
      let analysisData = analysis;
      
      // First time: analyze video if needed
      if (!hasAnalyzed && instagramUrl) {
        console.log('🎬 First time: analyzing video...');
        const analyzeResponse = await api.post<ApiResponse>('/experience-recommendations', {
          instagramUrl: instagramUrl,
          userLocation: userLocation,
          prioritizeBored: true
        });
        
        if (analyzeResponse.data && analyzeResponse.data.analysis) {
          analysisData = {
            ...analyzeResponse.data.analysis,
            fullActivity: analyzeResponse.data.analysis.activity, // Keep original detailed
            activity: getBaseActivity(analyzeResponse.data.analysis.activity) // Base for general searches
          };
          setAnalysis(analysisData);
          setHasAnalyzed(true);
        }
      }
      
      if (!analysisData) {
        console.error('❌ No analysis data available');
        return;
      }
      
      const baseActivity = analysisData.activity; // General: "snorkeling"
      const fullActivity = analysisData.fullActivity || analysisData.activity; // Specific: "snorkeling with giant manta rays"
      const reelLocation = analysisData.location; // Location from reel: "French Polynesia", "Maldives", etc.
      
      console.log('🎯 Base activity:', baseActivity);
      console.log('🎯 Full activity:', fullActivity);
      console.log('🌍 Reel location:', reelLocation);
      console.log('📍 User location:', userLocation);
      
      // Parallel fetch for 3 sections
      const [nearYouResponse, reelResponse] = await Promise.all([
        // 1. Near You: EXACT activity match + User city
        // Only show experiences that match the EXACT activity type (surf = surf, not indoor skydiving)
        api.post('/experience-recommendations/by-activity', {
          activity: baseActivity,
          userLocation: userLocation, // City name - backend will filter by this
          strictActivityMatch: true, // Only exact activity matches
          prioritizeBored: true // Bored Tourist first
        }),
        
        // 2. As Seen on the Reel: Full specific activity + Reel location (where the video was filmed)
        api.post('/experience-recommendations/by-activity', {
          activity: fullActivity,
          userLocation: reelLocation || null, // Search in the location from the reel
          prioritizeBored: false // Show all relevant results (Viator primarily for exotic locations)
        })
      ]);
      
      console.log('📦 Near You Response:', nearYouResponse.data?.experiences?.length);
      console.log('📦 Reel Response:', reelResponse.data?.experiences?.length);
      
      // Set experiences for each section
      if (nearYouResponse.data && nearYouResponse.data.experiences) {
        const sorted = sortExperiences(nearYouResponse.data.experiences);
        setNearYouExperiences(sorted);
        console.log('✅ Near You:', sorted.length, 'experiences');
      }
      
      if (reelResponse.data && reelResponse.data.experiences) {
        const sorted = sortExperiences(reelResponse.data.experiences);
        setReelExperiences(sorted);
        console.log('✅ As Seen on Reel:', sorted.length, 'experiences');
      }
      
      // 3. Suggested Locations: Use popularDestinations for base activity
      const locations = popularDestinations[baseActivity.toLowerCase()] || [];
      setSuggestedLocations(locations);
      console.log('📍 Suggested locations:', locations);
      
      // Keep experiences state for compatibility
      setExperiences(nearYouResponse.data?.experiences || []);
      
    } catch (error) {
      console.error('❌ Error fetching recommendations:', error);
      setNearYouExperiences([]);
      setReelExperiences([]);
      setSuggestedLocations([]);
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
          {/* Show back button when in specific location mode */}
          {isSpecificLocation && (
            <View style={styles.backButtonContainer}>
              <Pressable 
                style={styles.backButton}
                onPress={() => {
                  setIsSpecificLocation(false);
                  setUserLocation('Lisboa'); // Reset to default
                }}
              >
                <Text style={styles.backArrow}>←</Text>
                <Text style={styles.backText}>Back to all locations</Text>
              </Pressable>
            </View>
          )}

          {/* Compact Activity Detection Title - Only show when not in specific location */}
          {!isSpecificLocation && analysis && (
            <View style={styles.compactTitleSection}>
              <Text style={styles.compactTitleText}>
                Found '<Text style={styles.compactTitleBold}>{analysis.activity}</Text>' in your Instagram Reel
              </Text>
            </View>
          )}
          
          {/* Near You Section - Only show when not in specific location */}
          {!isSpecificLocation && (
            <View style={styles.sectionContainer}>
              <View style={styles.nearYouHeader}>
                <Pressable 
                  style={styles.nearYouTitleContainer}
                  onPress={() => setShowNearYouDropdown(!showNearYouDropdown)}
                >
                  <Text style={styles.sectionTitle}>Near You</Text>
                  <View style={styles.editIconContainer}>
                    <Edit3 size={18} color="#666" strokeWidth={2} />
                  </View>
                </Pressable>
              </View>
              
              {/* Modern Premium Modal */}
              <Modal
                visible={showNearYouDropdown}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => {
                  setShowNearYouDropdown(false);
                  setNearYouSearch('');
                }}
              >
                <View style={styles.modalContainer}>
                  {/* Modal Header */}
                  <View style={styles.modalHandle}>
                    <View style={styles.modalHandleBar} />
                  </View>
                  
                  {/* Search Bar */}
                  <View style={styles.modalSearchContainer}>
                    <Search size={20} color="#999" />
                    <TextInput
                      style={styles.modalSearchInput}
                      placeholder="Search for your city"
                      placeholderTextColor="#999"
                      value={nearYouSearch}
                      onChangeText={setNearYouSearch}
                      autoCapitalize="words"
                      autoFocus
                    />
                    {nearYouSearch.length > 0 && (
                      <Pressable onPress={() => setNearYouSearch('')}>
                        <X size={20} color="#999" />
                      </Pressable>
                    )}
                  </View>
                  
                  {/* Results */}
                  <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                    {/* Nearby Option */}
                    {!nearYouSearch && (
                      <Pressable
                        style={styles.modalItem}
                        onPress={() => {
                          setUserLocation('Nearby');
                          setIsSpecificLocation(false);
                          setShowNearYouDropdown(false);
                          setNearYouSearch('');
                        }}
                      >
                        <Text style={[
                          styles.modalItemText,
                          userLocation === 'Nearby' && styles.modalItemTextActive
                        ]}>
                          Nearby
                        </Text>
                        <View style={[
                          styles.radioButton,
                          userLocation === 'Nearby' && styles.radioButtonSelected
                        ]}>
                          {userLocation === 'Nearby' && <View style={styles.radioButtonInner} />}
                        </View>
                      </Pressable>
                    )}
                    
                    {/* Global Search Results */}
                    {nearYouSearch.length > 0 && globalCityResults.length > 0 && (
                      <View style={styles.searchResultsContainer}>
                        {globalCityResults.map((result, index) => (
                          <Pressable
                            key={`${result.name}-${result.country}-${index}`}
                            style={styles.modalItem}
                            onPress={() => {
                              const cityName = result.name;
                              setUserLocation(cityName);
                              setIsSpecificLocation(true);
                              setShowNearYouDropdown(false);
                              setNearYouSearch('');
                            }}
                          >
                            <View>
                              <Text style={styles.modalItemText}>
                                {result.name}
                              </Text>
                              <Text style={styles.modalItemSubtext}>
                                {result.country}
                              </Text>
                            </View>
                            <View style={[
                              styles.radioButton,
                              userLocation === result.name && styles.radioButtonSelected
                            ]}>
                              {userLocation === result.name && <View style={styles.radioButtonInner} />}
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    )}
                    
                    {/* Common Cities - Only show when no search */}
                    {!nearYouSearch && cities.map((city) => (
                        <Pressable
                          key={city}
                          style={styles.modalItem}
                          onPress={() => {
                            setUserLocation(city);
                            setIsSpecificLocation(true);
                            setShowNearYouDropdown(false);
                            setNearYouSearch('');
                          }}
                        >
                          <Text style={[
                            styles.modalItemText,
                            userLocation === city && styles.modalItemTextActive
                          ]}>
                            {city}
                          </Text>
                          <View style={[
                            styles.radioButton,
                            userLocation === city && styles.radioButtonSelected
                          ]}>
                            {userLocation === city && <View style={styles.radioButtonInner} />}
                          </View>
                        </Pressable>
                      ))}
                  </ScrollView>
                </View>
              </Modal>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {nearYouExperiences.map((experience, index) => {
                  const imageUrl = (() => {
                    if (experience.source === 'database') {
                      return experience.images && experience.images.length > 0 
                        ? experience.images[0] 
                        : experience.image_url;
                    } else {
                      return experience.imageUrl || experience.image_url;
                    }
                  })();

                  return (
                    <Pressable
                      key={`near-${experience.source}-${experience.id}-${index}`}
                      style={styles.nearYouFullCard}
                      onPress={() => handleExperiencePress(experience)}
                    >
                      <View style={styles.nearYouImageContainer}>
                        <ExpoImage
                          source={{ uri: imageUrl }}
                          style={styles.nearYouFullImage}
                          contentFit="cover"
                          transition={200}
                        />
                        
                        {/* Dark gradient overlay */}
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.7)']}
                          style={styles.imageGradient}
                        />
                        
                        {/* Badge top-left */}
                        <View style={styles.badgeTopLeft}>
                          <View style={experience.source === 'database' ? styles.sourceBadgeOurs : styles.sourceBadgeViator}>
                            <Text style={styles.sourceBadgeText}>
                              {experience.source === 'database' ? 'BORED TOURIST' : 'VIATOR'}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Price top-right */}
                        <View style={styles.priceOverlay}>
                          <Text style={styles.priceOverlayText}>
                            {experience.price}€
                          </Text>
                        </View>
                        
                        {/* Rating bottom-left */}
                        {(experience.rating || experience.reviewCount) && (
                          <View style={styles.ratingOverlay}>
                            <Star size={14} color="#FFB800" fill="#FFB800" />
                            <Text style={styles.ratingOverlayText}>
                              {(experience.rating || 0).toFixed(1)}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {/* Title outside image */}
                      <View style={styles.nearYouCardContent}>
                        <Text style={styles.nearYouCardTitle} numberOfLines={2}>
                          {experience.title}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* As Seen on the Reel Section - Show experiences matching the exact reel content */}
          {!isSpecificLocation && analysis && analysis.fullActivity && analysis.location && reelExperiences.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.asSeenHeader}>
                <Text style={styles.asSeenTitle}>🎬 As Seen on the Reel</Text>
                <Text style={styles.asSeenSubtitle}>
                  {analysis.fullActivity} in {analysis.location}
                </Text>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {reelExperiences.slice(0, 8).map((experience, index) => {
                  const imageUrl = (() => {
                    if (experience.source === 'database') {
                      return experience.images && experience.images.length > 0 
                        ? experience.images[0] 
                        : experience.image_url;
                    } else {
                      return experience.imageUrl || experience.image_url;
                    }
                  })();

                  return (
                    <Pressable
                      key={`reel-${experience.source}-${experience.id}-${index}`}
                      style={styles.nearYouFullCard}
                      onPress={() => handleExperiencePress(experience)}
                    >
                      <View style={styles.nearYouImageContainer}>
                        <ExpoImage
                          source={{ uri: imageUrl }}
                          style={styles.nearYouFullImage}
                          contentFit="cover"
                          transition={200}
                        />
                        
                        {/* Dark gradient overlay */}
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.7)']}
                          style={styles.imageGradient}
                        />
                        
                        {/* Badge top-left */}
                        <View style={styles.badgeTopLeft}>
                          <View style={experience.source === 'database' ? styles.sourceBadgeOurs : styles.sourceBadgeViator}>
                            <Text style={styles.sourceBadgeText}>
                              {experience.source === 'database' ? 'BORED TOURIST' : 'VIATOR'}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Price top-right */}
                        <View style={styles.priceOverlay}>
                          <Text style={styles.priceOverlayText}>
                            {experience.price}€
                          </Text>
                        </View>
                        
                        {/* Rating bottom-left */}
                        {(experience.rating || experience.reviewCount) && (
                          <View style={styles.ratingOverlay}>
                            <Star size={14} color="#FFB800" fill="#FFB800" />
                            <Text style={styles.ratingOverlayText}>
                              {(experience.rating || 0).toFixed(1)}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {/* Title outside image */}
                      <View style={styles.nearYouCardContent}>
                        <Text style={styles.nearYouCardTitle} numberOfLines={2}>
                          {experience.title}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Suggested Locations Section - Suggest places to do this activity */}
          {!isSpecificLocation && suggestedLocations.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.suggestedHeader}>
                <Text style={styles.sectionTitle}>🌍 Where to try {analysis?.activity}</Text>
                <Text style={styles.suggestedDescription}>Popular destinations for this experience</Text>
              </View>
              <View style={styles.suggestedGrid}>
                {suggestedLocations.slice(0, 6).map((city, index) => (
                  <Pressable
                    key={`suggested-${index}`}
                    style={styles.suggestedCardVertical}
                    onPress={() => {
                      setUserLocation(city);
                      saveRecentSearch(city);
                      setIsSpecificLocation(true); // Enter specific location mode
                    }}
                  >
                    <ExpoImage
                      source={{ uri: `https://source.unsplash.com/400x400/?${city},travel,landscape` }}
                      style={styles.suggestedImageVertical}
                      contentFit="cover"
                      transition={200}
                    />
                    <View style={styles.suggestedOverlayVertical}>
                      <Text style={styles.suggestedCityNameVertical}>{city}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Experiences for Specific Location */}
          {isSpecificLocation && (
            <View style={styles.specificLocationContainer}>
              <Text style={styles.specificLocationTitle}>Experiences in {userLocation}</Text>
              <View style={styles.experiencesList}>
                {experiences.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      No experiences found in {userLocation}. Try a different location.
                    </Text>
                  </View>
                ) : (
                  experiences.map((experience, index) => {
                    const imageUrl = (() => {
                      if (experience.source === 'database') {
                        return experience.images && experience.images.length > 0 
                          ? experience.images[0] 
                          : experience.image_url;
                      } else {
                        return experience.imageUrl || experience.image_url;
                      }
                    })();
                    
                    const sourceBadge = experience.source === 'database' ? 'Bored Tourist' : 'Viator';
                    const isOurApp = experience.source === 'database';

                    return (
                      <Pressable
                        key={`${experience.source}-${experience.id}-${index}`}
                        style={styles.experienceCard}
                        onPress={() => handleExperiencePress(experience)}
                      >
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
                        
                        <View style={styles.cardContent}>
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
              </View>
            </View>
          )}

          {/* Location Picker Modal (hidden by default) */}
          <View style={styles.locationSection}>
            
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
                            setIsSpecificLocation(true); // Enter specific location mode
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
                            setIsSpecificLocation(true); // Enter specific location mode
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
  },
  compactTitleSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  compactTitleText: {
    fontSize: 18,
    color: '#333',
    lineHeight: 24,
    textAlign: 'left',
    fontWeight: '400',
  },
  compactTitleBold: {
    fontWeight: '700',
    color: '#000',
  },
  asSeenHeader: {
    marginBottom: 16,
    paddingRight: 20,
  },
  asSeenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  asSeenSubtitle: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  sourceBadgeAbsolute: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sourceBadgeTextWhite: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  sectionContainer: {
    marginBottom: 32,
    paddingLeft: 20,
  },
  specificLocationContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  specificLocationTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 20,
  },
  experiencesList: {
    gap: 16,
  },
  experienceCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  cardImageWrapper: {
    width: 120,
    height: 120,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 12,
  },
  cardContent: {
    flex: 1,
    padding: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sourceBadgeViator: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sourceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.5,
  },
  sourceBadgeTextOurs: {
    color: '#000',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
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
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  cardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  cardRatingLabel: {
    fontSize: 12,
    color: '#666',
  },
  nearYouHeader: {
    marginBottom: 16,
    paddingRight: 20,
  },
  nearYouTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernDropdown: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginRight: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 280,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  modalHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalHandleBar: {
    width: 36,
    height: 5,
    backgroundColor: '#3A3A3C',
    borderRadius: 3,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 17,
    color: '#fff',
  },
  modalScroll: {
    flex: 1,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#3A3A3C',
  },
  modalItemText: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '400',
  },
  modalItemSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  searchResultsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#3A3A3C',
    paddingTop: 8,
  },
  modalItemTextActive: {
    fontWeight: '600',
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#48484A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#fff',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  dropdownItemTextActive: {
    fontWeight: '700',
    color: '#000',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  horizontalScroll: {
    paddingRight: 20,
    gap: 12,
  },
  backButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backArrow: {
    fontSize: 24,
    color: '#000',
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  nearYouFullCard: {
    width: 260,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  nearYouImageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  nearYouFullImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  badgeTopLeft: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  priceOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceOverlayText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  ratingOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingOverlayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  nearYouCardContent: {
    padding: 12,
  },
  nearYouCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    lineHeight: 20,
  },
  nearYouCard: {
    width: 280,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
  },
  nearYouImage: {
    width: '100%',
    height: '100%',
  },
  nearYouOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  nearYouLocation: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  suggestedCard: {
    width: 140,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  suggestedImage: {
    width: '100%',
    height: '100%',
  },
  suggestedOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestedImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestedCityName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  suggestedHeader: {
    marginBottom: 16,
  },
  suggestedDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  suggestedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingRight: 20,
  },
  suggestedCardVertical: {
    width: '48%',
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  suggestedImageVertical: {
    width: '100%',
    height: '100%',
  },
  suggestedOverlayVertical: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestedCityNameVertical: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginRight: 20,
    gap: 12,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: '#999',
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
});
