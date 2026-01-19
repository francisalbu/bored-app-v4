/**
 * Quick test script for Instagram video analysis
 * Run: OPENAI_API_KEY=sk-xxx RAPIDAPI_KEY=xxx node test-reel.js "https://instagram.com/reel/xxx"
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Get URL from command line
const reelUrl = process.argv[2];

if (!reelUrl) {
  console.log('Usage: node test-reel.js "https://instagram.com/reel/xxx"');
  console.log('Make sure to set OPENAI_API_KEY and RAPIDAPI_KEY environment variables');
  process.exit(1);
}

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '13e6fed9b4msh7770b0604d16a75p11d71ejsn0d42966b3d99';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function extractInstagramId(url) {
  const match = url.match(/\/p\/([^\/\?]+)|\/reel\/([^\/\?]+)/);
  return match ? (match[1] || match[2]) : null;
}

async function getInstagramMetadata(url) {
  const mediaCode = await extractInstagramId(url);
  console.log('📸 Media code:', mediaCode);
  
  const response = await axios.get('https://instagram-scraper-stable-api.p.rapidapi.com/get_media_data_v2.php', {
    params: { media_code: mediaCode },
    headers: {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com'
    },
    timeout: 15000
  });
  
  return {
    caption: response.data?.caption || '',
    hashtags: (response.data?.caption?.match(/#[\w]+/g) || []),
    location: response.data?.location?.name || null,
    videoUrl: response.data?.video_url,
    thumbnailUrl: response.data?.thumbnail_src || response.data?.display_url
  };
}

async function main() {
  console.log('\n🎬 Testing Instagram Reel Analysis');
  console.log('═'.repeat(50));
  console.log('URL:', reelUrl);
  console.log('═'.repeat(50));
  
  try {
    // Step 1: Get metadata
    console.log('\n📡 Step 1: Fetching Instagram metadata...');
    const metadata = await getInstagramMetadata(reelUrl);
    
    console.log('\n📋 METADATA RESULTS:');
    console.log('─'.repeat(40));
    console.log('📍 Instagram Location Tag:', metadata.location || 'NOT SET');
    console.log('📝 Caption:', metadata.caption?.substring(0, 200) + '...');
    console.log('🏷️ Hashtags:', metadata.hashtags?.slice(0, 10).join(' ') || 'none');
    console.log('🖼️ Thumbnail:', metadata.thumbnailUrl ? '✅ Available' : '❌ Not found');
    console.log('🎥 Video URL:', metadata.videoUrl ? '✅ Available' : '❌ Not found');
    
    // If we have OPENAI_API_KEY, do the full analysis
    if (OPENAI_API_KEY) {
      console.log('\n🤖 Step 2: Analyzing with OpenAI...');
      // Here you could add OpenAI analysis
    } else {
      console.log('\n⚠️ OPENAI_API_KEY not set - skipping AI analysis');
      console.log('Set it with: export OPENAI_API_KEY=sk-xxx');
    }
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

main();
