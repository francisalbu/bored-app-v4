/**
 * Get Auth Token for Testing
 */

const axios = require('axios');
const readline = require('readline');

const API_URL = 'http://localhost:3000/api';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function getAuthToken() {
  console.log('🔐 Get Authentication Token\n');
  
  rl.question('Email: ', async (email) => {
    rl.question('Password: ', async (password) => {
      
      try {
        console.log('\n🔄 Logging in...');
        
        const response = await axios.post(`${API_URL}/auth/login`, {
          email: email.trim(),
          password: password.trim()
        });
        
        if (response.data.success) {
          const token = response.data.data.token;
          
          console.log('\n✅ Login successful!\n');
          console.log('🎫 Your Auth Token:');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(token);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          console.log('📝 Now run the test with:');
          console.log(`node test-video-analysis.js ${token}\n`);
        } else {
          console.log('\n❌ Login failed:', response.data.message);
        }
        
      } catch (error) {
        console.error('\n❌ Error:', error.response?.data?.message || error.message);
        console.log('\n💡 Make sure:');
        console.log('   1. Backend is running (npm run dev)');
        console.log('   2. Email and password are correct');
        console.log('   3. User exists in database\n');
      }
      
      rl.close();
    });
  });
}

getAuthToken();
