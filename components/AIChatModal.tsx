import React, { useState } from 'react';
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
} from 'react-native';
import { Bot } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import typography from '@/constants/typography';
import { type Experience } from '@/constants/experiences';
import { useLanguage } from '@/contexts/LanguageContext';

interface AIChatModalProps {
  visible: boolean;
  experience: Experience | null;
  onClose: () => void;
}

export default function AIChatModal({ visible, experience, onClose }: AIChatModalProps) {
  const { t } = useLanguage();
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);
  const insets = useSafeAreaInsets();

  // Pre-fabricated questions based on experience type
  const quickQuestions = [
    t('feed.aiQuestion1'),
    t('feed.aiQuestion2'),
    t('feed.aiQuestion3'),
    t('feed.aiQuestion4'),
  ];

  const handleQuickQuestion = (question: string) => {
    if (!experience) return;
    setMessages([...messages, { text: question, isUser: true }]);
    
    // Simulate AI response based on question
    setTimeout(() => {
      let response = '';
      if (question.includes('included')) {
        response = `For "${experience.title}", the price includes all materials, expert instruction, and a complimentary drink. You'll also get to take home what you create! Transportation and additional food are not included.`;
      } else if (question.includes('bring')) {
        response = `Just bring yourself and your enthusiasm! We provide everything you need for "${experience.title}". Comfortable clothing is recommended. Don't forget your camera to capture the memories!`;
      } else if (question.includes('children')) {
        response = `"${experience.title}" is suitable for children aged 8 and above with adult supervision. Kids under 12 must be accompanied by a parent or guardian. We provide special equipment sized for children.`;
      } else if (question.includes('cancel')) {
        response = `You can cancel or reschedule up to 24 hours before "${experience.title}" starts for a full refund. Cancellations within 24 hours are non-refundable, but we're flexible in case of emergencies!`;
      } else {
        response = `Thanks for asking about "${experience.title}"! This is a demo response. In the full app, AI will provide detailed answers about availability, requirements, location details, and insider tips!`;
      }
      
      setMessages((prev) => [...prev, { text: response, isUser: false }]);
    }, 1000);
  };

  const handleSend = () => {
    if (message.trim()) {
      handleQuickQuestion(message);
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
              style={{ flex: 1 }}
              contentContainerStyle={[styles.aiChatContainer, { paddingBottom: 20 }]} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {messages.length === 0 && (
                <View style={styles.aiWelcomeContainer}>
                  <Text style={styles.aiWelcomeText}>
                    {t('feed.aiWelcome')}{' '}
                    <Text style={styles.aiWelcomeTextBold}>"{experience.title}"</Text>
                  </Text>
                  
                  {/* Quick Questions */}
                  <Text style={styles.quickQuestionsTitle}>{t('feed.quickQuestions')}</Text>
                  <View style={styles.quickQuestionsContainer}>
                    {quickQuestions.map((question, idx) => (
                      <Pressable
                        key={idx}
                        style={styles.quickQuestionButton}
                        onPress={() => handleQuickQuestion(question)}
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
            </ScrollView>

            {/* Input */}
            <View style={[styles.aiInputContainer, { paddingBottom: Math.max(insets.bottom + 8, 24) }]}>
              <View style={styles.aiInputWrapper}>
                <TextInput
                  style={styles.aiInput}
                  placeholder={t('feed.aiPlaceholder')}
                  placeholderTextColor={colors.dark.textTertiary}
                  value={message}
                  onChangeText={setMessage}
                  onSubmitEditing={handleSend}
                  multiline
                  maxLength={500}
                />
                <Pressable 
                  style={[styles.aiSendButton, !message.trim() && styles.aiSendButtonDisabled]} 
                  onPress={handleSend}
                  disabled={!message.trim()}
                >
                  <Text style={styles.aiSendButtonText}>→</Text>
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
  aiSendButtonText: {
    color: colors.dark.background,
    fontSize: 18,
    fontWeight: '600',
  },
});
