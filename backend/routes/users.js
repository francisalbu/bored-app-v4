/**
 * Users Routes
 * 
 * Handles user-specific operations like updating contact information
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateSupabase } = require('../middleware/supabaseAuth');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * PUT /api/users/update-phone
 * Update user's phone number
 */
router.put('/update-phone',
  authenticateSupabase,
  [
    body('phone').notEmpty().withMessage('Phone number is required')
      .matches(/^\+[1-9]\d{1,14}$/).withMessage('Phone must be in international format (e.g., +351912345678)')
  ],
  async (req, res, next) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { phone } = req.body;
      const userId = req.user.id; // From authenticateSupabase middleware (supabase_uid)

      console.log('📞 [UPDATE-PHONE] Updating phone for user:', userId);
      console.log('📞 [UPDATE-PHONE] New phone:', phone);

      // Update phone in public.users table
      const { data, error } = await supabase
        .from('users')
        .update({ phone })
        .eq('supabase_uid', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ [UPDATE-PHONE] Supabase error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update phone number',
          details: error.message
        });
      }

      console.log('✅ [UPDATE-PHONE] Phone updated successfully');

      res.json({
        success: true,
        message: 'Phone number updated successfully',
        data: {
          user: {
            id: data.id,
            email: data.email,
            name: data.name,
            phone: data.phone
          }
        }
      });
    } catch (error) {
      console.error('❌ [UPDATE-PHONE] Error:', error);
      next(error);
    }
  }
);

module.exports = router;
