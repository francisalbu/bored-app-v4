const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testLogin() {
  try {
    console.log('🔐 Testing login with ola123@pt.com...\n');
    
    // Try to login
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'ola123@pt.com',
      password: 'password123' // Try common password
    });
    
    console.log('✅ Login successful!');
    console.log('Token:', loginResponse.data.token);
    console.log('User:', loginResponse.data.user);
    
    // Now try to get bookings with the token
    const token = loginResponse.data.token;
    const bookingsResponse = await axios.get(`${BASE_URL}/bookings`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n📋 Bookings:', bookingsResponse.data);
    
  } catch (error) {
    if (error.response) {
      console.error('❌ Error:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testLogin();
