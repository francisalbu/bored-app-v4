/**
 * Availability Slots Routes
 * 
 * Manage experience availability slots
 */

const express = require('express');
const router = express.Router();
const { from } = require('../config/database');

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
  ],
  async (req, res, next) => {
    try {
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid experience ID',
          errors: errors.array()
        });
      }
      
      const { experienceId } = req.params;
      const { date, from: fromDate, to: toDate } = req.query;
      
      console.log('📅 Availability request:', { experienceId, date, fromDate, toDate });
      
      // Build Supabase query
      let query = from('availability_slots')
        .select('id, experience_id, date, start_time, end_time, max_participants, booked_participants, is_available')
        .eq('experience_id', experienceId)
        .eq('is_available', true);
      
      // Filter by specific date
      if (date) {
        query = query.eq('date', date);
      }
      // Filter by date range
      else if (fromDate && toDate) {
        query = query.gte('date', fromDate).lte('date', toDate);
      }
      // Default: only show future slots
      else {
        const today = new Date().toISOString().split('T')[0];
        query = query.gte('date', today);
      }
      
      query = query.order('date', { ascending: true }).order('start_time', { ascending: true });
      
      console.log('🔍 Fetching from Supabase...');
      
      const { data: slots, error } = await query;
      
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      
      // Calculate available_spots for each slot
      const slotsWithSpots = slots.map(slot => ({
        ...slot,
        available_spots: slot.max_participants - slot.booked_participants
      }));
      
      console.log('✅ Found slots:', slotsWithSpots.length);
      if (slotsWithSpots.length > 0) {
        console.log('📋 First slot:', slotsWithSpots[0]);
      }
      
      // Filter out slots that are less than 90 minutes from now
      // Example: Activity at 10:00, current time 08:31 → blocked (1h29min < 1h30min)
      //          Activity at 10:00, current time 08:29 → available (1h31min > 1h30min)
      const now = new Date();
      const NINETY_MINUTES_IN_MS = 90 * 60 * 1000;
      
      const availableSlots = slotsWithSpots.filter(slot => {
        // Combine date and start_time to get the full datetime
        const slotDateTime = new Date(`${slot.date}T${slot.start_time}`);
        const timeUntilSlot = slotDateTime - now;
        
        // Only show slots that are more than 90 minutes away
        const isBookable = timeUntilSlot > NINETY_MINUTES_IN_MS;
        
        if (!isBookable) {
          console.log(`⏰ Slot ${slot.id} blocked: ${slot.date} ${slot.start_time} (${Math.round(timeUntilSlot / 1000 / 60)} minutes away, need >90 minutes)`);
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
  ],
  async (req, res, next) => {
    try {
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid slot ID',
          errors: errors.array()
        });
      }
      
      const { slotId } = req.params;
      
      const { data: slot, error } = await from('availability_slots')
        .select(`
          *,
          experiences(title, price, currency)
        `)
        .eq('id', slotId)
        .single();
      
      if (error || !slot) {
        return res.status(404).json({
          success: false,
          message: 'Availability slot not found'
        });
      }
      
      // Calculate available spots and flatten experience data
      const formattedSlot = {
        ...slot,
        available_spots: slot.max_participants - slot.booked_participants,
        experience_title: slot.experiences?.title,
        experience_price: slot.experiences?.price,
        experience_currency: slot.experiences?.currency
      };
      delete formattedSlot.experiences; // Remove nested object
      
      res.json({
        success: true,
        data: formattedSlot
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
