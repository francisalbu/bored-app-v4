// Simple API test script
const https = require('http');

const baseURL = 'http://localhost:3000';

async function testEndpoint(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseURL);
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Backend API\n');
  console.log('='.repeat(50));

  // Test 1: Get all experiences
  console.log('\n📍 Test 1: GET /api/experiences');
  try {
    const result = await testEndpoint('/api/experiences');
    console.log(`Status: ${result.status}`);
    console.log(`Success: ${result.data.success}`);
    console.log(`Experiences count: ${result.data.data?.length || 0}`);
    if (result.data.data?.length > 0) {
      console.log(`First experience: ${result.data.data[0].title}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  // Test 2: Get single experience
  console.log('\n📍 Test 2: GET /api/experiences/1');
  try {
    const result = await testEndpoint('/api/experiences/1');
    console.log(`Status: ${result.status}`);
    console.log(`Success: ${result.data.success}`);
    if (result.data.data) {
      console.log(`Experience: ${result.data.data.title}`);
      console.log(`Location: ${result.data.data.location}`);
      console.log(`Price: $${result.data.data.price}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  // Test 3: Get trending experiences
  console.log('\n📍 Test 3: GET /api/experiences/trending');
  try {
    const result = await testEndpoint('/api/experiences/trending');
    console.log(`Status: ${result.status}`);
    console.log(`Success: ${result.data.success}`);
    console.log(`Trending count: ${result.data.data?.length || 0}`);
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  // Test 4: Get reviews for experience
  console.log('\n📍 Test 4: GET /api/reviews/experience/1');
  try {
    const result = await testEndpoint('/api/reviews/experience/1');
    console.log(`Status: ${result.status}`);
    console.log(`Success: ${result.data.success}`);
    console.log(`Reviews count: ${result.data.data?.length || 0}`);
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ API tests completed!');
}

runTests();
