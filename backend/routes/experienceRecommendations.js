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
    const { instagramUrl } = req.body;
    
    if (!instagramUrl) {
      return res.status(400).json({
        success: false,
        message: 'Instagram URL is required'
      });
    }
    
    console.log('🎯 Starting experience recommendation flow...');
    
    // 1. Analyze video (2-3 frames only)
    const analysis = await simpleVideoAnalyzer.analyzeVideo(instagramUrl);
    
    console.log('📊 Analysis result:', analysis);
    
    let experiences = [];
    let viatorExperiences = [];
    let message = '';
    const defaultCity = 'Lisbon';
    
    if (analysis.type === 'activity' && analysis.activity) {
      // Activity detected - find similar experiences in DB
      console.log(`🏄 Activity detected: ${analysis.activity}`);
      
      experiences = await Experience.findSimilarActivities(
        analysis.activity,
        defaultCity,
        5 // Get more from our DB
      );
      
      // Always try to fetch Viator results in parallel
      const viatorPromise = viatorService.smartSearch(
        analysis.activity,
        analysis.location || defaultCity,
        'EUR',
        5
      );
      
      viatorExperiences = await viatorPromise;
      
      if (experiences.length > 0) {
        // We have our own experiences - add 2-3 from Viator for variety
        console.log(`✅ Found ${experiences.length} in our DB + ${viatorExperiences.length} from Viator`);
        
        const viatorToAdd = viatorExperiences.slice(0, 2);
        experiences = [...experiences, ...viatorToAdd];
        
        message = `We found ${experiences.length} ${analysis.activity} experiences for you!`;
      } else {
        // No results in our DB - use Viator as fallback
        console.log(`🌐 No results in DB - using ${viatorExperiences.length} Viator experiences as fallback`);
        
        experiences = viatorExperiences;
        message = viatorExperiences.length > 0
          ? `We found ${viatorExperiences.length} ${analysis.activity} experiences from our partners!`
          : `No ${analysis.activity} experiences found. Try a different activity!`;
      }
      
    } else if (analysis.type === 'landscape' && analysis.location) {
      // Landscape detected - suggest generic activities
      console.log(`🏔️ Landscape detected: ${analysis.location}`);
      
      // Get diverse activities from both sources
      const dbPromise = Experience.getAllExperiences(5, 0);
      const viatorPromise = viatorService.smartSearch(
        'activities', // Generic search
        analysis.location || defaultCity,
        'EUR',
        3
      );
      
      [experiences, viatorExperiences] = await Promise.all([dbPromise, viatorPromise]);
      
      // Combine: our DB + Viator
      experiences = [...experiences, ...viatorExperiences.slice(0, 2)];
      
      message = `${analysis.location} looks amazing! Here are some activities you can do:`;
    }
    
    // Deduplicate and limit to max 8 experiences
    experiences = experiences.slice(0, 8);
    
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

module.exports = router;
