/**
 * Supabase Authentication Middleware
 * Validates Supabase JWT tokens and syncs users with Supabase database
 */

const { createClient } = require('@supabase/supabase-js');
const { from } = require('../config/database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hnivuisqktlrusyqywaz.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXZ1aXNxa3RscnVzeXF5d2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNzE2NzgsImV4cCI6MjA3ODc0NzY3OH0.amqHQkxh9tun5cIHUJN23ocGImZek6QfoSGpLDSUhDA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Verify Supabase JWT token
 */
async function verifySupabaseToken(token) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('❌ Supabase token verification failed:', error.message);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('❌ Error verifying Supabase token:', error.message);
    return null;
  }
}

/**
 * Sync Supabase user with Supabase database
 * Creates or updates user in users table
 */
async function syncUserToLocalDB(supabaseUser, rawPassword = null) {
  console.log('🔄 [SYNC START] Syncing user to Supabase DB');
  console.log('🔄 [SYNC] Supabase User ID:', supabaseUser.id);
  console.log('🔄 [SYNC] Email:', supabaseUser.email);
  console.log('🔄 [SYNC] User Metadata:', JSON.stringify(supabaseUser.user_metadata));
  
  try {
    // Check if user exists by supabase_uid
    const { data: existingUser, error: fetchError } = await from('users')
      .select('*')
      .eq('supabase_uid', supabaseUser.id)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ [SYNC ERROR] Error checking user:', fetchError);
      throw fetchError;
    }
    
    if (existingUser) {
      console.log('✅ [SYNC] User exists - updating last login for ID:', existingUser.id);
      
      // User exists - update timestamp
      const { error: updateError } = await from('users')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', existingUser.id);
      
      if (updateError) {
        console.error('❌ [SYNC ERROR] Error updating user:', updateError);
        throw updateError;
      }
      
      console.log('✅ [SYNC SUCCESS] User synced from database:', existingUser.email);
      return existingUser;
    } else {
      console.log('📝 [SYNC] User does not exist - creating new user');
      
      // User doesn't exist - create in Supabase
      const email = supabaseUser.email;
      const name = supabaseUser.user_metadata?.full_name || 
                   supabaseUser.user_metadata?.name || 
                   supabaseUser.email?.split('@')[0];
      const phone = supabaseUser.user_metadata?.phone || null;
      
      console.log('📝 [SYNC] Prepared user data:', { 
        email, 
        name, 
        phone, 
        supabase_uid: supabaseUser.id 
      });
      
      // Ensure we store a secure hashed password locally to satisfy NOT NULL column
      let passwordToStore;
      try {
        if (rawPassword) {
          passwordToStore = await bcrypt.hash(String(rawPassword), SALT_ROUNDS);
        } else {
          // For OAuth users (no plain password), generate a strong random secret and hash it
          const randomSecret = crypto.randomBytes(48).toString('hex');
          passwordToStore = await bcrypt.hash(randomSecret, SALT_ROUNDS);
        }
      } catch (err) {
        console.error('❌ [SYNC ERROR] Error hashing password:', err);
        throw err;
      }

      const { data: newUser, error: insertError } = await from('users')
        .insert({
          supabase_uid: supabaseUser.id,
          email,
          name,
          phone,
          password: passwordToStore,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ [SYNC ERROR] Error creating user:', insertError);
        throw insertError;
      }
      
      console.log('✅ [SYNC SUCCESS] User created in database!');
      console.log('✅ [SYNC SUCCESS] Email:', newUser.email);
      console.log('✅ [SYNC SUCCESS] DB ID:', newUser.id);
      return newUser;
    }
  } catch (error) {
    console.error('❌ [SYNC ERROR] Unexpected error:', error);
    throw error;
  }
}

/**
 * Middleware to authenticate requests using Supabase tokens
 */
const authenticateSupabase = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No authorization token provided',
        message: 'Please provide a valid Supabase token'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const supabaseUser = await verifySupabaseToken(token);

    if (!supabaseUser) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        message: 'Please log in again'
      });
    }

    // Sync user to local database
    const localUser = await syncUserToLocalDB(supabaseUser);

    // Attach both users to request
    req.supabaseUser = supabaseUser;
    req.user = localUser; // This is what the rest of the backend expects

    console.log(`✅ Authenticated: ${localUser.email} (Local ID: ${localUser.id})`);
    next();

  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    res.status(500).json({ 
      error: 'Authentication failed',
      message: error.message
    });
  }
};

module.exports = {
  authenticateSupabase,
  verifySupabaseToken,
  syncUserToLocalDB,
  supabase
};
