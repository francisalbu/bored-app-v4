import { Sparkles, Send, MapPin, X } from 'lucide-react-native';
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
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { getVibeCheckRecommendation, type VibeCheckResponse } from '@/services/boredAI';
import { useLanguage } from '@/contexts/LanguageContext';

interface VibeResponse {
  id: string;
  vibe: string;
  recommendation: VibeCheckResponse;
  timestamp: Date;
}

interface BoredAIModalProps {
  visible: boolean;
  onClose: () => void;
}

export function BoredAIModal({ visible, onClose }: BoredAIModalProps) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [userVibe, setUserVibe] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<VibeResponse | null>(null);

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
    setCurrentResponse(null);
    try {
      const recommendation = await getVibeCheckRecommendation(vibeToCheck);
      const newResponse: VibeResponse = {
        id: Date.now().toString(),
        vibe: vibeToCheck,
        recommendation,
        timestamp: new Date(),
      };
      setCurrentResponse(newResponse);
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

  const handleClose = () => {
    setCurrentResponse(null);
    setUserVibe('');
    onClose();
  };

  const renderTextWithHighlight = (text: string, placeName?: string) => {
    if (!placeName) return text;
    
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      presentationStyle="overFullScreen"
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleClose} />
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Sparkles size={24} color={colors.dark.primary} />
                <View style={styles.headerTextContainer}>
                  <Text style={styles.headerTitle}>{t('boredAI.title')}</Text>
                  <Text style={styles.headerSubtitle}>{t('boredAI.subtitle')}</Text>
                </View>
              </View>
              <Pressable style={styles.closeButton} onPress={handleClose}>
                <X size={24} color={colors.dark.text} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Intro */}
              <View style={styles.introSection}>
                <Text style={styles.introText}>
                  {t('boredAI.intro')}
                </Text>
              </View>

              {/* Input */}
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

                {/* Mood Chips */}
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

              {/* Response */}
              {currentResponse && (
                <View style={styles.responsesSection}>
                  <View style={styles.responseCard}>
                    <View style={styles.responseHeader}>
                      <Text style={styles.responseVibe}>"{currentResponse.vibe}"</Text>
                      <View style={styles.aiChoiceBadge}>
                        <Text style={styles.aiChoiceText}>{t('boredAI.aiChoice')}</Text>
                      </View>
                    </View>
                    <Text style={styles.responseText}>
                      {renderTextWithHighlight(currentResponse.recommendation.text, currentResponse.recommendation.placeName)}
                    </Text>
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

              {/* Loading State */}
              {isLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.dark.primary} />
                  <Text style={styles.loadingText}>Finding the perfect spot...</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: colors.dark.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 500,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: colors.dark.text,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  introSection: {
    padding: 20,
    backgroundColor: '#2a2a2a',
  },
  introText: {
    fontSize: 15,
    color: colors.dark.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  inputSection: {
    padding: 20,
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.dark.backgroundSecondary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.dark.text,
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.dark.textTertiary,
  },
  moodsContainer: {
    gap: 10,
    paddingVertical: 4,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  moodEmoji: {
    fontSize: 18,
  },
  moodLabel: {
    fontSize: 13,
    color: colors.dark.text,
    fontWeight: '600' as const,
  },
  responsesSection: {
    paddingHorizontal: 20,
  },
  responseCard: {
    backgroundColor: colors.dark.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.dark.primary,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  responseVibe: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
  aiChoiceBadge: {
    backgroundColor: colors.dark.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  aiChoiceText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.dark.background,
  },
  responseText: {
    fontSize: 15,
    color: colors.dark.text,
    lineHeight: 24,
  },
  highlightedPlace: {
    color: colors.dark.primary,
    fontWeight: '700' as const,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 8,
  },
  mapsButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.dark.background,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
  },
});
