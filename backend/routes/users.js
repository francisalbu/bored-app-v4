/**
 * Users Routes
 * 
 * Handles user-specific operations like updating contact information
 */

const express = require('express');
const router = express.Router();
const { authenticateSupabase } = require('../middleware/supabaseAuth');
const { createClient } = require('@supabase/supabase-js');
const { from } = require('../config/database');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/users/stats
 * Get user statistics (experiences completed, cities visited, reviews written)
 */
router.get('/stats',
  authenticateSupabase,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      console.log('📊 [USER-STATS] Fetching stats for user:', userId);

      // Get all confirmed/completed bookings for this user
      const { data: bookings, error: bookingsError } = await from('bookings')
        .select(`
          id,
          status,
          payment_status,
          experiences(location)
        `)
        .eq('user_id', userId)
        .in('status', ['confirmed', 'completed']);

      if (bookingsError) {
        console.error('❌ [USER-STATS] Bookings error:', bookingsError);
        throw bookingsError;
      }

      console.log('📊 [USER-STATS] Found bookings:', bookings?.length, bookings);

      // Count unique cities from booking experiences
      const uniqueCities = new Set();
      bookings?.forEach(booking => {
        if (booking.experiences?.location) {
          // Extract city from location (e.g., "Lisbon, Portugal" -> "Lisbon")
          const city = booking.experiences.location.split(',')[0].trim();
          if (city) uniqueCities.add(city);
        }
      });

      // Get reviews count
      const { count: reviewsCount, error: reviewsError } = await from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (reviewsError) {
        console.error('❌ [USER-STATS] Reviews error:', reviewsError);
        throw reviewsError;
      }

      const stats = {
        experiencesCompleted: bookings?.length || 0,
        citiesVisited: uniqueCities.size,
        reviewsWritten: reviewsCount || 0
      };

      console.log('✅ [USER-STATS] Stats:', stats);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('❌ [USER-STATS] Error:', error);
      next(error);
    }
  }
);

/**
 * PUT /api/users/update-phone
 * Update user's phone number
 */
router.put('/update-phone',
  authenticateSupabase,
  async (req, res, next) => {
    try {
      // Manual validation
      const { phone } = req.body;
      
      if (!phone || !/^\+[1-9]\d{1,14}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Phone must be in international format (e.g., +351912345678)'
        });
      }
      
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

/**
 * DELETE /api/users/delete-account
 * Permanently delete user account and all associated data
 */
router.delete('/delete-account',
  authenticateSupabase,
  async (req, res, next) => {
    try {
      const localUserId = req.user.id; // Local DB user ID (integer)
      const supabaseUid = req.user.supabase_uid; // Supabase Auth UUID
      
      console.log('🗑️ [DELETE-ACCOUNT] Starting account deletion');
      console.log('🗑️ [DELETE-ACCOUNT] Local User ID:', localUserId);
      console.log('🗑️ [DELETE-ACCOUNT] Supabase UID:', supabaseUid);

      // 1. Delete user's bookings (use local user ID)
      const { error: bookingsError } = await supabase
        .from('bookings')
        .delete()
        .eq('user_id', localUserId);
      
      if (bookingsError) {
        console.error('⚠️ [DELETE-ACCOUNT] Error deleting bookings:', bookingsError);
      } else {
        console.log('✅ [DELETE-ACCOUNT] Bookings deleted');
      }

      // 2. Delete user's reviews
      const { error: reviewsError } = await supabase
        .from('reviews')
        .delete()
        .eq('user_id', localUserId);
      
      if (reviewsError) {
        console.error('⚠️ [DELETE-ACCOUNT] Error deleting reviews:', reviewsError);
      } else {
        console.log('✅ [DELETE-ACCOUNT] Reviews deleted');
      }

      // 3. Delete user's saved experiences
      const { error: savedError } = await supabase
        .from('saved_experiences')
        .delete()
        .eq('user_id', localUserId);
      
      if (savedError) {
        console.error('⚠️ [DELETE-ACCOUNT] Error deleting saved experiences:', savedError);
      } else {
        console.log('✅ [DELETE-ACCOUNT] Saved experiences deleted');
      }

      // 4. Delete from public.users table
      const { error: usersError } = await supabase
        .from('users')
        .delete()
        .eq('id', localUserId);
      
      if (usersError) {
        console.error('⚠️ [DELETE-ACCOUNT] Error deleting from users table:', usersError);
      } else {
        console.log('✅ [DELETE-ACCOUNT] User record deleted');
      }

      // 5. Delete from auth.users using Admin API (use supabase_uid - the UUID)
      const { error: authError } = await supabase.auth.admin.deleteUser(supabaseUid);
      
      if (authError) {
        console.error('❌ [DELETE-ACCOUNT] Error deleting auth user:', authError);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete authentication account',
          details: authError.message
        });
      }

      console.log('✅ [DELETE-ACCOUNT] Auth user deleted successfully');

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      console.error('❌ [DELETE-ACCOUNT] Error:', error);
      next(error);
    }
  }
);

module.exports = router;
