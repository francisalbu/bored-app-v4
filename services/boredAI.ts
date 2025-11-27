import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';

export interface VibeCheckResponse {
  text: string;
  placeName?: string;
  mapsUrl?: string;
}

export const getVibeCheckRecommendation = async (userVibe: string): Promise<VibeCheckResponse> => {
  try {
    // Initialize the client only when needed (Lazy Initialization)
    // This prevents the entire app from crashing if the API key is missing at startup
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_AI_KEY || Constants.expoConfig?.extra?.googleAiKey;
    
    if (!apiKey) {
      console.error("API Key is missing from environment variables.");
      return { text: "System offline. The developer forgot the API key. Oops." };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

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
    `;

    const prompt = `${systemInstruction}\n\nMy vibe right now is: ${userVibe}`;
    
    console.log('🤖 Bored AI: Generating recommendation...');

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 1.2, // High temperature for more creativity/sass
        maxOutputTokens: 100,
      },
    });

    const response = await result.response;
    const text = response.text();

    if (!text) {
      return { text: "My brain is buffering. Try again, tourist." };
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
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "The AI is on a coffee break. Try again later." };
  }
};
