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
import { Sparkles, Send, Trash2, Plus, ChevronRight, Calendar, Compass, Map } from 'lucide-react-native';
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

// Quick action buttons config
const quickActions = [
  { icon: Calendar, text: 'Plan an experience', emoji: '📅' },
  { icon: Compass, text: 'What should I do today?', emoji: '🧭' },
  { icon: Map, text: 'Explore experiences', emoji: '🗺️' },
];

export default function AIScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleNewChat = async () => {
    await clearConversation();
    setMessages([]);
  };

  const handleExperiencePress = (experience: ConciergeExperience) => {
    router.push({
      pathname: '/experience/[id]',
      params: { id: experience.id },
    });
  };

  const handleQuickAction = (action: typeof quickActions[0]) => {
    handleSend(action.text);
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

  // Welcome screen - Mindtrip style
  const renderWelcome = () => (
    <View style={styles.welcomeContainer}>
      {/* Logo/Icon */}
      <View style={styles.welcomeIconContainer}>
        <LinearGradient
          colors={[colors.dark.primary, '#8BC34A']}
          style={styles.welcomeIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Sparkles size={36} color="#fff" />
        </LinearGradient>
      </View>
      
      {/* Main Title */}
      <Text style={styles.welcomeTitle}>What's the plan?</Text>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        {quickActions.map((action, index) => (
          <Pressable
            key={index}
            style={styles.quickActionButton}
            onPress={() => handleQuickAction(action)}
          >
            <action.icon size={18} color={colors.dark.text} />
            <Text style={styles.quickActionText}>{action.text}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header - Mindtrip style */}
      <View style={styles.header}>
        {/* New Chat Button */}
        <Pressable style={styles.headerButton} onPress={handleNewChat}>
          <Plus size={22} color={colors.dark.text} />
        </Pressable>
        
        {/* Title */}
        <View style={styles.headerCenter}>
          <Sparkles size={20} color={colors.dark.primary} />
          <Text style={styles.headerTitle}>Bored AI</Text>
        </View>
        
        {/* Delete Button */}
        <Pressable 
          style={[styles.headerButton, messages.length === 0 && styles.headerButtonDisabled]} 
          onPress={handleClearChat}
          disabled={messages.length === 0}
        >
          <Trash2 size={20} color={messages.length > 0 ? colors.dark.text : colors.dark.textSecondary} />
        </Pressable>
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
            <Pressable style={styles.inputPlusButton}>
              <Plus size={20} color={colors.dark.textSecondary} />
            </Pressable>
            <TextInput
              style={styles.input}
              placeholder="Ask anything..."
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
              <Send size={18} color={inputText.trim() && !isLoading ? '#fff' : colors.dark.textSecondary} />
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
  
  // Header - Mindtrip style
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    ...typography.styles.h3,
    color: colors.dark.text,
    fontWeight: '600',
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
  
  // Welcome screen - Mindtrip style
  welcomeContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  welcomeIconContainer: {
    marginBottom: 24,
  },
  welcomeIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.dark.text,
    textAlign: 'center',
    marginBottom: 32,
  },
  
  // Quick Actions - Mindtrip style
  quickActionsContainer: {
    width: '100%',
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.card,
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  quickActionText: {
    ...typography.styles.body,
    color: colors.dark.text,
    fontWeight: '500',
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

  // Input - Mindtrip style
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.dark.background,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  inputPlusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    ...typography.styles.body,
    color: colors.dark.text,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'transparent',
  },
});
