/**
 * Simple test for Bored AI API
 * Run: node test-bored-ai-simple.js
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = 'AIzaSyAlvnCcn8ndC6avTq2BlW7LJ-H3VgCEAk4';

async function testBoredAI() {
  try {
    console.log('🤖 Testing Bored AI...');
    console.log('📍 API Key:', API_KEY.substring(0, 10) + '...');
    
    const genAI = new GoogleGenerativeAI(API_KEY);

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

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemInstruction,
      generationConfig: {
        temperature: 1.2,
        maxOutputTokens: 100,
      }
    });

    const userVibe = 'relaxed vibes, nothing too crazy';
    console.log('💭 User vibe:', userVibe);
    console.log('⏳ Generating...\n');

    const result = await model.generateContent(`My vibe right now is: ${userVibe}`);
    const response = result.response;
    const text = response.text();

    console.log('✅ SUCCESS! AI Response:');
    console.log('─'.repeat(50));
    console.log(text);
    console.log('─'.repeat(50));

    // Extract place name
    const placeMatch = text.match(/\*\*([^*]+)\*\*/);
    if (placeMatch && placeMatch[1]) {
      console.log('\n📍 Place Name:', placeMatch[1]);
      const searchQuery = encodeURIComponent(`${placeMatch[1]}, Lisbon, Portugal`);
      console.log('🗺️  Maps URL: https://www.google.com/maps/search/?api=1&query=' + searchQuery);
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    console.error('\nFull error:', error);
  }
}

testBoredAI();
