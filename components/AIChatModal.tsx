import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Bot, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import typography from '@/constants/typography';
import { useLanguage } from '@/contexts/LanguageContext';
import { getExperienceAnswer, type ExperienceInfo } from '@/services/boredAI';

// Accept any experience-like object (from API or constants)
interface AIChatModalProps {
  visible: boolean;
  experience: any | null;
  onClose: () => void;
}

export default function AIChatModal({ visible, experience, onClose }: AIChatModalProps) {
  const { t } = useLanguage();
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  // Pre-fabricated questions
  const quickQuestions = [
    "What's included in the price?",
    "What should I bring?",
    "Is this suitable for children?",
    "What's the cancellation policy?",
  ];

  // Convert experience to ExperienceInfo format
  const getExperienceInfo = (): ExperienceInfo | null => {
    if (!experience) return null;
    
    return {
      title: experience.title || '',
      description: experience.description || '',
      location: experience.location || experience.meeting_point || '',
      duration: experience.duration || '',
      price: experience.price || 0,
      included: experience.included || experience.whats_included || [],
      whatToBring: experience.whatToBring || experience.what_to_bring || [],
      highlights: experience.highlights || [],
      category: experience.category || '',
      providerName: experience.provider || experience.operator_name || experience.providerName || '',
    };
  };

  const handleQuestion = async (question: string) => {
    if (!experience) return;
    
    // Add user message
    setMessages(prev => [...prev, { text: question, isUser: true }]);
    setIsLoading(true);
    
    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const experienceInfo = getExperienceInfo();
      if (!experienceInfo) {
        setMessages(prev => [...prev, { 
          text: "Sorry, I couldn't load the experience details. Please try again.", 
          isUser: false 
        }]);
        return;
      }

      const answer = await getExperienceAnswer(question, experienceInfo);
      setMessages(prev => [...prev, { text: answer, isUser: false }]);
      
    } catch (error) {
      console.error('AI Chat error:', error);
      setMessages(prev => [...prev, { 
        text: "Oops! Something went wrong. Please try again.", 
        isUser: false 
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      handleQuestion(message.trim());
      setMessage('');
    }
  };

  const handleClose = () => {
    setMessages([]);
    setMessage('');
    onClose();
  };

  if (!experience) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      presentationStyle="overFullScreen"
    >
      <KeyboardAvoidingView 
        style={styles.aiModalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Pressable style={styles.aiModalBackdrop} onPress={handleClose} />
        <View style={styles.aiModalContainer}>
          <View style={styles.aiModalContent}>
            {/* Header */}
            <View style={styles.aiModalHeader}>
              <View style={styles.aiHeaderLeft}>
                <View style={styles.aiIcon}>
                  <Bot size={20} color={colors.dark.background} />
                </View>
                <Text style={styles.aiModalTitle}>{t('feed.aiModalTitle')}</Text>
              </View>
              <Pressable style={styles.aiCloseButton} onPress={handleClose}>
                <Text style={styles.aiCloseButtonText}>✕</Text>
              </Pressable>
            </View>

            {/* Chat Messages */}
            <ScrollView 
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={[styles.aiChatContainer, { paddingBottom: 20 }]} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {messages.length === 0 && (
                <View style={styles.aiWelcomeContainer}>
                  <Text style={styles.aiWelcomeText}>
                    👋 Hi! I'm here to answer any questions about{' '}
                    <Text style={styles.aiWelcomeTextBold}>"{experience.title}"</Text>
                  </Text>
                  
                  {/* Quick Questions */}
                  <Text style={styles.quickQuestionsTitle}>Quick questions</Text>
                  <View style={styles.quickQuestionsContainer}>
                    {quickQuestions.map((question, idx) => (
                      <Pressable
                        key={idx}
                        style={[styles.quickQuestionButton, isLoading && styles.quickQuestionDisabled]}
                        onPress={() => handleQuestion(question)}
                        disabled={isLoading}
                      >
                        <Text style={styles.quickQuestionText}>{question}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              
              {messages.map((msg, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.aiChatBubble,
                    msg.isUser ? styles.aiChatBubbleUser : styles.aiChatBubbleAI,
                  ]}
                >
                  <Text style={[
                    styles.aiChatText,
                    msg.isUser ? styles.aiChatTextUser : styles.aiChatTextAI,
                  ]}>
                    {msg.text}
                  </Text>
                </View>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <View style={styles.loadingBubble}>
                  <ActivityIndicator size="small" color={colors.dark.primary} />
                  <Text style={styles.loadingText}>Thinking...</Text>
                </View>
              )}
            </ScrollView>

            {/* Input */}
            <View style={[styles.aiInputContainer, { paddingBottom: Math.max(insets.bottom + 8, 24) }]}>
              <View style={styles.aiInputWrapper}>
                <TextInput
                  style={styles.aiInput}
                  placeholder="Ask me anything about this experience..."
                  placeholderTextColor={colors.dark.textTertiary}
                  value={message}
                  onChangeText={setMessage}
                  onSubmitEditing={handleSend}
                  multiline
                  maxLength={500}
                  editable={!isLoading}
                />
                <Pressable 
                  style={[styles.aiSendButton, (!message.trim() || isLoading) && styles.aiSendButtonDisabled]} 
                  onPress={handleSend}
                  disabled={!message.trim() || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.dark.background} />
                  ) : (
                    <Send size={18} color={colors.dark.background} />
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  aiModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  aiModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  aiModalContainer: {
    maxHeight: '85%',
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  aiModalContent: {
    flex: 1,
    minHeight: 400,
  },
  aiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  aiHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiModalTitle: {
    ...typography.styles.h3,
    color: colors.dark.text,
  },
  aiCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCloseButtonText: {
    color: colors.dark.text,
    fontSize: 18,
  },
  aiChatContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  aiWelcomeContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  aiWelcomeText: {
    ...typography.styles.body,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  aiWelcomeTextBold: {
    color: colors.dark.text,
    fontWeight: '600',
  },
  quickQuestionsTitle: {
    ...typography.styles.caption,
    color: colors.dark.textTertiary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  quickQuestionsContainer: {
    width: '100%',
    gap: 8,
  },
  quickQuestionButton: {
    backgroundColor: colors.dark.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  quickQuestionText: {
    ...typography.styles.body,
    color: colors.dark.text,
  },
  aiChatBubble: {
    maxWidth: '80%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  aiChatBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: colors.dark.primary,
  },
  aiChatBubbleAI: {
    alignSelf: 'flex-start',
    backgroundColor: colors.dark.background,
  },
  aiChatText: {
    ...typography.styles.body,
  },
  aiChatTextUser: {
    color: colors.dark.background,
  },
  aiChatTextAI: {
    color: colors.dark.text,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.dark.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 8,
  },
  loadingText: {
    ...typography.styles.body,
    color: colors.dark.textSecondary,
  },
  quickQuestionDisabled: {
    opacity: 0.5,
  },
  aiInputContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  aiInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    backgroundColor: colors.dark.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  aiInput: {
    flex: 1,
    ...typography.styles.body,
    color: colors.dark.text,
    maxHeight: 100,
    paddingVertical: 8,
  },
  aiSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSendButtonDisabled: {
    backgroundColor: colors.dark.textTertiary,
  },
});
