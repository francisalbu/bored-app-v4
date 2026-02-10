/**
 * Test script for Interest API endpoint
 */

const API_URL = 'https://bored-tourist-api.onrender.com/api/interest';

async function testInterestAPI() {
  console.log('🧪 Testing Interest API...\n');
  
  const testData = {
    experience_id: 19,
    name: 'Test User',
    email: 'test@example.com',
    phone: '+351 123 456 789',
    notes: 'This is a test submission',
    user_id: null
  };
  
  try {
    console.log('📤 Sending POST request to:', API_URL);
    console.log('📦 Payload:', JSON.stringify(testData, null, 2));
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('\n📥 Response status:', response.status);
    const data = await response.json();
    console.log('📥 Response data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n✅ Test PASSED! Interest submitted successfully!');
    } else {
      console.log('\n❌ Test FAILED:', data.message);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Wait a bit for Render to wake up
console.log('⏳ Waiting 5 seconds for Render to wake up...\n');
setTimeout(testInterestAPI, 5000);
