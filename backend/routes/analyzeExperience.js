const express = require('express');
const router = express.Router();
const experienceAnalyzer = require('../services/experienceAnalyzer');
const Experience = require('../models/Experience');

/**
 * POST /api/analyze-experience
 * Simplified: Analyze video and return matching experiences directly
 * 
 * Flow:
 * 1. Analyze video (2-3 frames only)
 * 2. Detect: Experience (surf, yoga) OR Landscape (desert, waterfall)
 * 3. Return matching experiences from database
 */
router.post('/', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Instagram URL is required'
      });
    }
    
    console.log('\n🎬 Analyzing Instagram video:', url);
    
    // 1. Analyze video
    const analysis = await experienceAnalyzer.analyzeInstagramVideo(url);
    
    console.log('📊 Analysis result:', analysis);
    
    // 2. Find matching experiences
    let experiences = [];
    
    if (analysis.isExperience) {
      // It's an experience (surf, yoga, etc) - find similar in DB
      console.log(`🏄 Experience detected: ${analysis.activity}`);
      experiences = await Experience.findSimilarActivities(analysis.activity, 'Lisbon', 3);
    } else {
      // It's a landscape (waterfall, desert, etc) - suggest generic activities
      console.log(`🏞️ Landscape detected: ${analysis.activity} in ${analysis.location}`);
      // For landscapes, return adventure/sightseeing activities
      experiences = await Experience.getExperiencesByCategory('adventure', 3);
    }
    
    console.log(`✅ Found ${experiences.length} matching experiences`);
    
    // 3. Return result
    res.json({
      success: true,
      data: {
        analysis: {
          activity: analysis.activity,
          location: analysis.location,
          isExperience: analysis.isExperience,
          description: analysis.description,
          confidence: analysis.confidence,
          processingTime: analysis.processingTime
        },
        experiences: experiences,
        meta: {
          type: analysis.isExperience ? 'experience' : 'landscape',
          experiencesCount: experiences.length
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error analyzing experience:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to analyze video',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
