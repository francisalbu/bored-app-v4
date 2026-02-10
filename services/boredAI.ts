import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';

export interface VibeCheckResponse {
  text: string;
  placeName?: string;
  mapsUrl?: string;
}

// Get API key helper
const getApiKey = () => {
  return process.env.EXPO_PUBLIC_GOOGLE_AI_KEY || Constants.expoConfig?.extra?.googleAiKey;
};

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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

/**
 * Experience-specific AI assistant
 * Answers questions about a specific experience
 */
export interface ExperienceInfo {
  title: string;
  description?: string;
  location?: string;
  duration?: string;
  price?: number;
  included?: string[];
  whatToBring?: string[];
  highlights?: string[];
  category?: string;
  providerName?: string;
  maxGroupSize?: number;
  languages?: string[];
  cancellationPolicy?: string;
}

export const getExperienceAnswer = async (
  question: string, 
  experience: ExperienceInfo
): Promise<string> => {
  try {
    const apiKey = getApiKey();
    
    if (!apiKey) {
      console.error("API Key is missing");
      return "I'm having trouble connecting right now. Please try again later!";
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Build context from experience data - ONLY verified data
    const experienceContext = `
=== VERIFIED EXPERIENCE DATA ===
Title: ${experience.title}
${experience.description ? `Description: ${experience.description}` : ''}
${experience.location ? `Meeting Point/Location: ${experience.location}` : ''}
${experience.duration ? `Duration: ${experience.duration}` : ''}
${experience.price ? `Price: €${experience.price} per person` : ''}
${experience.maxGroupSize ? `Maximum group size: ${experience.maxGroupSize} people` : ''}
${experience.included?.length ? `What's included: ${experience.included.join(', ')}` : ''}
${experience.whatToBring?.length ? `What to bring: ${experience.whatToBring.join(', ')}` : ''}
${experience.highlights?.length ? `Highlights: ${experience.highlights.join(', ')}` : ''}
${experience.category ? `Category: ${experience.category}` : ''}
${experience.providerName ? `Host/Provider: ${experience.providerName}` : ''}
${experience.languages?.length ? `Available languages: ${experience.languages.join(', ')}` : ''}
${experience.cancellationPolicy ? `Cancellation policy: ${experience.cancellationPolicy}` : ''}
=== END OF DATA ===
    `.trim();

    const systemPrompt = `
You are a helpful assistant for the "Bored Tourist" travel app. You answer questions about a specific experience.

${experienceContext}

STRICT RULES:
1. ONLY use information from the VERIFIED DATA above. Do NOT invent or guess facts.
2. If data is missing, say "I don't have that specific information - please check with the host when booking or contact support."
3. Keep answers short (max 50 words), friendly, and accurate.
4. For start times: If not specified, say "Start times vary - you'll see available time slots when you select a date!"
5. For group size: Only mention if maxGroupSize is provided in the data.
6. For kids/children: Say "Please check with the host for age restrictions" unless explicitly mentioned.
7. Use 1 emoji max to keep it friendly.
8. NEVER make up prices, times, requirements, or inclusions that aren't in the data.
9. If asked about something not in the data, be honest: "I don't have that info, but you can ask the host!"

User question: ${question}
    `.trim();

    console.log('🤖 Experience AI: Generating answer...');
    console.log('📋 Context:', experienceContext);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      generationConfig: {
        temperature: 0.3, // Lower temperature for more factual responses
        maxOutputTokens: 120,
      },
    });

    const response = await result.response;
    const text = response.text();

    if (!text) {
      return "I'm having trouble thinking right now. Could you try asking again?";
    }

    console.log('✅ Experience AI: Answer generated');
    return text.trim();

  } catch (error) {
    console.error("Experience AI Error:", error);
    return "Oops! I couldn't process your question. Please try again in a moment.";
  }
};
