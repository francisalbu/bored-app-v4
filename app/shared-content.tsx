import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ExternalLink, MapPin, Star, Clock, Sparkles, Search } from 'lucide-react-native';
import colors from '@/constants/colors';
import typography from '@/constants/typography';
import apiService from '@/services/api';
import { useExperiences } from '@/hooks/useExperiences';

// Keywords to match from social media content to experiences
const EXPERIENCE_KEYWORDS: Record<string, string[]> = {
  // Dolphins & Marine
  'dolphins': ['dolphin', 'golfinhos', 'whale', 'marine', 'ocean', 'sea'],
  'boat': ['boat', 'barco', 'sailing', 'yacht', 'cruise', 'catamaran'],
  
  // Wine & Food
  'wine': ['wine', 'vinho', 'vineyard', 'winery', 'tasting', 'cellar'],
  'food': ['food', 'comida', 'gastronomy', 'cooking', 'culinary', 'restaurant'],
  
  // Adventure
  'surf': ['surf', 'surfing', 'waves', 'beach', 'praia'],
  'kayak': ['kayak', 'canoeing', 'paddle', 'river'],
  'hiking': ['hiking', 'trekking', 'mountain', 'trail', 'sintra', 'arrábida'],
  
  // City & Culture
  'lisbon': ['lisbon', 'lisboa', 'alfama', 'belém', 'bairro alto', 'tram'],
  'sintra': ['sintra', 'palace', 'pena', 'castle', 'palácio'],
  'porto': ['porto', 'douro', 'ribeira', 'gaia'],
  
  // Activities
  'sunset': ['sunset', 'pôr do sol', 'golden hour', 'evening'],
  'tour': ['tour', 'guided', 'experience', 'excursion', 'day trip'],
};

// Location keywords for better matching
const LOCATION_KEYWORDS: Record<string, string[]> = {
  'Setúbal': ['setúbal', 'setubal', 'arrábida', 'troia', 'sado'],
  'Lisbon': ['lisbon', 'lisboa', 'cascais', 'sintra', 'belém'],
  'Porto': ['porto', 'douro', 'gaia', 'matosinhos'],
  'Algarve': ['algarve', 'faro', 'lagos', 'albufeira', 'benagil'],
};

interface MatchedExperience {
  experience: any;
  score: number;
  matchedKeywords: string[];
}

export default function SharedContentScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { experiences } = useExperiences();
  
  const [loading, setLoading] = useState(true);
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [sharedText, setSharedText] = useState<string | null>(null);
  const [matchedExperiences, setMatchedExperiences] = useState<MatchedExperience[]>([]);
  const [analyzing, setAnalyzing] = useState(true); // Start with analyzing state
  const [scanProgress] = useState(new Animated.Value(0));
  const [scanLineAnim] = useState(new Animated.Value(0));

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
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    }
  }, [analyzing]);

  useEffect(() => {
    // Get the shared content from params
    const url = params.url as string;
    const text = params.text as string;
    
    if (url) setSharedUrl(url);
    if (text) setSharedText(text);
    
    setLoading(false);
    
    // Start with a delay to show the detecting animation
    setTimeout(() => {
      if (experiences.length > 0) {
        analyzeAndMatch();
      }
    }, 3500); // Show detecting screen for 3.5 seconds
  }, [params]);

  useEffect(() => {
    if ((sharedUrl || sharedText) && experiences.length > 0 && !analyzing) {
      // Already handled in the timeout above
    }
  }, [sharedUrl, sharedText, experiences]);

  const analyzeAndMatch = async () => {
    
    try {
      // Combine URL and text for analysis
      const contentToAnalyze = `${sharedUrl || ''} ${sharedText || ''}`.toLowerCase();
      
      // Extract platform info
      const isTikTok = contentToAnalyze.includes('tiktok');
      const isInstagram = contentToAnalyze.includes('instagram') || contentToAnalyze.includes('instagr.am');
      
      // Find matching experiences based on keywords
      const matches: MatchedExperience[] = [];
      
      for (const exp of experiences) {
        let score = 0;
        const matchedKeywords: string[] = [];
        
        // Check experience title, description, category, tags
        const expContent = `${exp.title} ${exp.description} ${exp.category} ${exp.location} ${(exp.tags || []).join(' ')}`.toLowerCase();
        
        // Match against keyword categories
        for (const [category, keywords] of Object.entries(EXPERIENCE_KEYWORDS)) {
          for (const keyword of keywords) {
            if (contentToAnalyze.includes(keyword)) {
              // Check if experience relates to this keyword
              if (expContent.includes(keyword) || expContent.includes(category)) {
                score += 10;
                if (!matchedKeywords.includes(category)) {
                  matchedKeywords.push(category);
                }
              }
            }
          }
        }
        
        // Location matching (higher weight)
        for (const [location, keywords] of Object.entries(LOCATION_KEYWORDS)) {
          for (const keyword of keywords) {
            if (contentToAnalyze.includes(keyword) && exp.location?.toLowerCase().includes(keyword)) {
              score += 20;
              if (!matchedKeywords.includes(location)) {
                matchedKeywords.push(location);
              }
            }
          }
        }
        
        // If there's a match, add to results
        if (score > 0) {
          matches.push({ experience: exp, score, matchedKeywords });
        }
      }
      
      // Sort by score and take top 5
      matches.sort((a, b) => b.score - a.score);
      setMatchedExperiences(matches.slice(0, 5));
      
      // If no keyword matches, try AI matching (if available)
      if (matches.length === 0 && sharedUrl) {
        // Could call Bored AI here for better matching
        // For now, show top-rated experiences as suggestions
        const topRated = experiences
          .filter(e => e.rating >= 4.5)
          .slice(0, 3)
          .map(exp => ({ experience: exp, score: 0, matchedKeywords: ['suggested'] }));
        setMatchedExperiences(topRated);
      }
      
    } catch (error) {
      console.error('Error analyzing content:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  const handleExperiencePress = (experienceId: string) => {
    router.push(`/experience/${experienceId}`);
  };

  const handleOpenOriginal = () => {
    if (sharedUrl) {
      Linking.openURL(sharedUrl);
    }
  };

  const getPlatformName = () => {
    if (sharedUrl?.includes('tiktok')) return 'TikTok';
    if (sharedUrl?.includes('instagram') || sharedUrl?.includes('instagr.am')) return 'Instagram';
    if (sharedUrl?.includes('youtube')) return 'YouTube';
    return 'Social Media';
  };

  const handleSaveInBackground = () => {
    // Close the modal and let it "save in background"
    router.back();
  };

  // Show the detecting/scanning screen
  if (analyzing) {
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

        {/* Save in background option */}
        <Pressable style={styles.backgroundSaveCard} onPress={handleSaveInBackground}>
          <View style={styles.backgroundSaveIcon}>
            <Text style={styles.backgroundSaveIconText}>⬇️</Text>
          </View>
          <View style={styles.backgroundSaveContent}>
            <Text style={styles.backgroundSaveTitle}>Don't want to wait?</Text>
            <Text style={styles.backgroundSaveSubtitle}>Bored Tourist will save in the background</Text>
          </View>
          <Text style={styles.backgroundSaveConfirm}>Confirm</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Sparkles size={24} color={colors.dark.accent} />
          <Text style={styles.headerTitle}>Save to Bored Tourist</Text>
        </View>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <X size={24} color={colors.dark.text} />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Shared Content Info */}
        <View style={styles.sharedCard}>
          <Text style={styles.sharedLabel}>Shared from {getPlatformName()}</Text>
          {sharedUrl && (
            <Pressable onPress={handleOpenOriginal} style={styles.urlContainer}>
              <Text style={styles.sharedUrl} numberOfLines={2}>{sharedUrl}</Text>
              <ExternalLink size={16} color={colors.dark.accent} />
            </Pressable>
          )}
          {sharedText && !sharedUrl && (
            <Text style={styles.sharedText} numberOfLines={3}>{sharedText}</Text>
          )}
        </View>

        {/* Matched Experiences */}
        {matchedExperiences.length > 0 && (
          <View style={styles.matchesSection}>
            <Text style={styles.sectionTitle}>
              {matchedExperiences[0].matchedKeywords.includes('suggested') 
                ? '✨ Suggested Experiences' 
                : '🎯 Matching Experiences'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {matchedExperiences[0].matchedKeywords.includes('suggested')
                ? 'Check out these popular experiences'
                : `Found ${matchedExperiences.length} related experience${matchedExperiences.length > 1 ? 's' : ''}`}
            </Text>

            {matchedExperiences.map(({ experience, matchedKeywords }) => (
              <Pressable
                key={experience.id}
                style={styles.experienceCard}
                onPress={() => handleExperiencePress(experience.id)}
              >
                <Image
                  source={{ uri: experience.image }}
                  style={styles.experienceImage}
                />
                <View style={styles.experienceInfo}>
                  <Text style={styles.experienceTitle} numberOfLines={2}>
                    {experience.title}
                  </Text>
                  <View style={styles.experienceMeta}>
                    <View style={styles.metaItem}>
                      <MapPin size={12} color={colors.dark.textSecondary} />
                      <Text style={styles.metaText}>{experience.location}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Star size={12} color="#FFB800" fill="#FFB800" />
                      <Text style={styles.metaText}>{experience.rating}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Clock size={12} color={colors.dark.textSecondary} />
                      <Text style={styles.metaText}>{experience.duration}</Text>
                    </View>
                  </View>
                  {matchedKeywords.length > 0 && !matchedKeywords.includes('suggested') && (
                    <View style={styles.keywordsContainer}>
                      {matchedKeywords.slice(0, 3).map((keyword) => (
                        <View key={keyword} style={styles.keywordBadge}>
                          <Text style={styles.keywordText}>{keyword}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <Text style={styles.experiencePrice}>
                  €{experience.price}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* No Matches */}
        {!analyzing && matchedExperiences.length === 0 && !loading && (
          <View style={styles.noMatchesContainer}>
            <Text style={styles.noMatchesTitle}>No exact matches found</Text>
            <Text style={styles.noMatchesText}>
              We couldn't find experiences matching this content. Try browsing our full catalog!
            </Text>
            <Pressable 
              style={styles.browseButton}
              onPress={() => router.push('/')}
            >
              <Text style={styles.browseButtonText}>Browse Experiences</Text>
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
    ...typography.h3,
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
    ...typography.caption,
    color: colors.dark.textSecondary,
    marginBottom: 8,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sharedUrl: {
    ...typography.body,
    color: colors.dark.accent,
    flex: 1,
  },
  sharedText: {
    ...typography.body,
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
    ...typography.body,
    color: colors.dark.textSecondary,
  },
  matchesSection: {
    marginTop: 10,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.dark.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    marginBottom: 16,
  },
  experienceCard: {
    flexDirection: 'row',
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  experienceImage: {
    width: 100,
    height: 100,
  },
  experienceInfo: {
    flex: 1,
    padding: 12,
  },
  experienceTitle: {
    ...typography.bodyBold,
    color: colors.dark.text,
    marginBottom: 6,
  },
  experienceMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption,
    color: colors.dark.textSecondary,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  keywordBadge: {
    backgroundColor: colors.dark.accent + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  keywordText: {
    ...typography.caption,
    color: colors.dark.accent,
    fontSize: 10,
  },
  experiencePrice: {
    ...typography.bodyBold,
    color: colors.dark.accent,
    padding: 12,
    alignSelf: 'center',
  },
  noMatchesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noMatchesTitle: {
    ...typography.h3,
    color: colors.dark.text,
    marginBottom: 8,
  },
  noMatchesText: {
    ...typography.body,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: colors.dark.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    ...typography.bodyBold,
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
