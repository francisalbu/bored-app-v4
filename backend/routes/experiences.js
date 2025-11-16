/**
 * Experience Routes
 * 
 * Handles experience discovery, search, and detail views
 */

const express = require('express');
const router = express.Router();
const { query, param } = require('express-validator');
const Experience = require('../models/Experience');
const { optionalAuth } = require('../middleware/auth');

/**
 * GET /api/experiences
 * Get all experiences for the feed
 * Query params: limit, offset, category, search
 */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const category = req.query.category;
    const search = req.query.search;
    
    let experiences;
    
    if (search) {
      experiences = await Experience.searchExperiences(search, limit);
    } else if (category) {
      experiences = await Experience.getExperiencesByCategory(category, limit);
    } else {
      experiences = await Experience.getAllExperiences(limit, offset);
    }
    
    res.json({
      success: true,
      data: experiences,
      meta: {
        limit,
        offset,
        count: experiences.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/experiences/nearby
 * Get experiences near user's location
 * Query params: lat, lon, radius (optional, default 50km), limit
 */
router.get('/nearby', async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    const radius = parseFloat(req.query.radius) || 50;
    const limit = parseInt(req.query.limit) || 50;
    
    // Validate coordinates
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        success: false,
        message: 'Valid latitude and longitude are required'
      });
    }
    
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }
    
    const experiences = await Experience.getExperiencesByProximity(lat, lon, radius, limit);
    
    res.json({
      success: true,
      data: experiences,
      meta: {
        userLocation: { lat, lon },
        radius,
        count: experiences.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/experiences/trending
 * Get trending/popular experiences
 */
router.get('/trending', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const experiences = await Experience.getTrendingExperiences(limit);
    
    res.json({
      success: true,
      data: experiences
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/experiences/:id
 * Get single experience details
 * Includes all media URLs (video_url, images array from Google Cloud Storage)
 */
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const experience = await Experience.getExperienceById(id);
    
    if (!experience) {
      return res.status(404).json({
        success: false,
        message: 'Experience not found'
      });
    }
    
    // Increment view count
    await Experience.incrementViews(id);
    
    res.json({
      success: true,
      data: experience
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
