const express = require('express');
const router = express.Router();
const { authenticateSupabase } = require('../middleware/supabaseAuth');
const { getDB } = require('../config/database');

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return undefined;
};

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeArrayField = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (item === null || item === undefined ? '' : String(item).trim()))
      .filter((item) => item.length > 0);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return undefined;
};

const getOperatorForUser = async (db, userId) => {
  const { data, error } = await db
    .from('operators')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
};

const buildExperiencePayload = (body) => {
  const payload = {};

  if (body.title !== undefined) payload.title = String(body.title).trim();
  if (body.description !== undefined) payload.description = String(body.description).trim();
  if (body.location !== undefined) payload.location = String(body.location).trim();
  if (body.address !== undefined) payload.address = body.address ? String(body.address).trim() : null;
  if (body.meeting_point !== undefined) payload.meeting_point = body.meeting_point ? String(body.meeting_point).trim() : null;
  if (body.distance !== undefined) payload.distance = body.distance ? String(body.distance).trim() : null;
  if (body.category !== undefined) payload.category = body.category ? String(body.category).trim() : null;
  if (body.currency !== undefined) payload.currency = body.currency ? String(body.currency).trim() : 'EUR';
  if (body.video_url !== undefined) payload.video_url = body.video_url ? String(body.video_url).trim() : null;
  if (body.image_url !== undefined) payload.image_url = body.image_url ? String(body.image_url).trim() : null;
  if (body.provider_logo !== undefined) payload.provider_logo = body.provider_logo ? String(body.provider_logo).trim() : null;
  if (body.cancellation_policy !== undefined) payload.cancellation_policy = body.cancellation_policy ? String(body.cancellation_policy).trim() : null;
  if (body.important_info !== undefined) payload.important_info = body.important_info ? String(body.important_info).trim() : null;

  const price = parseNumber(body.price);
  if (price !== undefined) payload.price = price;

  const maxGroupSize = parseNumber(body.max_group_size);
  if (maxGroupSize !== undefined) payload.max_group_size = maxGroupSize;

  const latitude = parseNumber(body.latitude);
  if (latitude !== undefined) payload.latitude = latitude;

  const longitude = parseNumber(body.longitude);
  if (longitude !== undefined) payload.longitude = longitude;

  const duration = body.duration !== undefined ? String(body.duration).trim() : undefined;
  if (duration !== undefined) payload.duration = duration;

  const instantBooking = parseBoolean(body.instant_booking);
  if (instantBooking !== undefined) payload.instant_booking = instantBooking;

  const availableToday = parseBoolean(body.available_today);
  if (availableToday !== undefined) payload.available_today = availableToday;

  const verified = parseBoolean(body.verified);
  if (verified !== undefined) payload.verified = verified;

  const isActive = parseBoolean(body.is_active);
  if (isActive !== undefined) payload.is_active = isActive;

  const tags = normalizeArrayField(body.tags);
  if (tags !== undefined) payload.tags = tags;

  const images = normalizeArrayField(body.images);
  if (images !== undefined) payload.images = images;

  const highlights = normalizeArrayField(body.highlights);
  if (highlights !== undefined) payload.highlights = highlights;

  const included = normalizeArrayField(body.included);
  if (included !== undefined) payload.included = included;

  const whatToBring = normalizeArrayField(body.what_to_bring);
  if (whatToBring !== undefined) payload.what_to_bring = whatToBring;

  const languages = normalizeArrayField(body.languages);
  if (languages !== undefined) payload.languages = languages;

  return payload;
};

const ensureAdmin = (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
    return false;
  }
  return true;
};

router.get('/me', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const user = req.user;

    const operator = await getOperatorForUser(db, user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        operator
      }
    });
  } catch (error) {
    console.error('Backoffice profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load backoffice profile'
    });
  }
});

router.get('/experiences', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const user = req.user;
    const isAdmin = user.role === 'admin';
    const isOperator = user.role === 'operator';

    if (!isAdmin && !isOperator) {
      return res.status(403).json({
        success: false,
        message: 'Backoffice access required'
      });
    }

    let query = db
      .from('experiences')
      .select('*, operators(id, company_name, logo_url)')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      const operator = await getOperatorForUser(db, user.id);
      if (!operator) {
        return res.status(404).json({
          success: false,
          message: 'Operator profile not found'
        });
      }
      query = query.eq('operator_id', operator.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Backoffice experiences error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch experiences'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Backoffice experiences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch experiences'
    });
  }
});

router.post('/experiences', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const user = req.user;
    const isAdmin = user.role === 'admin';
    const isOperator = user.role === 'operator';

    if (!isAdmin && !isOperator) {
      return res.status(403).json({
        success: false,
        message: 'Backoffice access required'
      });
    }

    let operatorId = parseNumber(req.body.operator_id);

    if (!isAdmin) {
      const operator = await getOperatorForUser(db, user.id);
      if (!operator) {
        return res.status(404).json({
          success: false,
          message: 'Operator profile not found'
        });
      }
      operatorId = operator.id;
    }

    if (!operatorId) {
      return res.status(400).json({
        success: false,
        message: 'Operator ID is required'
      });
    }

    const payload = buildExperiencePayload(req.body);
    payload.operator_id = operatorId;

    const requiredFields = ['title', 'description', 'location', 'price', 'duration'];
    const missingFields = requiredFields.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === '');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const { data, error } = await db
      .from('experiences')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('Backoffice create experience error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create experience'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Backoffice create experience error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create experience'
    });
  }
});

router.put('/experiences/:id', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const user = req.user;
    const isAdmin = user.role === 'admin';
    const isOperator = user.role === 'operator';

    if (!isAdmin && !isOperator) {
      return res.status(403).json({
        success: false,
        message: 'Backoffice access required'
      });
    }

    const experienceId = parseNumber(req.params.id);
    if (!experienceId) {
      return res.status(400).json({
        success: false,
        message: 'Valid experience ID required'
      });
    }

    const { data: existing, error: existingError } = await db
      .from('experiences')
      .select('id, operator_id')
      .eq('id', experienceId)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({
        success: false,
        message: 'Experience not found'
      });
    }

    if (!isAdmin) {
      const operator = await getOperatorForUser(db, user.id);
      if (!operator || operator.id !== existing.operator_id) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own experiences'
        });
      }
    }

    const payload = buildExperiencePayload(req.body);

    if (!isAdmin) {
      delete payload.operator_id;
    } else if (req.body.operator_id !== undefined) {
      payload.operator_id = parseNumber(req.body.operator_id) || existing.operator_id;
    }

    const { data, error } = await db
      .from('experiences')
      .update(payload)
      .eq('id', experienceId)
      .select('*')
      .single();

    if (error) {
      console.error('Backoffice update experience error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update experience'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Backoffice update experience error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update experience'
    });
  }
});

router.delete('/experiences/:id', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const user = req.user;
    const isAdmin = user.role === 'admin';
    const isOperator = user.role === 'operator';

    if (!isAdmin && !isOperator) {
      return res.status(403).json({
        success: false,
        message: 'Backoffice access required'
      });
    }

    const experienceId = parseNumber(req.params.id);
    if (!experienceId) {
      return res.status(400).json({
        success: false,
        message: 'Valid experience ID required'
      });
    }

    const { data: existing, error: existingError } = await db
      .from('experiences')
      .select('id, operator_id')
      .eq('id', experienceId)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({
        success: false,
        message: 'Experience not found'
      });
    }

    if (!isAdmin) {
      const operator = await getOperatorForUser(db, user.id);
      if (!operator || operator.id !== existing.operator_id) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own experiences'
        });
      }
    }

    const { error } = await db
      .from('experiences')
      .delete()
      .eq('id', experienceId);

    if (error) {
      console.error('Backoffice delete experience error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete experience'
      });
    }

    res.json({
      success: true,
      data: { id: experienceId }
    });
  } catch (error) {
    console.error('Backoffice delete experience error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete experience'
    });
  }
});

router.get('/operators', authenticateSupabase, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const db = getDB();
    const { data, error } = await db
      .from('operators')
      .select('*, users(id, name, email, role)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Backoffice operators error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch operators'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Backoffice operators error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch operators'
    });
  }
});

router.post('/operators', authenticateSupabase, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const db = getDB();
    const userId = parseNumber(req.body.user_id);
    const userEmail = req.body.user_email ? String(req.body.user_email).trim() : null;

    if (!userId && !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'User ID or user email is required'
      });
    }

    let userQuery = db.from('users').select('id, role, email, name');
    if (userId) {
      userQuery = userQuery.eq('id', userId);
    } else {
      userQuery = userQuery.eq('email', userEmail);
    }

    const { data: user, error: userError } = await userQuery.single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { data: existingOperator } = await db
      .from('operators')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingOperator) {
      return res.status(409).json({
        success: false,
        message: 'Operator already exists for this user'
      });
    }

    if (user.role === 'user') {
      await db
        .from('users')
        .update({ role: 'operator' })
        .eq('id', user.id);
    }

    const payload = {
      user_id: user.id,
      company_name: req.body.company_name ? String(req.body.company_name).trim() : null,
      logo_url: req.body.logo_url ? String(req.body.logo_url).trim() : null,
      description: req.body.description ? String(req.body.description).trim() : null,
      website: req.body.website ? String(req.body.website).trim() : null,
      phone: req.body.phone ? String(req.body.phone).trim() : null,
      address: req.body.address ? String(req.body.address).trim() : null,
      city: req.body.city ? String(req.body.city).trim() : null,
      verified: parseBoolean(req.body.verified) || false,
      commission: req.body.commission != null ? parseFloat(req.body.commission) : null
    };

    if (!payload.company_name) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required'
      });
    }

    const { data, error } = await db
      .from('operators')
      .insert(payload)
      .select('*, users(id, name, email, role)')
      .single();

    if (error) {
      console.error('Backoffice create operator error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create operator'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Backoffice create operator error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create operator'
    });
  }
});

router.put('/operators/:id', authenticateSupabase, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const db = getDB();
    const operatorId = parseNumber(req.params.id);

    if (!operatorId) {
      return res.status(400).json({
        success: false,
        message: 'Valid operator ID required'
      });
    }

    const payload = {};
    if (req.body.company_name !== undefined) payload.company_name = req.body.company_name ? String(req.body.company_name).trim() : null;
    if (req.body.logo_url !== undefined) payload.logo_url = req.body.logo_url ? String(req.body.logo_url).trim() : null;
    if (req.body.description !== undefined) payload.description = req.body.description ? String(req.body.description).trim() : null;
    if (req.body.website !== undefined) payload.website = req.body.website ? String(req.body.website).trim() : null;
    if (req.body.phone !== undefined) payload.phone = req.body.phone ? String(req.body.phone).trim() : null;
    if (req.body.address !== undefined) payload.address = req.body.address ? String(req.body.address).trim() : null;
    if (req.body.city !== undefined) payload.city = req.body.city ? String(req.body.city).trim() : null;
    if (req.body.verified !== undefined) payload.verified = parseBoolean(req.body.verified) || false;
    if (req.body.commission !== undefined) payload.commission = req.body.commission != null ? parseFloat(req.body.commission) : null;

    const { data, error } = await db
      .from('operators')
      .update(payload)
      .eq('id', operatorId)
      .select('*, users(id, name, email, role)')
      .single();

    if (error) {
      console.error('Backoffice update operator error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update operator'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Backoffice update operator error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update operator'
    });
  }
});

router.delete('/operators/:id', authenticateSupabase, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const db = getDB();
    const operatorId = parseNumber(req.params.id);

    if (!operatorId) {
      return res.status(400).json({
        success: false,
        message: 'Valid operator ID required'
      });
    }

    const { data: operator } = await db
      .from('operators')
      .select('id, user_id')
      .eq('id', operatorId)
      .single();

    if (!operator) {
      return res.status(404).json({
        success: false,
        message: 'Operator not found'
      });
    }

    const { error } = await db
      .from('operators')
      .delete()
      .eq('id', operatorId);

    if (error) {
      console.error('Backoffice delete operator error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete operator'
      });
    }

    const { data: user } = await db
      .from('users')
      .select('role')
      .eq('id', operator.user_id)
      .single();

    if (user && user.role === 'operator') {
      await db
        .from('users')
        .update({ role: 'user' })
        .eq('id', operator.user_id);
    }

    res.json({
      success: true,
      data: { id: operatorId }
    });
  } catch (error) {
    console.error('Backoffice delete operator error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete operator'
    });
  }
});

// ============================================
// BOOKINGS MANAGEMENT
// ============================================

/**
 * GET /api/backoffice/bookings
 * Get all bookings (admin sees all, operators see their experiences only)
 */
router.get('/bookings', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const isAdmin = req.user.role === 'admin';
    const { status, payment_status, from_date, to_date, experience_id, operator_id } = req.query;

    let query = db
      .from('bookings')
      .select(`
        *,
        experiences(id, title, location, price, operator_id, operators(id, company_name, commission)),
        users(id, name, email)
      `)
      .order('created_at', { ascending: false });

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }
    if (payment_status) {
      query = query.eq('payment_status', payment_status);
    }

    // Filter by date range
    if (from_date) {
      query = query.gte('booking_date', from_date);
    }
    if (to_date) {
      query = query.lte('booking_date', to_date);
    }

    // Filter by experience
    if (experience_id) {
      query = query.eq('experience_id', experience_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Backoffice get bookings error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch bookings'
      });
    }

    // Filter by operator if not admin
    let filteredData = data || [];
    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      if (operator) {
        filteredData = filteredData.filter(
          (b) => b.experiences?.operator_id === operator.id
        );
      } else {
        filteredData = [];
      }
    } else if (operator_id) {
      // Admin filtering by specific operator
      filteredData = filteredData.filter(
        (b) => b.experiences?.operator_id === parseInt(operator_id, 10)
      );
    }

    res.json({
      success: true,
      data: filteredData
    });
  } catch (error) {
    console.error('Backoffice get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
});

/**
 * PUT /api/backoffice/bookings/:id/status
 * Update booking status (confirm, complete, cancel)
 */
router.put('/bookings/:id/status', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const bookingId = parseNumber(req.params.id);
    const { status } = req.body;
    const isAdmin = req.user.role === 'admin';

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Valid booking ID required'
      });
    }

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status required: pending, confirmed, completed, cancelled'
      });
    }

    // Get booking with experience info
    const { data: booking, error: fetchError } = await db
      .from('bookings')
      .select('*, experiences(operator_id)')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check permission
    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      if (!operator || booking.experiences?.operator_id !== operator.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this booking'
        });
      }
    }

    // Update booking status
    const { data, error } = await db
      .from('bookings')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      console.error('Backoffice update booking status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update booking status'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Backoffice update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status'
    });
  }
});

/**
 * GET /api/backoffice/analytics/revenue
 * Get revenue analytics (admin sees all, operators see their own)
 */
router.get('/analytics/revenue', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const isAdmin = req.user.role === 'admin';
    const { from_date, to_date } = req.query;

    // Get all confirmed/completed bookings with experience and operator info
    let query = db
      .from('bookings')
      .select(`
        id,
        total_amount,
        currency,
        booking_date,
        status,
        payment_status,
        created_at,
        experience_id,
        experiences(id, title, operator_id, operators(id, company_name, commission))
      `)
      .in('status', ['confirmed', 'completed'])
      .eq('payment_status', 'paid');

    if (from_date) {
      query = query.gte('booking_date', from_date);
    }
    if (to_date) {
      query = query.lte('booking_date', to_date);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Backoffice revenue analytics error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch revenue data'
      });
    }

    let filteredBookings = bookings || [];

    // Filter by operator if not admin
    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      if (operator) {
        filteredBookings = filteredBookings.filter(
          (b) => b.experiences?.operator_id === operator.id
        );
      } else {
        filteredBookings = [];
      }
    }

    // Calculate totals
    const totalRevenue = filteredBookings.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);
    const bookingCount = filteredBookings.length;

    // Revenue by operator (admin only)
    const revenueByOperator = {};
    const revenueByExperience = {};

    filteredBookings.forEach((b) => {
      const operatorName = b.experiences?.operators?.company_name || 'Unknown';
      const operatorId = b.experiences?.operator_id;
      const commission = b.experiences?.operators?.commission || 0;
      const amount = parseFloat(b.total_amount) || 0;
      const operatorShare = amount * (commission / 100);
      const platformShare = amount - operatorShare;

      if (!revenueByOperator[operatorId]) {
        revenueByOperator[operatorId] = {
          id: operatorId,
          name: operatorName,
          commission,
          totalRevenue: 0,
          operatorShare: 0,
          platformShare: 0,
          bookingCount: 0
        };
      }
      revenueByOperator[operatorId].totalRevenue += amount;
      revenueByOperator[operatorId].operatorShare += operatorShare;
      revenueByOperator[operatorId].platformShare += platformShare;
      revenueByOperator[operatorId].bookingCount += 1;

      // Revenue by experience
      const expId = b.experience_id;
      const expTitle = b.experiences?.title || 'Unknown';
      if (!revenueByExperience[expId]) {
        revenueByExperience[expId] = {
          id: expId,
          title: expTitle,
          totalRevenue: 0,
          bookingCount: 0
        };
      }
      revenueByExperience[expId].totalRevenue += amount;
      revenueByExperience[expId].bookingCount += 1;
    });

    // Calculate today/week/month revenue
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const todayRevenue = filteredBookings
      .filter((b) => b.booking_date === todayStr)
      .reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);

    const weekRevenue = filteredBookings
      .filter((b) => b.booking_date >= weekAgo)
      .reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);

    const monthRevenue = filteredBookings
      .filter((b) => b.booking_date >= monthAgo)
      .reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);

    res.json({
      success: true,
      data: {
        totalRevenue,
        todayRevenue,
        weekRevenue,
        monthRevenue,
        bookingCount,
        currency: 'EUR',
        revenueByOperator: Object.values(revenueByOperator).sort((a, b) => b.totalRevenue - a.totalRevenue),
        revenueByExperience: Object.values(revenueByExperience).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Backoffice revenue analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue analytics'
    });
  }
});

/**
 * GET /api/backoffice/analytics/revenue-chart
 * Get revenue time series data for charts (day, week, month, year)
 */
router.get('/analytics/revenue-chart', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const isAdmin = req.user.role === 'admin';
    const { period = 'month' } = req.query; // day, week, month, year

    // Calculate date range based on period
    const now = new Date();
    let fromDate;
    let groupBy;
    let dateFormat;

    switch (period) {
      case 'day':
        // Last 24 hours, group by hour
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        groupBy = 'hour';
        break;
      case 'week':
        // Last 7 days, group by day
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        break;
      case 'month':
        // Last 30 days, group by day
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        break;
      case 'year':
        // Last 12 months, group by month
        fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        groupBy = 'month';
        break;
      default:
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
    }

    const fromDateStr = fromDate.toISOString().split('T')[0];

    // Get all confirmed/completed bookings
    let query = db
      .from('bookings')
      .select(`
        id,
        total_amount,
        booking_date,
        created_at,
        status,
        payment_status,
        experience_id,
        experiences(operator_id)
      `)
      .in('status', ['confirmed', 'completed'])
      .eq('payment_status', 'paid')
      .gte('booking_date', fromDateStr);

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Revenue chart data error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch revenue chart data'
      });
    }

    let filteredBookings = bookings || [];

    // Filter by operator if not admin
    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      if (operator) {
        filteredBookings = filteredBookings.filter(
          (b) => b.experiences?.operator_id === operator.id
        );
      } else {
        filteredBookings = [];
      }
    }

    // Group bookings by time period
    const groupedData = {};

    filteredBookings.forEach((b) => {
      const bookingDate = new Date(b.booking_date);
      let key;

      if (groupBy === 'hour') {
        const createdAt = new Date(b.created_at);
        key = createdAt.toISOString().slice(0, 13) + ':00'; // YYYY-MM-DDTHH:00
      } else if (groupBy === 'day') {
        key = bookingDate.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (groupBy === 'month') {
        key = bookingDate.toISOString().slice(0, 7); // YYYY-MM
      }

      if (!groupedData[key]) {
        groupedData[key] = { date: key, revenue: 0, bookings: 0 };
      }
      groupedData[key].revenue += parseFloat(b.total_amount) || 0;
      groupedData[key].bookings += 1;
    });

    // Fill in missing dates with zero values
    const chartData = [];
    const currentDate = new Date(fromDate);

    while (currentDate <= now) {
      let key;
      if (groupBy === 'hour') {
        key = currentDate.toISOString().slice(0, 13) + ':00';
        currentDate.setHours(currentDate.getHours() + 1);
      } else if (groupBy === 'day') {
        key = currentDate.toISOString().split('T')[0];
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (groupBy === 'month') {
        key = currentDate.toISOString().slice(0, 7);
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      chartData.push(groupedData[key] || { date: key, revenue: 0, bookings: 0 });
    }

    // Calculate total for the period
    const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
    const totalBookings = chartData.reduce((sum, d) => sum + d.bookings, 0);

    res.json({
      success: true,
      data: {
        period,
        groupBy,
        chartData,
        totalRevenue,
        totalBookings,
        currency: 'EUR'
      }
    });
  } catch (error) {
    console.error('Revenue chart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue chart data'
    });
  }
});

/**
 * GET /api/backoffice/analytics/bookings-summary
 * Get booking stats summary
 */
router.get('/analytics/bookings-summary', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const isAdmin = req.user.role === 'admin';

    const { data: bookings, error } = await db
      .from('bookings')
      .select('id, status, payment_status, booking_date, experiences(operator_id)');

    if (error) {
      console.error('Backoffice bookings summary error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch bookings summary'
      });
    }

    let filteredBookings = bookings || [];

    // Filter by operator if not admin
    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      if (operator) {
        filteredBookings = filteredBookings.filter(
          (b) => b.experiences?.operator_id === operator.id
        );
      } else {
        filteredBookings = [];
      }
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const pending = filteredBookings.filter((b) => b.status === 'pending').length;
    const confirmed = filteredBookings.filter((b) => b.status === 'confirmed').length;
    const completed = filteredBookings.filter((b) => b.status === 'completed').length;
    const cancelled = filteredBookings.filter((b) => b.status === 'cancelled').length;
    const todayBookings = filteredBookings.filter((b) => b.booking_date === todayStr).length;
    const upcomingWeek = filteredBookings.filter(
      (b) => b.booking_date >= todayStr && b.booking_date <= weekFromNow && b.status !== 'cancelled'
    ).length;

    res.json({
      success: true,
      data: {
        total: filteredBookings.length,
        pending,
        confirmed,
        completed,
        cancelled,
        todayBookings,
        upcomingWeek
      }
    });
  } catch (error) {
    console.error('Backoffice bookings summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings summary'
    });
  }
});

// ============================================
// REVIEWS MANAGEMENT
// ============================================

/**
 * GET /api/backoffice/reviews
 * Get all reviews (admin sees all, operators see their experiences only)
 */
router.get('/reviews', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const isAdmin = req.user.role === 'admin';
    const { experience_id, rating, has_response, flagged } = req.query;

    let query = db
      .from('reviews')
      .select(`
        *,
        experiences(id, title, operator_id, operators(id, company_name)),
        users(id, name, email)
      `)
      .order('created_at', { ascending: false });

    // Filter by experience
    if (experience_id) {
      query = query.eq('experience_id', experience_id);
    }

    // Filter by rating
    if (rating) {
      query = query.eq('rating', parseInt(rating));
    }

    // Filter by has response
    if (has_response === 'true') {
      query = query.not('operator_response', 'is', null);
    } else if (has_response === 'false') {
      query = query.is('operator_response', null);
    }

    // Filter by flagged
    if (flagged === 'true') {
      query = query.eq('flagged', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Backoffice get reviews error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch reviews'
      });
    }

    // Filter by operator if not admin
    let filteredData = data || [];
    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      if (operator) {
        filteredData = filteredData.filter(
          (r) => r.experiences?.operator_id === operator.id
        );
      } else {
        filteredData = [];
      }
    }

    // Calculate stats
    const stats = {
      total: filteredData.length,
      averageRating: filteredData.length > 0
        ? (filteredData.reduce((sum, r) => sum + r.rating, 0) / filteredData.length).toFixed(1)
        : 0,
      withResponse: filteredData.filter(r => r.operator_response).length,
      withoutResponse: filteredData.filter(r => !r.operator_response).length,
      flagged: filteredData.filter(r => r.flagged).length,
      byRating: {
        5: filteredData.filter(r => r.rating === 5).length,
        4: filteredData.filter(r => r.rating === 4).length,
        3: filteredData.filter(r => r.rating === 3).length,
        2: filteredData.filter(r => r.rating === 2).length,
        1: filteredData.filter(r => r.rating === 1).length
      }
    };

    res.json({
      success: true,
      data: filteredData,
      stats
    });
  } catch (error) {
    console.error('Backoffice get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    });
  }
});

/**
 * PUT /api/backoffice/reviews/:id/respond
 * Add or update operator response to a review
 */
router.put('/reviews/:id/respond', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const reviewId = parseNumber(req.params.id);
    const { response } = req.body;
    const isAdmin = req.user.role === 'admin';

    if (!reviewId) {
      return res.status(400).json({
        success: false,
        message: 'Valid review ID required'
      });
    }

    // Get review with experience info
    const { data: review, error: fetchError } = await db
      .from('reviews')
      .select('*, experiences(operator_id)')
      .eq('id', reviewId)
      .single();

    if (fetchError || !review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check permission
    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      if (!operator || review.experiences?.operator_id !== operator.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to respond to this review'
        });
      }
    }

    // Update review with response
    const { data, error } = await db
      .from('reviews')
      .update({
        operator_response: response || null,
        response_date: response ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .select()
      .single();

    if (error) {
      console.error('Backoffice respond to review error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save response'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Backoffice respond to review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save response'
    });
  }
});

/**
 * PUT /api/backoffice/reviews/:id/flag
 * Flag or unflag a review as inappropriate
 */
router.put('/reviews/:id/flag', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const reviewId = parseNumber(req.params.id);
    const { flagged, flag_reason } = req.body;
    const isAdmin = req.user.role === 'admin';

    if (!reviewId) {
      return res.status(400).json({
        success: false,
        message: 'Valid review ID required'
      });
    }

    // Get review with experience info
    const { data: review, error: fetchError } = await db
      .from('reviews')
      .select('*, experiences(operator_id)')
      .eq('id', reviewId)
      .single();

    if (fetchError || !review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check permission
    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      if (!operator || review.experiences?.operator_id !== operator.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to flag this review'
        });
      }
    }

    // Update review flag status
    const { data, error } = await db
      .from('reviews')
      .update({
        flagged: flagged === true,
        flag_reason: flagged ? (flag_reason || null) : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .select()
      .single();

    if (error) {
      console.error('Backoffice flag review error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update flag status'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Backoffice flag review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update flag status'
    });
  }
});

/**
 * DELETE /api/backoffice/reviews/:id
 * Delete a review (admin only or hide for operators)
 */
router.delete('/reviews/:id', authenticateSupabase, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const db = getDB();
    const reviewId = parseNumber(req.params.id);

    if (!reviewId) {
      return res.status(400).json({
        success: false,
        message: 'Valid review ID required'
      });
    }

    const { error } = await db
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) {
      console.error('Backoffice delete review error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete review'
      });
    }

    res.json({
      success: true,
      data: { id: reviewId }
    });
  } catch (error) {
    console.error('Backoffice delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review'
    });
  }
});

/**
 * GET /api/backoffice/reviews/stats-by-experience
 * Get average ratings per experience
 */
router.get('/reviews/stats-by-experience', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const isAdmin = req.user.role === 'admin';

    const { data: reviews, error } = await db
      .from('reviews')
      .select('experience_id, rating, experiences(id, title, operator_id, operators(id, company_name))');

    if (error) {
      console.error('Backoffice reviews stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch reviews stats'
      });
    }

    // Filter by operator if not admin
    let filteredReviews = reviews || [];
    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      if (operator) {
        filteredReviews = filteredReviews.filter(
          (r) => r.experiences?.operator_id === operator.id
        );
      } else {
        filteredReviews = [];
      }
    }

    // Group by experience
    const statsByExperience = {};
    filteredReviews.forEach((r) => {
      const expId = r.experience_id;
      if (!statsByExperience[expId]) {
        statsByExperience[expId] = {
          experience_id: expId,
          title: r.experiences?.title || 'Unknown',
          operator_name: r.experiences?.operators?.company_name || 'Unknown',
          total_reviews: 0,
          total_rating: 0,
          average_rating: 0
        };
      }
      statsByExperience[expId].total_reviews += 1;
      statsByExperience[expId].total_rating += r.rating;
    });

    // Calculate averages
    Object.values(statsByExperience).forEach((stat) => {
      stat.average_rating = stat.total_reviews > 0
        ? parseFloat((stat.total_rating / stat.total_reviews).toFixed(1))
        : 0;
      delete stat.total_rating;
    });

    res.json({
      success: true,
      data: Object.values(statsByExperience).sort((a, b) => b.average_rating - a.average_rating)
    });
  } catch (error) {
    console.error('Backoffice reviews stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews stats'
    });
  }
});

// ============================================
// IMAGE UPLOAD
// ============================================

/**
 * POST /api/backoffice/upload-image
 * Upload an image to Supabase Storage and return the public URL
 */
router.post('/upload-image', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const { base64, filename, contentType, folder = 'experiences' } = req.body;

    if (!base64) {
      return res.status(400).json({
        success: false,
        message: 'No image data provided'
      });
    }

    // Decode base64 to buffer
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = contentType?.split('/')[1] || 'jpg';
    const safeFilename = filename?.replace(/[^a-zA-Z0-9.-]/g, '_') || 'image';
    const uniqueFilename = `${folder}/${timestamp}-${randomStr}-${safeFilename}.${extension}`;

    // Upload to Supabase Storage
    const { data, error } = await db.storage
      .from('images')
      .upload(uniqueFilename, buffer, {
        contentType: contentType || 'image/jpeg',
        upsert: false
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      
      // If bucket doesn't exist, return helpful message
      if (error.message?.includes('Bucket not found')) {
        return res.status(400).json({
          success: false,
          message: 'Storage bucket "images" not found. Please create it in Supabase Dashboard > Storage.'
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image: ' + error.message
      });
    }

    // Get public URL
    const { data: urlData } = db.storage
      .from('images')
      .getPublicUrl(uniqueFilename);

    res.json({
      success: true,
      data: {
        url: urlData.publicUrl,
        path: uniqueFilename,
        filename: safeFilename
      }
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image'
    });
  }
});

/**
 * DELETE /api/backoffice/delete-image
 * Delete an image from Supabase Storage
 */
router.delete('/delete-image', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const { path } = req.body;

    if (!path) {
      return res.status(400).json({
        success: false,
        message: 'No image path provided'
      });
    }

    const { error } = await db.storage
      .from('images')
      .remove([path]);

    if (error) {
      console.error('Supabase storage delete error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete image'
      });
    }

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Image delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image'
    });
  }
});

// ============================================
// ENHANCED ANALYTICS ENDPOINTS
// ============================================

/**
 * GET /api/backoffice/analytics/conversions
 * Get conversion rate tracking (views → bookings)
 */
router.get('/analytics/conversions', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const isAdmin = req.user.role === 'admin';
    const { from_date, to_date } = req.query;

    // Get experiences with their view counts and booking counts
    let experienceQuery = db
      .from('experiences')
      .select(`
        id, title, location, view_count,
        operators(id, company_name)
      `);

    const { data: experiences, error: expError } = await experienceQuery;
    if (expError) throw expError;

    // Get bookings for these experiences
    let bookingQuery = db
      .from('bookings')
      .select('experience_id, created_at')
      .in('status', ['confirmed', 'completed']);

    if (from_date) {
      bookingQuery = bookingQuery.gte('created_at', from_date);
    }
    if (to_date) {
      bookingQuery = bookingQuery.lte('created_at', to_date + 'T23:59:59');
    }

    const { data: bookings, error: bookError } = await bookingQuery;
    if (bookError) throw bookError;

    // Filter by operator if not admin
    let filteredExperiences = experiences || [];
    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      if (operator) {
        filteredExperiences = filteredExperiences.filter(e => e.operators?.id === operator.id);
      } else {
        filteredExperiences = [];
      }
    }

    // Calculate conversion rates
    const conversions = filteredExperiences.map(exp => {
      const expBookings = (bookings || []).filter(b => b.experience_id === exp.id);
      const views = exp.view_count || 0;
      const bookingCount = expBookings.length;
      const conversionRate = views > 0 ? ((bookingCount / views) * 100).toFixed(2) : 0;

      return {
        id: exp.id,
        title: exp.title,
        location: exp.location,
        views,
        bookings: bookingCount,
        conversionRate: parseFloat(conversionRate),
        operator: exp.operators?.company_name || 'Unknown'
      };
    });

    // Sort by conversion rate descending
    conversions.sort((a, b) => b.conversionRate - a.conversionRate);

    // Calculate totals
    const totalViews = conversions.reduce((sum, c) => sum + c.views, 0);
    const totalBookings = conversions.reduce((sum, c) => sum + c.bookings, 0);
    const overallConversionRate = totalViews > 0 ? ((totalBookings / totalViews) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        experiences: conversions,
        summary: {
          totalViews,
          totalBookings,
          overallConversionRate: parseFloat(overallConversionRate)
        }
      }
    });
  } catch (error) {
    console.error('Analytics conversions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversion analytics' });
  }
});

/**
 * GET /api/backoffice/analytics/demographics
 * Get customer demographics breakdown
 */
router.get('/analytics/demographics', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const isAdmin = req.user.role === 'admin';

    // Get bookings with user info
    let query = db
      .from('bookings')
      .select(`
        id, customer_name, customer_email, participants, booking_date, total_amount, currency,
        experiences(id, title, operator_id)
      `)
      .in('status', ['confirmed', 'completed']);

    const { data: bookings, error } = await query;
    if (error) throw error;

    // Filter by operator if not admin
    let filteredBookings = bookings || [];
    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      if (operator) {
        filteredBookings = filteredBookings.filter(b => b.experiences?.operator_id === operator.id);
      } else {
        filteredBookings = [];
      }
    }

    // Analyze bookings
    const uniqueCustomers = new Set(filteredBookings.map(b => b.customer_email)).size;
    const totalParticipants = filteredBookings.reduce((sum, b) => sum + (b.participants || 1), 0);
    const avgGroupSize = filteredBookings.length > 0 
      ? (totalParticipants / filteredBookings.length).toFixed(1) 
      : 0;

    // Repeat customers
    const customerCounts = {};
    filteredBookings.forEach(b => {
      customerCounts[b.customer_email] = (customerCounts[b.customer_email] || 0) + 1;
    });
    const repeatCustomers = Object.values(customerCounts).filter(c => c > 1).length;
    const repeatRate = uniqueCustomers > 0 ? ((repeatCustomers / uniqueCustomers) * 100).toFixed(1) : 0;

    // Booking value distribution
    const valueRanges = {
      'Under €50': 0,
      '€50-100': 0,
      '€100-200': 0,
      '€200-500': 0,
      'Over €500': 0
    };
    filteredBookings.forEach(b => {
      const amount = b.total_amount || 0;
      if (amount < 50) valueRanges['Under €50']++;
      else if (amount < 100) valueRanges['€50-100']++;
      else if (amount < 200) valueRanges['€100-200']++;
      else if (amount < 500) valueRanges['€200-500']++;
      else valueRanges['Over €500']++;
    });

    // Group size distribution
    const groupSizes = {
      'Solo (1)': 0,
      'Couple (2)': 0,
      'Small Group (3-5)': 0,
      'Medium Group (6-10)': 0,
      'Large Group (11+)': 0
    };
    filteredBookings.forEach(b => {
      const size = b.participants || 1;
      if (size === 1) groupSizes['Solo (1)']++;
      else if (size === 2) groupSizes['Couple (2)']++;
      else if (size <= 5) groupSizes['Small Group (3-5)']++;
      else if (size <= 10) groupSizes['Medium Group (6-10)']++;
      else groupSizes['Large Group (11+)']++;
    });

    // Top customers
    const topCustomers = Object.entries(customerCounts)
      .map(([email, count]) => {
        const customerBookings = filteredBookings.filter(b => b.customer_email === email);
        const totalSpent = customerBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
        const name = customerBookings[0]?.customer_name || email;
        return { email, name, bookings: count, totalSpent };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        summary: {
          uniqueCustomers,
          totalBookings: filteredBookings.length,
          totalParticipants,
          avgGroupSize: parseFloat(avgGroupSize),
          repeatCustomers,
          repeatRate: parseFloat(repeatRate)
        },
        valueDistribution: valueRanges,
        groupSizeDistribution: groupSizes,
        topCustomers
      }
    });
  } catch (error) {
    console.error('Analytics demographics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch demographics' });
  }
});

/**
 * GET /api/backoffice/analytics/heatmap
 * Get peak booking times/days heatmap data
 */
router.get('/analytics/heatmap', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const isAdmin = req.user.role === 'admin';

    // Get bookings with dates
    let query = db
      .from('bookings')
      .select(`
        id, booking_date, booking_time, created_at,
        experiences(id, operator_id)
      `)
      .in('status', ['confirmed', 'completed']);

    const { data: bookings, error } = await query;
    if (error) throw error;

    // Filter by operator if not admin
    let filteredBookings = bookings || [];
    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      if (operator) {
        filteredBookings = filteredBookings.filter(b => b.experiences?.operator_id === operator.id);
      } else {
        filteredBookings = [];
      }
    }

    // Day of week distribution (0=Sunday, 6=Saturday)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayDistribution = dayNames.map(name => ({ name, count: 0 }));
    
    // Hour distribution (0-23)
    const hourDistribution = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i.toString().padStart(2, '0')}:00`,
      count: 0
    }));

    // Month distribution
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthDistribution = monthNames.map(name => ({ name, count: 0 }));

    // Heatmap: day x hour (7 days x 24 hours)
    const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));

    filteredBookings.forEach(b => {
      const bookingDate = new Date(b.booking_date);
      const dayOfWeek = bookingDate.getDay();
      const month = bookingDate.getMonth();
      
      dayDistribution[dayOfWeek].count++;
      monthDistribution[month].count++;

      // Parse booking time if available
      if (b.booking_time) {
        const hourMatch = b.booking_time.match(/^(\d{1,2})/);
        if (hourMatch) {
          const hour = parseInt(hourMatch[1], 10);
          if (hour >= 0 && hour < 24) {
            hourDistribution[hour].count++;
            heatmap[dayOfWeek][hour]++;
          }
        }
      }
    });

    // Find peak times
    let peakDay = dayDistribution.reduce((max, d) => d.count > max.count ? d : max, { count: 0 });
    let peakHour = hourDistribution.reduce((max, h) => h.count > max.count ? h : max, { count: 0 });
    let peakMonth = monthDistribution.reduce((max, m) => m.count > max.count ? m : max, { count: 0 });

    res.json({
      success: true,
      data: {
        dayDistribution,
        hourDistribution,
        monthDistribution,
        heatmap,
        peaks: {
          day: peakDay.name,
          hour: peakHour.label,
          month: peakMonth.name
        },
        totalBookings: filteredBookings.length
      }
    });
  } catch (error) {
    console.error('Analytics heatmap error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch heatmap data' });
  }
});

/**
 * GET /api/backoffice/analytics/forecast
 * Get revenue forecasting data
 */
router.get('/analytics/forecast', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const isAdmin = req.user.role === 'admin';

    // Get historical bookings for the last 12 months
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    let query = db
      .from('bookings')
      .select(`
        id, total_amount, currency, booking_date, created_at,
        experiences(id, operator_id)
      `)
      .in('status', ['confirmed', 'completed'])
      .gte('booking_date', oneYearAgo.toISOString().split('T')[0]);

    const { data: bookings, error } = await query;
    if (error) throw error;

    // Filter by operator if not admin
    let filteredBookings = bookings || [];
    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      if (operator) {
        filteredBookings = filteredBookings.filter(b => b.experiences?.operator_id === operator.id);
      } else {
        filteredBookings = [];
      }
    }

    // Group by month
    const monthlyData = {};
    filteredBookings.forEach(b => {
      const date = new Date(b.booking_date);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, bookings: 0 };
      }
      monthlyData[monthKey].revenue += b.total_amount || 0;
      monthlyData[monthKey].bookings++;
    });

    // Sort months and create historical data
    const sortedMonths = Object.keys(monthlyData).sort();
    const historical = sortedMonths.map(month => ({
      month,
      revenue: monthlyData[month].revenue,
      bookings: monthlyData[month].bookings
    }));

    // Simple linear regression for forecasting
    const revenues = historical.map(h => h.revenue);
    const n = revenues.length;
    
    let forecast = [];
    if (n >= 3) {
      // Calculate trend
      const xMean = (n - 1) / 2;
      const yMean = revenues.reduce((a, b) => a + b, 0) / n;
      
      let numerator = 0;
      let denominator = 0;
      revenues.forEach((y, x) => {
        numerator += (x - xMean) * (y - yMean);
        denominator += (x - xMean) ** 2;
      });
      
      const slope = denominator !== 0 ? numerator / denominator : 0;
      const intercept = yMean - slope * xMean;
      
      // Calculate growth rate
      const avgMonthlyRevenue = yMean;
      const monthlyGrowthRate = avgMonthlyRevenue > 0 ? (slope / avgMonthlyRevenue) : 0;

      // Forecast next 3 months
      const today = new Date();
      for (let i = 1; i <= 3; i++) {
        const futureDate = new Date(today);
        futureDate.setMonth(futureDate.getMonth() + i);
        const monthKey = `${futureDate.getFullYear()}-${(futureDate.getMonth() + 1).toString().padStart(2, '0')}`;
        const predictedRevenue = Math.max(0, intercept + slope * (n + i - 1));
        forecast.push({
          month: monthKey,
          predictedRevenue: Math.round(predictedRevenue),
          confidence: Math.max(50, 90 - (i * 10)) // Decrease confidence for further predictions
        });
      }
    }

    // Calculate summary stats
    const totalRevenue = revenues.reduce((a, b) => a + b, 0);
    const avgMonthlyRevenue = n > 0 ? totalRevenue / n : 0;
    const lastMonthRevenue = revenues[n - 1] || 0;
    const prevMonthRevenue = revenues[n - 2] || 0;
    const monthOverMonthGrowth = prevMonthRevenue > 0 
      ? ((lastMonthRevenue - prevMonthRevenue) / prevMonthRevenue * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        historical,
        forecast,
        summary: {
          totalRevenue: Math.round(totalRevenue),
          avgMonthlyRevenue: Math.round(avgMonthlyRevenue),
          lastMonthRevenue: Math.round(lastMonthRevenue),
          monthOverMonthGrowth: parseFloat(monthOverMonthGrowth),
          currency: 'EUR'
        }
      }
    });
  } catch (error) {
    console.error('Analytics forecast error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch forecast data' });
  }
});

/**
 * GET /api/backoffice/analytics/compare
 * Compare performance across experiences
 */
router.get('/analytics/compare', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const isAdmin = req.user.role === 'admin';
    const { from_date, to_date } = req.query;

    // Get all experiences
    let expQuery = db
      .from('experiences')
      .select(`
        id, title, location, price, view_count, is_active,
        operators(id, company_name)
      `);

    const { data: experiences, error: expError } = await expQuery;
    if (expError) throw expError;

    // Get bookings
    let bookingQuery = db
      .from('bookings')
      .select('experience_id, total_amount, participants, status, booking_date')
      .in('status', ['confirmed', 'completed']);

    if (from_date) {
      bookingQuery = bookingQuery.gte('booking_date', from_date);
    }
    if (to_date) {
      bookingQuery = bookingQuery.lte('booking_date', to_date);
    }

    const { data: bookings, error: bookError } = await bookingQuery;
    if (bookError) throw bookError;

    // Filter by operator if not admin
    let filteredExperiences = experiences || [];
    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      if (operator) {
        filteredExperiences = filteredExperiences.filter(e => e.operators?.id === operator.id);
      } else {
        filteredExperiences = [];
      }
    }

    // Calculate metrics for each experience
    const comparison = filteredExperiences.map(exp => {
      const expBookings = (bookings || []).filter(b => b.experience_id === exp.id);
      const revenue = expBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const participants = expBookings.reduce((sum, b) => sum + (b.participants || 1), 0);
      const views = exp.view_count || 0;
      const conversionRate = views > 0 ? ((expBookings.length / views) * 100).toFixed(2) : 0;
      const avgBookingValue = expBookings.length > 0 ? revenue / expBookings.length : 0;

      return {
        id: exp.id,
        title: exp.title,
        location: exp.location,
        price: exp.price,
        isActive: exp.is_active,
        operator: exp.operators?.company_name || 'Unknown',
        metrics: {
          views,
          bookings: expBookings.length,
          revenue: Math.round(revenue),
          participants,
          conversionRate: parseFloat(conversionRate),
          avgBookingValue: Math.round(avgBookingValue)
        }
      };
    });

    // Sort by revenue descending
    comparison.sort((a, b) => b.metrics.revenue - a.metrics.revenue);

    // Calculate averages for benchmarking
    const totalExperiences = comparison.length;
    const avgViews = totalExperiences > 0 
      ? comparison.reduce((sum, e) => sum + e.metrics.views, 0) / totalExperiences 
      : 0;
    const avgBookings = totalExperiences > 0 
      ? comparison.reduce((sum, e) => sum + e.metrics.bookings, 0) / totalExperiences 
      : 0;
    const avgRevenue = totalExperiences > 0 
      ? comparison.reduce((sum, e) => sum + e.metrics.revenue, 0) / totalExperiences 
      : 0;
    const avgConversion = totalExperiences > 0 
      ? comparison.reduce((sum, e) => sum + e.metrics.conversionRate, 0) / totalExperiences 
      : 0;

    res.json({
      success: true,
      data: {
        experiences: comparison,
        benchmarks: {
          avgViews: Math.round(avgViews),
          avgBookings: Math.round(avgBookings),
          avgRevenue: Math.round(avgRevenue),
          avgConversionRate: parseFloat(avgConversion.toFixed(2))
        },
        topPerformers: {
          byRevenue: comparison[0] || null,
          byBookings: [...comparison].sort((a, b) => b.metrics.bookings - a.metrics.bookings)[0] || null,
          byConversion: [...comparison].sort((a, b) => b.metrics.conversionRate - a.metrics.conversionRate)[0] || null
        }
      }
    });
  } catch (error) {
    console.error('Analytics compare error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch comparison data' });
  }
});

/**
 * GET /api/backoffice/analytics/export
 * Export analytics data as CSV
 */
router.get('/analytics/export', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const isAdmin = req.user.role === 'admin';
    const { type, from_date, to_date } = req.query;

    if (!type) {
      return res.status(400).json({ success: false, message: 'Export type required' });
    }

    let csvContent = '';
    let filename = '';

    if (type === 'bookings') {
      // Export bookings
      let query = db
        .from('bookings')
        .select(`
          id, booking_reference, booking_date, booking_time, 
          customer_name, customer_email, customer_phone,
          participants, total_amount, currency, status, payment_status,
          experiences(id, title, operator_id, operators(company_name))
        `)
        .order('booking_date', { ascending: false });

      if (from_date) query = query.gte('booking_date', from_date);
      if (to_date) query = query.lte('booking_date', to_date);

      const { data: bookings, error } = await query;
      if (error) throw error;

      // Filter by operator
      let filteredData = bookings || [];
      if (!isAdmin) {
        const operator = await getOperatorForUser(db, req.user.id);
        if (operator) {
          filteredData = filteredData.filter(b => b.experiences?.operator_id === operator.id);
        } else {
          filteredData = [];
        }
      }

      // Build CSV
      csvContent = 'Reference,Date,Time,Customer,Email,Phone,Experience,Participants,Amount,Currency,Status,Payment\n';
      filteredData.forEach(b => {
        csvContent += `${b.booking_reference},${b.booking_date},${b.booking_time},"${b.customer_name}",${b.customer_email},${b.customer_phone || ''},"${b.experiences?.title || ''}",${b.participants},${b.total_amount},${b.currency},${b.status},${b.payment_status}\n`;
      });

      filename = `bookings_export_${new Date().toISOString().split('T')[0]}.csv`;

    } else if (type === 'revenue') {
      // Export revenue data
      let query = db
        .from('bookings')
        .select(`
          booking_date, total_amount, currency,
          experiences(title, operators(company_name))
        `)
        .in('status', ['confirmed', 'completed'])
        .order('booking_date', { ascending: false });

      if (from_date) query = query.gte('booking_date', from_date);
      if (to_date) query = query.lte('booking_date', to_date);

      const { data: bookings, error } = await query;
      if (error) throw error;

      let filteredData = bookings || [];
      if (!isAdmin) {
        const operator = await getOperatorForUser(db, req.user.id);
        if (operator) {
          filteredData = filteredData.filter(b => b.experiences?.operators?.company_name);
        }
      }

      csvContent = 'Date,Experience,Operator,Amount,Currency\n';
      filteredData.forEach(b => {
        csvContent += `${b.booking_date},"${b.experiences?.title || ''}","${b.experiences?.operators?.company_name || ''}",${b.total_amount},${b.currency}\n`;
      });

      filename = `revenue_export_${new Date().toISOString().split('T')[0]}.csv`;

    } else if (type === 'experiences') {
      // Export experiences data
      let query = db
        .from('experiences')
        .select(`
          id, title, location, price, currency, duration, category,
          is_active, view_count, operators(company_name)
        `);

      const { data: experiences, error } = await query;
      if (error) throw error;

      let filteredData = experiences || [];
      if (!isAdmin) {
        const operator = await getOperatorForUser(db, req.user.id);
        if (operator) {
          filteredData = filteredData.filter(e => e.operators?.company_name);
        }
      }

      csvContent = 'ID,Title,Location,Price,Currency,Duration,Category,Active,Views,Operator\n';
      filteredData.forEach(e => {
        csvContent += `${e.id},"${e.title}","${e.location}",${e.price},${e.currency || 'EUR'},"${e.duration || ''}","${e.category || ''}",${e.is_active},${e.view_count || 0},"${e.operators?.company_name || ''}"\n`;
      });

      filename = `experiences_export_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid export type' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Analytics export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export data' });
  }
});

// ============================================
// CALENDAR & AVAILABILITY ENDPOINTS
// ============================================

/**
 * GET /api/backoffice/calendar
 * Get calendar data with bookings
 */
router.get('/calendar', authenticateSupabase, async (req, res) => {
  console.log('📅 CALENDAR ENDPOINT HIT');
  try {
    const db = getDB();
    const isAdmin = req.user.role === 'admin';
    const { from_date, to_date, experience_id } = req.query;
    console.log('📅 Calendar query params:', { from_date, to_date, experience_id, isAdmin, userId: req.user.id });

    // Default to current month if no dates provided
    const today = new Date();
    const defaultFrom = from_date || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const defaultTo = to_date || new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    console.log('📅 Date range:', defaultFrom, 'to', defaultTo);

    // Get bookings
    let bookingQuery = db
      .from('bookings')
      .select(`
        id, booking_reference, booking_date, booking_time, 
        customer_name, participants, total_amount, currency, status,
        experiences(id, title, operator_id, operators(id, company_name))
      `)
      .gte('booking_date', defaultFrom)
      .lte('booking_date', defaultTo)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });

    if (experience_id) {
      bookingQuery = bookingQuery.eq('experience_id', experience_id);
    }

    const { data: bookings, error: bookError } = await bookingQuery;
    if (bookError) throw bookError;

    // Get blocked dates (table may not exist yet)
    let blockedDates = [];
    try {
      const { data, error: blockedError } = await db
        .from('blocked_dates')
        .select('*')
        .gte('date', defaultFrom)
        .lte('date', defaultTo);
      
      if (!blockedError) {
        blockedDates = data || [];
      }
    } catch (e) {
      // Table doesn't exist yet, continue without blocked dates
      console.log('blocked_dates table not found, skipping');
    }

    // Filter by operator if not admin
    let filteredBookings = bookings || [];
    let filteredBlocked = blockedDates || [];

    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      console.log('📅 Calendar - User ID:', req.user.id, 'Operator:', operator?.id, operator?.company_name);
      console.log('📅 Total bookings before filter:', bookings?.length);
      if (operator) {
        filteredBookings = filteredBookings.filter(b => {
          const match = b.experiences?.operator_id === operator.id;
          if (!match && b.experiences) {
            console.log('📅 Booking operator mismatch:', b.booking_reference, 'exp_operator:', b.experiences.operator_id, 'user_operator:', operator.id);
          }
          return match;
        });
        filteredBlocked = filteredBlocked.filter(bd => bd.operator_id === operator.id);
      } else {
        console.log('📅 No operator found for user, returning empty');
        filteredBookings = [];
        filteredBlocked = [];
      }
      console.log('📅 Filtered bookings count:', filteredBookings.length);
    }

    // Group bookings by date
    const calendarData = {};
    filteredBookings.forEach(b => {
      if (!calendarData[b.booking_date]) {
        calendarData[b.booking_date] = {
          date: b.booking_date,
          bookings: [],
          isBlocked: false,
          totalRevenue: 0,
          totalParticipants: 0
        };
      }
      calendarData[b.booking_date].bookings.push({
        id: b.id,
        reference: b.booking_reference,
        time: b.booking_time,
        customer: b.customer_name,
        experience: b.experiences?.title || 'Unknown',
        participants: b.participants,
        amount: b.total_amount,
        currency: b.currency,
        status: b.status
      });
      calendarData[b.booking_date].totalRevenue += b.total_amount || 0;
      calendarData[b.booking_date].totalParticipants += b.participants || 0;
    });

    // Mark blocked dates
    filteredBlocked.forEach(bd => {
      if (!calendarData[bd.date]) {
        calendarData[bd.date] = {
          date: bd.date,
          bookings: [],
          isBlocked: true,
          blockedReason: bd.reason,
          totalRevenue: 0,
          totalParticipants: 0
        };
      } else {
        calendarData[bd.date].isBlocked = true;
        calendarData[bd.date].blockedReason = bd.reason;
      }
    });

    res.json({
      success: true,
      data: {
        fromDate: defaultFrom,
        toDate: defaultTo,
        days: Object.values(calendarData).sort((a, b) => a.date.localeCompare(b.date)),
        summary: {
          totalBookings: filteredBookings.length,
          totalRevenue: filteredBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
          blockedDays: filteredBlocked.length
        }
      }
    });
  } catch (error) {
    console.error('Calendar fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch calendar data' });
  }
});

/**
 * PUT /api/backoffice/bookings/:id/reschedule
 * Reschedule a booking to a new date/time
 */
router.put('/bookings/:id/reschedule', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const isAdmin = req.user.role === 'admin';
    const { id } = req.params;
    const { new_date, new_time } = req.body;

    if (!new_date) {
      return res.status(400).json({ success: false, message: 'New date is required' });
    }

    // Get the booking
    const { data: booking, error: fetchError } = await db
      .from('bookings')
      .select('*, experiences(operator_id)')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Check permissions
    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      if (!operator || booking.experiences?.operator_id !== operator.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
    }

    // Update the booking
    const updateData = {
      booking_date: new_date,
      updated_at: new Date().toISOString()
    };
    if (new_time) {
      updateData.booking_time = new_time;
    }

    const { data: updated, error: updateError } = await db
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      data: updated,
      message: 'Booking rescheduled successfully'
    });
  } catch (error) {
    console.error('Reschedule error:', error);
    res.status(500).json({ success: false, message: 'Failed to reschedule booking' });
  }
});

/**
 * GET /api/backoffice/blocked-dates
 * Get blocked dates for operator
 */
router.get('/blocked-dates', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const isAdmin = req.user.role === 'admin';
    const { from_date, to_date, experience_id } = req.query;

    let query = db.from('blocked_dates').select('*');

    if (from_date) query = query.gte('date', from_date);
    if (to_date) query = query.lte('date', to_date);
    if (experience_id) query = query.eq('experience_id', experience_id);

    const { data, error } = await query;
    if (error) throw error;

    let filteredData = data || [];
    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      if (operator) {
        filteredData = filteredData.filter(bd => bd.operator_id === operator.id);
      } else {
        filteredData = [];
      }
    }

    res.json({ success: true, data: filteredData });
  } catch (error) {
    console.error('Get blocked dates error:', error);
    // If table doesn't exist, return empty array instead of error
    if (error.message?.includes('relation') || error.code === '42P01') {
      return res.json({ success: true, data: [] });
    }
    res.status(500).json({ success: false, message: 'Failed to fetch blocked dates' });
  }
});

/**
 * POST /api/backoffice/blocked-dates
 * Block a date (holiday, maintenance, etc.)
 */
router.post('/blocked-dates', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const isAdmin = req.user.role === 'admin';
    const { date, reason, experience_id } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    let operatorId = null;
    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      if (!operator) {
        return res.status(403).json({ success: false, message: 'Operator not found' });
      }
      operatorId = operator.id;
    }

    const { data, error } = await db
      .from('blocked_dates')
      .insert({
        date,
        reason: reason || 'Blocked',
        operator_id: operatorId,
        experience_id: experience_id || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Block date error:', error);
    res.status(500).json({ success: false, message: 'Failed to block date' });
  }
});

/**
 * DELETE /api/backoffice/blocked-dates/:id
 * Unblock a date
 */
router.delete('/blocked-dates/:id', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const isAdmin = req.user.role === 'admin';
    const { id } = req.params;

    // Get the blocked date first
    const { data: blockedDate, error: fetchError } = await db
      .from('blocked_dates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !blockedDate) {
      return res.status(404).json({ success: false, message: 'Blocked date not found' });
    }

    // Check permissions
    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      if (!operator || blockedDate.operator_id !== operator.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
    }

    const { error } = await db
      .from('blocked_dates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Date unblocked successfully' });
  } catch (error) {
    console.error('Unblock date error:', error);
    res.status(500).json({ success: false, message: 'Failed to unblock date' });
  }
});

/**
 * GET /api/backoffice/availability
 * Get availability settings for experiences
 */
router.get('/availability', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const isAdmin = req.user.role === 'admin';
    const { experience_id } = req.query;

    let query = db.from('experience_availability').select(`
      *,
      experiences(id, title, operator_id)
    `);

    if (experience_id) {
      query = query.eq('experience_id', experience_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    let filteredData = data || [];
    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      if (operator) {
        filteredData = filteredData.filter(a => a.experiences?.operator_id === operator.id);
      } else {
        filteredData = [];
      }
    }

    res.json({ success: true, data: filteredData });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch availability' });
  }
});

/**
 * PUT /api/backoffice/availability/:experienceId
 * Update availability settings for an experience
 */
router.put('/availability/:experienceId', authenticateSupabase, async (req, res) => {
  try {
    const db = getDB();
    const isAdmin = req.user.role === 'admin';
    const { experienceId } = req.params;
    const { time_slots, days_of_week, max_per_slot } = req.body;

    // Verify experience ownership
    const { data: experience, error: expError } = await db
      .from('experiences')
      .select('id, operator_id')
      .eq('id', experienceId)
      .single();

    if (expError || !experience) {
      return res.status(404).json({ success: false, message: 'Experience not found' });
    }

    if (!isAdmin) {
      const operator = await getOperatorForUser(db, req.user.id);
      if (!operator || experience.operator_id !== operator.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
    }

    // Upsert availability
    const { data, error } = await db
      .from('experience_availability')
      .upsert({
        experience_id: experienceId,
        time_slots: time_slots || [],
        days_of_week: days_of_week || [1, 2, 3, 4, 5, 6, 0], // Default all days
        max_per_slot: max_per_slot || 10,
        updated_at: new Date().toISOString()
      }, { onConflict: 'experience_id' })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ success: false, message: 'Failed to update availability' });
  }
});

module.exports = router;
