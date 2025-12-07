import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, Send, Trash2, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import colors from '@/constants/colors';
import typography from '@/constants/typography';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  sendMessage,
  getSuggestions,
  clearConversation,
  formatResponseText,
  type ConciergeSuggestion,
  type ConciergeExperience,
  type ChatResponse,
} from '@/services/aiConcierge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  experiences?: ConciergeExperience[];
  timestamp: Date;
}

export default function AIScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ConciergeSuggestion[]>([]);

  // Load suggestions on mount
  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    const data = await getSuggestions();
    setSuggestions(data);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = useCallback(async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response: ChatResponse = await sendMessage(messageText);
      
      // Add AI response
      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        text: formatResponseText(response.response),
        isUser: false,
        experiences: response.experiences,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      // Add error message
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        text: "Oops! Something went wrong. Please try again. 🙏",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading]);

  const handleClearChat = async () => {
    await clearConversation();
    setMessages([]);
  };

  const handleExperiencePress = (experience: ConciergeExperience) => {
    router.push({
      pathname: '/experience/[id]',
      params: { id: experience.id },
    });
  };

  const handleSuggestionPress = (suggestion: ConciergeSuggestion) => {
    handleSend(suggestion.text);
  };

  // Render experience card
  const renderExperienceCard = (experience: ConciergeExperience) => (
    <Pressable
      key={experience.id}
      style={styles.experienceCard}
      onPress={() => handleExperiencePress(experience)}
    >
      <Image
        source={{ uri: experience.image }}
        style={styles.experienceImage}
        resizeMode="cover"
      />
      <View style={styles.experienceInfo}>
        <Text style={styles.experienceTitle} numberOfLines={2}>
          {experience.title}
        </Text>
        <Text style={styles.experienceDetails}>
          {experience.duration} • €{experience.price}
        </Text>
        <View style={styles.experienceFooter}>
          <Text style={styles.experienceLocation} numberOfLines={1}>
            📍 {experience.location}
          </Text>
          <ChevronRight size={16} color={colors.dark.textSecondary} />
        </View>
      </View>
    </Pressable>
  );

  // Render message bubble
  const renderMessage = (message: Message) => (
    <View
      key={message.id}
      style={[
        styles.messageBubble,
        message.isUser ? styles.userBubble : styles.aiBubble,
      ]}
    >
      {!message.isUser && (
        <View style={styles.aiAvatar}>
          <Sparkles size={16} color={colors.dark.primary} />
        </View>
      )}
      <View style={[
        styles.messageContent,
        message.isUser ? styles.userContent : styles.aiContent,
      ]}>
        <Text style={[
          styles.messageText,
          message.isUser ? styles.userText : styles.aiText,
        ]}>
          {message.text}
        </Text>
        
        {/* Experience cards */}
        {message.experiences && message.experiences.length > 0 && (
          <View style={styles.experiencesContainer}>
            {message.experiences.map(renderExperienceCard)}
          </View>
        )}
      </View>
    </View>
  );

  // Welcome screen (no messages yet)
  const renderWelcome = () => (
    <View style={styles.welcomeContainer}>
      <LinearGradient
        colors={[colors.dark.primary, '#8BC34A']}
        style={styles.welcomeIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Sparkles size={40} color="#fff" />
      </LinearGradient>
      
      <Text style={styles.welcomeTitle}>Your AI Travel Concierge</Text>
      <Text style={styles.welcomeSubtitle}>
        I can help you plan activities, suggest experiences based on your mood, 
        and answer questions about things to do in Lisbon!
      </Text>

      <Text style={styles.suggestionsTitle}>Try asking:</Text>
      <View style={styles.suggestionsContainer}>
        {suggestions.map((suggestion, index) => (
          <Pressable
            key={index}
            style={styles.suggestionChip}
            onPress={() => handleSuggestionPress(suggestion)}
          >
            <Text style={styles.suggestionEmoji}>{suggestion.emoji}</Text>
            <Text style={styles.suggestionText}>{suggestion.text}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Sparkles size={24} color={colors.dark.primary} />
          <Text style={styles.headerTitle}>AI Concierge</Text>
        </View>
        {messages.length > 0 && (
          <Pressable style={styles.clearButton} onPress={handleClearChat}>
            <Trash2 size={20} color={colors.dark.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Chat area */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.centeredContent,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? renderWelcome() : messages.map(renderMessage)}
          
          {/* Loading indicator */}
          {isLoading && (
            <View style={[styles.messageBubble, styles.aiBubble]}>
              <View style={styles.aiAvatar}>
                <Sparkles size={16} color={colors.dark.primary} />
              </View>
              <View style={[styles.messageContent, styles.aiContent, styles.loadingContent]}>
                <ActivityIndicator size="small" color={colors.dark.primary} />
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input area */}
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) + 70 }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Ask me anything about Lisbon..."
              placeholderTextColor={colors.dark.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <Pressable
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={() => handleSend()}
              disabled={!inputText.trim() || isLoading}
            >
              <Send size={20} color={inputText.trim() && !isLoading ? '#fff' : colors.dark.textSecondary} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    ...typography.styles.h3,
    color: colors.dark.text,
  },
  clearButton: {
    padding: 8,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 100,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
  },
  
  // Welcome screen
  welcomeContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    ...typography.styles.h2,
    color: colors.dark.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    ...typography.styles.body,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  suggestionsTitle: {
    ...typography.styles.caption,
    color: colors.dark.textSecondary,
    marginBottom: 12,
  },
  suggestionsContainer: {
    width: '100%',
    gap: 10,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  suggestionEmoji: {
    fontSize: 20,
  },
  suggestionText: {
    ...typography.styles.body,
    color: colors.dark.text,
    flex: 1,
  },

  // Messages
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '100%',
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  aiBubble: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 195, 74, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 4,
  },
  messageContent: {
    maxWidth: '85%',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  userContent: {
    backgroundColor: colors.dark.primary,
    borderBottomRightRadius: 4,
    marginLeft: 'auto',
  },
  aiContent: {
    backgroundColor: colors.dark.card,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    ...typography.styles.body,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: colors.dark.text,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  loadingText: {
    ...typography.styles.body,
    color: colors.dark.textSecondary,
  },

  // Experience cards
  experiencesContainer: {
    marginTop: 12,
    gap: 10,
  },
  experienceCard: {
    flexDirection: 'row',
    backgroundColor: colors.dark.background,
    borderRadius: 12,
    overflow: 'hidden',
  },
  experienceImage: {
    width: 80,
    height: 80,
  },
  experienceInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  experienceTitle: {
    ...typography.styles.label,
    color: colors.dark.text,
    fontSize: 13,
  },
  experienceDetails: {
    ...typography.styles.caption,
    color: colors.dark.primary,
  },
  experienceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  experienceLocation: {
    ...typography.styles.caption,
    color: colors.dark.textSecondary,
    flex: 1,
  },

  // Input
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    backgroundColor: colors.dark.background,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.dark.card,
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    ...typography.styles.body,
    color: colors.dark.text,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.dark.border,
  },
});
