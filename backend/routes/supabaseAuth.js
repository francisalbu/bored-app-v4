/**
 * Supabase Authentication Routes
 * 
 * Handles user registration and login with Supabase
 * Syncs users with local SQLite database
 */

const express = require('express');
const router = express.Router();
const { authenticateSupabase, syncUserToLocalDB, supabase } = require('../middleware/supabaseAuth');
const { createClient } = require('@supabase/supabase-js');

// Admin client for user management (can bypass email confirmation)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hnivuisqktlrusyqywaz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;
if (SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('✅ Supabase Admin client initialized');
} else {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not set - auto-confirmation disabled');
}

/**
 * POST /api/auth/supabase/register
 * Register a new user with Supabase and sync to local DB
 */
router.post('/register', async (req, res) => {
  try {
    const { name, password, phone } = req.body;
    // Trim and normalize email
    const email = req.body.email ? req.body.email.trim().toLowerCase() : null;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    console.log(`📝 Registering user: ${email}`);

    // Create user in Supabase - ALWAYS require email confirmation in production
    let authData, authError;
    
    // Use regular signup to require email confirmation
    console.log('📧 Creating user with email confirmation required');
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone: phone || null
        }
      }
    });
    authData = result.data;
    authError = result.error;

    if (authError) {
      console.error('❌ Supabase registration error:', authError.message);
      return res.status(400).json({
        success: false,
        error: authError.message
      });
    }

    if (!authData.user) {
      return res.status(400).json({
        success: false,
        error: 'Failed to create user'
      });
    }

    console.log(`✅ User created in Supabase: ${authData.user.id}`);

    // Sync to local database
    let localUser;
    try {
      // Pass raw password so the sync function can hash & store it securely
      localUser = await syncUserToLocalDB(authData.user, password);
      console.log(`✅ User synced to local DB: ID ${localUser.id}`);
    } catch (syncError) {
      console.error('❌ Database sync error:', syncError);
      console.error('❌ Error code:', syncError.code);
      console.error('❌ Error message:', syncError.message);
      console.error('❌ Error details:', syncError.details);
      console.error('❌ Error hint:', syncError.hint);
      
      return res.status(400).json({
        success: false,
        error: 'Database error saving new user',
        details: {
          code: syncError.code,
          message: syncError.message,
          hint: syncError.hint
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: localUser.id,
          supabase_uid: localUser.supabase_uid,
          email: localUser.email,
          name: localUser.name,
          phone: localUser.phone
        },
        session: authData.session,
        needsEmailConfirmation: !authData.user.email_confirmed_at
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/supabase/login
 * Login with Supabase and sync to local DB
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    console.log(`🔐 Logging in user: ${email}`);

    // Login with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('❌ Supabase login error:', authError.message);
      return res.status(401).json({
        success: false,
        error: authError.message
      });
    }

    if (!authData.user || !authData.session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    console.log(`✅ User authenticated with Supabase: ${authData.user.id}`);

    // Sync to local database
    const localUser = await syncUserToLocalDB(authData.user);

    console.log(`✅ User synced to local DB: ID ${localUser.id}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: localUser.id,
          supabase_uid: localUser.supabase_uid,
          email: localUser.email,
          name: localUser.name,
          phone: localUser.phone
        },
        session: authData.session
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/supabase/logout
 * Logout from Supabase (clears session client-side, this is just for consistency)
 */
router.post('/logout', authenticateSupabase, async (req, res) => {
  try {
    console.log(`👋 Logging out user: ${req.user.email}`);

    // Supabase logout is handled client-side
    // This endpoint is just for logging/consistency
    
    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: error.message
    });
  }
});

/**
 * GET /api/auth/supabase/me
 * Get current user info (validates token and syncs)
 */
router.get('/me', authenticateSupabase, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          supabase_uid: req.user.supabase_uid,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
          phone: req.user.phone,
          avatar_icon: req.user.avatar_icon,
          birthdate: req.user.birthdate,
          location: req.user.location
        },
        supabaseUser: req.supabaseUser
      }
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/supabase/resend-confirmation
 * Resend email confirmation link
 */
router.post('/resend-confirmation', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    console.log(`📧 Resending confirmation email to: ${email}`);

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    });

    if (error) {
      console.error('❌ Error resending confirmation:', error.message);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    console.log('✅ Confirmation email resent');

    res.json({
      success: true,
      message: 'Confirmation email sent. Please check your inbox.'
    });

  } catch (error) {
    console.error('❌ Resend confirmation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend confirmation email',
      message: error.message
    });
  }
});

module.exports = router;
