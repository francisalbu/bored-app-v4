import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  Modal,
  TextInput,
  Keyboard,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { Clock, Trash2, Plus, X } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '@/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding

// Activity icons from Google Cloud Storage - all 14 icons
const ACTIVITY_ICONS = [
  'https://storage.googleapis.com/bored_tourist_media/images/Icons_Activities/icon_surfing.png',
  'https://storage.googleapis.com/bored_tourist_media/images/Icons_Activities/icon_diving.png',
  'https://storage.googleapis.com/bored_tourist_media/images/Icons_Activities/icon_yoga.png',
  'https://storage.googleapis.com/bored_tourist_media/images/Icons_Activities/icon_kayak.png',
  'https://storage.googleapis.com/bored_tourist_media/images/Icons_Activities/icon_hiking.png',
  'https://storage.googleapis.com/bored_tourist_media/images/Icons_Activities/icon_quadbike.png',
  'https://storage.googleapis.com/bored_tourist_media/images/Icons_Activities/icon_skydiving.png',
  'https://storage.googleapis.com/bored_tourist_media/images/Icons_Activities/icon_horse_riding.png',
  'https://storage.googleapis.com/bored_tourist_media/images/Icons_Activities/icon_wine_tasting.png',
  'https://storage.googleapis.com/bored_tourist_media/images/Icons_Activities/icon_cave_tour.png',
  'https://storage.googleapis.com/bored_tourist_media/images/Icons_Activities/icon_fishing.png',
  'https://storage.googleapis.com/bored_tourist_media/images/Icons_Activities/icon_snowboarding.png',
  'https://storage.googleapis.com/bored_tourist_media/images/Icons_Activities/icon_golf.png',
  'https://storage.googleapis.com/bored_tourist_media/images/Icons_Activities/icon_grape_harvest.png',
];

interface HistoryItem {
  activity: string;
  fullActivity: string;
  location: string;
  thumbnail: string | null;
  lastSearched: string;
  searchCount: number;
  // Store all data needed to recreate the find-activity screen
  analysis: string;
  experiences: string;
  instagramUrl: string;
}

const HISTORY_STORAGE_KEY = '@bored_search_history';

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [instagramLink, setInstagramLink] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  
  // Animation refs for detecting screen
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const scanProgress = useRef(new Animated.Value(0)).current;
  const iconScrollAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    loadHistory();
  }, []);

  // Reset analyzing state when returning to this screen
  useFocusEffect(
    useCallback(() => {
      // When screen gains focus, ensure analyzing modal is closed
      setAnalyzing(false);
      setInstagramLink('');
      // Reload history to get latest searches
      loadHistory();
    }, [])
  );

  // Scanning line animation for detecting screen
  useEffect(() => {
    if (analyzing) {
      // Scan line animation - continuous loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Progress bar animation (30 seconds for video analysis)
      Animated.timing(scanProgress, {
        toValue: 1,
        duration: 30000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
      
      // Icon carousel animation - continuous loop, slower for visibility
      const startIconLoop = () => {
        iconScrollAnim.setValue(0);
        Animated.loop(
          Animated.timing(iconScrollAnim, {
            toValue: 1,
            duration: 8000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ).start();
      };
      startIconLoop();
    } else {
      scanLineAnim.setValue(0);
      scanProgress.setValue(0);
      iconScrollAnim.setValue(0);
    }
  }, [analyzing]);

  const loadHistory = async () => {
    try {
      const historyJson = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      if (historyJson) {
        const historyData = JSON.parse(historyJson);
        
        // DEBUG: Log each item's thumbnail
        console.log('🔍 LOADING HISTORY - DEBUG:');
        historyData.forEach((item: HistoryItem, index: number) => {
          const thumbPreview = item.thumbnail 
            ? (item.thumbnail.startsWith('http') 
                ? `URL: ${item.thumbnail.substring(0, 60)}...` 
                : `BASE64: ${item.thumbnail.substring(0, 50)}...`)
            : 'NULL';
          console.log(`[${index}] ${item.activity}: ${thumbPreview}`);
        });
        
        // Sort by lastSearched (most recent first)
        const sorted = historyData.sort((a: HistoryItem, b: HistoryItem) => 
          new Date(b.lastSearched).getTime() - new Date(a.lastSearched).getTime()
        );
        setHistory(sorted);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const handleCardPress = (item: HistoryItem) => {
    // Navigate instantly - no loading needed for saved items
    // The find-activity screen will fetch fresh sections in background
    router.push({
      pathname: '/find-activity',
      params: {
        activity: item.activity,
        analysis: item.analysis,
        experiences: item.experiences,
        instagramUrl: item.instagramUrl,
        thumbnail: item.thumbnail || '',
        fromHistory: 'true' // Flag to indicate coming from history
      },
    });
  };

  const handleDeleteItem = async (activity: string) => {
    try {
      const filtered = history.filter(item => item.activity !== activity);
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered));
      setHistory(filtered);
    } catch (error) {
      console.error('Failed to delete history item:', error);
    }
  };

  const clearAllHistory = async () => {
    try {
      await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
      setHistory([]);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const handleAnalyzeLink = async () => {
    if (!instagramLink.trim()) {
      Alert.alert('Error', 'Please enter an Instagram link');
      return;
    }

    const urlToAnalyze = instagramLink.trim();
    setShowLinkInput(false);
    setAnalyzing(true);
    Keyboard.dismiss();

    try {
      console.log('🎬 Step 1: Calling experience-recommendations API...');
      
      // Step 1: Analyze the video and get initial recommendations
      const response = await apiService.post('/experience-recommendations', {
        instagramUrl: urlToAnalyze,
        userLocation: 'Lisboa'
      });
      
      if (response.success && response.data) {
        console.log('✅ Got initial recommendations:', response.data);
        
        // Extract base activity from detailed description
        const getBaseActivity = (activityString: string): string => {
          const activity = activityString.toLowerCase();
          if (activity.includes('snorkel')) return 'snorkeling';
          if (activity.includes('dive') || activity.includes('diving')) return 'diving';
          if (activity.includes('surf')) return 'surfing';
          if (activity.includes('kayak')) return 'kayaking';
          if (activity.includes('paddle')) return 'paddleboarding';
          if (activity.includes('hike') || activity.includes('hiking') || activity.includes('trek')) return 'hiking';
          if (activity.includes('climb')) return 'climbing';
          if (activity.includes('bike') || activity.includes('cycling') || activity.includes('biking')) return 'biking';
          if (activity.includes('ski')) return 'skiing';
          if (activity.includes('snowboard')) return 'snowboarding';
          if (activity.includes('paraglid')) return 'paragliding';
          if (activity.includes('skydiv')) return 'skydiving';
          if (activity.includes('yoga')) return 'yoga';
          if (activity.includes('sail')) return 'sailing';
          return activity.split(' ')[0];
        };
        
        const originalActivity = response.data.analysis.activity;
        const baseActivity = originalActivity ? getBaseActivity(originalActivity) : null;
        const reelLocation = response.data.analysis.location;
        const isLandscape = response.data.analysis.type === 'landscape';
        
        const processedAnalysis = {
          ...response.data.analysis,
          fullActivity: originalActivity,
          activity: baseActivity
        };
        
        console.log('🎯 Base activity:', baseActivity);
        console.log('🌍 Reel location:', reelLocation);
        console.log('🏔️ Is landscape:', isLandscape);
        
        // For landscapes, we already have what we need
        if (isLandscape) {
          console.log('🏔️ Landscape mode - navigating with initial data');
          setInstagramLink('');
          router.replace({
            pathname: '/find-activity',
            params: {
              instagramUrl: urlToAnalyze,
              thumbnail: response.data.analysis?.thumbnailUrl || '',
              activity: '',
              experiences: JSON.stringify(response.data.experiences),
              nearYouExperiences: JSON.stringify(response.data.experiences),
              reelExperiences: JSON.stringify([]),
              analysis: JSON.stringify(processedAnalysis),
              allDataLoaded: 'true'
            }
          });
          return;
        }
        
        // Step 2: Fetch Near You and As Seen on Reel in parallel
        console.log('🎬 Step 2: Fetching Near You and As Seen on Reel...');
        
        const [nearYouResponse, reelResponse] = await Promise.all([
          // Near You: activity + user location (Lisboa)
          apiService.post('/experience-recommendations/by-activity', {
            activity: baseActivity,
            userLocation: 'Lisboa',
            strictActivityMatch: true,
            prioritizeBored: true
          }),
          // As Seen on Reel: full activity + reel location
          apiService.post('/experience-recommendations/by-activity', {
            activity: originalActivity,
            userLocation: reelLocation || null,
            prioritizeBored: false
          })
        ]);
        
        const nearYouExperiences = nearYouResponse.data?.experiences || response.data.experiences || [];
        const reelExperiences = reelResponse.data?.experiences || [];
        
        console.log('✅ Near You:', nearYouExperiences.length, 'experiences');
        console.log('✅ As Seen on Reel:', reelExperiences.length, 'experiences');
        
        // Navigate with ALL data ready
        setInstagramLink('');
        router.replace({
          pathname: '/find-activity',
          params: {
            instagramUrl: urlToAnalyze,
            thumbnail: response.data.analysis?.thumbnailUrl || '',
            activity: baseActivity || '',
            experiences: JSON.stringify(response.data.experiences),
            nearYouExperiences: JSON.stringify(nearYouExperiences),
            reelExperiences: JSON.stringify(reelExperiences),
            analysis: JSON.stringify(processedAnalysis),
            allDataLoaded: 'true' // Flag to skip additional fetches
          }
        });
      } else {
        // Fallback: navigate anyway
        setInstagramLink('');
        router.replace({
          pathname: '/find-activity',
          params: {
            instagramUrl: urlToAnalyze,
            thumbnail: '',
          }
        });
      }
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Error', 'Failed to analyze link. Please try again.');
      // Only close modal on error
      setAnalyzing(false);
      setInstagramLink('');
    }
  };

  const getActivityImage = (activity: string) => {
    // Map activities to representative images
    const activityImages: { [key: string]: string } = {
      'surfing': 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=400&h=600&fit=crop',
      'surf': 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=400&h=600&fit=crop',
      'sandboarding': 'https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?w=400&h=600&fit=crop',
      'sandboard': 'https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?w=400&h=600&fit=crop',
      'sand': 'https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?w=400&h=600&fit=crop',
      'hiking': 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=600&fit=crop',
      'cooking': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=600&fit=crop',
      'diving': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=600&fit=crop',
      'scuba': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=600&fit=crop',
      'climbing': 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=400&h=600&fit=crop',
      'kayak': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=600&fit=crop',
      'yoga': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=600&fit=crop',
      'zip': 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=600&fit=crop',
      'zipline': 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=600&fit=crop',
      'zip-line': 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=600&fit=crop',
      'ziplining': 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=600&fit=crop',
      'paragliding': 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=400&h=600&fit=crop',
      'skydiving': 'https://images.unsplash.com/photo-1521651201144-634f700b36ef?w=400&h=600&fit=crop',
      'biking': 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=400&h=600&fit=crop',
      'cycling': 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=400&h=600&fit=crop',
    };

    const normalizedActivity = activity.toLowerCase();
    
    for (const [key, image] of Object.entries(activityImages)) {
      if (normalizedActivity.includes(key)) {
        return image;
      }
    }

    // Return null so the fallback in renderHistoryCard works
    return null;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const renderHistoryCard = ({ item }: { item: HistoryItem }) => {
    // Priority: 1) Real thumbnail from reel, 2) Activity-specific icon, 3) Generic adventure placeholder
    // Handle base64 images (first frame from video)
    let imageUrl = item.thumbnail;
    
    // If thumbnail is base64, prepend data URI prefix
    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
      imageUrl = `data:image/jpeg;base64,${imageUrl}`;
    }
    
    // Fallback chain: thumbnail → activity image → generic placeholder
    const activityImage = getActivityImage(item.activity);
    const finalImageUrl = imageUrl || activityImage || 'https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?w=400&h=600&fit=crop';

    return (
      <TouchableOpacity
        style={styles.premiumCard}
        onPress={() => handleCardPress(item)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: finalImageUrl }}
          style={styles.premiumCardImage}
          resizeMode="cover"
        />
        <View style={styles.premiumCardOverlay}>
          <View style={styles.premiumCardContent}>
            <Text style={styles.premiumActivityName} numberOfLines={1}>
              {item.fullActivity || item.activity}
            </Text>
            <Text style={styles.premiumTimeText}>Saved {formatDate(item.lastSearched)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.premiumDeleteButton}
          onPress={() => handleDeleteItem(item.activity)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 size={18} color="#fff" />
        </TouchableOpacity>
        {item.searchCount > 1 && (
          <View style={styles.premiumCountBadge}>
            <Text style={styles.premiumCountText}>{item.searchCount}x</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>�️</Text>
      <Text style={styles.emptyTitle}>No adventures yet</Text>
      <Text style={styles.emptyText}>
        Convert Instagram reels to experiences{'\n'}and save them here!
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Your Collection</Text>
          <Text style={styles.subtitle}>
            {history.length} {history.length === 1 ? 'adventure' : 'adventures'}
          </Text>
        </View>
        {history.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearAllHistory}
          >
            <Trash2 size={20} color="#888" />
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryCard}
          keyExtractor={(item) => item.activity}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowLinkInput(true)}
      >
        <Plus size={28} color="#000" />
      </TouchableOpacity>

      {/* Link Input Modal - Bottom Sheet */}
      <Modal
        visible={showLinkInput}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLinkInput(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowLinkInput(false);
              setInstagramLink('');
            }}
          />
          <View style={styles.modalBottomSheet}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIcon}>
                  <Ionicons name="link" size={20} color="#F4E04D" />
                </View>
                <Text style={styles.modalTitle}>Add Instagram Link</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowLinkInput(false);
                  setInstagramLink('');
                }}
              >
                <Ionicons name="close" size={20} color="#888" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <TextInput
                style={styles.input}
                placeholder="Paste Instagram reel URL..."
                placeholderTextColor="#666"
                value={instagramLink}
                onChangeText={setInstagramLink}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                multiline={false}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowLinkInput(false);
                    setInstagramLink('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.analyzeButton]}
                  onPress={handleAnalyzeLink}
                >
                  <Text style={styles.analyzeButtonText}>Discover</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Analyzing Modal - Premium X-Ray Screen */}
      <Modal
        visible={analyzing}
        transparent={false}
        animationType="fade"
      >
        <View style={styles.loadingScreen}>
          <Pressable 
            onPress={() => {
              setAnalyzing(false);
              setInstagramLink('');
            }} 
            style={styles.loadingCloseButton}
          >
            <X size={24} color="#333" />
          </Pressable>

          <Text style={styles.boredTouristBrand}>Bored Tourist</Text>
          
          {/* X-Ray Container - Icons scroll through the middle */}
          <View style={styles.xrayContainer}>
            {/* Scrolling Icons - Full width, passes through scan area */}
            <Animated.View 
              style={[
                styles.iconCarousel,
                {
                  transform: [{
                    translateX: iconScrollAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, -ACTIVITY_ICONS.length * 75],
                    })
                  }]
                }
              ]}
            >
              {[...ACTIVITY_ICONS, ...ACTIVITY_ICONS, ...ACTIVITY_ICONS].map((iconUrl, index) => (
                <Image
                  key={`icon-${index}`}
                  source={{ uri: iconUrl }}
                  style={styles.carouselIcon}
                />
              ))}
            </Animated.View>
            
            {/* Scan Box Frame - overlays the icons */}
            <View style={styles.scanFrame}>
              {/* Scanning line */}
              <Animated.View 
                style={[
                  styles.scanLine,
                  {
                    transform: [{
                      translateY: scanLineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-60, 60],
                      })
                    }]
                  }
                ]} 
              />
              
              {/* Corner brackets */}
              <View style={[styles.scanCorner, styles.scanCornerTL]} />
              <View style={[styles.scanCorner, styles.scanCornerTR]} />
              <View style={[styles.scanCorner, styles.scanCornerBL]} />
              <View style={[styles.scanCorner, styles.scanCornerBR]} />
            </View>
          </View>

          {/* Progress bar */}
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
          
          <Text style={styles.findingText}>Analyzing video & finding activities...</Text>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginTop: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  clearButton: {
    position: 'absolute',
    right: 20,
    top: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#1a1a1a',
  },
  clearButtonText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  // Premium card styles
  premiumCard: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  premiumCardImage: {
    width: '100%',
    height: '100%',
  },
  premiumCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'flex-end',
  },
  premiumCardContent: {
    padding: 20,
  },
  premiumActivityName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  premiumTimeText: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.8,
    fontWeight: '400',
  },
  premiumDeleteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 10,
    borderRadius: 24,
  },
  premiumCountBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  premiumCountText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalBottomSheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 224, 77, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#2a2a2a',
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  analyzeButton: {
    backgroundColor: '#F4E04D',
  },
  analyzeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  // Premium X-Ray loading screen
  loadingScreen: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  loadingCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  boredTouristBrand: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F4E04D',
    letterSpacing: 1,
    marginBottom: 50,
  },
  // X-Ray container holds icons and scan frame
  xrayContainer: {
    width: SCREEN_WIDTH,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
  },
  // Scrolling icons row
  iconCarousel: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    gap: 20,
  },
  carouselIcon: {
    width: 55,
    height: 55,
    resizeMode: 'contain',
  },
  // Scan frame overlays the icons
  scanFrame: {
    width: 200,
    height: 140,
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 3,
    backgroundColor: '#4A90D9',
    shadowColor: '#4A90D9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  scanCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4A90D9',
    borderWidth: 3,
  },
  scanCornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 16,
  },
  scanCornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 16,
  },
  scanCornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
  },
  scanCornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 16,
  },
  // Progress bar styles
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '70%',
    marginBottom: 20,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#333',
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#888',
    borderRadius: 2,
  },
  findingText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
});
