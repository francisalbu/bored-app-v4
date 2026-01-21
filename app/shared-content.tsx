import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin, Star, Clock, Sparkles, Search } from 'lucide-react-native';
import { useShareIntent } from 'expo-share-intent';
import colors from '@/constants/colors';
import typography from '@/constants/typography';
import apiService from '@/services/api';
import { useExperiences } from '@/hooks/useExperiences';

// Keywords to match from social media content to experiences
// Covers ALL experiences in the Bored Tourist platform
const EXPERIENCE_KEYWORDS: Record<string, string[]> = {
  // 🏍️ Quad Bike / Off-Road (Experience 1, 13, 17)
  'quad': ['quad', 'quadbike', 'atv', '4x4', 'off-road', 'offroad', 'buggy', 'jeep', 'dirt', 'mud', 'terrain'],
  
  // 🐕 Puppy Yoga (Experience 2)
  'puppy': ['puppy', 'puppies', 'dog', 'dogs', 'cachorro', 'cão', 'pet', 'animal yoga', 'puppy yoga'],
  
  // 🧘 Yoga & Meditation (Experience 2, 16, 19)
  'yoga': ['yoga', 'meditation', 'meditate', 'mindfulness', 'zen', 'wellness', 'wellbeing', 'relax', 'relaxation', 'stretch', 'breathing'],
  
  // 🧗 Climbing / Bridge (Experience 3, 22)
  'climbing': ['climbing', 'climb', 'rock climbing', 'bouldering', 'escalada', 'bridge', 'ponte', '25 abril', 'rappel', 'abseil'],
  
  // 🐬 Dolphins & Marine Life (Experience 4)
  'dolphins': ['dolphin', 'dolphins', 'golfinhos', 'golfinho', 'whale', 'whales', 'baleia', 'marine', 'cetacean', 'wildlife', 'safari', 'boat tour'],
  
  // 🥧 Pastel de Nata / Baking (Experience 5)
  'pastry': ['pastel de nata', 'pasteis', 'pastry', 'baking', 'bakery', 'custard tart', 'portuguese tart', 'nata', 'pastelaria', 'pasteis de belem'],
  
  // 👨‍🍳 Cooking Class (Experience 5, 6)
  'cooking': ['cooking', 'cook', 'chef', 'kitchen', 'recipe', 'culinary', 'gastronomia', 'gastronomy', 'cooking class', 'food making', 'cuisine'],
  
  // 🍷 Wine Tasting (Experience 16)
  'wine': ['wine', 'vinho', 'vineyard', 'vineyards', 'vinha', 'winery', 'tasting', 'degustação', 'cellar', 'adega', 'sommelier', 'grapes'],
  
  // 🍽️ Food & Gastronomy (Experience 6, 9)
  'food': ['food', 'comida', 'foodie', 'food tour', 'gastronomy', 'gastronomia', 'tasting', 'restaurant', 'restaurante', 'eat', 'eating', 'taste'],
  
  // 🚗 Self-Drive Tours / Electric Car (Experience 7)
  'selfdrive': ['self-drive', 'self drive', 'electric car', 'carro elétrico', 'eco car', 'tuk tuk', 'tuktuk', 'rental car', 'drive tour'],
  
  // 🏰 Sintra / Treasure Hunt (Experience 8, 13)
  'sintra': ['sintra', 'palace', 'palácio', 'pena', 'castle', 'castelo', 'monserrate', 'quinta da regaleira', 'treasure hunt', 'mystery'],
  
  // 🎨 Street Art & Culture (Experience 9)
  'streetart': ['street art', 'graffiti', 'mural', 'murals', 'urban art', 'arte urbana', 'art tour', 'cultural', 'multicultural'],
  
  // 🎵 Live Music (Experience 9)
  'music': ['music', 'música', 'live music', 'concert', 'concerto', 'fado', 'jazz', 'jam session', 'band', 'musical'],
  
  // 🐴 Horseback Riding (Experience 10)
  'horse': ['horse', 'horses', 'cavalo', 'cavalos', 'horseback', 'riding', 'equestrian', 'equitação', 'pony', 'stable'],
  
  // 🏖️ Beach / Comporta (Experience 10, 18, 20)
  'beach': ['beach', 'praia', 'coast', 'costa', 'coastline', 'seaside', 'comporta', 'caparica', 'sand', 'shore', 'atlantic'],
  
  // 🎨 Tile Workshop / Azulejos (Experience 11)
  'tiles': ['tiles', 'azulejos', 'azulejo', 'ceramic', 'ceramics', 'pottery', 'workshop', 'art workshop', 'craft', 'crafts', 'handmade', 'diy'],
  
  // 🐝 Beekeeping / Honey (Experience 12)
  'beekeeping': ['beekeeping', 'bees', 'bee', 'abelha', 'abelhas', 'honey', 'mel', 'apicultura', 'hive', 'farm', 'quinta', 'agriculture'],
  
  // ✈️ Flying / Pilot Experience (Experience 14)
  'flying': ['flying', 'fly', 'voar', 'voo', 'pilot', 'piloto', 'airplane', 'avião', 'aviation', 'aircraft', 'cockpit', 'flight'],
  
  // 🪂 Skydiving / Indoor Skydive (Experience 15)
  'skydiving': ['skydiving', 'skydive', 'sky dive', 'freefall', 'wind tunnel', 'indoor skydive', 'paraquedismo', 'adrenaline'],
  
  // 🪂 Paragliding (Experience 20)
  'paragliding': ['paragliding', 'paraglide', 'parapente', 'gliding', 'tandem flight', 'soaring', 'cliffs'],
  
  // 🏄 Surfing (Experience 18, 19)
  'surf': ['surf', 'surfing', 'surfer', 'waves', 'ondas', 'wave', 'surfboard', 'surf lesson', 'surf camp', 'surf school', 'water sport', 'barrels', 'barrel'],
  
  // 🤿 Scuba Diving (Experience 21)
  'diving': ['diving', 'dive', 'scuba', 'mergulho', 'underwater', 'snorkel', 'snorkeling', 'ocean dive', 'sea dive', 'marine reserve'],
  
  // 🏔️ Adventure / Adrenaline (General)
  'adventure': ['adventure', 'aventura', 'adrenaline', 'adrenalina', 'extreme', 'extremo', 'thrill', 'exciting', 'action'],
  
  // 🌅 Sunset / Golden Hour
  'sunset': ['sunset', 'pôr do sol', 'golden hour', 'sunrise', 'nascer do sol', 'evening', 'dusk', 'twilight'],
  
  // 🚤 Boat Tours (Experience 4)
  'boat': ['boat', 'barco', 'sailing', 'veleiro', 'yacht', 'iate', 'cruise', 'cruzeiro', 'catamaran', 'speedboat'],
  
  // 🎯 Tours & Experiences (General)
  'tour': ['tour', 'guided', 'guiado', 'experience', 'experiência', 'excursion', 'excursão', 'day trip', 'activity', 'atividade'],
  
  // 🧘‍♀️ Wellness / Retreat
  'wellness': ['wellness', 'bem-estar', 'spa', 'retreat', 'retiro', 'health', 'saúde', 'detox', 'mindful', 'self-care'],
  
  // 🎣 Fishing (if you add fishing experiences)
  'fishing': ['fishing', 'fish', 'pesca', 'pescar', 'peixe', 'angling', 'deep sea fishing', 'boat fishing', 'rod'],
  
  // 📸 Photography / Views
  'photography': ['photography', 'photo', 'fotografia', 'foto', 'instagram', 'instagrammable', 'viewpoint', 'miradouro', 'scenic', 'views'],
  
  // 🏛️ Lisbon City
  'lisbon': ['lisbon', 'lisboa', 'alfama', 'belém', 'belem', 'bairro alto', 'chiado', 'baixa', 'mouraria', 'tram', 'elétrico', 'tram 28'],
  
  // 🌊 Nature / Outdoors
  'nature': ['nature', 'natureza', 'outdoor', 'outdoors', 'ar livre', 'forest', 'floresta', 'park', 'parque', 'natural', 'green', 'sea', 'ocean', 'oceano'],
  
  // 👨‍👩‍👧‍👦 Family / Kids
  'family': ['family', 'família', 'kids', 'crianças', 'children', 'family-friendly', 'kid-friendly'],
  
  // 💑 Romantic / Couples
  'romantic': ['romantic', 'romântico', 'couple', 'casal', 'honeymoon', 'lua de mel', 'date', 'love', 'anniversary'],
  
  // 🏊 Water Sports / Ocean (General)
  'water': ['water', 'água', 'ocean', 'oceano', 'sea', 'mar', 'aquatic', 'aquático', 'corals', 'summer', 'verão'],
};

// Mapping categories to experience IDs (when available)
const CATEGORY_TO_EXPERIENCE_IDS: Record<string, number[]> = {
  'surf': [18, 19],
  'beach': [10, 18, 20],
  'yoga': [2, 16, 19],
  'puppy': [2],
  'quad': [1, 13, 17],
  'dolphins': [4],
  'boat': [4],
  'water': [18, 19, 21, 4],
  'diving': [21],
  'climbing': [3, 22],
  'horse': [10],
  'cooking': [5, 6],
  'pastry': [5],
  'wine': [16],
  'food': [6, 9],
  'tiles': [11],
  'beekeeping': [12],
  'flying': [14],
  'skydiving': [15],
  'paragliding': [20],
  'sintra': [8, 13],
  'streetart': [9],
  'music': [9],
  'selfdrive': [7],
};

// Location keywords for better matching
const LOCATION_KEYWORDS: Record<string, string[]> = {
  'Setúbal': ['setúbal', 'setubal', 'arrábida', 'arrabida', 'troia', 'sado', 'sesimbra'],
  'Lisbon': ['lisbon', 'lisboa', 'cascais', 'sintra', 'belém', 'belem', 'caparica', 'costa da caparica', 'almada'],
  'Comporta': ['comporta', 'melides', 'carvalhal', 'troia'],
  'Sintra': ['sintra', 'colares', 'praia das maçãs', 'cabo da roca'],
  'Cascais': ['cascais', 'estoril', 'carcavelos', 'guincho'],
  'Algarve': ['algarve', 'faro', 'lagos', 'albufeira', 'benagil', 'portimão', 'tavira', 'vilamoura'],
  'Porto': ['porto', 'douro', 'gaia', 'matosinhos', 'foz'],
  'Tomar': ['tomar', 'tejo', 'ribatejo', 'santarém'],
  'Portugal': ['portugal', 'portuguese', 'português', 'portuguesa', 'pt'],
};

interface MatchedExperience {
  experience: any;
  score: number;
  matchedKeywords: string[];
}

interface SocialMediaMetadata {
  platform: 'tiktok' | 'instagram';
  success: boolean;
  username?: string;
  userUrl?: string;
  description?: string;
  fullTitle?: string;
  hashtags?: string[];
  thumbnailUrl?: string;
  error?: string;
  matchMethod?: 'ai' | 'keywords' | 'suggested';
}

interface SmartMatchResponse {
  success: boolean;
  metadata: SocialMediaMetadata;
  matchedExperiences: any[];
  matchMethod: 'ai' | 'keywords' | 'suggested' | 'none';
  error?: string;
}

export default function SharedContentScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { experiences } = useExperiences();
  
  // Also get share intent directly as fallback
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  
  const [loading, setLoading] = useState(true);
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [sharedText, setSharedText] = useState<string | null>(null);
  const [matchedExperiences, setMatchedExperiences] = useState<MatchedExperience[]>([]);
  const [analyzing, setAnalyzing] = useState(true); // Start with analyzing state
  const [paramsReady, setParamsReady] = useState(false); // Track if params are loaded
  const [scanProgress] = useState(new Animated.Value(0));
  const [scanLineAnim] = useState(new Animated.Value(0));
  const [socialMetadata, setSocialMetadata] = useState<SocialMediaMetadata | null>(null);
  const [matchMethod, setMatchMethod] = useState<string>('');

  // Scanning line animation
  useEffect(() => {
    const animateScanLine = () => {
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
    };
    
    if (analyzing) {
      animateScanLine();
      // Animate progress bar
      Animated.timing(scanProgress, {
        toValue: 1,
        duration: 6000, // Longer to account for AI processing
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    }
  }, [analyzing]);

  /**
   * Use the new smart-match endpoint that handles:
   * 1. Apify metadata extraction
   * 2. Gemini AI matching
   * 3. Keyword fallback
   */
  const smartMatchExperiences = async (url: string): Promise<SmartMatchResponse | null> => {
    try {
      console.log('🤖 Calling smart-match API for:', url);
      const response = await apiService.post('/social-media/smart-match', { url });
      
      if (response.success) {
        console.log('✅ Smart match response:', response);
        return response as unknown as SmartMatchResponse;
      }
      
      console.log('❌ Smart match failed:', response.error);
      return null;
    } catch (error) {
      console.error('Failed to smart match:', error);
      return null;
    }
  };

  /**
   * Fallback to local keyword matching if API fails
   */
  const localKeywordMatch = (url?: string, text?: string) => {
    console.log('� Using local keyword matching...');
    
    let contentToAnalyze = `${url || ''} ${text || ''}`.toLowerCase();
    
    // Extract hashtags directly from the shared text
    const hashtagRegex = /#[\w\u00C0-\u024F]+/gi;
    const hashtagsFromText = (text || '').match(hashtagRegex) || [];
    contentToAnalyze += ' ' + hashtagsFromText.join(' ').toLowerCase();
    
    console.log('� Content to analyze:', contentToAnalyze);
    
    // Find matching experiences based on keywords
    const matches: MatchedExperience[] = [];
    const matchedExperienceIds = new Set<string>();
    const categoryScores: Record<string, number> = {};
    
    // Find which categories match the content
    for (const [category, keywords] of Object.entries(EXPERIENCE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (contentToAnalyze.includes(keyword)) {
          categoryScores[category] = (categoryScores[category] || 0) + 10;
        }
      }
    }
    
    // Find experiences that match the categories
    const sortedCategories = Object.entries(categoryScores)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);
    
    for (const category of sortedCategories) {
      const expIds = CATEGORY_TO_EXPERIENCE_IDS[category] || [];
      
      for (const expId of expIds) {
        const exp = experiences.find(e => 
          e.id === String(expId) || parseInt(e.id) === expId
        );
        
        if (exp && !matchedExperienceIds.has(exp.id)) {
          matchedExperienceIds.add(exp.id);
          matches.push({
            experience: exp,
            score: categoryScores[category],
            matchedKeywords: [category],
          });
        }
      }
      
      // Also try matching by experience content
      for (const exp of experiences) {
        if (matchedExperienceIds.has(exp.id)) continue;
        
        const expContent = `${exp.title} ${exp.description || ''} ${exp.category} ${(exp.tags || []).join(' ')}`.toLowerCase();
        const categoryKeywords = EXPERIENCE_KEYWORDS[category] || [];
        
        for (const keyword of categoryKeywords) {
          if (expContent.includes(keyword)) {
            matchedExperienceIds.add(exp.id);
            matches.push({
              experience: exp,
              score: categoryScores[category],
              matchedKeywords: [category],
            });
            break;
          }
        }
      }
    }
    
    return matches.sort((a, b) => b.score - a.score).slice(0, 5);
  };

  useEffect(() => {
    // Get the shared content from params OR from share intent directly
    let url = params.url as string;
    let text = params.text as string;
    
    // Fallback: if params are empty but we have a share intent, use it directly
    if ((!url && !text) && hasShareIntent && shareIntent) {
      console.log('📤 [shared-content] Using share intent directly:', shareIntent);
      url = shareIntent.webUrl || shareIntent.text || '';
      text = shareIntent.text || '';
      resetShareIntent();
    }
    
    console.log('📤 [shared-content] Final URL/Text:', { url, text });
    
    // If still no params, wait a bit more
    if (!url && !text) {
      console.log('📤 [shared-content] Waiting for params...');
      return;
    }
    
    setParamsReady(true);
    if (url) setSharedUrl(url);
    if (text) setSharedText(text);
    
    setLoading(false);
    
    // Main processing function
    const processSharedContent = async () => {
      try {
        // Check if it's a social media URL
        const isSocialMedia = url && (
          url.includes('tiktok') || 
          url.includes('instagram') || 
          url.includes('instagr.am')
        );
        
        if (isSocialMedia) {
          // Try the smart-match API first (uses Apify + Gemini AI)
          const smartMatchResult = await smartMatchExperiences(url);
          
          if (smartMatchResult?.success && smartMatchResult.matchedExperiences?.length > 0) {
            // DEBUG: Log raw API response
            console.log('🖼️ RAW API RESPONSE:', JSON.stringify(smartMatchResult.matchedExperiences[0], null, 2));
            
            // Transform API response to frontend format
            const matches = smartMatchResult.matchedExperiences.map(exp => {
              // Parse images if it's a string (JSONB from database)
              let imagesArray = exp.images;
              if (typeof exp.images === 'string') {
                try {
                  imagesArray = JSON.parse(exp.images);
                } catch (e) {
                  imagesArray = [];
                }
              }
              
              // Get the first real image from images array
              const firstImage = Array.isArray(imagesArray) && imagesArray.length > 0 
                ? imagesArray[0] 
                : null;
              
              console.log('🖼️ Experience:', exp.title);
              console.log('   - exp.images:', exp.images);
              console.log('   - imagesArray:', imagesArray);
              console.log('   - firstImage:', firstImage);
              console.log('   - exp.image:', exp.image);
              console.log('   - exp.image_url:', exp.image_url);
              console.log('   - exp.provider_logo:', exp.provider_logo);
              
              return {
              experience: {
                id: exp.id,
                title: exp.title,
                description: exp.description,
                category: exp.category,
                tags: exp.tags,
                location: exp.location,
                price: exp.price,
                currency: exp.currency,
                duration: exp.duration,
                rating: exp.rating,
                reviewCount: exp.reviewCount,
                image: firstImage || exp.image_url || exp.image, // USE firstImage from parsed array!
                images: imagesArray,
                provider: exp.provider,
              },
              score: 100, // AI matched
              matchedKeywords: smartMatchResult.matchMethod === 'suggested' ? ['suggested'] : ['ai-matched'],
            }});
            
            // Navigate directly to find-activity screen with Instagram URL
            console.log('🎯 Navigating to find-activity with URL:', url);
            router.replace({
              pathname: '/find-activity',
              params: {
                instagramUrl: url,
                thumbnail: smartMatchResult.metadata?.thumbnail_url || '',
              }
            });
            return;
          }
        }
        
        // No fallback - if AI match fails or not social media, navigate to find-activity anyway
        console.log('🎯 No matches found, but navigating to find-activity with URL:', url);
        router.replace({
          pathname: '/find-activity',
          params: {
            instagramUrl: url || text || '',
            thumbnail: '',
          }
        });
        
      } catch (error) {
        console.error('Error processing shared content:', error);
        // On error, still try to navigate to find-activity
        console.log('❌ Error occurred, but navigating to find-activity');
        router.replace({
          pathname: '/find-activity',
          params: {
            instagramUrl: url || text || '',
            thumbnail: '',
          }
        });
      }
    };
    
    // Start after a short delay to show animation
    const timer = setTimeout(() => {
      processSharedContent();
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [params.url, params.text, hasShareIntent, shareIntent]); // Include share intent as fallback source

  const handleClose = () => {
    // Always go to home - this ensures clean navigation state
    router.replace('/(tabs)');
  };

  const handleExperiencePress = (experienceId: string) => {
    // Navigate to experience WITHOUT closing the modal
    // This allows the user to go back and see other experiences
    console.log('🔗 Navigating to experience:', experienceId);
    
    router.push({
      pathname: '/experience/[id]',
      params: { id: experienceId }
    });
  };

  // Show the detecting/scanning screen while loading or analyzing
  if (!paramsReady || analyzing) {
    return (
      <View style={[styles.detectingContainer, { paddingTop: insets.top }]}>
        {/* Close button */}
        <Pressable onPress={handleClose} style={styles.detectingCloseButton}>
          <X size={24} color="#333" />
        </Pressable>

        {/* Logo */}
        <Text style={styles.detectingLogo}>Bored Tourist</Text>

        {/* Scanning visual */}
        <View style={styles.scanContainer}>
          {/* Emojis around the scan area */}
          <Text style={styles.emojiLeft}>🏛️</Text>
          
          <View style={styles.scanBox}>
            {/* Main image/icon */}
            <Text style={styles.scanEmoji}>🗺️</Text>
            
            {/* Scanning line animation */}
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
            
            {/* Corner brackets */}
            <View style={[styles.scanCorner, styles.scanCornerTL]} />
            <View style={[styles.scanCorner, styles.scanCornerTR]} />
            <View style={[styles.scanCorner, styles.scanCornerBL]} />
            <View style={[styles.scanCorner, styles.scanCornerBR]} />
          </View>
          
          <Text style={styles.emojiRight}>🎭</Text>
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

        {/* Status text */}
        <Text style={styles.detectingText}>Detecting....</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Sparkles size={24} color={colors.dark.accent} />
          <Text style={styles.headerTitle}>Bored Tourist</Text>
        </View>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <X size={24} color={colors.dark.text} />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Matched Experiences */}
        {matchedExperiences.length > 0 && (
          <View style={styles.matchesSection}>
            <Text style={styles.sectionTitle}>
              🎯 Book an Experience!
            </Text>
            <Text style={styles.sectionSubtitle}>
              {`Found ${matchedExperiences.length} experience${matchedExperiences.length > 1 ? 's' : ''} that match your content`}
            </Text>

            {matchedExperiences.map(({ experience, matchedKeywords }) => {
              // Use images[0] if available, fallback to image
              const imageUri = experience.images && experience.images.length > 0 
                ? experience.images[0] 
                : experience.image;
              
              return (
              <Pressable
                key={experience.id}
                style={styles.experienceCard}
                onPress={() => handleExperiencePress(experience.id)}
              >
                {/* Large image with gradient overlay */}
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.experienceImage}
                  />
                  {/* Price badge on image */}
                  <View style={styles.priceBadge}>
                    <Text style={styles.priceText}>€{experience.price}</Text>
                  </View>
                </View>
                
                {/* Experience info below image */}
                <View style={styles.experienceInfo}>
                  <Text style={styles.experienceTitle} numberOfLines={2}>
                    {experience.title}
                  </Text>
                  
                  <View style={styles.experienceMeta}>
                    <View style={styles.metaItem}>
                      <MapPin size={14} color={colors.dark.textSecondary} />
                      <Text style={styles.metaText}>{experience.location}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.experienceStats}>
                    <View style={styles.statItem}>
                      <Star size={14} color="#FFB800" fill="#FFB800" />
                      <Text style={styles.statText}>{experience.rating || '4.5'}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Clock size={14} color={colors.dark.accent} />
                      <Text style={styles.statText}>{experience.duration}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
              );
            })}
          </View>
        )}

        {/* No Matches - Simple message */}
        {!analyzing && matchedExperiences.length === 0 && !loading && (
          <View style={styles.noMatchesContainer}>
            <Text style={styles.noMatchesEmoji}>🔍</Text>
            <Text style={styles.noMatchesTitle}>No matches found</Text>
            <Text style={styles.noMatchesText}>
              We couldn't find experiences matching this content. Try sharing a different video or explore our experiences!
            </Text>
            
            {/* Explore Experiences button */}
            <Pressable 
              style={styles.exploreButton}
              onPress={handleClose}
            >
              <Text style={styles.exploreButtonText}>Explore Experiences</Text>
            </Pressable>
          </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontFamily: typography.fonts.extrabold,
    fontSize: typography.sizes['2xl'],
    lineHeight: 30,
    color: colors.dark.text,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sharedCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sharedLabel: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    lineHeight: 16,
    color: colors.dark.textSecondary,
    marginBottom: 8,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sharedUrl: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    lineHeight: 24,
    color: colors.dark.accent,
    flex: 1,
  },
  sharedText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    lineHeight: 24,
    color: colors.dark.text,
  },
  analyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  analyzingText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    lineHeight: 24,
    color: colors.dark.textSecondary,
  },
  matchesSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontFamily: typography.fonts.extrabold,
    fontSize: typography.sizes['2xl'],
    lineHeight: 30,
    color: colors.dark.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    lineHeight: 16,
    color: colors.dark.textSecondary,
    marginBottom: 16,
  },
  experienceCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  experienceImage: {
    width: '100%',
    height: '100%',
  },
  priceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.dark.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priceText: {
    fontFamily: typography.fonts.extrabold,
    fontSize: typography.sizes.base,
    color: colors.dark.background,
  },
  experienceInfo: {
    padding: 16,
  },
  experienceTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.lg,
    lineHeight: 26,
    color: colors.dark.text,
    marginBottom: 8,
  },
  experienceMeta: {
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
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary,
  },
  experienceStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.text,
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.dark.border,
    marginHorizontal: 12,
  },
  noMatchesContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  noMatchesEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  noMatchesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.dark.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  noMatchesText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  exploreButton: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: colors.dark.primary,
    borderRadius: 12,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark.background,
  },
  backToAppButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: 12,
  },
  backToAppButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark.textSecondary,
  },
  browseButton: {
    backgroundColor: colors.dark.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark.background,
  },
  // Detecting screen styles
  detectingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  detectingCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  detectingLogo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F4E04D',
    marginTop: 80,
    marginBottom: 60,
    fontFamily: 'Inter_800ExtraBold',
  },
  scanContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 40,
  },
  emojiLeft: {
    fontSize: 40,
  },
  emojiRight: {
    fontSize: 40,
  },
  scanBox: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  scanEmoji: {
    fontSize: 70,
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 3,
    backgroundColor: '#4A90D9',
    opacity: 0.8,
  },
  scanCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4A90D9',
  },
  scanCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  scanCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  scanCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  scanCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginBottom: 20,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#333',
    marginRight: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#C0C0C0',
    borderRadius: 3,
  },
  detectingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 40,
  },
  backgroundSaveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A3A3A',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
  },
  backgroundSaveIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#5A5A5A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backgroundSaveIconText: {
    fontSize: 20,
  },
  backgroundSaveContent: {
    flex: 1,
  },
  backgroundSaveTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  backgroundSaveSubtitle: {
    fontSize: 13,
    color: '#AAAAAA',
  },
  backgroundSaveConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90D9',
  },
});
