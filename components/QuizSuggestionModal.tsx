import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Sparkles } from 'lucide-react-native';
import colors from '@/constants/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface QuizSuggestionModalProps {
  visible: boolean;
  onClose: () => void;
  onStartQuiz: () => void;
  userName?: string;
}

export default function QuizSuggestionModal({ 
  visible, 
  onClose, 
  onStartQuiz,
  userName 
}: QuizSuggestionModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingBottom: insets.bottom + 24 }]}>
          {/* Close button */}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <X size={24} color={colors.dark.textSecondary} />
          </Pressable>

          {/* Emoji header */}
          <View style={styles.emojiContainer}>
            <Text style={styles.emoji}>🎉</Text>
          </View>

          {/* Welcome text */}
          <Text style={styles.title}>
            Welcome{userName ? `, ${userName.split(' ')[0]}` : ''}!
          </Text>
          
          <Text style={styles.subtitle}>
            Your account is ready! Want to personalize your experience?
          </Text>

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <View style={styles.bulletPoint}>
              <Sparkles size={20} color={colors.dark.primary} />
              <Text style={styles.bulletText}>
                Take a quick 1-minute quiz
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Sparkles size={20} color={colors.dark.primary} />
              <Text style={styles.bulletText}>
                We'll show you experiences you'll love
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Sparkles size={20} color={colors.dark.primary} />
              <Text style={styles.bulletText}>
                Your favorite categories will appear first
              </Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable style={styles.primaryButton} onPress={onStartQuiz}>
              <Text style={styles.primaryButtonText}>Let's do it! 🚀</Text>
            </Pressable>
            
            <Pressable style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Skip for later</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.dark.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    minHeight: SCREEN_HEIGHT * 0.55,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  emojiContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.dark.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  descriptionContainer: {
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bulletText: {
    fontSize: 15,
    color: colors.dark.text,
    flex: 1,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark.background,
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark.textSecondary,
  },
});
