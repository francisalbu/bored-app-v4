const express = require('express');
const router = express.Router();
const simpleVideoAnalyzer = require('../services/simpleVideoAnalyzer');
const Experience = require('../models/Experience');

/**
 * POST /api/experience-recommendations
 * Analyze video and recommend experiences from database
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
    let message = '';
    
    if (analysis.type === 'activity' && analysis.activity) {
      // Activity detected - find similar experiences in DB
      console.log(`🏄 Activity detected: ${analysis.activity}`);
      
      experiences = await Experience.findSimilarActivities(
        analysis.activity,
        'Lisbon', // Default city
        3
      );
      
      message = `We found ${experiences.length} ${analysis.activity} experiences near you!`;
      
    } else if (analysis.type === 'landscape' && analysis.location) {
      // Landscape detected - suggest generic activities
      console.log(`🏔️ Landscape detected: ${analysis.location}`);
      
      // Get diverse activities (any 3)
      experiences = await Experience.getAllExperiences(3, 0);
      
      message = `${analysis.location} looks amazing! Here are some activities you can do:`;
    }
    
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
        message: message
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
