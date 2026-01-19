import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Clipboard,
  Easing,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { PROVIDER_DEFAULT, Marker } from 'react-native-maps';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { Instagram, Plus, Share2, X } from 'lucide-react-native';
import api from '@/services/api';
import ImportTutorialModal from '@/components/ImportTutorialModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_MIN_HEIGHT = 0;
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.75;

interface Activity {
  title: string;
  description: string;
  category: string;
  difficulty?: string;
  duration?: string;
  why_not_boring?: string;
}

interface Spot {
  id: string;
  spot_name: string;
  country: string;
  city?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  activities: Activity[];
  visit_status: 'want_to_go' | 'visited' | 'currently_here';
  instagram_url?: string;
  saved_at: string;
}

interface CountryStats {
  [country: string]: number;
}

interface CountryCluster {
  country: string;
  count: number;
  center: { latitude: number; longitude: number };
  spots: Spot[];
}

interface CityCluster {
  city: string;
  country: string;
  count: number;
  center: { latitude: number; longitude: number };
  spots: Spot[];
}

type ZoomLevel = 'country' | 'city' | 'spot';

export default function MapScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CountryStats>({});
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [instagramLink, setInstagramLink] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('country');
  
  const bottomSheetHeight = useRef(new Animated.Value(BOTTOM_SHEET_MIN_HEIGHT)).current;
  const mapRef = useRef<any>(null);
  
  // Animation for detecting screen
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const scanProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSpots();
    
    // 🔥 Keep Render backend warm - ping every 5 minutes
    const keepAlive = setInterval(async () => {
      try {
        console.log('💓 Pinging backend to keep it warm...');
        await fetch(`${process.env.EXPO_PUBLIC_API_URL}/health`).catch(() => {});
      } catch (error) {
        // Silent fail
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(keepAlive);
  }, [user]);

  // Reload spots when tab becomes visible (after saving a spot)
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        console.log('🔄 Tab focused, reloading spots...');
        loadSpots();
      }
    }, [user?.id])
  );

  useEffect(() => {
    if (selectedSpot) {
      openBottomSheet();
    } else {
      closeBottomSheet();
    }
  }, [selectedSpot]);

  // Scanning line animation for detecting screen
  useEffect(() => {
    if (analyzing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Animate progress bar (30 seconds for video analysis)
      Animated.timing(scanProgress, {
        toValue: 1,
        duration: 30000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    } else {
      scanLineAnim.setValue(0);
      scanProgress.setValue(0);
    }
  }, [analyzing]);

  const loadSpots = async () => {
    if (!user?.id) {
      console.log('⚠️ No user ID, skipping loadSpots');
      return;
    }

    try {
      console.log('📍 Loading spots for user:', user.id);
      console.log('🔑 User object:', JSON.stringify(user, null, 2));
      
      const result = await api.getSpots(user.id);
      
      console.log('📊 API result:', JSON.stringify(result, null, 2));

      if (result.success) {
        console.log('✅ Loaded spots:', result.data?.spots?.length || 0);
        setSpots(result.data?.spots || []);
        setStats(result.data?.by_country || {});
      } else {
        console.error('❌ Failed to load spots:', result.error);
        Alert.alert('Error', result.error || 'Failed to load spots');
      }
    } catch (error) {
      console.error('💥 Error loading spots:', error);
      Alert.alert('Error', `Failed to load spots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const openBottomSheet = () => {
    Animated.spring(bottomSheetHeight, {
      toValue: BOTTOM_SHEET_MAX_HEIGHT,
      useNativeDriver: false,
      tension: 65,
      friction: 7,
    }).start();
  };

  const closeBottomSheet = () => {
    Animated.timing(bottomSheetHeight, {
      toValue: BOTTOM_SHEET_MIN_HEIGHT,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const onMarkerPress = (spot: Spot) => {
    console.log('📍 Pin clicked!', spot.spot_name);
    setSelectedSpot(spot);
    console.log('✅ selectedSpot set:', spot);
    
    // Animate to marker
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: spot.coordinates.latitude,
          longitude: spot.coordinates.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        },
        500
      );
    }
  };

  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'visited':
        return '#4CAF50';
      case 'currently_here':
        return '#FF5722';
      default:
        return '#F4E04D';
    }
  };

  // 🗺️ Group spots by country
  const groupByCountry = (): CountryCluster[] => {
    const countryMap = new Map<string, Spot[]>();
    
    spots.forEach(spot => {
      const country = spot.country;
      if (!countryMap.has(country)) {
        countryMap.set(country, []);
      }
      countryMap.get(country)!.push(spot);
    });

    return Array.from(countryMap.entries()).map(([country, countrySpots]) => {
      // Calculate center as average of all coordinates
      const totalLat = countrySpots.reduce((sum, s) => sum + s.coordinates.latitude, 0);
      const totalLng = countrySpots.reduce((sum, s) => sum + s.coordinates.longitude, 0);
      
      return {
        country,
        count: countrySpots.length,
        center: {
          latitude: totalLat / countrySpots.length,
          longitude: totalLng / countrySpots.length,
        },
        spots: countrySpots,
      };
    });
  };

  // 🏙️ Group spots by city
  const groupByCity = (): CityCluster[] => {
    const cityMap = new Map<string, Spot[]>();
    
    spots.forEach(spot => {
      const city = spot.city || spot.spot_name.split(',')[0]; // Fallback to first part of name
      const key = `${city}, ${spot.country}`;
      if (!cityMap.has(key)) {
        cityMap.set(key, []);
      }
      cityMap.get(key)!.push(spot);
    });

    return Array.from(cityMap.entries()).map(([key, citySpots]) => {
      const [city, country] = key.split(', ');
      const totalLat = citySpots.reduce((sum, s) => sum + s.coordinates.latitude, 0);
      const totalLng = citySpots.reduce((sum, s) => sum + s.coordinates.longitude, 0);
      
      return {
        city,
        country,
        count: citySpots.length,
        center: {
          latitude: totalLat / citySpots.length,
          longitude: totalLng / citySpots.length,
        },
        spots: citySpots,
      };
    });
  };

  // 🔍 Detect zoom level from map region
  const handleRegionChange = (region: any) => {
    const latitudeDelta = region.latitudeDelta;
    
    if (latitudeDelta > 20) {
      setZoomLevel('country');
    } else if (latitudeDelta > 1) {
      setZoomLevel('city');
    } else {
      setZoomLevel('spot');
    }
  };

  const handleAnalyzeLink = async () => {
    if (!instagramLink.trim()) {
      Alert.alert('Error', 'Please paste an Instagram link');
      return;
    }

    setAnalyzing(true);

    try {
      console.log('🎬 Analyzing Instagram video:', instagramLink);
      
      // API service already has auth token from AuthContext
      const data = await api.analyzeInstagramPost({
        url: instagramLink,
        description: ''
      });
      
      console.log('📊 Analysis response:', data);

      if (!data.success || !data.data?.analysis) {
        Alert.alert('Error', 'Could not analyze this video. Please try another one.');
        setAnalyzing(false);
        return;
      }

      const { analysis, detectedSpots } = data.data;
      
      // Validate we got location data
      if (!analysis.location || analysis.location === 'not specified') {
        Alert.alert('Error', 'Could not determine location from this video');
        setAnalyzing(false);
        return;
      }

      console.log('✅ Analysis complete:', {
        activity: analysis.activity,
        location: analysis.location,
        detectedPOIs: detectedSpots?.length || 0
      });

      // Get coordinates via geocoding
      const axios = require('axios');
      let coordinates = { latitude: 0, longitude: 0 };
      
      if (analysis.location && analysis.location !== 'not specified') {
        try {
          const geoResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
              q: analysis.location,
              format: 'json',
              limit: 1
            },
            headers: {
              'User-Agent': 'BoredTouristApp/1.0'
            },
            timeout: 5000
          });
          
          if (geoResponse.data && geoResponse.data[0]) {
            coordinates.latitude = parseFloat(geoResponse.data[0].lat);
            coordinates.longitude = parseFloat(geoResponse.data[0].lon);
            console.log('📍 Geocoded coordinates:', coordinates);
          }
        } catch (geoError) {
          console.error('Geocoding error:', geoError);
        }
      }

      // Navigate to spot result page with POI data
      setAnalyzing(false);
      setShowLinkInput(false);
      setInstagramLink('');
      
      console.log('📍 POIs detected:', data.data.detectedSpots?.length || 0);
      console.log('📸 Thumbnail:', data.data.analysis?.thumbnailUrl);
      
      router.push({
        pathname: '/spot-result',
        params: {
          location: analysis.location,
          activity: analysis.activity,
          confidence: analysis.confidence,
          instagramUrl: instagramLink,
          thumbnailUrl: data.data.analysis?.thumbnailUrl || '',
          pois: JSON.stringify(data.data.detectedSpots || [])
        }
      });
    } catch (error: any) {
      console.error('❌ Error analyzing link:', error);
      Alert.alert(
        'Error', 
        error.message || 'Failed to analyze video. Please check your internet connection.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleShowTutorial = () => {
    setShowLinkInput(false);
    setShowTutorialModal(true);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#F4E04D" />
        <Text style={styles.loadingText}>Loading your spots...</Text>
      </View>
    );
  }

  const totalSpots = spots.length;
  const totalCountries = Object.keys(stats).length;

  console.log('🗺️ Rendering map with', totalSpots, 'spots');
  console.log('📍 Spots data:', JSON.stringify(spots, null, 2));

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: 38.7223,
          longitude: -9.1393,
          latitudeDelta: 50,
          longitudeDelta: 50,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChangeComplete={handleRegionChange}
        onPress={() => {
          console.log('🗺️ Map pressed - closing bottom sheet');
          setSelectedSpot(null);
        }}
      >
        {/* 🌍 COUNTRY LEVEL - Zoom Out */}
        {zoomLevel === 'country' && groupByCountry().map((cluster) => (
          <Marker
            key={`country-${cluster.country}`}
            coordinate={cluster.center}
            tracksViewChanges={false}
            onPress={() => {
              // Zoom into country
              mapRef.current?.animateToRegion({
                latitude: cluster.center.latitude,
                longitude: cluster.center.longitude,
                latitudeDelta: 10,
                longitudeDelta: 10,
              }, 500);
            }}
          >
            <View style={styles.countryBadge}>
              <Text style={styles.countryName}>{cluster.country}</Text>
              <View style={styles.countBubble}>
                <Text style={styles.countText}>{cluster.count}</Text>
              </View>
            </View>
          </Marker>
        ))}

        {/* 🏙️ CITY LEVEL - Medium Zoom */}
        {zoomLevel === 'city' && groupByCity().map((cluster) => (
          <Marker
            key={`city-${cluster.city}-${cluster.country}`}
            coordinate={cluster.center}
            tracksViewChanges={false}
            onPress={() => {
              // Zoom into city
              mapRef.current?.animateToRegion({
                latitude: cluster.center.latitude,
                longitude: cluster.center.longitude,
                latitudeDelta: 0.5,
                longitudeDelta: 0.5,
              }, 500);
            }}
          >
            <View style={styles.cityBadge}>
              <Text style={styles.cityName}>{cluster.city}</Text>
              <View style={styles.countBubble}>
                <Text style={styles.countText}>{cluster.count}</Text>
              </View>
            </View>
          </Marker>
        ))}

        {/* 📍 SPOT LEVEL - Zoomed In */}
        {zoomLevel === 'spot' && spots.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={{
              latitude: spot.coordinates.latitude,
              longitude: spot.coordinates.longitude,
            }}
            pinColor={getMarkerColor(spot.visit_status)}
            tracksViewChanges={false}
            title={spot.spot_name}
            onPress={() => onMarkerPress(spot)}
          />
        ))}
      </MapView>

      {/* Debug: Reload button */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: 60,
          right: 20,
          backgroundColor: '#F4E04D',
          padding: 15,
          borderRadius: 30,
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        }}
        onPress={() => {
          console.log('🔄 Manual reload triggered');
          loadSpots();
        }}
      >
        <Text style={{ fontSize: 20 }}>🔄</Text>
      </TouchableOpacity>

      {/* Empty State */}
      {totalSpots === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No spots saved yet</Text>
          <Text style={styles.emptySubtitle}>
            Analyze an Instagram video to discover and save cool spots!
          </Text>
        </View>
      )}

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            height: bottomSheetHeight,
          },
        ]}
      >
        {selectedSpot && (
          <>
            {/* Handle Bar */}
            <View style={styles.handleBar} />

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedSpot(null)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            {/* Content */}
            <ScrollView 
              style={styles.bottomSheetContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.spotName}>{selectedSpot.spot_name}</Text>

              {/* Quick Info */}
              <View style={styles.quickInfo}>
                <View style={styles.quickInfoItem}>
                  <Text style={styles.quickInfoLabel}>📍</Text>
                  <Text style={styles.quickInfoText}>
                    {selectedSpot.city || 'Other'}
                  </Text>
                </View>

                {selectedSpot.instagram_url && (
                  <TouchableOpacity 
                    style={styles.quickInfoItem}
                    onPress={() => {
                      // Open Instagram URL
                      console.log('Open Instagram:', selectedSpot.instagram_url);
                    }}
                  >
                    <Instagram size={16} color="#E1306C" />
                    <Text style={styles.quickInfoText}>
                      You saved this place {spots.filter(s => s.country === selectedSpot.country).length}x
                    </Text>
                    <Text style={styles.quickInfoArrow}>↗</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Activities */}
              <View style={styles.activitiesSection}>
                <Text style={styles.sectionTitle}>
                  {selectedSpot.activities?.length || 0} Cool Activities to Do Here
                </Text>
                {selectedSpot.activities?.slice(0, 3).map((activity: any, index: number) => {
                  const getEmoji = (category: string) => {
                    const cat = category?.toLowerCase() || '';
                    if (cat.includes('water') || cat.includes('surf') || cat.includes('dive')) return '🌊';
                    if (cat.includes('hike') || cat.includes('walk') || cat.includes('trek')) return '🥾';
                    if (cat.includes('food') || cat.includes('restaurant')) return '🍽️';
                    if (cat.includes('adventure')) return '⚡';
                    if (cat.includes('culture')) return '🎭';
                    if (cat.includes('nature')) return '🌿';
                    if (cat.includes('beach')) return '🏖️';
                    if (cat.includes('view')) return '🌅';
                    return '✨';
                  };

                  return (
                    <View key={index} style={styles.activityCard}>
                      <View style={styles.activityHeader}>
                        <Text style={styles.activityEmoji}>{getEmoji(activity.category)}</Text>
                        <View style={styles.activityContent}>
                          <Text style={styles.activityTitle}>{activity.title || activity.activity}</Text>
                          <Text style={styles.activityDescription} numberOfLines={3}>
                            {activity.description || activity.why_not_boring}
                          </Text>
                          {(activity.difficulty || activity.duration) && (
                            <Text style={styles.activityMeta}>
                              {activity.difficulty} {activity.difficulty && activity.duration ? '•' : ''} {activity.duration}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </>
        )}
      </Animated.View>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowLinkInput(true)}
      >
        <Plus size={28} color="#000" />
      </TouchableOpacity>

      {/* Detecting/Analyzing Screen */}
      {analyzing && (
        <View style={styles.detectingContainer}>
          <Pressable 
            onPress={() => {
              setAnalyzing(false);
              setInstagramLink('');
            }} 
            style={styles.detectingCloseButton}
          >
            <X size={24} color="#333" />
          </Pressable>

          <Text style={styles.detectingLogo}>Bored Tourist</Text>

          <View style={styles.scanContainer}>
            <Text style={styles.emojiLeft}>🏛️</Text>
            
            <View style={styles.scanBox}>
              <Text style={styles.scanEmoji}>🗺️</Text>
              
              <Animated.View 
                style={[
                  styles.scanLine,
                  {
                    transform: [{
                      translateY: scanLineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 50],
                      })
                    }]
                  }
                ]} 
              />
              
              <View style={[styles.scanCorner, styles.scanCornerTL]} />
              <View style={[styles.scanCorner, styles.scanCornerTR]} />
              <View style={[styles.scanCorner, styles.scanCornerBL]} />
              <View style={[styles.scanCorner, styles.scanCornerBR]} />
            </View>
            
            <Text style={styles.emojiRight}>🎭</Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressDot} />
            <View style={styles.progressBarBg}>
              <Animated.View 
                style={[
                  styles.progressBarFill,
                  {
                    width: scanProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    })
                  }
                ]} 
              />
            </View>
          </View>

          <Text style={styles.detectingText}>Detecting....</Text>
        </View>
      )}

      {/* Link Input Modal - Bottom Sheet */}
      <Modal
        visible={showLinkInput && !analyzing}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowLinkInput(false);
          setInstagramLink('');
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => {
              setShowLinkInput(false);
              setInstagramLink('');
            }}
          >
            <Pressable 
              style={styles.bottomSheetModal}
              onPress={(e) => e.stopPropagation()}
            >
            {/* Header with close and "Do it faster" */}
            <View style={styles.bottomSheetHeader}>
              <Pressable
                onPress={() => {
                  setShowLinkInput(false);
                  setInstagramLink('');
                }}
                style={styles.closeButtonTop}
              >
                <X size={24} color="#000" />
              </Pressable>
              
              <Pressable
                style={styles.tutorialButton}
                onPress={() => {
                  setShowLinkInput(false);
                  handleShowTutorial();
                }}
              >
                <Text style={styles.tutorialButtonText}>Do it faster</Text>
              </Pressable>
            </View>

            {/* Title */}
            <Text style={styles.bottomSheetTitle}>Import experiences from Instagram 📸</Text>

            {/* Input */}
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.bottomSheetInput}
                placeholder="Paste Instagram reel URL"
                placeholderTextColor="#999"
                value={instagramLink}
                onChangeText={setInstagramLink}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                autoFocus
              />
            </View>

            {/* Analyse button */}
            <TouchableOpacity
              style={[
                styles.analyseButton,
                !instagramLink.trim() && styles.analyseButtonDisabled
              ]}
              onPress={handleAnalyzeLink}
              disabled={!instagramLink.trim()}
            >
              <Text style={styles.analyseButtonText}>Analyse</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Tutorial Modal */}
      <ImportTutorialModal
        visible={showTutorialModal}
        onClose={() => setShowTutorialModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
  },
  loadingText: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
  map: {
    flex: 1,
  },
  emptyState: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 20,
    paddingVertical: 40,
    borderRadius: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: '600',
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  spotName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  quickInfo: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 24,
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickInfoLabel: {
    fontSize: 16,
  },
  quickInfoText: {
    fontSize: 14,
    color: '#666',
  },
  quickInfoArrow: {
    fontSize: 16,
    color: '#999',
    marginLeft: 'auto',
  },
  activitiesSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  activitiesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  activityCard: {
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  activityDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 8,
  },
  activityMeta: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F4E04D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal styles - Bottom Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
    minHeight: 340,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 8,
  },
  closeButtonTop: {
    padding: 8,
  },
  tutorialButton: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tutorialButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomSheetTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 24,
  },
  inputWrapper: {
    marginBottom: 24,
  },
  bottomSheetInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    color: '#000',
  },
  analyseButton: {
    backgroundColor: '#FFD60A',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  analyseButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  analyseButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  linkInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 500,
  },
  linkInputTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  linkInputSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  linkInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#000',
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  socialsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  socialsButtonText: {
    fontSize: 14,
    color: '#666',
  },
  linkInputButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  linkInputButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkInputButtonSecondary: {
    backgroundColor: '#F0F0F0',
  },
  linkInputButtonPrimary: {
    backgroundColor: '#F4E04D',
  },
  linkInputButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  linkInputButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  // Detecting screen styles
  detectingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  detectingCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detectingLogo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F4E04D',
    position: 'absolute',
    top: 120,
  },
  scanContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  emojiLeft: {
    fontSize: 64,
  },
  emojiRight: {
    fontSize: 64,
  },
  scanBox: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  scanEmoji: {
    fontSize: 80,
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 3,
    backgroundColor: '#4A90E2',
    opacity: 0.6,
  },
  scanCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4A90E2',
  },
  scanCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  scanCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  scanCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  scanCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginTop: 60,
    gap: 12,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#000',
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#000',
  },
  detectingText: {
    fontSize: 20,
    color: '#666',
    marginTop: 40,
  },
  // 🗺️ Hierarchical Cluster Badges
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    gap: 8,
  },
  countryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    gap: 6,
  },
  cityName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  countBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
});
