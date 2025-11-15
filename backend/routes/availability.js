/**
 * Availability Slots Routes
 * 
 * Manage experience availability slots
 */

const express = require('express');
const router = express.Router();
const { param, validationResult } = require('express-validator');
const { query, get } = require('../config/database');

/**
 * GET /api/availability/:experienceId
 * Get all available slots for an experience
 * Query params:
 * - date: filter by specific date (YYYY-MM-DD)
 * - from: start date range (YYYY-MM-DD)
 * - to: end date range (YYYY-MM-DD)
 */
router.get('/:experienceId',
  [
    param('experienceId').isInt({ min: 1 }).withMessage('Valid experience ID required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid experience ID',
          errors: errors.array()
        });
      }
      
      const { experienceId } = req.params;
      const { date, from, to } = req.query;
      
      console.log('📅 Availability request:', { experienceId, date, from, to });
      
      let sql = `
        SELECT 
          id,
          experience_id,
          date,
          start_time,
          end_time,
          max_participants,
          booked_participants,
          (max_participants - booked_participants) as available_spots,
          is_available
        FROM availability_slots
        WHERE experience_id = ?
      `;
      
      const params = [experienceId];
      
      // Filter by specific date
      if (date) {
        sql += ' AND date = ?';
        params.push(date);
      }
      // Filter by date range
      else if (from && to) {
        sql += ' AND date BETWEEN ? AND ?';
        params.push(from, to);
      }
      // Default: only show future slots
      else {
        sql += ' AND date >= date("now")';
      }
      
      // Only show available slots
      sql += ' AND is_available = 1';
      
      sql += ' ORDER BY date ASC, start_time ASC';
      
      console.log('🔍 Executing SQL:', sql);
      console.log('🔍 With params:', params);
      
      const slots = await query(sql, params);
      
      console.log('✅ Found slots:', slots.length);
      if (slots.length > 0) {
        console.log('📋 First slot:', slots[0]);
      }
      
      // Filter out slots that are less than 3 hours from now
      // Example: Activity at 10:00, current time 07:01 → blocked (2h59min < 3h)
      //          Activity at 10:00, current time 06:59 → available (3h01min > 3h)
      const now = new Date();
      const THREE_HOURS_IN_MS = 3 * 60 * 60 * 1000;
      
      const availableSlots = slots.filter(slot => {
        // Combine date and start_time to get the full datetime
        const slotDateTime = new Date(`${slot.date}T${slot.start_time}`);
        const timeUntilSlot = slotDateTime - now;
        
        // Only show slots that are more than 3 hours away
        const isBookable = timeUntilSlot > THREE_HOURS_IN_MS;
        
        if (!isBookable) {
          console.log(`⏰ Slot ${slot.id} blocked: ${slot.date} ${slot.start_time} (${Math.round(timeUntilSlot / 1000 / 60)} minutes away, need >180 minutes)`);
        }
        
        return isBookable;
      });
      
      console.log(`✅ Bookable slots: ${availableSlots.length}/${slots.length}`);
      
      res.json({
        success: true,
        count: availableSlots.length,
        data: availableSlots
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/availability/slot/:slotId
 * Get specific slot details
 */
router.get('/slot/:slotId',
  [
    param('slotId').isInt({ min: 1 }).withMessage('Valid slot ID required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid slot ID',
          errors: errors.array()
        });
      }
      
      const { slotId } = req.params;
      
      const slot = await get(`
        SELECT 
          s.*,
          (s.max_participants - s.booked_participants) as available_spots,
          e.title as experience_title,
          e.price as experience_price,
          e.currency as experience_currency
        FROM availability_slots s
        LEFT JOIN experiences e ON s.experience_id = e.id
        WHERE s.id = ?
      `, [slotId]);
      
      if (!slot) {
        return res.status(404).json({
          success: false,
          message: 'Availability slot not found'
        });
      }
      
      res.json({
        success: true,
        data: slot
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
