const axios = require('axios');

async function testReelAnalysis() {
  const url = 'https://www.instagram.com/reel/DOtUIVYDvq8/';
  
  console.log('🎬 Testing reel analysis...');
  console.log('URL:', url);
  console.log('');
  
  try {
    // Use test endpoint (no auth required)
    const response = await axios.post('https://bored-backend.onrender.com/api/suggestions/test-analyze', {
      url: url,
      description: ''
    }, {
      timeout: 120000 // 2 minutes
    });
    
    console.log('✅ Analysis Success!');
    console.log('');
    console.log('📊 Results:');
    console.log('Activity:', response.data.data.analysis.activity);
    console.log('Location:', response.data.data.analysis.location);
    console.log('Confidence:', response.data.data.analysis.confidence);
    console.log('Landmarks:', response.data.data.analysis.landmarks?.length || 0);
    console.log('Is Activity:', response.data.data.analysis.isActivity || false);
    console.log('');
    console.log('🗺️ Detected Spots:', response.data.data.detectedSpots?.length || 0);
    
    if (response.data.data.detectedSpots && response.data.data.detectedSpots.length > 0) {
      console.log('');
      console.log('📍 Spots:');
      response.data.data.detectedSpots.forEach((spot, i) => {
        console.log(`  ${i + 1}. ${spot.spot_name} (${spot.city}, ${spot.country})`);
        if (spot.isActivity) {
          console.log(`     🎯 ACTIVITY - "Find in my city" button will show!`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Full error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testReelAnalysis();
