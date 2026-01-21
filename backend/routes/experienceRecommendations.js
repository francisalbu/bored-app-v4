const express = require('express');
const router = express.Router();
const simpleVideoAnalyzer = require('../services/simpleVideoAnalyzer');
const viatorService = require('../services/viatorService');
const Experience = require('../models/Experience');

/**
 * POST /api/experience-recommendations
 * Analyze video and recommend experiences from database + Viator
 * 
 * Strategy:
 * 1. Analyze video to detect activity/location
 * 2. Search our DB first
 * 3. If we have results: add 2-3 from Viator for variety
 * 4. If we don't have results: use only Viator as fallback
 * 
 * Body: { instagramUrl: string }
 */
router.post('/', async (req, res) => {
  try {
    const { instagramUrl, userLocation } = req.body;
    
    if (!instagramUrl) {
      return res.status(400).json({
        success: false,
        message: 'Instagram URL is required'
      });
    }
    
    // User location (city name or coordinates)
    // Examples: "Porto", "Barcelona", "Lisbon"
    const userCity = userLocation?.city || userLocation || 'Lisbon';
    
    console.log('🎯 Starting experience recommendation flow...');
    console.log('📍 User location:', userCity);
    
    // 1. Analyze video (2-3 frames only)
    const analysis = await simpleVideoAnalyzer.analyzeVideo(instagramUrl);
    
    console.log('📊 Analysis result:', analysis);
    
    let experiences = [];
    let viatorExperiences = [];
    let message = '';
    const TARGET_COUNT = 5; // Always show 5 activities
    
    if (analysis.type === 'activity' && analysis.activity) {
      // Activity detected - find similar experiences in DB
      console.log(`🏄 Activity detected: ${analysis.activity}`);
      
      // Get up to 5 from our DB (filtered by user's city)
      experiences = await Experience.findSimilarActivities(
        analysis.activity,
        userCity,
        TARGET_COUNT
      );
      
      // Mark all DB experiences with source field
      experiences = experiences.map(exp => ({
        ...exp,
        source: 'database'
      }));
      
      // CRITICAL: Always fetch Viator for user's location
      // Use user's city (not video location) because we need local experiences
      const viatorPromise = viatorService.smartSearch(
        analysis.activity,
        userCity, // ← User's city, not video location!
        'EUR',
        TARGET_COUNT
      );
      
      viatorExperiences = await viatorPromise;
      
      if (experiences.length >= TARGET_COUNT) {
        // We have enough from our DB - use only ours
        console.log(`✅ Found ${experiences.length} in our DB (enough)`);
        experiences = experiences.slice(0, TARGET_COUNT);
        message = `We found ${TARGET_COUNT} ${analysis.activity} experiences near you!`;
        
      } else if (experiences.length > 0) {
        // We have some, but not enough - complete with Viator
        const needed = TARGET_COUNT - experiences.length;
        console.log(`✅ Found ${experiences.length} in our DB, adding ${needed} from Viator`);
        
        const viatorToAdd = viatorExperiences.slice(0, needed);
        experiences = [...experiences, ...viatorToAdd];
        
        message = `We found ${experiences.length} ${analysis.activity} experiences for you!`;
        
      } else {
        // No results in our DB - use Viator as fallback
        console.log(`🌐 No results in DB - using ${viatorExperiences.length} Viator experiences as fallback`);
        
        experiences = viatorExperiences.slice(0, TARGET_COUNT);
        message = experiences.length > 0
          ? `We found ${experiences.length} ${analysis.activity} experiences from our partners!`
          : `No ${analysis.activity} experiences found. Try a different activity!`;
      }
      
    } else if (analysis.type === 'landscape' && analysis.location) {
      // Landscape detected - suggest generic activities
      console.log(`🏔️ Landscape detected: ${analysis.location}`);
      
      // Get diverse activities from both sources (user's location!)
      const dbPromise = Experience.getAllExperiences(TARGET_COUNT, 0);
      const viatorPromise = viatorService.smartSearch(
        'activities', // Generic search
        userCity, // ← User's city for local activities
        'EUR',
        TARGET_COUNT
      );
      
      [experiences, viatorExperiences] = await Promise.all([dbPromise, viatorPromise]);
      
      // Mark all DB experiences with source field
      experiences = experiences.map(exp => ({
        ...exp,
        source: 'database'
      }));
      
      // Complete to 5 with Viator if needed
      if (experiences.length < TARGET_COUNT) {
        const needed = TARGET_COUNT - experiences.length;
        experiences = [...experiences, ...viatorExperiences.slice(0, needed)];
      } else {
        experiences = experiences.slice(0, TARGET_COUNT);
      }
      
      message = `${analysis.location} looks amazing! Here are some activities you can do:`;
    }
    
    // Ensure we always return exactly TARGET_COUNT (or less if unavailable)
    experiences = experiences.slice(0, TARGET_COUNT);
    
    res.json({
      success: true,
      data: {
        analysis: {
          type: analysis.type,
          activity: analysis.activity,
          location: analysis.location,
          confidence: analysis.confidence
        },
        experiences: experiences,
        message: message,
        sources: {
          database: experiences.filter(e => !e.source || e.source !== 'viator').length,
          viator: experiences.filter(e => e.source === 'viator').length
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error in experience recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing video',
      error: error.message
    });
  }
});

/**
 * POST /api/experience-recommendations/by-activity
 * Search experiences by activity and location WITHOUT re-analyzing video
 * 
 * Body: { activity: string, userLocation: string }
 */
router.post('/by-activity', async (req, res) => {
  try {
    const { activity, userLocation } = req.body;
    
    if (!activity) {
      return res.status(400).json({
        success: false,
        message: 'Activity is required'
      });
    }
    
    const userCity = userLocation || 'Lisbon';
    
    console.log('🔍 Searching experiences by activity...');
    console.log('   Activity:', activity);
    console.log('   Location:', userCity);
    
    const TARGET_COUNT = 5;
    let experiences = [];
    
    // Get from our DB
    experiences = await Experience.findSimilarActivities(
      activity,
      userCity,
      TARGET_COUNT
    );
    
    // Mark all DB experiences with source field
    experiences = experiences.map(exp => ({
      ...exp,
      source: 'database'
    }));
    
    // Get from Viator
    const viatorExperiences = await viatorService.smartSearch(
      activity,
      userCity,
      'EUR',
      TARGET_COUNT
    );
    
    // Combine: DB first, complete with Viator to reach 5 total
    if (experiences.length >= TARGET_COUNT) {
      experiences = experiences.slice(0, TARGET_COUNT);
    } else {
      const needed = TARGET_COUNT - experiences.length;
      const viatorToAdd = viatorExperiences.slice(0, needed);
      experiences = [...experiences, ...viatorToAdd];
    }
    
    console.log(`✅ Found ${experiences.length} experiences (${experiences.filter(e => e.source === 'database').length} DB + ${experiences.filter(e => e.source === 'viator').length} Viator)`);
    
    res.json({
      success: true,
      data: {
        experiences: experiences.slice(0, TARGET_COUNT),
        sources: {
          database: experiences.filter(e => e.source === 'database').length,
          viator: experiences.filter(e => e.source === 'viator').length
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error searching by activity:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching experiences',
      error: error.message
    });
  }
});

module.exports = router;
