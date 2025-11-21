/**
 * Database Configuration - Supabase PostgreSQL
 * 
 * Uses Supabase as the main database for production
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase;

/**
 * Initialize Supabase connection
 */
function initDB() {
  console.log('🔍 Checking Supabase credentials...');
  console.log('SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return Promise.reject(new Error('❌ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'));
  }
  
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  console.log('✅ Connected to Supabase PostgreSQL:', SUPABASE_URL);
  return Promise.resolve(supabase);
}

/**
 * Get Supabase client instance
 */
function getDB() {
  if (!supabase) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return supabase;
}

/**
 * Helper function to query Supabase tables
 * Returns Supabase query builder
 */
function from(tableName) {
  if (!supabase) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return supabase.from(tableName);
}

/**
 * Close database connection (no-op for Supabase, kept for compatibility)
 */
function closeDB() {
  console.log('Supabase connection closed');
  return Promise.resolve();
}

// Export Supabase client and helper functions
module.exports = {
  initDB,
  getDB,
  from,
  closeDB,
  supabase: () => supabase
};
