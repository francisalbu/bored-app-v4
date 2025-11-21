/**
 * Test Google OAuth Configuration
 * 
 * This script tests if Google OAuth is properly configured in Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hnivuisqktlrusyqywaz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXZ1aXNxa3RscnVzeXF5d2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNzE2NzgsImV4cCI6MjA3ODc0NzY3OH0.amqHQkxh9tun5cIHUJN23ocGImZek6QfoSGpLDSUhDA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testGoogleOAuth() {
  console.log('🔍 Testing Google OAuth Configuration...\n');
  
  try {
    console.log('1️⃣ Attempting to get OAuth URL for Google...');
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'boredtravel://auth/callback',
        skipBrowserRedirect: true,
      },
    });
    
    if (error) {
      console.error('\n❌ ERROR:', error.message);
      console.error('📄 Error details:', JSON.stringify(error, null, 2));
      
      if (error.message.includes('Provider') || error.message.includes('not found')) {
        console.log('\n🔧 SOLUTION:');
        console.log('   Google OAuth is NOT enabled in Supabase!');
        console.log('   Go to: https://supabase.com/dashboard/project/hnivuisqktlrusyqywaz/auth/providers');
        console.log('   Enable Google provider and add your OAuth credentials');
      }
      
      return;
    }
    
    if (!data?.url) {
      console.error('\n❌ No OAuth URL returned');
      console.log('   This means Google OAuth is not configured in Supabase');
      return;
    }
    
    console.log('\n✅ SUCCESS! Google OAuth is configured!');
    console.log('\n📍 OAuth URL:', data.url.substring(0, 100) + '...');
    console.log('\n✅ This means:');
    console.log('   ✓ Google provider is enabled in Supabase');
    console.log('   ✓ OAuth credentials are configured');
    console.log('   ✓ The issue is likely with the redirect/deep link');
    
    console.log('\n🔍 Next steps:');
    console.log('   1. Make sure you rebuilt the app: rm -rf ios/ && npx expo prebuild --clean');
    console.log('   2. Test the login flow and check the console logs');
    console.log('   3. Look for logs starting with 🔐, 🌐, ✅, or ❌');
    
  } catch (error) {
    console.error('\n❌ Exception:', error.message);
  }
}

testGoogleOAuth();
