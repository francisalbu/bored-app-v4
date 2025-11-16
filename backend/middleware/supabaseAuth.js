/**
 * Supabase Authentication Middleware
 * Validates Supabase JWT tokens and syncs users with local database
 */

const { createClient } = require('@supabase/supabase-js');
const { getDB } = require('../config/database');

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
 * Sync Supabase user with local database
 * Creates or updates user in bored_tourist.db
 */
async function syncUserToLocalDB(supabaseUser) {
  console.log('🔄 [SYNC START] Syncing user to local DB');
  console.log('🔄 [SYNC] Supabase User ID:', supabaseUser.id);
  console.log('🔄 [SYNC] Email:', supabaseUser.email);
  console.log('🔄 [SYNC] User Metadata:', JSON.stringify(supabaseUser.user_metadata));
  
  return new Promise((resolve, reject) => {
    console.log('🔄 [SYNC] Promise created, about to query database...');
    
    const db = getDB(); // Get database instance
    console.log('🔄 [SYNC] Got database instance');
    
    // Check if user exists in local DB by supabase_uid
    console.log('🔄 [SYNC] Executing db.get() with supabase_uid:', supabaseUser.id);
    
    db.get(
      'SELECT * FROM users WHERE supabase_uid = ?',
      [supabaseUser.id],
      (err, existingUser) => {
        console.log('🔄 [SYNC] db.get() callback fired!');
        
        if (err) {
          console.error('❌ [SYNC ERROR] Error checking user in local DB:', err);
          console.error('❌ [SYNC ERROR] Error message:', err.message);
          console.error('❌ [SYNC ERROR] Error stack:', err.stack);
          return reject(err);
        }

        console.log('🔄 [SYNC] Query successful. Existing user:', existingUser ? 'YES' : 'NO');
        
        if (existingUser) {
          console.log('✅ [SYNC] User exists - updating last login for ID:', existingUser.id);
          
          // User exists - update last login
          db.run(
            'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [existingUser.id],
            (updateErr) => {
              console.log('🔄 [SYNC] db.run() UPDATE callback fired!');
              
              if (updateErr) {
                console.error('❌ [SYNC ERROR] Error updating user:', updateErr);
                console.error('❌ [SYNC ERROR] Update error message:', updateErr.message);
                return reject(updateErr);
              }
              
              console.log('✅ [SYNC SUCCESS] User synced from local DB:', existingUser.email);
              resolve(existingUser);
            }
          );
        } else {
          console.log('📝 [SYNC] User does not exist - creating new user');
          
          // User doesn't exist - create in local DB
          const email = supabaseUser.email;
          const name = supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0];
          const phone = supabaseUser.user_metadata?.phone || null;

          console.log('📝 [SYNC] Prepared user data:', { 
            email, 
            name, 
            phone, 
            supabase_uid: supabaseUser.id 
          });
          console.log('📝 [SYNC] About to execute INSERT statement...');

          db.run(
            `INSERT INTO users (supabase_uid, email, name, phone, password, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [supabaseUser.id, email, name, phone, 'SUPABASE_AUTH'],
            function(insertErr) {
              console.log('🔄 [SYNC] db.run() INSERT callback fired!');
              console.log('🔄 [SYNC] this.lastID:', this.lastID);
              console.log('🔄 [SYNC] this.changes:', this.changes);
              
              if (insertErr) {
                console.error('❌ [SYNC ERROR] Error creating user in local DB:', insertErr);
                console.error('❌ [SYNC ERROR] Insert error message:', insertErr.message);
                console.error('❌ [SYNC ERROR] Insert error code:', insertErr.code);
                console.error('❌ [SYNC ERROR] Insert error stack:', insertErr.stack);
                return reject(insertErr);
              }

              const newUser = {
                id: this.lastID,
                supabase_uid: supabaseUser.id,
                email,
                name,
                phone
              };

              console.log('✅ [SYNC SUCCESS] User created in local DB!');
              console.log('✅ [SYNC SUCCESS] Email:', newUser.email);
              console.log('✅ [SYNC SUCCESS] Local DB ID:', newUser.id);
              resolve(newUser);
            }
          );
        }
      }
    );
  });
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
