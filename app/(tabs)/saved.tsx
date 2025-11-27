import { Sparkles, Send, MapPin } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, PermanentMarker_400Regular } from '@expo-google-fonts/permanent-marker';

import colors from '@/constants/colors';
import { getVibeCheckRecommendation, type VibeCheckResponse } from '@/services/boredAI';
import { useLanguage } from '@/contexts/LanguageContext';

interface VibeResponse {
  id: string;
  vibe: string;
  recommendation: VibeCheckResponse;
  timestamp: Date;
}

export default function BoredAITab() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [userVibe, setUserVibe] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<VibeResponse | null>(null);

  const [fontsLoaded] = useFonts({
    PermanentMarker_400Regular,
  });

  const moods = [
    { emoji: '🎉', label: t('boredAI.moods.chaos'), vibe: t('boredAI.vibes.chaos') },
    { emoji: '😌', label: t('boredAI.moods.chill'), vibe: t('boredAI.vibes.chill') },
    { emoji: '🤘', label: t('boredAI.moods.rave'), vibe: t('boredAI.vibes.rave') },
    { emoji: '🏛️', label: t('boredAI.moods.history'), vibe: t('boredAI.vibes.history') },
    { emoji: '🍕', label: t('boredAI.moods.food'), vibe: t('boredAI.vibes.food') },
    { emoji: '🏄', label: t('boredAI.moods.surf'), vibe: t('boredAI.vibes.surf') },
  ];

  const handleMoodPress = async (vibe: string) => {
    setUserVibe(vibe);
    await handleSubmit(vibe);
  };

  const handleSubmit = async (customVibe?: string) => {
    const vibeToCheck = customVibe || userVibe;
    if (!vibeToCheck.trim()) return;

    setIsLoading(true);
    setCurrentResponse(null); // Clear previous response
    try {
      const recommendation = await getVibeCheckRecommendation(vibeToCheck);
      const newResponse: VibeResponse = {
        id: Date.now().toString(),
        vibe: vibeToCheck,
        recommendation,
        timestamp: new Date(),
      };
      setCurrentResponse(newResponse); // Only show current response
      if (!customVibe) setUserVibe('');
    } catch (error) {
      console.error('Error getting vibe check:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenMaps = async (mapsUrl: string) => {
    try {
      const supported = await Linking.canOpenURL(mapsUrl);
      if (supported) {
        await Linking.openURL(mapsUrl);
      }
    } catch (error) {
      console.error('Error opening maps:', error);
    }
  };

  const renderTextWithHighlight = (text: string, placeName?: string) => {
    if (!placeName) return text;
    
    // Find the place name in the text (it might have ** around it or not)
    const placePattern = new RegExp(`\\*\\*${placeName}\\*\\*|${placeName}`, 'gi');
    const parts = text.split(placePattern);
    const matches = text.match(placePattern) || [];
    
    return parts.map((part, index) => {
      const match = matches[index];
      if (match) {
        const cleanMatch = match.replace(/\*\*/g, '');
        return (
          <React.Fragment key={index}>
            {part}
            <Text style={styles.highlightedPlace}>{cleanMatch}</Text>
          </React.Fragment>
        );
      }
      return part;
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <Sparkles size={28} color={colors.dark.primary} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{t('boredAI.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('boredAI.subtitle')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.introSection}>
          <Text style={styles.introText}>
            {t('boredAI.intro')}
          </Text>
        </View>

        <View style={styles.inputSection}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('boredAI.placeholder')}
              placeholderTextColor={colors.dark.textTertiary}
              value={userVibe}
              onChangeText={setUserVibe}
              multiline
              maxLength={200}
              editable={!isLoading}
            />
            <Pressable
              style={[styles.sendButton, (!userVibe.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={() => handleSubmit()}
              disabled={!userVibe.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.dark.background} />
              ) : (
                <Send size={20} color={colors.dark.background} />
              )}
            </Pressable>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodsContainer}
          >
            {moods.map((mood) => (
              <Pressable
                key={mood.label}
                style={styles.moodChip}
                onPress={() => handleMoodPress(mood.vibe)}
                disabled={isLoading}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text style={styles.moodLabel}>{mood.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {currentResponse && (
          <View style={styles.responsesSection}>
            <View style={styles.responseCard}>
              <View style={styles.responseHeader}>
                <Text style={styles.responseVibe}>"{currentResponse.vibe}"</Text>
                <View style={styles.aiChoiceBadge}>
                  <Text style={styles.aiChoiceText}>{t('boredAI.aiChoice')}</Text>
                </View>
              </View>
              {fontsLoaded ? (
                <Text style={[styles.responseText, { fontFamily: 'PermanentMarker_400Regular' }]}>
                  {renderTextWithHighlight(currentResponse.recommendation.text, currentResponse.recommendation.placeName)}
                </Text>
              ) : (
                <Text style={styles.responseText}>
                  {renderTextWithHighlight(currentResponse.recommendation.text, currentResponse.recommendation.placeName)}
                </Text>
              )}
              {currentResponse.recommendation.mapsUrl && (
                <Pressable 
                  style={styles.mapsButton}
                  onPress={() => handleOpenMaps(currentResponse.recommendation.mapsUrl!)}
                >
                  <MapPin size={18} color={colors.dark.background} />
                  <Text style={styles.mapsButtonText}>{t('boredAI.viewOnMaps')}</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {!currentResponse && !isLoading && (
          <View style={styles.emptyState} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900' as const,
    color: colors.dark.text,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  introSection: {
    padding: 20,
    backgroundColor: '#2a2a2a',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dark.primary,
  },
  introText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    lineHeight: 20,
    textAlign: 'center' as const,
  },
  inputSection: {
    padding: 16,
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.dark.text,
    minHeight: 44,
    maxHeight: 120,
    paddingTop: 12,
    paddingBottom: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.dark.textTertiary,
    opacity: 0.5,
  },
  moodsContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 16,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  moodEmoji: {
    fontSize: 18,
  },
  moodLabel: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: colors.dark.text,
  },
  responsesSection: {
    padding: 16,
    gap: 16,
  },
  responseCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  responseVibe: {
    flex: 1,
    fontSize: 14,
    color: colors.dark.textSecondary,
    fontStyle: 'italic' as const,
  },
  aiChoiceBadge: {
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    transform: [{ rotate: '-2deg' }],
  },
  aiChoiceText: {
    fontSize: 10,
    fontWeight: '900' as const,
    color: colors.dark.background,
    letterSpacing: 0.5,
  },
  responseText: {
    fontSize: 16,
    color: colors.dark.text,
    lineHeight: 24,
    fontWeight: '500' as const,
  },
  highlightedPlace: {
    color: colors.dark.primary, // Lime green color
    fontWeight: '900' as const,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  mapsButtonText: {
    fontSize: 15,
    fontWeight: '900' as const,
    color: colors.dark.background,
    letterSpacing: 0.3,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    minHeight: 400,
  },
  emptyStateImage: {
    width: '100%',
    height: 400,
    maxWidth: 600,
  },
});
