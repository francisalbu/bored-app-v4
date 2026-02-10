const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const { authenticateSupabase } = require('../middleware/supabaseAuth');

/**
 * POST /api/discount-codes/validate
 * Validate a discount code for the current user
 */
router.post('/validate', authenticateSupabase, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user?.supabase_uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!code || code.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Discount code is required'
      });
    }

    console.log(`🎫 Validating discount code: ${code} for user ${userId}`);

    const db = getDB();

    // Get the discount code
    const { data: discountCode, error: codeError } = await db
      .from('discount_codes')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('active', true)
      .single();

    if (codeError || !discountCode) {
      console.log('❌ Invalid or inactive discount code');
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired discount code'
      });
    }

    // Check if code has expired
    if (discountCode.expires_at && new Date(discountCode.expires_at) < new Date()) {
      console.log('❌ Discount code has expired');
      return res.status(400).json({
        success: false,
        message: 'This discount code has expired'
      });
    }

    // Check how many times this user has used this code
    const { data: usageData, error: usageError } = await db
      .from('discount_code_usage')
      .select('*')
      .eq('discount_code_id', discountCode.id)
      .eq('user_id', userId);

    if (usageError) {
      console.error('❌ Error checking usage:', usageError);
      return res.status(500).json({
        success: false,
        message: 'Failed to validate discount code'
      });
    }

    const usageCount = usageData ? usageData.length : 0;

    if (usageCount >= discountCode.max_uses_per_user) {
      console.log(`❌ User has already used this code ${usageCount} times (max: ${discountCode.max_uses_per_user})`);
      return res.status(400).json({
        success: false,
        message: 'You have already used this discount code'
      });
    }

    console.log(`✅ Discount code valid: ${discountCode.discount_percentage}% off`);

    res.json({
      success: true,
      message: 'Discount code is valid',
      data: {
        code: discountCode.code,
        discount_percentage: discountCode.discount_percentage,
        description: discountCode.description
      }
    });

  } catch (error) {
    console.error('❌ Error validating discount code:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/discount-codes/apply
 * Apply a discount code (mark as used by current user)
 */
router.post('/apply', authenticateSupabase, async (req, res) => {
  try {
    const { code, booking_id } = req.body;
    const userId = req.user?.supabase_uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!code || code.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Discount code is required'
      });
    }

    console.log(`🎫 Applying discount code: ${code} for user ${userId}`);

    const db = getDB();

    // Get the discount code (same validation as before)
    const { data: discountCode, error: codeError } = await db
      .from('discount_codes')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('active', true)
      .single();

    if (codeError || !discountCode) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired discount code'
      });
    }

    // Check if code has expired
    if (discountCode.expires_at && new Date(discountCode.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'This discount code has expired'
      });
    }

    // Check if user has already used this code
    const { data: existingUsage, error: checkError } = await db
      .from('discount_code_usage')
      .select('*')
      .eq('discount_code_id', discountCode.id)
      .eq('user_id', userId);

    if (checkError) {
      console.error('❌ Error checking usage:', checkError);
      return res.status(500).json({
        success: false,
        message: 'Failed to apply discount code'
      });
    }

    const usageCount = existingUsage ? existingUsage.length : 0;

    if (usageCount >= discountCode.max_uses_per_user) {
      return res.status(400).json({
        success: false,
        message: 'You have already used this discount code'
      });
    }

    // Record the usage
    const { data: usageRecord, error: insertError } = await db
      .from('discount_code_usage')
      .insert({
        discount_code_id: discountCode.id,
        user_id: userId,
        booking_id: booking_id || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error recording usage:', insertError);
      return res.status(500).json({
        success: false,
        message: 'Failed to apply discount code'
      });
    }

    console.log(`✅ Discount code applied successfully`);

    res.json({
      success: true,
      message: 'Discount code applied successfully',
      data: {
        code: discountCode.code,
        discount_percentage: discountCode.discount_percentage,
        usage_id: usageRecord.id
      }
    });

  } catch (error) {
    console.error('❌ Error applying discount code:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/discount-codes/my-usage
 * Get discount codes used by current user
 */
router.get('/my-usage', authenticateSupabase, async (req, res) => {
  try {
    const userId = req.user?.supabase_uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const db = getDB();

    const { data, error } = await db
      .from('discount_code_usage')
      .select(`
        *,
        discount_codes:discount_code_id (
          code,
          discount_percentage,
          description
        )
      `)
      .eq('user_id', userId)
      .order('used_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching usage:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch discount code usage'
      });
    }

    res.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('❌ Error fetching discount code usage:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
