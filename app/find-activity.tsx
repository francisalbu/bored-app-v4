import React, { useState, useEffect, useRef } from 'react';
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
import * as Location from 'expo-location';
import colors from '@/constants/colors';
import api from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';

// Import activities database with destinations and photos
import activitiesDatabase from '@/assets/COMPLETE_ACTIVITIES_DATABASE_WITH_PHOTOS.json';

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
  activity: string | null; // Can be null for landscape
  location: string;
  confidence: number;
  fullActivity?: string | null; // Original detailed activity from reel (null for landscape)
}

// Destination from activities database JSON
interface ActivityDestination {
  location: string;
  photo_url: string;
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
  const fromSource = params.from as string; // Track where we came from
  const allDataLoaded = params.allDataLoaded === 'true'; // Flag to skip additional fetches
  const fromHistory = params.fromHistory === 'true'; // Coming from history - show data immediately
  
  // Check if data was passed from shared-content or history
  const preloadedExperiences = params.experiences ? JSON.parse(params.experiences as string) : null;
  const preloadedNearYou = params.nearYouExperiences ? JSON.parse(params.nearYouExperiences as string) : null;
  const preloadedReel = params.reelExperiences ? JSON.parse(params.reelExperiences as string) : null;
  const rawPreloadedAnalysis = params.analysis ? JSON.parse(params.analysis as string) : null;
  
  // Process preloaded analysis to ensure fullActivity and base activity are set
  const preloadedAnalysis = rawPreloadedAnalysis ? {
    ...rawPreloadedAnalysis,
    fullActivity: rawPreloadedAnalysis.fullActivity || rawPreloadedAnalysis.activity, // Ensure fullActivity is set
    activity: rawPreloadedAnalysis.activity // Base activity (already processed in shared-content)
  } : null;
  
  const [userLocation, setUserLocation] = useState('Lisboa');
  const [userGpsCoords, setUserGpsCoords] = useState<{ lat: number; lng: number } | null>(null); // GPS coordinates
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showNearYouDropdown, setShowNearYouDropdown] = useState(false);
  const [nearYouSearch, setNearYouSearch] = useState('');
  const [globalCityResults, setGlobalCityResults] = useState<Array<{name: string, country: string}>>([]);
  const [searchingCities, setSearchingCities] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSpecificLocation, setIsSpecificLocation] = useState(false); // Track if viewing specific location
  
  // Separate states for 3 sections - use preloaded data if available
  const [nearYouExperiences, setNearYouExperiences] = useState<Experience[]>(preloadedNearYou || preloadedExperiences || []);
  const [reelExperiences, setReelExperiences] = useState<Experience[]>(preloadedReel || []);
  const [suggestedLocations, setSuggestedLocations] = useState<ActivityDestination[]>([]);
  
  const [experiences, setExperiences] = useState<Experience[]>(preloadedExperiences || []); // Keep for compatibility
  const [analysis, setAnalysis] = useState<Analysis | null>(preloadedAnalysis);
  const [loading, setLoading] = useState(false); // For manual location changes
  const [fetchingSections, setFetchingSections] = useState(!allDataLoaded && !!preloadedAnalysis); // Show loading when fetching 3 sections
  const [hasAnalyzed, setHasAnalyzed] = useState(!!preloadedExperiences);
  const [hasFetchedSections, setHasFetchedSections] = useState(allDataLoaded); // Skip fetch if all data already loaded
  const [favorites, setFavorites] = useState<Set<string | number>>(new Set());
  
  // Rating system states
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  
  const cities = ['New York', 'Los Angeles', 'Miami', 'Washington DC', 'Boston', 'Atlanta', 'Lisboa', 'Porto', 'Barcelona', 'Madrid', 'Paris', 'London', 'Rome', 'Amsterdam'];
  
  // Save search to history
  const saveToHistory = async (activity: string, fullActivity: string, location: string, thumbnail: string | null) => {
    try {
      const HISTORY_STORAGE_KEY = '@bored_search_history';
      const historyJson = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      const history = historyJson ? JSON.parse(historyJson) : [];
      
      // Check if activity already exists
      const existingIndex = history.findIndex((item: any) => item.activity === activity);
      
      // Process thumbnail: 
      // 1. NEVER save Instagram CDN URLs (they expire)
      // 2. Only save base64 if < 75KB
      // 3. Otherwise null → will use activity image fallback
      let processedThumbnail = thumbnail;
      
      if (thumbnail) {
        // Check if it's an Instagram CDN URL (these expire!)
        if (thumbnail.startsWith('http') && thumbnail.includes('cdninstagram')) {
          console.log('⚠️ Instagram CDN URL detected - not saving (will expire). Using fallback.');
          processedThumbnail = null; // Will fallback to activity image in history.tsx
        } else if (thumbnail.startsWith('http')) {
          // Other HTTP URLs (not Instagram) - keep them
          console.log('✅ External URL thumbnail - saving:', thumbnail.substring(0, 80));
          processedThumbnail = thumbnail;
        } else {
          // It's base64 - check size
          const base64Size = thumbnail.length;
          if (base64Size > 100000) { // > ~75KB when decoded
            console.log(`⚠️ Base64 thumbnail too large (${Math.round(base64Size/1024)}KB) - not saving to history`);
            processedThumbnail = null; // Will fallback to activity image in history.tsx
          } else {
            console.log(`✅ Base64 thumbnail OK (${Math.round(base64Size/1024)}KB) - saving for ${activity}`);
          }
        }
      } else {
        console.log(`⚠️ No thumbnail provided for ${activity}`);
      }
      
      const historyItem = {
        activity,
        fullActivity,
        location,
        thumbnail: processedThumbnail,
        lastSearched: new Date().toISOString(),
        searchCount: existingIndex >= 0 ? history[existingIndex].searchCount + 1 : 1,
        // Store all params needed to recreate find-activity screen
        analysis: params.analysis as string,
        experiences: params.experiences as string,
        instagramUrl: params.instagramUrl as string || '',
      };
      
      console.log(`💾 Saving to history: ${activity}, thumbnail: ${processedThumbnail ? (processedThumbnail.startsWith('http') ? 'URL' : 'base64') : 'NULL'}`);
      
      if (existingIndex >= 0) {
        // Update existing item - ALWAYS update thumbnail with new one
        history[existingIndex] = historyItem;
        console.log(`♻️ Updated existing activity: ${activity}`);
      } else {
        // Add new item
        history.unshift(historyItem);
        console.log(`➕ Added new activity: ${activity}`);
      }
      
      // Keep only last 50 searches
      const trimmedHistory = history.slice(0, 50);
      
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmedHistory));
      console.log('✅ Saved to history:', activity, processedThumbnail ? '(with thumbnail)' : '(without thumbnail - will use activity image)');
      
      // ALSO save to Supabase for centralized tracking
      try {
        const deviceId = Application.androidId || await Application.getIosIdForVendorAsync() || 'unknown';
        
        const analysisData = params.analysis ? JSON.parse(params.analysis as string) : null;
        const experiencesData = params.experiences ? JSON.parse(params.experiences as string) : null;
        
        await api.post('/search-history', {
          deviceId: deviceId,
          activity,
          fullActivity: fullActivity,
          location,
          instagramUrl: params.instagramUrl as string || '',
          thumbnailUrl: processedThumbnail,
          analysisType: analysisData?.type || 'activity',
          experiences: experiencesData,
          analysis: analysisData,
        });
        
        console.log('📊 Saved to Supabase search history');
      } catch (supabaseError) {
        console.error('Failed to save to Supabase (non-critical):', supabaseError);
        // Don't throw - local save is still successful
      }
    } catch (error) {
      console.error('Failed to save to history:', error);
    }
  };
  
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
  
  // Find destinations for an activity from the JSON database
  // Returns destinations with photos from the 315 activities database
  const getActivityDestinations = (activityName: string): ActivityDestination[] => {
    if (!activityName) return [];
    
    const normalizedSearch = activityName.toLowerCase().trim();
    
    // Try exact match first (case insensitive)
    let found = activitiesDatabase.activities.find(
      (a: any) => a.activity.toLowerCase() === normalizedSearch
    );
    
    // Try partial match (e.g., "surf" matches "Surfing")
    if (!found) {
      found = activitiesDatabase.activities.find(
        (a: any) => a.activity.toLowerCase().includes(normalizedSearch) ||
                   normalizedSearch.includes(a.activity.toLowerCase())
      );
    }
    
    // COMPREHENSIVE mapping: AI-detected activity → JSON activity name
    // This covers ALL 315 activities with common variations and abbreviations
    if (!found) {
      const activityMappings: { [key: string]: string[] } = {
        // ===== WATER ACTIVITIES =====
        'surf': ['Surfing', 'Big Wave Surfing'],
        'surfing': ['Surfing', 'Big Wave Surfing'],
        'big wave': ['Big Wave Surfing'],
        'dive': ['Scuba Diving', 'Cave Diving', 'Freediving', 'Deep Sea Diving', 'Technical Diving', 'Ice Diving', 'Wreck Diving', 'Apnea Diving', 'Cage Diving', 'Shark Cage Diving', 'Lobster Diving', 'Pearl Diving'],
        'diving': ['Scuba Diving', 'Cave Diving', 'Freediving', 'Deep Sea Diving'],
        'scuba': ['Scuba Diving'],
        'freedive': ['Freediving', 'Apnea Diving'],
        'freediving': ['Freediving', 'Apnea Diving'],
        'apnea': ['Apnea Diving', 'Freediving'],
        'snorkel': ['Snorkeling', 'Dry-suit Snorkeling'],
        'snorkeling': ['Snorkeling'],
        'kayak': ['Kayaking', 'Sea Kayaking', 'Bioluminescent Kayaking', 'Iceberg Kayaking'],
        'kayaking': ['Kayaking', 'Sea Kayaking'],
        'sea kayak': ['Sea Kayaking'],
        'canoe': ['Canoeing'],
        'canoeing': ['Canoeing'],
        'paddle': ['Stand Up Paddleboarding (SUP)', 'Paddleboarding', 'Glacier Paddleboarding'],
        'paddleboard': ['Stand Up Paddleboarding (SUP)', 'Paddleboarding'],
        'sup': ['Stand Up Paddleboarding (SUP)'],
        'stand up paddle': ['Stand Up Paddleboarding (SUP)'],
        'kite': ['Kitesurfing', 'Snowkiting', 'Land Kiting', 'Kite Landboarding'],
        'kitesurf': ['Kitesurfing'],
        'kitesurfing': ['Kitesurfing'],
        'windsurf': ['Windsurfing'],
        'windsurfing': ['Windsurfing'],
        'wakeboard': ['Wakeboarding'],
        'wakeboarding': ['Wakeboarding'],
        'water ski': ['Water Skiing'],
        'waterski': ['Water Skiing'],
        'jet ski': ['Jet Skiing'],
        'jetski': ['Jet Skiing'],
        'sail': ['Sailing'],
        'sailing': ['Sailing'],
        'boat': ['Jet Boating', 'Houseboat Stays'],
        'jet boat': ['Jet Boating'],
        'bodyboard': ['Bodyboarding'],
        'boogie board': ['Bodyboarding'],
        'skim board': ['Skim Boarding'],
        'kneeboard': ['Kneeboarding', 'Knee Boarding'],
        'flyboard': ['Flyboarding'],
        'flowboard': ['Flowboarding'],
        'subwing': ['Sub Wing'],
        'sub wing': ['Sub Wing'],
        'parasail': ['Parasailing'],
        'parasailing': ['Parasailing'],
        'fish': ['Fishing', 'Fly Fishing', 'Ice Fishing'],
        'fishing': ['Fishing', 'Fly Fishing'],
        'fly fish': ['Fly Fishing'],
        'raft': ['White Water Rafting', 'Whitewater Rafting'],
        'rafting': ['White Water Rafting', 'Whitewater Rafting'],
        'white water': ['White Water Rafting', 'Whitewater Rafting'],
        'whitewater': ['Whitewater Rafting'],
        'river tube': ['River Tubing'],
        'tubing': ['River Tubing', 'Snow Tubing'],
        'cliff jump': ['Cliff Jumping', 'Cliff Diving'],
        'cliff dive': ['Cliff Diving'],
        'coasteer': ['Coasteering'],
        'coasteering': ['Coasteering'],
        'submarine': ['Submarine Tours'],
        'shark cage': ['Shark Cage Diving', 'Cage Diving'],
        'whale watch': ['Whale Watching'],
        'whale': ['Whale Watching'],
        'dolphin': ['Dolphin Swimming', 'Dolphin Watching'],
        'swim with dolphin': ['Dolphin Swimming'],
        'manatee': ['Manatee Swimming'],
        'turtle': ['Sea Turtle Watching'],
        'sea turtle': ['Sea Turtle Watching'],
        'coral': ['Coral Reef Exploration'],
        'reef': ['Coral Reef Exploration'],
        'marine': ['Marine Life Tours'],
        'cenote': ['Cenote Jumping'],
        'bioluminescen': ['Bioluminescence Tours', 'Bioluminescent Kayaking'],
        
        // ===== SNOW & ICE ACTIVITIES =====
        'ski': ['Skiing', 'Heli-Skiing', 'Cross Country Skiing', 'Ski Touring', 'Backcountry Skiing', 'Slalom Skiing', 'Freestyle Skiing', 'Telemark Skiing', 'Helicopter Skiing', 'Cross-country Skiing', 'Ski Jumping', 'Ski Racing'],
        'skiing': ['Skiing', 'Cross Country Skiing'],
        'heli ski': ['Heli-Skiing', 'Helicopter Skiing'],
        'heliski': ['Heli-Skiing'],
        'backcountry': ['Backcountry Skiing'],
        'cross country': ['Cross Country Skiing', 'Cross-country Skiing'],
        'snowboard': ['Snowboarding', 'Snowboard Cross', 'Snowboard Racing'],
        'snowboarding': ['Snowboarding'],
        'sandboard': ['Sandboarding'],
        'sandboarding': ['Sandboarding'],
        'ice climb': ['Ice Climbing'],
        'ice climbing': ['Ice Climbing'],
        'snowmobile': ['Snowmobiling'],
        'snowmobiling': ['Snowmobiling'],
        'sled': ['Sledding', 'Dog Sledding', 'Reindeer Sledding'],
        'sledding': ['Sledding'],
        'toboggan': ['Tobogganing'],
        'dog sled': ['Dog Sledding'],
        'husky': ['Dog Sledding'],
        'snow tube': ['Snow Tubing'],
        'snowshoe': ['Snowshoeing'],
        'snowshoeing': ['Snowshoeing'],
        'ice skate': ['Ice Skating'],
        'ice skating': ['Ice Skating'],
        'glacier': ['Glacier Trekking', 'Glacier Hiking', 'Glacier Paddleboarding'],
        'glacier trek': ['Glacier Trekking'],
        'ice cave': ['Ice Cave Exploring'],
        'ice drive': ['Ice Driving'],
        'luge': ['Luge'],
        'bobsled': ['Bobsledding'],
        'ice fish': ['Ice Fishing'],
        'igloo': ['Igloo Building', 'Igloo Stays'],
        'snow bike': ['Snow Biking'],
        'arctic': ['Arctic Expeditions', 'Arctic Wildlife Tours'],
        'monoski': ['Monoskiing'],
        'snowblade': ['Snowblading'],
        'snowkite': ['Snowkiting'],
        'speed ride': ['Speed Riding'],
        'reindeer': ['Reindeer Experience', 'Reindeer Sledding'],
        
        // ===== AIR ACTIVITIES =====
        'skydive': ['Skydiving', 'Indoor Skydiving', 'Tandem Skydiving', 'Formation Skydiving'],
        'skydiving': ['Skydiving', 'Indoor Skydiving'],
        'indoor skydive': ['Indoor Skydiving'],
        'tandem': ['Tandem Skydiving'],
        'paraglide': ['Paragliding'],
        'paragliding': ['Paragliding'],
        'hang glide': ['Hang Gliding', 'Hang-gliding'],
        'hang gliding': ['Hang Gliding'],
        'bungee': ['Bungee Jumping'],
        'bungee jump': ['Bungee Jumping'],
        'base jump': ['Base Jumping'],
        'hot air balloon': ['Hot Air Ballooning'],
        'balloon': ['Hot Air Ballooning', 'Balloon Safaris'],
        'helicopter': ['Helicopter Tours', 'Helicopter Skiing'],
        'heli': ['Helicopter Tours', 'Heli-Skiing', 'Heli-Biking'],
        'wingsuit': ['Wingsuit Flying'],
        'zipline': ['Zip Lining', 'Zip-lining'],
        'zip line': ['Zip Lining', 'Zip-lining'],
        'ziplining': ['Zip Lining', 'Zip-lining'],
        'canyon swing': ['Canyon Swing', 'Tricycle Canyon Swing'],
        'parachute': ['Parachuting'],
        'microlight': ['Micro Lighting'],
        'ultralight': ['Micro Lighting'],
        'glide': ['Gliding'],
        'gliding': ['Gliding'],
        'trapeze': ['Trapeze'],
        'highline': ['Highlining'],
        'slackline': ['Slacklining', 'Highlining'],
        'slingshot': ['Slingshot Rides'],
        'giant swing': ['Giant Swing'],
        'aerobatic': ['Aerobatic Flying', 'Aerobatic Flights'],
        'stunt plane': ['Stunt Plane Flying', 'Aerobatic Flying'],
        'paramotor': ['Paramotoring', 'Paramotor Flying'],
        'seaplane': ['Seaplane Tours'],
        'scenic flight': ['Scenic Flights'],
        'fighter jet': ['Fighter Jet Rides'],
        'weightless': ['Weightlessness Flights'],
        'zero gravity': ['Weightlessness Flights'],
        'wing walk': ['Wingwalking', 'Plane Wing Walking'],
        'zeppelin': ['Zeppelin Tours'],
        'airship': ['Airship Tours'],
        'bush plane': ['Bush Plane Tours'],
        
        // ===== LAND ADVENTURES =====
        'hike': ['Hiking', 'Volcano Hiking', 'Canyon Hiking', 'Glacier Hiking'],
        'hiking': ['Hiking'],
        'trek': ['Hiking', 'Jungle Trekking', 'Desert Trekking', 'Glacier Trekking', 'Gorilla Trekking', 'Orangutan Trekking', 'Llama Trekking', 'Yak Trekking'],
        'trekking': ['Hiking', 'Jungle Trekking'],
        'volcano': ['Volcano Hiking'],
        'jungle': ['Jungle Trekking'],
        'desert trek': ['Desert Trekking'],
        'climb': ['Rock Climbing', 'Ice Climbing', 'Free Climbing', 'Tree Climbing'],
        'climbing': ['Rock Climbing'],
        'rock climb': ['Rock Climbing'],
        'free climb': ['Free Climbing'],
        'boulder': ['Bouldering'],
        'bouldering': ['Bouldering'],
        'mountain': ['Mountaineering', 'Winter Mountaineering', 'Mountain Biking', 'Mountain Boarding', 'Mountain Karting', 'Mountain Drives'],
        'mountaineer': ['Mountaineering', 'Winter Mountaineering'],
        'cave': ['Caving', 'Cave Exploring', 'Caving/Spelunking', 'Cave Diving', 'Ice Cave Exploring'],
        'caving': ['Caving', 'Caving/Spelunking'],
        'spelunk': ['Caving/Spelunking'],
        'atv': ['ATV/Quad Biking', 'ATV Tours'],
        'quad': ['ATV/Quad Biking', 'Quad Biking'],
        'quad bike': ['ATV/Quad Biking', 'Quad Biking'],
        'buggy': ['Dune Buggy', 'Buggy Tours', 'Dune Buggy Racing'],
        'dune buggy': ['Dune Buggy', 'Dune Buggy Racing'],
        'safari': ['Safari', 'Safari (Wildlife)', 'Photography Safari', 'Night Safari', 'Tiger Safari', 'Lion Safari', 'Walking Safari', 'Balloon Safaris', 'Game Drives'],
        'game drive': ['Game Drives', 'Safari'],
        'horse': ['Horseback Riding', 'Horse Racing'],
        'horseback': ['Horseback Riding'],
        'horse riding': ['Horseback Riding'],
        'camel': ['Camel Riding', 'Camel Racing'],
        'elephant': ['Elephant Riding'],
        'llama': ['Llama Trekking'],
        'yak': ['Yak Trekking'],
        'ostrich': ['Ostrich Riding'],
        'zorb': ['Zorbing'],
        'zorbing': ['Zorbing'],
        'via ferrata': ['Via Ferrata'],
        'ferrata': ['Via Ferrata'],
        'abseil': ['Abseiling/Rappelling', 'Rappelling'],
        'rappel': ['Abseiling/Rappelling', 'Rappelling'],
        'parkour': ['Parkour'],
        'freerun': ['Parkour'],
        'trail run': ['Trail Running', 'Ultra Running'],
        'trail running': ['Trail Running'],
        'ultra': ['Ultra Running'],
        'orienteer': ['Orienteering'],
        'geocach': ['Geocaching'],
        'off road': ['Off-Road Driving'],
        'offroad': ['Off-Road Driving'],
        '4x4': ['Off-Road Driving', 'Jeep Tours', 'Land Rover Tours'],
        'jeep': ['Jeep Tours'],
        'land rover': ['Land Rover Tours'],
        'gorge walk': ['Gorge Walking'],
        'rope course': ['Rope Course'],
        'obstacle': ['Obstacle Course Racing'],
        'wildlife track': ['Wildlife Tracking'],
        'gorilla': ['Gorilla Trekking'],
        'orangutan': ['Orangutan Trekking'],
        'tiger': ['Tiger Safari'],
        'lion': ['Lion Safari'],
        'bear': ['Bear Watching', 'Polar Bear Viewing'],
        'polar bear': ['Polar Bear Viewing'],
        'penguin': ['Penguin Watching'],
        'bird': ['Bird Watching'],
        'birdwatch': ['Bird Watching'],
        'seal': ['Seal Watching'],
        'firefly': ['Firefly Watching'],
        'butterfly': ['Butterfly Sanctuary Visits', 'Butterfly Migration Watching'],
        'rainforest': ['Rainforest Tours'],
        'botanical': ['Botanical Garden Visits'],
        'national park': ['National Park Tours'],
        
        // ===== WHEELS & MOTORS =====
        'bike': ['Mountain Biking', 'Bike Tours', 'Snow Biking', 'Dirt Bike Tours', 'Heli-Biking'],
        'biking': ['Mountain Biking', 'Bike Tours'],
        'mountain bike': ['Mountain Biking'],
        'mtb': ['Mountain Biking'],
        'cycle': ['Mountain Biking', 'Bike Tours'],
        'cycling': ['Mountain Biking', 'Bike Tours'],
        'bmx': ['BMX'],
        'dirt bike': ['Dirt Bike Tours'],
        'skateboard': ['Skateboarding'],
        'longboard': ['Longboarding'],
        'motocross': ['Motocross', 'FMX (Freestyle Motocross)'],
        'fmx': ['FMX (Freestyle Motocross)'],
        'freestyle motocross': ['FMX (Freestyle Motocross)'],
        'inline skate': ['Aggressive Inline Skating'],
        'rollerblad': ['Aggressive Inline Skating'],
        'mountain board': ['Mountain Boarding'],
        'drift': ['Drifting'],
        'drifting': ['Drifting'],
        'kart': ['Mountain Karting', 'Go-kart Racing'],
        'go kart': ['Go-kart Racing'],
        'land kite': ['Land Kiting', 'Kite Landboarding'],
        'motorcycle': ['Motorcycle Racing', 'Motorcycle Touring'],
        'motorbike': ['Motorcycle Touring'],
        'rally': ['Rally Driving'],
        'race car': ['Race Car Driving'],
        'stunt drive': ['Stunt Driving'],
        'autobahn': ['Autobahn Driving'],
        'segway': ['Segway Tours'],
        'rv': ['RV Touring'],
        'caravan': ['Caravan Touring'],
        'road trip': ['Road Trips', 'Scenic Drives'],
        'scenic drive': ['Scenic Drives', 'Coastal Drives', 'Mountain Drives', 'Desert Drives'],
        'rickshaw': ['Rickshaw Driving'],
        
        // ===== CULTURAL & TOURS =====
        'city tour': ['City Tours'],
        'walk tour': ['Walking Tours'],
        'walking tour': ['Walking Tours'],
        'museum': ['Museum Visits'],
        'history': ['Historical Site Tours'],
        'historical': ['Historical Site Tours'],
        'food tour': ['Food Tours'],
        'food': ['Food Tours'],
        'wine': ['Wine Tasting'],
        'wine tasting': ['Wine Tasting'],
        'brewery': ['Brewery Tours'],
        'beer': ['Brewery Tours'],
        'temple': ['Temple Visits', 'Temple Stays'],
        'castle': ['Castle Tours'],
        'palace': ['Palace Tours'],
        'archaeological': ['Archaeological Site Visits'],
        'archaeology': ['Archaeological Site Visits'],
        'street art': ['Street Art Tours'],
        'graffiti': ['Street Art Tours'],
        'market': ['Market Visits'],
        'cook': ['Cooking Classes'],
        'cooking': ['Cooking Classes'],
        'cooking class': ['Cooking Classes'],
        'festival': ['Cultural Festivals'],
        'pilgrimage': ['Religious Pilgrimages'],
        'architecture': ['Architecture Tours'],
        'ghost tour': ['Ghost Tours'],
        'ghost': ['Ghost Tours'],
        'bike tour': ['Bike Tours'],
        'hop on': ['Hop-On Hop-Off Bus'],
        'bus tour': ['Hop-On Hop-Off Bus'],
        'night tour': ['Night Tours', 'Night Safari'],
        'photo tour': ['Photography Tours', 'Photography Safari'],
        'photography': ['Photography Tours', 'Photography Safari'],
        'art gallery': ['Art Gallery Visits'],
        'gallery': ['Art Gallery Visits'],
        'theater': ['Theater Shows'],
        'theatre': ['Theater Shows'],
        'opera': ['Opera Performances'],
        'concert': ['Concert Attendance'],
        'village': ['Local Village Visits'],
        'tribal': ['Tribal Experiences'],
        'dance': ['Traditional Dance Shows'],
        'geisha': ['Geisha Experiences'],
        'sumo': ['Sumo Watching'],
        'bullfight': ['Bullfighting'],
        'rodeo': ['Rodeo'],
        'polo': ['Polo'],
        'equestrian': ['Equestrian Events'],
        'falcon': ['Falconry'],
        'falconry': ['Falconry'],
        'archery': ['Archery'],
        'muay thai': ['Muay Thai'],
        'thai box': ['Muay Thai'],
        'kok boru': ['Kok Boru'],
        
        // ===== WELLNESS & RELAXATION =====
        'beach': ['Beach Relaxation'],
        'spa': ['Spa Treatments'],
        'massage': ['Massage Therapy'],
        'yoga': ['Yoga Retreats'],
        'meditation': ['Meditation Retreats'],
        'wellness': ['Wellness Retreats'],
        'retreat': ['Yoga Retreats', 'Meditation Retreats', 'Wellness Retreats'],
        'hot spring': ['Hot Springs', 'Hot Spring Bathing'],
        'thermal': ['Thermal Baths', 'Thermal Bath'],
        'hammam': ['Hammam/Turkish Bath'],
        'turkish bath': ['Hammam/Turkish Bath'],
        'onsen': ['Onsen (Japanese Bath)', 'Onsen Bathing'],
        'japanese bath': ['Onsen (Japanese Bath)'],
        'sauna': ['Sauna', 'Sauna Experiences'],
        'mud bath': ['Mud Baths'],
        'float': ['Float Therapy'],
        'ayurveda': ['Ayurveda Treatments'],
        'tai chi': ['Tai Chi Classes'],
        'ashram': ['Ashram Stays'],
        
        // ===== ACCOMMODATIONS & STAYS =====
        'camp': ['Camping'],
        'camping': ['Camping'],
        'backpack': ['Backpacking'],
        'glamp': ['Glamping'],
        'glamping': ['Glamping'],
        'treehouse': ['Tree House Stays'],
        'tree house': ['Tree House Stays'],
        'houseboat': ['Houseboat Stays'],
        'yurt': ['Yurt Stays'],
        'farm stay': ['Farm Stays'],
        'eco lodge': ['Eco-lodge Stays'],
        'monastery': ['Monastery Stays'],
        'ice hotel': ['Ice Hotel Stays'],
        'ice bar': ['Ice Bar Experience'],
        'van life': ['Van Life'],
        
        // ===== TRAINS & TRANSPORT =====
        'train': ['Scenic Train Rides', 'Luxury Train Journeys', 'Bullet Train Rides'],
        'bullet train': ['Bullet Train Rides'],
        'luxury train': ['Luxury Train Journeys'],
        
        // ===== SKY WATCHING =====
        'stargaze': ['Stargazing'],
        'stargazing': ['Stargazing'],
        'meteor': ['Meteor Shower Watching'],
        'northern light': ['Arctic Expeditions'],
        'aurora': ['Arctic Expeditions'],
        
        // ===== MISC =====
        'canyoning': ['Canyoning'],
        'canyon': ['Canyoning', 'Canyon Hiking', 'Canyon Swing'],
        'space': ['Space Tourism'],
      };
      
      // Find the best match
      const matchKeys = Object.keys(activityMappings).filter(key => 
        normalizedSearch.includes(key) || key.includes(normalizedSearch)
      );
      
      // Sort by key length (longer = more specific match)
      matchKeys.sort((a, b) => b.length - a.length);
      
      if (matchKeys.length > 0) {
        for (const key of matchKeys) {
          for (const activityVariation of activityMappings[key]) {
            found = activitiesDatabase.activities.find(
              (a: any) => a.activity === activityVariation
            );
            if (found) {
              console.log(`🎯 Mapped "${activityName}" → "${key}" → "${found.activity}"`);
              break;
            }
          }
          if (found) break;
        }
      }
    }
    
    // Last resort: fuzzy match - find activity that contains any word from search
    if (!found) {
      const searchWords = normalizedSearch.split(' ').filter(w => w.length > 3);
      for (const word of searchWords) {
        found = activitiesDatabase.activities.find(
          (a: any) => a.activity.toLowerCase().includes(word)
        );
        if (found) {
          console.log(`🔍 Fuzzy matched "${activityName}" → "${found.activity}" (via "${word}")`);
          break;
        }
      }
    }
    
    if (found && found.destinations) {
      console.log(`🗺️ Found ${found.destinations.length} destinations for "${activityName}" → "${found.activity}"`);
      // Filter out destinations without valid photo URLs and cast to correct type
      return found.destinations
        .filter((d: any) => d.photo_url && typeof d.photo_url === 'string')
        .map((d: any) => ({ location: d.location, photo_url: d.photo_url })) as ActivityDestination[];
    }
    
    console.log(`⚠️ No destinations found in database for "${activityName}"`);
    return [];
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
  
  // Get user GPS coordinates on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserGpsCoords({
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          });
          console.log('📍 User GPS:', location.coords.latitude, location.coords.longitude);
        } else {
          console.log('❌ Location permission denied, will use Lisboa as fallback');
        }
      } catch (error) {
        console.error('❌ Error getting GPS:', error);
      }
    })();
  }, []);
  
  // Track if initial setup has been done
  const initialSetupDone = useRef(false);
  
  // Initial fetch: when we have preloaded data, fetch the 3 sections properly
  useEffect(() => {
    // Only run once
    if (initialSetupDone.current) return;
    
    // Check if we have all 3 sections preloaded (from social share with full data)
    const hasAllSectionsPreloaded = preloadedNearYou && preloadedReel && preloadedAnalysis;
    
    // If ALL data was preloaded (from new analysis with all 3 sections), just set up local data
    if ((allDataLoaded || hasAllSectionsPreloaded) && preloadedAnalysis) {
      initialSetupDone.current = true;
      console.log('✅ All data preloaded (allDataLoaded or 3 sections present), showing results immediately...');
      
      // Set suggested locations from local JSON database
      const baseActivity = preloadedAnalysis.activity;
      if (baseActivity && preloadedAnalysis.type !== 'landscape') {
        const destinations = getActivityDestinations(baseActivity);
        setSuggestedLocations(destinations);
        console.log('📍 Suggested locations from database:', destinations.length);
      }
      
      // Mark sections as fetched so we don't refetch
      setFetchingSections(false);
      setHasFetchedSections(true);
      setHasAnalyzed(true);
      
      // Save to history (ONLY activities, NOT landscapes)
      if (preloadedAnalysis.type !== 'landscape') {
        const thumbnailToSave = thumbnailUrl || preloadedAnalysis.thumbnailUrl || null;
        console.log('🎯 CALLING saveToHistory with:');
        console.log('  - Activity:', preloadedAnalysis.activity);
        console.log('  - Thumbnail:', thumbnailToSave ? (thumbnailToSave.startsWith('http') ? 'URL: ' + thumbnailToSave.substring(0, 80) : 'BASE64 (' + Math.round(thumbnailToSave.length/1024) + 'KB)') : 'NULL');
        
        saveToHistory(
          preloadedAnalysis.activity,
          preloadedAnalysis.fullActivity || preloadedAnalysis.activity,
          preloadedAnalysis.location || userLocation,
          thumbnailToSave
        );
      } else {
        console.log('🏞️ Landscape detected - NOT saving to history');
      }
      return;
    }
    
    // Coming from history - show stored data immediately, fetch sections in background
    if (fromHistory && preloadedAnalysis && preloadedExperiences) {
      initialSetupDone.current = true;
      console.log('📚 From history - showing stored data, fetching sections in background...');
      
      // Set suggested locations immediately from local JSON
      const baseActivity = preloadedAnalysis.activity;
      if (baseActivity && preloadedAnalysis.type !== 'landscape') {
        const destinations = getActivityDestinations(baseActivity);
        setSuggestedLocations(destinations);
      }
      
      // Fetch fresh sections in background (won't block UI)
      fetchRecommendations();
      setHasFetchedSections(true);
      return;
    }
    
    if (preloadedAnalysis && !hasFetchedSections) {
      initialSetupDone.current = true;
      console.log('🚀 Have preloaded analysis, fetching 3 sections...');
      fetchRecommendations();
      setHasFetchedSections(true);
      
      // Save to history (ONLY activities, NOT landscapes)
      if (preloadedAnalysis.type !== 'landscape') {
        const thumbnailToSave = thumbnailUrl || preloadedAnalysis.thumbnailUrl || null;
        console.log('🎯 CALLING saveToHistory with:');
        console.log('  - Activity:', preloadedAnalysis.activity);
        console.log('  - Thumbnail:', thumbnailToSave ? (thumbnailToSave.startsWith('http') ? 'URL: ' + thumbnailToSave.substring(0, 80) : 'BASE64 (' + Math.round(thumbnailToSave.length/1024) + 'KB)') : 'NULL');
        
        saveToHistory(
          preloadedAnalysis.activity,
          preloadedAnalysis.fullActivity || preloadedAnalysis.activity,
          preloadedAnalysis.location || userLocation,
          thumbnailToSave
        );
      } else {
        console.log('🏞️ Landscape detected - NOT saving to history');
      }
    } else if (!preloadedExperiences && instagramUrl && !hasFetchedSections) {
      initialSetupDone.current = true;
      console.log('⚠️ No preloaded data, but we have URL - will fetch');
      fetchRecommendations();
      setHasFetchedSections(true);
    }
  }, [preloadedAnalysis]);
  
  // Re-fetch experiences when user manually changes location
  useEffect(() => {
    if (hasAnalyzed && analysis && hasFetchedSections) {
      console.log('📍 Location changed to:', userLocation, '- fetching new experiences...');
      
      // If in specific location mode (clicked a "Where to try" destination), 
      // fetch experiences for that specific location
      if (isSpecificLocation) {
        fetchExperiencesForDestination(userLocation);
      } else {
        fetchRecommendations();
      }
    }
  }, [userLocation, isSpecificLocation]);
  
  // Fetch experiences for a specific destination (when user clicks "Where to try")
  const fetchExperiencesForDestination = async (destination: string) => {
    if (!analysis) return;
    
    console.log('🌍 Fetching experiences for destination:', destination);
    console.log('   Activity:', analysis.activity);
    
    try {
      setLoading(true);
      
      // Search for activity + destination (e.g., "surfing Uluwatu Indonesia")
      const response = await api.post('/experience-recommendations/by-activity', {
        activity: analysis.activity,
        userLocation: destination, // The destination they clicked
        strictActivityMatch: true,
        prioritizeBored: false // Viator will have more results for exotic locations
      });
      
      console.log('📦 Destination Response:', response.data?.experiences?.length);
      
      if (response.data && response.data.experiences) {
        const sorted = sortExperiences(response.data.experiences);
        setExperiences(sorted);
        console.log('✅ Experiences for', destination, ':', sorted.length);
      } else {
        setExperiences([]);
      }
      
    } catch (error) {
      console.error('❌ Error fetching destination experiences:', error);
      setExperiences([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Check if we should show rating modal (3rd, 9th, 21st import)
  const checkAndShowRating = async () => {
    try {
      // Get current import count
      const countStr = await AsyncStorage.getItem('@import_count');
      const currentCount = countStr ? parseInt(countStr, 10) : 0;
      const newCount = currentCount + 1;
      
      // Save new count
      await AsyncStorage.setItem('@import_count', newCount.toString());
      
      console.log(`📊 Import count: ${newCount}`);
      
      // Show rating on 3rd, 9th, and 21st import
      if (newCount === 3 || newCount === 9 || newCount === 21) {
        console.log('⭐ Showing rating modal!');
        setTimeout(() => {
          setShowRatingModal(true);
        }, 1500); // Show after 1.5s delay to let results appear first
      }
    } catch (error) {
      console.error('❌ Error checking rating:', error);
    }
  };
  
  // Submit rating to backend
  const submitRating = async (rating: number) => {
    try {
      const countStr = await AsyncStorage.getItem('@import_count');
      const importCount = countStr ? parseInt(countStr, 10) : 0;
      
      await api.post('/feedback/rating', {
        rating: rating,
        import_count: importCount,
        question: 'How good has been the matchmaking so far?'
      });
      
      console.log('✅ Rating submitted:', rating);
    } catch (error) {
      console.error('❌ Error submitting rating:', error);
    }
  };
  
  const fetchRecommendations = async () => {
    if (!instagramUrl && !analysis) {
      console.error('❌ Cannot fetch: no instagramUrl or analysis');
      setLoading(false);
      return;
    }
    
    console.log('🔍 Fetching recommendations...');
    console.log('   Has analyzed:', hasAnalyzed);
    console.log('   User location:', userLocation);
    console.log('   Has preloaded experiences:', !!preloadedExperiences);
    
    try {
      // Show loading state while fetching sections
      setFetchingSections(true);
      
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
          const rawActivity = analyzeResponse.data.analysis.activity;
          analysisData = {
            ...analyzeResponse.data.analysis,
            fullActivity: rawActivity, // Keep original detailed (can be null for landscape)
            activity: rawActivity ? getBaseActivity(rawActivity) : null // Base for general searches (null for landscape)
          };
          setAnalysis(analysisData);
          setHasAnalyzed(true);
          
          // ⭐ Check if we should show rating modal after successful import
          await checkAndShowRating();
        }
      }
      
      if (!analysisData) {
        console.error('❌ No analysis data available');
        return;
      }
      
      const baseActivity = analysisData.activity; // General: "snorkeling" (null for landscape)
      const fullActivity = analysisData.fullActivity || analysisData.activity; // Specific: "snorkeling with giant manta rays"
      const reelLocation = analysisData.location; // Location from reel: "French Polynesia", "Maldives", etc.
      const isLandscape = analysisData.type === 'landscape';
      
      console.log('🎯 Base activity:', baseActivity);
      console.log('🎯 Full activity:', fullActivity);
      console.log('🌍 Reel location:', reelLocation);
      console.log('📍 User location:', userLocation);
      console.log('🏔️ Is landscape:', isLandscape);
      
      // For LANDSCAPE: Skip activity-based searches, just show location-based results
      // The main API already returned Viator results for the location
      if (isLandscape) {
        console.log('🏔️ Landscape mode - using preloaded experiences');
        console.log('   Preloaded count:', preloadedExperiences?.length || 0);
        
        // For landscape, the experiences were already loaded from the main API
        // Just set them to nearYouExperiences to display in the landscape section
        if (preloadedExperiences && preloadedExperiences.length > 0) {
          setNearYouExperiences(sortExperiences(preloadedExperiences));
          console.log('✅ Landscape experiences:', preloadedExperiences.length);
        } else {
          // No preloaded experiences - fetch from Viator directly using the location
          console.log('⚠️ No preloaded experiences, fetching from Viator for:', reelLocation);
          try {
            const viatorResponse = await api.post('/experience-recommendations/by-activity', {
              activity: 'tours activities things to do',
              userLocation: reelLocation,
              strictActivityMatch: false,
              prioritizeBored: false
            });
            if (viatorResponse.data?.experiences?.length > 0) {
              setNearYouExperiences(sortExperiences(viatorResponse.data.experiences));
              console.log('✅ Fetched landscape experiences:', viatorResponse.data.experiences.length);
            } else {
              console.log('❌ No experiences found for:', reelLocation);
            }
          } catch (err) {
            console.error('❌ Error fetching landscape experiences:', err);
          }
        }
        setReelExperiences([]);
        setSuggestedLocations([]);
        setFetchingSections(false);
        return;
      }
      
      // For ACTIVITY: Fetch Near You and As Seen on Reel sections
      const [nearYouResponse, reelResponse] = await Promise.all([
        // 1. Near You: EXACT activity match + GPS coordinates (or city name as fallback)
        // Only show experiences that match the EXACT activity type (surf = surf, not indoor skydiving)
        api.post('/experience-recommendations/by-activity', {
          activity: baseActivity,
          userLocation: userGpsCoords || userLocation, // Pass GPS coords if available, otherwise city name
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
      
      // 3. Suggested Locations: Get destinations from JSON database with photos
      // Only for activity types, not landscapes (baseActivity is null for landscapes)
      if (baseActivity) {
        const destinations = getActivityDestinations(baseActivity);
        setSuggestedLocations(destinations);
        console.log('📍 Suggested locations from database:', destinations.length);
      }
      
      // Keep experiences state for compatibility
      setExperiences(nearYouResponse.data?.experiences || []);
      
    } catch (error: any) {
      console.error('❌ Error fetching recommendations:', error);
      
      // Check if it's an irrelevant video error
      if (error.response?.data?.error === 'IRRELEVANT_VIDEO') {
        // Show alert with fun message
        alert(error.response.data.message);
        // Go back to previous screen
        router.back();
        return;
      }
      
      setNearYouExperiences([]);
      setReelExperiences([]);
      setSuggestedLocations([]);
    } finally {
      setFetchingSections(false);
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
  
  const handleClose = () => {
    // If came from Instagram share, go to home tab
    // Otherwise go to history tab (came from within the app)
    if (fromSource === 'instagram') {
      router.replace('/(tabs)');
    } else {
      router.replace('/(tabs)/history');
    }
  };
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Simple header with close button */}
      <View style={styles.header}>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <X size={24} color="#333" />
        </Pressable>
      </View>
      
      {/* Show loading while fetching sections - skip if coming from social share with preloaded data */}
      {fetchingSections && !preloadedExperiences ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Finding experiences...</Text>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : !analysis ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Could not analyze this reel. Please try again.
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
          {!isSpecificLocation && analysis && analysis.type !== 'landscape' && (
            <View style={styles.compactTitleSection}>
              <Text style={styles.compactTitleText}>
                Found '<Text style={styles.compactTitleBold}>{analysis.activity}</Text>' in your Instagram Reel
              </Text>
            </View>
          )}
          
          {/* LANDSCAPE SPECIAL UI - When we detect a beautiful view but can't identify the activity */}
          {!isSpecificLocation && analysis && analysis.type === 'landscape' && (
            <View style={styles.landscapeSection}>
              <Text style={styles.landscapeTitle}>That view just broke our algorithm! 🔥</Text>
              <Text style={styles.landscapeSubtitle}>
                We can't pinpoint the exact activity (it's THAT special), but check out these experiences {analysis.location ? `in ${analysis.location}` : 'nearby'}:
              </Text>
              
              {/* Show experiences from Viator for this location */}
              {nearYouExperiences.length > 0 ? (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                  style={{ marginTop: 16 }}
                >
                  {nearYouExperiences
                    .filter(exp => {
                      const hasImage = exp.source === 'database' 
                        ? (exp.images && exp.images.length > 0) || exp.image_url
                        : exp.imageUrl || exp.image_url;
                      return hasImage;
                    })
                    .map((experience, index) => {
                    const imageUrl = experience.source === 'database'
                      ? (experience.images && experience.images.length > 0 ? experience.images[0] : experience.image_url)
                      : (experience.imageUrl || experience.image_url);

                    return (
                      <Pressable
                        key={`landscape-${experience.source}-${experience.id}-${index}`}
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
                          
                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.7)']}
                            style={styles.imageGradient}
                          />
                          
                          <View style={styles.badgeTopLeft}>
                            <View style={experience.source === 'database' ? styles.sourceBadgeOurs : styles.sourceBadgeViator}>
                              <Text style={styles.sourceBadgeText}>
                                {experience.source === 'database' ? 'BORED TOURIST' : 'VIATOR'}
                              </Text>
                            </View>
                          </View>
                          
                          <View style={styles.priceOverlay}>
                            <Text style={styles.priceOverlayText}>
                              {experience.price}€
                            </Text>
                          </View>
                          
                          {((experience.rating ?? 0) > 0 || (experience.reviewCount ?? 0) > 0) && (
                            <View style={styles.ratingOverlay}>
                              <Star size={14} color="#FFB800" fill="#FFB800" />
                              <Text style={styles.ratingOverlayText}>
                                {(experience.rating || 0).toFixed(1)}
                              </Text>
                            </View>
                          )}
                        </View>
                        
                        <View style={styles.nearYouCardContent}>
                          <Text style={styles.nearYouCardTitle} numberOfLines={2}>
                            {experience.title}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No experiences found for this location. Try sharing another reel!
                  </Text>
                </View>
              )}
            </View>
          )}
          
          {/* BORING ACTIVITY - Show rejection message */}
          {!isSpecificLocation && analysis && analysis.type === 'boring' && (
            <View style={styles.boringSection}>
              <Image 
                source={{ uri: 'https://storage.googleapis.com/bored_tourist_media/images/pinguin_meme.webp' }}
                style={styles.boringImage}
                resizeMode="cover"
              />
              <Text style={styles.boringTitle}>Boring alert!</Text>
              <Text style={styles.boringHint}>
                This type of activity doesn't quite fit the Bored universe.. it's a bit too 'standard tour'. Want something with more personality? Explore our Outdoors, Sports or Culture experiences instead!
              </Text>
            </View>
          )}
          
          {/* Near You Section - Only show when: not in specific location, not landscape, not boring, AND has experiences */}
          {!isSpecificLocation && analysis?.type !== 'landscape' && analysis?.type !== 'boring' && nearYouExperiences.length > 0 && (
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
              
              {/* Show empty state or experiences */}
              {nearYouExperiences.length === 0 ? (
                <View style={styles.nearYouEmpty}>
                  <Text style={styles.nearYouEmptyText}>
                    No {analysis?.activity || 'activities'} found near {userLocation}
                  </Text>
                  <Text style={styles.nearYouEmptySubtext}>
                    Tap the ✏️ icon above to search in a different location
                  </Text>
                </View>
              ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {nearYouExperiences
                  .filter(exp => {
                    const hasImage = exp.source === 'database' 
                      ? (exp.images && exp.images.length > 0) || exp.image_url
                      : exp.imageUrl || exp.image_url;
                    return hasImage;
                  })
                  .map((experience, index) => {
                  const imageUrl = experience.source === 'database'
                    ? (experience.images && experience.images.length > 0 ? experience.images[0] : experience.image_url)
                    : (experience.imageUrl || experience.image_url);

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
                        {((experience.rating ?? 0) > 0 || (experience.reviewCount ?? 0) > 0) && (
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
              )}
            </View>
          )}

          {/* As Seen on the Reel Section - Show experiences matching the exact reel content */}
          {/* Hide for landscape - we already show location-based results above */}
          {!isSpecificLocation && analysis && analysis.type !== 'landscape' && analysis.fullActivity && analysis.location && reelExperiences.length > 0 && (
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
                {reelExperiences
                  .filter(exp => {
                    const hasImage = exp.source === 'database' 
                      ? (exp.images && exp.images.length > 0) || exp.image_url
                      : exp.imageUrl || exp.image_url;
                    return hasImage;
                  })
                  .slice(0, 8)
                  .map((experience, index) => {
                  const imageUrl = experience.source === 'database'
                    ? (experience.images && experience.images.length > 0 ? experience.images[0] : experience.image_url)
                    : (experience.imageUrl || experience.image_url);

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
                        {((experience.rating ?? 0) > 0 || (experience.reviewCount ?? 0) > 0) && (
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
          {/* Hide for landscape - doesn't make sense without a specific activity */}
          {!isSpecificLocation && analysis?.type !== 'landscape' && suggestedLocations.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.suggestedHeader}>
                <Text style={styles.sectionTitle}>🌍 Where to try {analysis?.activity}</Text>
                <Text style={styles.suggestedDescription}>Popular destinations for this experience</Text>
              </View>
              <View style={styles.suggestedGrid}>
                {suggestedLocations.slice(0, 6).map((destination, index) => (
                  <Pressable
                    key={`suggested-${index}`}
                    style={styles.suggestedCardVertical}
                    onPress={() => {
                      // Set location to just the city/place name for search
                      setUserLocation(destination.location);
                      saveRecentSearch(destination.location);
                      setIsSpecificLocation(true); // Enter specific location mode - triggers Viator search
                    }}
                  >
                    <ExpoImage
                      source={{ uri: destination.photo_url }}
                      style={styles.suggestedImageVertical}
                      contentFit="cover"
                      transition={200}
                    />
                    <View style={styles.suggestedOverlayVertical}>
                      <Text style={styles.suggestedCityNameVertical}>{destination.location}</Text>
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
                  experiences
                    .filter(exp => {
                      const hasImage = exp.source === 'database' 
                        ? (exp.images && exp.images.length > 0) || exp.image_url
                        : exp.imageUrl || exp.image_url;
                      return hasImage;
                    })
                    .map((experience, index) => {
                    const imageUrl = experience.source === 'database'
                      ? (experience.images && experience.images.length > 0 ? experience.images[0] : experience.image_url)
                      : (experience.imageUrl || experience.image_url);
                    
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

                  {/* Popular for Activity - from JSON database */}
                  {analysis?.activity && suggestedLocations.length > 0 && !searchQuery && (
                    <View style={styles.locationGroup}>
                      <Text style={styles.locationGroupTitle}>Popular for {analysis.activity}</Text>
                      {suggestedLocations.slice(0, 8).map((destination, index) => (
                        <Pressable
                          key={`popular-${index}`}
                          style={styles.cityOption}
                          onPress={() => {
                            setUserLocation(destination.location);
                            saveRecentSearch(destination.location);
                            setIsSpecificLocation(true); // Enter specific location mode
                            setShowLocationPicker(false);
                            setSearchQuery('');
                          }}
                        >
                          <MapPin size={16} color="#007AFF" style={styles.locationIcon} />
                          <Text style={styles.cityOptionText}>{destination.location}</Text>
                          {destination.location === userLocation && <Text style={styles.checkmark}>✓</Text>}
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
      
      {/* ⭐ Rating Modal - Shows on 3rd, 9th, 21st import */}
      <Modal
        visible={showRatingModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowRatingModal(false);
          setSelectedRating(null);
        }}
      >
        <View style={styles.ratingModalOverlay}>
          <View style={styles.ratingModalContent}>
            {/* Close button */}
            <Pressable 
              style={styles.ratingCloseButton}
              onPress={() => {
                setShowRatingModal(false);
                setSelectedRating(null);
              }}
            >
              <X size={20} color="#999" />
            </Pressable>
            
            {/* Question */}
            <Text style={styles.ratingQuestion}>
              How good has been the matchmaking so far?
            </Text>
            
            {/* Star rating */}
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setSelectedRating(star)}
                  style={styles.starButton}
                >
                  <Star
                    size={48}
                    color={selectedRating && selectedRating >= star ? '#FFD700' : '#ddd'}
                    fill={selectedRating && selectedRating >= star ? '#FFD700' : 'none'}
                    strokeWidth={2}
                  />
                </Pressable>
              ))}
            </View>
            
            {/* Submit button */}
            {selectedRating && (
              <Pressable
                style={styles.submitRatingButton}
                onPress={async () => {
                  await submitRating(selectedRating);
                  setShowRatingModal(false);
                  setSelectedRating(null);
                }}
              >
                <Text style={styles.submitRatingText}>Submit</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
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
  // LANDSCAPE SPECIAL SECTION STYLES
  landscapeSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  landscapeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  landscapeSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  // BORING ACTIVITY SECTION STYLES
  boringSection: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 0,
  },
  boringImage: {
    width: 280,
    height: 280,
    borderRadius: 20,
    marginBottom: 24,
  },
  boringEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  boringTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  boringHint: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
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
  nearYouEmpty: {
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  nearYouEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  nearYouEmptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  // Rating Modal Styles
  ratingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  ratingModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  ratingCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingQuestion: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 28,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  starButton: {
    padding: 4,
  },
  submitRatingButton: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  submitRatingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
