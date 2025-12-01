/**
 * Interest Routes
 * 
 * Handle user interest submissions for upcoming experiences
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { from } = require('../config/database');

/**
 * POST /api/interest
 * Submit interest for an experience
 */
router.post('/',
  [
    body('experience_id').isInt({ min: 1 }).withMessage('Valid experience ID required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').optional().trim(),
    body('notes').optional().trim(),
    body('user_id').optional(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const { experience_id, name, email, phone, notes, user_id } = req.body;
      
      console.log('📝 New interest submission:', { experience_id, name, email });
      
      // Insert into Supabase
      const { data, error } = await from('experience_interests')
        .insert([{
          experience_id,
          name,
          email,
          phone: phone || null,
          notes: notes || null,
          user_id: user_id || null,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      
      console.log('✅ Interest saved:', data.id);
      
      // TODO: Send confirmation email to user
      // TODO: Notify admin about new interest
      
      res.json({
        success: true,
        message: 'Interest registered successfully',
        data: {
          id: data.id,
          experience_id: data.experience_id,
        }
      });
      
    } catch (error) {
      console.error('Error submitting interest:', error);
      next(error);
    }
  }
);

/**
 * GET /api/interest/:experienceId
 * Get all interests for an experience (admin only)
 */
router.get('/:experienceId',
  async (req, res, next) => {
    try {
      const { experienceId } = req.params;
      
      const { data, error } = await from('experience_interests')
        .select('*')
        .eq('experience_id', experienceId)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      res.json({
        success: true,
        count: data.length,
        data
      });
      
    } catch (error) {
      console.error('Error fetching interests:', error);
      next(error);
    }
  }
);

module.exports = router;
