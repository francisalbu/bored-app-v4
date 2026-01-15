/**
 * Test Video Analysis Feature
 * Quick test to verify everything is working
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

// Test URLs
const TEST_URLS = {
  instagram: 'https://www.instagram.com/reel/C2pQX5qvZ3L/', // Example surf reel
  tiktok: 'https://www.tiktok.com/@natgeo/video/7208867935212326186' // Example travel video
};

async function testVideoAnalysis() {
  console.log('🧪 Testing Video Analysis Feature\n');
  
  // You'll need a valid auth token - get it from your app or create a test user
  const AUTH_TOKEN = process.argv[2]; // Pass token as argument
  
  if (!AUTH_TOKEN) {
    console.log('❌ Please provide an auth token:');
    console.log('   node test-video-analysis.js YOUR_AUTH_TOKEN\n');
    console.log('💡 Get a token by:');
    console.log('   1. Login to your app');
    console.log('   2. Check the API logs for the token');
    console.log('   3. Or use the /api/auth/login endpoint\n');
    return;
  }
  
  console.log('🔗 Testing with Instagram Reel...\n');
  
  try {
    const response = await axios.post(
      `${API_URL}/suggestions/analyze-video`,
      {
        instagram_url: TEST_URLS.instagram,
        description: 'Surfing video test'
      },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 seconds
      }
    );
    
    console.log('✅ SUCCESS!\n');
    console.log('📊 Analysis Result:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎯 Activity: ${response.data.data.analysis.activity}`);
    console.log(`📍 Location: ${response.data.data.analysis.location}`);
    console.log(`💯 Confidence: ${(response.data.data.analysis.confidence * 100).toFixed(1)}%`);
    console.log(`⏱️  Processing Time: ${(response.data.data.analysis.processingTime / 1000).toFixed(1)}s`);
    console.log(`🖼️  Frames Analyzed: ${response.data.data.meta.framesAnalyzed}`);
    
    if (response.data.data.analysis.landmarks?.length > 0) {
      console.log(`🏔️  Landmarks: ${response.data.data.analysis.landmarks.join(', ')}`);
    }
    
    console.log('\n🎫 Found Experiences:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    response.data.data.experiences.slice(0, 3).forEach((exp, i) => {
      console.log(`${i + 1}. ${exp.title}`);
      console.log(`   💰 ${exp.price.amount} ${exp.price.currency}`);
      console.log(`   ⭐ ${exp.rating} (${exp.reviewCount} reviews)`);
      console.log(`   🔗 ${exp.url}\n`);
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ TEST FAILED\n');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      console.error('⏱️  Request timed out - video might be too long or internet slow');
    } else {
      console.error('Error:', error.message);
    }
    
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Make sure backend is running (npm run dev)');
    console.log('   2. Check if FFmpeg is installed (ffmpeg -version)');
    console.log('   3. Check if yt-dlp is installed (yt-dlp --version)');
    console.log('   4. Verify OPENAI_API_KEY in .env');
    console.log('   5. Make sure auth token is valid');
  }
}

// Run test
testVideoAnalysis();
