/**
 * Simple Supabase Connection Test
 * Run with: node test-supabase-simple.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hnivuisqktlrusyqywaz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXZ1aXNxa3RscnVzeXF5d2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNzE2NzgsImV4cCI6MjA3ODc0NzY3OH0.amqHQkxh9tun5cIHUJN23ocGImZek6QfoSGpLDSUhDA';

async function testSupabase() {
  console.log('🧪 Testing Supabase connection...\n');

  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase client initialized');
    console.log('   URL:', SUPABASE_URL);

    // Test 1: Check session
    console.log('\n📋 Test 1: Session Check');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.log('❌ Session error:', sessionError.message);
    } else {
      console.log('✅ Session check successful');
      console.log('   Status:', sessionData.session ? '🟢 Logged in' : '⭕ Not logged in');
    }

    // Test 2: Try to sign up a test user
    console.log('\n📋 Test 2: Sign Up Test');
    const testEmail = `test-${Date.now()}@bored.app`;
    const testPassword = 'Test123456!';
    
    console.log('   Creating user:', testEmail);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: 'Test User',
        }
      }
    });

    if (signUpError) {
      console.log('❌ Sign up error:', signUpError.message);
      console.log('   Code:', signUpError.status);
      
      if (signUpError.message.includes('Email') || signUpError.message.includes('not enabled')) {
        console.log('\n⚠️  IMPORTANT: Enable Email Auth in Supabase Dashboard!');
        console.log('   1. Go to: https://hnivuisqktlrusyqywaz.supabase.co/project/hnivuisqktlrusyqywaz/auth/providers');
        console.log('   2. Enable "Email" provider');
        console.log('   3. (Optional) Disable "Confirm email" for testing');
      }
    } else {
      console.log('✅ Sign up successful!');
      console.log('   User ID:', signUpData.user?.id);
      console.log('   Email:', signUpData.user?.email);
      console.log('   Needs confirmation:', !signUpData.user?.email_confirmed_at ? '⚠️  YES (check email)' : '✅ NO');
    }

    console.log('\n✅ Connection test completed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testSupabase();
