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
      console.log(`🔄 [Retry] Attempt ${i + 1}/${maxRetries}...`);
      const result = await fn();
      console.log(`✅ [Retry] Success on attempt ${i + 1}!`);
      return result;
    } catch (error) {
      console.error(`❌ [Retry] Attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) {
        console.error(`❌ [Retry] All ${maxRetries} attempts failed, throwing error`);
        throw error;
      }
      const delay = initialDelay * Math.pow(2, i);
      console.log(`⏳ [Retry] Waiting ${delay}ms before retry ${i + 2}...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries reached');
};

export const getVibeCheckRecommendation = async (userVibe: string): Promise<VibeCheckResponse> => {
  // Try environment variable first, fallback to app.json extra config
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_AI_KEY || Constants.expoConfig?.extra?.googleAiKey;
  
  try {
    
    console.log('🔍 DEBUG: Checking API Key...');
    console.log('- process.env.EXPO_PUBLIC_GOOGLE_AI_KEY:', process.env.EXPO_PUBLIC_GOOGLE_AI_KEY ? '✅ Found' : '❌ Missing');
    console.log('- Constants.expoConfig?.extra?.googleAiKey:', Constants.expoConfig?.extra?.googleAiKey ? '✅ Found' : '❌ Missing');
    console.log('- Final API Key:', apiKey ? `✅ ${apiKey.substring(0, 10)}...` : '❌ Missing');
    
    if (!apiKey) {
      console.error("❌ Google AI API Key is missing!");
      return { text: "Yo, the AI needs its coffee (aka API key) before it can help. Hit up the dev." };
    }
    
    console.log('🤖 Bored AI: Generating recommendation with user vibe:', userVibe);

    // DIRECT API CALL - Bypass library issues with v1beta
    const generateWithRetry = async () => {
      console.log('📡 [Bored AI] Making direct API call...');
      
      const prompt = `You are a sassy, irreverent, and high-energy local guide for Lisbon, Portugal. 
The user is a "Bored Tourist" looking for something cool, not boring.

Rules:
1. Recommend ONE specific, actual place or activity in Lisbon based on the user's input vibe.
2. Be brief (max 40 words).
3. Use a "roast-y" but helpful tone. Like a cool older sibling.
4. No generic suggestions (no "go to Belem Tower" unless there's a twisted reason).
5. Format the place name in bold markdown (**Place Name**).
6. Use slang like "slaps", "lit", "basic", "mid" appropriately but don't overdo it.

User's vibe: ${userVibe}

Your recommendation:`;

      // Direct REST API call to v1 (stable) - Using gemini-2.5-flash (latest production model)
      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 1.0, // Reduzido de 1.2 para 1.0 (mais estável, menos bloqueios)
            maxOutputTokens: 100,
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('📡 [Bored AI] Got response from API');
      
      const candidate = data.candidates?.[0]; // Obter o primeiro candidato de resposta
      
      if (!candidate) {
        throw new Error('API response missing candidates array or is empty');
      }

      // 🚨 VERIFICAR finishReason para detetar bloqueios de segurança
      console.log('🔍 [Bored AI] Finish reason:', candidate.finishReason);
      
      if (candidate.finishReason === 'SAFETY') {
        console.error('❌ [Bored AI] Response blocked by safety filters:', candidate.safetyRatings);
        throw new Error('Response blocked by AI Safety filters. Tente uma "vibe" menos agressiva ou mais específica.');
      }
      
      if (candidate.finishReason === 'RECITATION') {
        console.error('❌ [Bored AI] Response blocked for recitation (copyright)');
        throw new Error('Response blocked for copyright reasons. Try rephrasing your vibe.');
      }
      
      // Extrair o texto da resposta
      const responseText = candidate.content?.parts?.[0]?.text;
      
      if (!responseText) {
        // Se ainda for nulo, é um erro de geração/estrutura inesperada
        throw new Error(`No text in API response (finishReason: ${candidate.finishReason})`);
      }
      
      console.log('✅ [Bored AI] Response text:', responseText);
      return responseText;
    };

    console.log('🔄 [Bored AI] Starting retry logic...');
    const text = await retryWithBackoff(generateWithRetry, 3, 1000);
    console.log('✅ [Bored AI] Retry completed successfully');

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
    console.error("❌ Error message:", error?.message);
    console.error("❌ Error response:", error?.response?.data);
    
    // Provide more helpful error messages based on error type
    if (error?.message?.includes('API key')) {
      return { text: "Bruh, the API key is acting sus. Tell the dev to check it." };
    } else if (error?.message?.includes('quota') || error?.message?.includes('limit')) {
      return { text: "The AI hit its daily limit. Blame Google, not me. Try tomorrow." };
    } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      return { text: "Network's being weird. Check your wifi and try again." };
    } else if (error?.message?.includes('model') || error?.message?.includes('not found')) {
      console.log('⚠️ Model gemini-2.5-flash not available, trying gemini-1.5-flash with direct REST call...');
      // Fallback to gemini-1.5-flash using direct REST call (avoid SDK v1beta issue)
      try {
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const fallbackPrompt = `You are a sassy, irreverent, and high-energy local guide for Lisbon, Portugal. 
Recommend ONE specific place based on this vibe: ${userVibe}
Keep it under 40 words. Be brief and roast-y. Format place name in bold (**Place Name**).`;

        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fallbackPrompt }] }],
            generationConfig: { temperature: 1.0, maxOutputTokens: 100 } // Consistente com o modelo principal
          })
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const fallbackCandidate = fallbackData.candidates?.[0];
          
          if (fallbackCandidate?.finishReason === 'SAFETY') {
            console.error('❌ [Fallback] Blocked by safety filters');
            return { text: "AI safety filters blocked both attempts. Try a different vibe!" };
          }
          
          const fallbackText = fallbackCandidate?.content?.parts?.[0]?.text;
          return { text: fallbackText || "Fallback model worked but gave no response. Retry?" };
        } else {
          throw new Error('Fallback REST call failed');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        return { text: "Both AI models failed. The dev needs to check the Gemini API setup." };
      }
    } else {
      return { text: `Something broke: ${error?.message || 'Unknown error'}. Check console and retry.` };
    }
  }
};
