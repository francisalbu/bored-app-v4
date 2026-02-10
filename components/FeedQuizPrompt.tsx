import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { ChevronUp, Sparkles, X } from 'lucide-react-native';
import colors from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FeedQuizPromptProps {
  visible: boolean;
  onStartQuiz: () => void;
  onDismiss: () => void;
}

export default function FeedQuizPrompt({ 
  visible, 
  onStartQuiz, 
  onDismiss 
}: FeedQuizPromptProps) {
  const slideAnim = useRef(new Animated.Value(200)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 200,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        }
      ]}
    >
      {/* Swipe up indicator */}
      <View style={styles.swipeIndicator}>
        <ChevronUp size={20} color={colors.dark.textSecondary} />
      </View>

      {/* Close button */}
      <Pressable style={styles.closeButton} onPress={onDismiss}>
        <X size={20} color={colors.dark.textSecondary} />
      </Pressable>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.iconRow}>
          <Sparkles size={24} color={colors.dark.primary} />
          <Text style={styles.title}>Personalize your feed?</Text>
        </View>
        
        <Text style={styles.description}>
          Take a quick quiz so we can show you experiences you'll actually love!
        </Text>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <Pressable style={styles.primaryButton} onPress={onStartQuiz}>
            <Text style={styles.primaryButtonText}>Let's do it! 🚀</Text>
          </Pressable>
          
          <Pressable style={styles.secondaryButton} onPress={onDismiss}>
            <Text style={styles.secondaryButtonText}>Later</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100, // Above the tab bar
    left: 16,
    right: 16,
    backgroundColor: 'rgba(30, 30, 40, 0.95)',
    borderRadius: 20,
    padding: 16,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  swipeIndicator: {
    alignItems: 'center',
    marginBottom: 4,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 1,
  },
  content: {
    paddingRight: 24, // Space for close button
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark.text,
  },
  description: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.dark.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.dark.background,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.dark.textSecondary,
  },
});
