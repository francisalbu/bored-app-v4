/**
 * Admin Routes - Protected Admin API
 * 
 * All endpoints require the admin secret key for authorization
 * Used for:
 * - Creating admin users
 * - Promoting users to admin
 * - Creating operators (user + operator profile)
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { from } = require('../config/database');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.SETUP_SECRET || 'bored-tourist-setup-2026';

// Create admin Supabase client for user management
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Middleware to validate admin secret
 */
const validateAdminSecret = (req, res, next) => {
  const { adminSecret } = req.body;
  
  if (adminSecret !== ADMIN_SECRET) {
    return res.status(403).json({
      success: false,
      error: 'Invalid admin secret'
    });
  }
  
  next();
};

/**
 * POST /api/admin/create-admin
 * 
 * Create an admin user for backoffice access
 * 
 * Body:
 * - email: Admin email
 * - password: Admin password (min 6 chars)
 * - name: Admin name
 * - adminSecret: Secret key to authorize admin creation
 * 
 * Example:
 * curl -X POST http://localhost:3000/api/admin/create-admin \
 *   -H "Content-Type: application/json" \
 *   -d '{"email":"admin@example.com","password":"securepass123","name":"Admin User","adminSecret":"bored-tourist-setup-2026"}'
 */
router.post('/create-admin', validateAdminSecret, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    console.log(`📝 Creating admin user: ${email}`);

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin
      user_metadata: {
        full_name: name
      }
    });

    if (authError) {
      console.error('❌ Failed to create Supabase auth user:', authError);
      return res.status(400).json({
        success: false,
        error: authError.message
      });
    }

    console.log(`✅ Created auth user: ${authData.user.id}`);

    // Step 2: Create user in public.users table with admin role
    const { data: userData, error: userError } = await from('users')
      .insert({
        supabase_uid: authData.user.id,
        email: email.toLowerCase(),
        name,
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ Failed to create user in database:', userError);
      // Try to clean up auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {});
      return res.status(500).json({
        success: false,
        error: 'Failed to create user in database: ' + userError.message
      });
    }

    console.log(`✅ Admin user created successfully: ${userData.id}`);

    res.json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        id: userData.id,
        supabase_uid: authData.user.id,
        email: userData.email,
        name: userData.name,
        role: userData.role
      }
    });

  } catch (error) {
    console.error('❌ Create admin error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create admin user'
    });
  }
});

/**
 * POST /api/admin/promote-to-admin
 * 
 * Promote an existing user to admin role
 * 
 * Body:
 * - email: User email to promote
 * - adminSecret: Secret key to authorize promotion
 */
router.post('/promote-to-admin', validateAdminSecret, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    console.log(`📝 Promoting user to admin: ${email}`);

    // Find user by email
    const { data: user, error: findError } = await from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (findError || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.json({
        success: true,
        message: 'User is already an admin',
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    }

    // Update role to admin
    const { data: updated, error: updateError } = await from('users')
      .update({ 
        role: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update user role:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update user role'
      });
    }

    console.log(`✅ User promoted to admin: ${updated.email}`);

    res.json({
      success: true,
      message: 'User promoted to admin successfully',
      data: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role
      }
    });

  } catch (error) {
    console.error('❌ Promote error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to promote user'
    });
  }
});

/**
 * POST /api/admin/create-operator
 * 
 * Create a new operator (user account + operator profile in one step)
 * 
 * Body:
 * - email: Operator email
 * - password: Operator password (min 6 chars)
 * - name: Operator name
 * - company_name: Company name (required)
 * - description: Company description (optional)
 * - website: Company website (optional)
 * - phone: Contact phone (optional)
 * - address: Company address (optional)
 * - city: City (optional)
 * - logo_url: Logo URL (optional)
 * - verified: Whether operator is verified (default: false)
 * - adminSecret: Secret key to authorize creation
 * 
 * Example:
 * curl -X POST http://localhost:3000/api/admin/create-operator \
 *   -H "Content-Type: application/json" \
 *   -d '{"email":"operator@example.com","password":"securepass123","name":"John Operator","company_name":"Tours Inc","adminSecret":"bored-tourist-setup-2026"}'
 */
router.post('/create-operator', validateAdminSecret, async (req, res) => {
  try {
    const { 
      email, 
      password, 
      name, 
      company_name,
      description,
      website,
      phone,
      address,
      city,
      logo_url,
      verified,
      commission
    } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required'
      });
    }

    if (!company_name) {
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    console.log(`📝 Creating operator: ${email} (${company_name})`);

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for operator
      user_metadata: {
        full_name: name
      }
    });

    if (authError) {
      console.error('❌ Failed to create Supabase auth user:', authError);
      return res.status(400).json({
        success: false,
        error: authError.message
      });
    }

    console.log(`✅ Created auth user: ${authData.user.id}`);

    // Step 2: Create user in public.users table with operator role
    const { data: userData, error: userError } = await from('users')
      .insert({
        supabase_uid: authData.user.id,
        email: email.toLowerCase(),
        name,
        role: 'operator',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ Failed to create user in database:', userError);
      // Try to clean up auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {});
      return res.status(500).json({
        success: false,
        error: 'Failed to create user in database: ' + userError.message
      });
    }

    console.log(`✅ Created user in database: ${userData.id}`);

    // Step 3: Create operator profile
    const operatorPayload = {
      user_id: userData.id,
      company_name: company_name.trim(),
      description: description ? description.trim() : null,
      website: website ? website.trim() : null,
      phone: phone ? phone.trim() : null,
      address: address ? address.trim() : null,
      city: city ? city.trim() : null,
      logo_url: logo_url ? logo_url.trim() : null,
      verified: verified === true || verified === 'true',
      commission: commission != null ? parseFloat(commission) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: operatorData, error: operatorError } = await from('operators')
      .insert(operatorPayload)
      .select()
      .single();

    if (operatorError) {
      console.error('❌ Failed to create operator profile:', operatorError);
      // Try to clean up user and auth
      try {
        await from('users').delete().eq('id', userData.id);
      } catch (e) { /* ignore cleanup errors */ }
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch (e) { /* ignore cleanup errors */ }
      return res.status(500).json({
        success: false,
        error: 'Failed to create operator profile: ' + operatorError.message
      });
    }

    console.log(`✅ Operator created successfully: ${operatorData.id}`);

    res.json({
      success: true,
      message: 'Operator created successfully',
      data: {
        user: {
          id: userData.id,
          supabase_uid: authData.user.id,
          email: userData.email,
          name: userData.name,
          role: userData.role
        },
        operator: {
          id: operatorData.id,
          company_name: operatorData.company_name,
          verified: operatorData.verified
        }
      }
    });

  } catch (error) {
    console.error('❌ Create operator error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create operator'
    });
  }
});

/**
 * POST /api/admin/promote-to-operator
 * 
 * Promote an existing user to operator role and create operator profile
 * 
 * Body:
 * - email: User email to promote
 * - company_name: Company name (required)
 * - description: Company description (optional)
 * - website: Company website (optional)
 * - phone: Contact phone (optional)
 * - address: Company address (optional)
 * - city: City (optional)
 * - logo_url: Logo URL (optional)
 * - verified: Whether operator is verified (default: false)
 * - adminSecret: Secret key to authorize promotion
 */
router.post('/promote-to-operator', validateAdminSecret, async (req, res) => {
  try {
    const { 
      email,
      company_name,
      description,
      website,
      phone,
      address,
      city,
      logo_url,
      verified,
      commission
    } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    if (!company_name) {
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
      });
    }

    console.log(`📝 Promoting user to operator: ${email}`);

    // Find user by email
    const { data: user, error: findError } = await from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (findError || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if operator profile already exists
    const { data: existingOperator } = await from('operators')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingOperator) {
      return res.status(409).json({
        success: false,
        error: 'Operator profile already exists for this user'
      });
    }

    // Update role to operator if not already
    if (user.role !== 'operator' && user.role !== 'admin') {
      const { error: updateError } = await from('users')
        .update({ 
          role: 'operator',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Failed to update user role:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to update user role'
        });
      }
    }

    // Create operator profile
    const operatorPayload = {
      user_id: user.id,
      company_name: company_name.trim(),
      description: description ? description.trim() : null,
      website: website ? website.trim() : null,
      phone: phone ? phone.trim() : null,
      address: address ? address.trim() : null,
      city: city ? city.trim() : null,
      logo_url: logo_url ? logo_url.trim() : null,
      verified: verified === true || verified === 'true',
      commission: commission != null ? parseFloat(commission) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: operatorData, error: operatorError } = await from('operators')
      .insert(operatorPayload)
      .select()
      .single();

    if (operatorError) {
      console.error('❌ Failed to create operator profile:', operatorError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create operator profile: ' + operatorError.message
      });
    }

    console.log(`✅ User promoted to operator: ${email}`);

    res.json({
      success: true,
      message: 'User promoted to operator successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: 'operator'
        },
        operator: {
          id: operatorData.id,
          company_name: operatorData.company_name,
          verified: operatorData.verified
        }
      }
    });

  } catch (error) {
    console.error('❌ Promote to operator error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to promote user to operator'
    });
  }
});

module.exports = router;
