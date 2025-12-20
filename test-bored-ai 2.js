/**
 * Test script for Bored AI / Google Gemini API
 * Run: node test-bored-ai.js
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testBoredAI() {
  console.log('🧪 Testing Bored AI...\n');

  // Check if API key exists
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_AI_KEY;
  
  if (!apiKey) {
    console.error('❌ ERROR: EXPO_PUBLIC_GOOGLE_AI_KEY not found in .env file');
    console.error('Please add it to your .env file');
    process.exit(1);
  }

  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...\n');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 1.2,
        maxOutputTokens: 100,
      }
    });

    console.log('📡 Sending test request to Gemini API...');
    const result = await model.generateContent('My vibe right now is: I want something chill and foodie');
    const response = result.response;
    const text = response.text();

    console.log('\n✅ SUCCESS! Bored AI is working!\n');
    console.log('Response:');
    console.log('-'.repeat(50));
    console.log(text);
    console.log('-'.repeat(50));
    console.log('\n🎉 All systems go! Your Bored AI should work in the app now.');

  } catch (error) {
    console.error('\n❌ ERROR: Failed to connect to Gemini API');
    console.error('Error details:', error.message);
    
    if (error.message.includes('API key')) {
      console.error('\n💡 Your API key might be invalid or expired');
      console.error('Get a new one at: https://aistudio.google.com/app/apikey');
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      console.error('\n💡 You might have hit the API quota limit');
      console.error('Wait a bit or upgrade your plan at: https://console.cloud.google.com/');
    } else if (error.message.includes('model')) {
      console.error('\n💡 The model might not be available');
      console.error('Try using gemini-1.5-flash instead of gemini-2.5-flash');
    }
    
    process.exit(1);
  }
}

testBoredAI();
