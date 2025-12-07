/**
 * AI Concierge Service
 * Handles communication with the AI Concierge backend
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://bored-tourist-api.onrender.com';
const SESSION_KEY = '@bored_ai_session_id';

export interface ConciergeSuggestion {
  emoji: string;
  text: string;
}

export interface ConciergeExperience {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  location: string;
  meetingPoint?: string;
  price: number;
  currency: string;
  duration: string;
  rating: number;
  reviewCount: number;
  image: string;
  images?: string[];
  highlights?: string[];
  included?: string[];
  whatToBring?: string[];
  maxGroupSize?: number;
  latitude?: number;
  longitude?: number;
}

export interface ConciergePlace {
  name: string;
  rating: number;
  totalRatings: number;
  address: string;
  priceLevel?: number;
  isOpen?: boolean;
}

export interface ChatContext {
  currentExperience?: {
    id: string;
    title: string;
  };
  upcomingBooking?: {
    experienceTitle: string;
    date: string;
    time: string;
    location: string;
  };
}

export interface ChatResponse {
  success: boolean;
  response: string;
  experiences: ConciergeExperience[];
  places?: ConciergePlace[];
  sessionId: string;
  error?: string;
}

// Get or create session ID
async function getSessionId(): Promise<string> {
  try {
    let sessionId = await AsyncStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  } catch {
    return `session_${Date.now()}`;
  }
}

// Send a message to the AI Concierge
export async function sendMessage(
  message: string,
  context?: ChatContext
): Promise<ChatResponse> {
  try {
    const sessionId = await getSessionId();
    
    console.log('🤖 AI Concierge: Sending message:', message);
    
    const response = await fetch(`${API_URL}/api/ai-concierge/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        sessionId,
        context,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ AI Concierge: Response received');
    
    return data;
  } catch (error) {
    console.error('❌ AI Concierge Error:', error);
    return {
      success: false,
      response: "I'm having trouble connecting right now. Please try again! 🙏",
      experiences: [],
      sessionId: '',
      error: String(error),
    };
  }
}

// Get quick suggestions
export async function getSuggestions(): Promise<ConciergeSuggestion[]> {
  try {
    const response = await fetch(`${API_URL}/api/ai-concierge/suggestions`);
    const data = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error('❌ Error fetching suggestions:', error);
    // Return default suggestions
    return [
      { emoji: '🌅', text: 'Plan my weekend in Lisbon' },
      { emoji: '🏄', text: 'I want something adventurous' },
      { emoji: '🍷', text: 'Relaxing experiences for couples' },
      { emoji: '👨‍👩‍👧‍👦', text: 'Family-friendly activities' },
    ];
  }
}

// Clear conversation history
export async function clearConversation(): Promise<void> {
  try {
    const sessionId = await AsyncStorage.getItem(SESSION_KEY);
    if (sessionId) {
      await fetch(`${API_URL}/api/ai-concierge/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    }
    // Generate new session
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await AsyncStorage.setItem(SESSION_KEY, newSessionId);
  } catch (error) {
    console.error('❌ Error clearing conversation:', error);
  }
}

// Parse experience IDs from response text
export function parseExperienceIds(text: string): string[] {
  const regex = /\[ID:(\d+)\]/g;
  const ids: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    ids.push(match[1]);
  }
  return [...new Set(ids)];
}

// Format response text (remove ID markers for clean display)
export function formatResponseText(text: string): string {
  // Replace [ID:XX] with empty string for cleaner display
  // The experiences are shown separately as cards
  return text.replace(/\s*\[ID:\d+\]/g, '');
}
