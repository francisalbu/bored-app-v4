import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';

export interface VibeCheckResponse {
  text: string;
  placeName?: string;
  mapsUrl?: string;
}

// Retry logic helper
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = initialDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries reached');
};

export const getVibeCheckRecommendation = async (userVibe: string): Promise<VibeCheckResponse> => {
  try {
    // Try environment variable first, fallback to app.json extra config
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_AI_KEY || Constants.expoConfig?.extra?.googleAiKey;
    
    console.log('🔍 DEBUG: Checking API Key...');
    console.log('- process.env.EXPO_PUBLIC_GOOGLE_AI_KEY:', process.env.EXPO_PUBLIC_GOOGLE_AI_KEY ? '✅ Found' : '❌ Missing');
    console.log('- Constants.expoConfig?.extra?.googleAiKey:', Constants.expoConfig?.extra?.googleAiKey ? '✅ Found' : '❌ Missing');
    console.log('- Final API Key:', apiKey ? `✅ ${apiKey.substring(0, 10)}...` : '❌ Missing');
    
    if (!apiKey) {
      console.error("❌ Google AI API Key is missing!");
      return { text: "Yo, the AI needs its coffee (aka API key) before it can help. Hit up the dev." };
    }
    
    console.log('🤖 Bored AI: Generating recommendation with user vibe:', userVibe);

    const genAI = new GoogleGenerativeAI(apiKey);

    const systemInstruction = `
      You are a sassy, irreverent, and high-energy local guide for Lisbon, Portugal. 
      The user is a "Bored Tourist" looking for something cool, not boring.
      
      Rules:
      1. Recommend ONE specific, actual place or activity in Lisbon based on the user's input vibe.
      2. Be brief (max 40 words).
      3. Use a "roast-y" but helpful tone. Like a cool older sibling.
      4. No generic suggestions (no "go to Belem Tower" unless there's a twisted reason).
      5. Format the place name in bold markdown (**Place Name**).
      6. Use slang like "slaps", "lit", "basic", "mid" appropriately but don't overdo it.
      7. IMPORTANT: Always include the exact place name in your response for places like restaurants, bars, parks, museums, etc.
    `;

    // Try with retry logic  
    const generateWithRetry = async () => {
      // Use gemini-2.5-flash (same as website - works reliably)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: systemInstruction,
        generationConfig: {
          temperature: 1.2, // High temperature for more creativity/sass
          maxOutputTokens: 100, // Keep responses short
        }
      });

      const result = await model.generateContent(`My vibe right now is: ${userVibe}`);
      const response = result.response;
      return response.text();
    };

    const text = await retryWithBackoff(generateWithRetry, 3, 1000);

    if (!text) {
      return { text: "My brain is buffering harder than a Netflix show on slow wifi. Try again?" };
    }

    console.log('✅ Bored AI: Recommendation generated successfully');

    // Extract place name from bold markdown (**Place Name**)
    const placeMatch = text.match(/\*\*([^*]+)\*\*/);
    let placeName: string | undefined;
    let mapsUrl: string | undefined;

    if (placeMatch && placeMatch[1]) {
      placeName = placeMatch[1].trim();
      // Create Google Maps search URL for Lisbon
      const searchQuery = encodeURIComponent(`${placeName}, Lisbon, Portugal`);
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
    }

    return {
      text,
      placeName,
      mapsUrl
    };
  } catch (error: any) {
    console.error("❌ Bored AI Error:", error);
    
    // Provide more helpful error messages based on error type
    if (error?.message?.includes('API key')) {
      return { text: "Bruh, the API key is acting sus. Tell the dev to check it." };
    } else if (error?.message?.includes('quota') || error?.message?.includes('limit')) {
      return { text: "The AI hit its daily limit. Blame Google, not me. Try tomorrow." };
    } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      return { text: "Network's being weird. Check your wifi and try again." };
    } else {
      return { text: "Something broke. The AI is debugging itself. Give it a sec and retry." };
    }
  }
};
