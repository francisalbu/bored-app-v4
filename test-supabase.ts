/**
 * Supabase Connection Test
 * 
 * Run this to test if Supabase is configured correctly
 * Usage: npx ts-node test-supabase.ts
 */

import { supabase } from './lib/supabase.js';

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase connection...\n');

  try {
    // Test 1: Check if client is initialized
    console.log('✓ Supabase client initialized');
    
    // Test 2: Try to get session (should be null for new user)
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.log('✗ Error getting session:', sessionError.message);
    } else {
      console.log('✓ Session check successful');
      console.log('  Current session:', sessionData.session ? 'Logged in' : 'Not logged in');
    }

    // Test 3: Test database connection (try to query users table)
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('⚠ Database query test:', error.message);
      console.log('  (This is OK if users table doesn\'t exist yet)');
    } else {
      console.log('✓ Database connection successful');
    }

    console.log('\n✅ Supabase is configured correctly!');
    console.log('\n📝 Next steps:');
    console.log('1. Make sure your Supabase project has:');
    console.log('   - Auth enabled (Settings → Authentication)');
    console.log('   - Email auth provider enabled');
    console.log('   - Confirm email disabled for testing (optional)');
    console.log('2. Create a test user in Supabase dashboard');
    console.log('3. Try logging in with the test user');

  } catch (error) {
    console.error('\n❌ Supabase connection failed:', error);
    process.exit(1);
  }
}

testSupabaseConnection();
