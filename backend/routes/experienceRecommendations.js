const express = require('express');
const router = express.Router();
const simpleVideoAnalyzer = require('../services/simpleVideoAnalyzer');
const viatorService = require('../services/viatorService');
const Experience = require('../models/Experience');
const { from } = require('../config/database');

/**
 * Helper: Parse images field from database (can be JSON string or array)
 * PostgreSQL JSONB can come as string that needs parsing
 */
function parseImages(images) {
  if (!images) return [];
  if (Array.isArray(images)) return images;
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Failed to parse images:', e.message);
      return [];
    }
  }
  return [];
}

/**
 * Check if video analysis is cached
 */
async function getCachedAnalysis(instagramUrl) {
  try {
    const { data, error } = await from('video_analysis_cache')
      .select('*')
      .eq('instagram_url', instagramUrl)
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      throw error;
    }
    
    if (data) {
      // Increment hit count
      await from('video_analysis_cache')
        .update({ hit_count: (data.hit_count || 0) + 1 })
        .eq('id', data.id);
      
      console.log('✅ Cache HIT for:', instagramUrl, '(hits:', (data.hit_count || 0) + 1, ')');
      return data;
    }
    
    console.log('❌ Cache MISS for:', instagramUrl);
    return null;
  } catch (error) {
    console.error('⚠️ Cache lookup error:', error.message);
    return null; // Continue without cache on error
  }
}

/**
 * Save video analysis to cache
 */
async function saveCachedAnalysis(instagramUrl, analysis, experiences, thumbnailUrl) {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now
    
    const { error } = await from('video_analysis_cache')
      .upsert({
        instagram_url: instagramUrl,
        thumbnail_url: thumbnailUrl,
        analysis_type: analysis.type,
        activity: analysis.activity,
        location: analysis.location,
        confidence: analysis.confidence,
        experiences: JSON.stringify(experiences),
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        hit_count: 0
      }, {
        onConflict: 'instagram_url'
      });
    
    if (error) throw error;
    
    console.log('💾 Cached analysis for:', instagramUrl);
  } catch (error) {
    console.error('⚠️ Failed to save cache:', error.message);
    // Don't fail the request if cache save fails
  }
}

/**
 * POST /api/experience-recommendations
 * Analyze video and recommend experiences from database + Viator
 * 
 * Strategy:
 * 1. Check cache first (avoid re-analyzing same video)
 * 2. If not cached: Analyze video to detect activity/location
 * 3. Search our DB first
 * 4. If we have results: add 2-3 from Viator for variety
 * 5. If we don't have results: use only Viator as fallback
 * 6. Save to cache for future requests
 * 
 * Body: { instagramUrl: string, userLocation?: string }
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
    
    // 1. Check cache first
    const cached = await getCachedAnalysis(instagramUrl);
    let analysis;
    let thumbnailUrl;
    
    if (cached) {
      // Use cached analysis
      analysis = {
        type: cached.analysis_type,
        activity: cached.activity,
        location: cached.location,
        confidence: parseFloat(cached.confidence),
        thumbnailUrl: cached.thumbnail_url
      };
      thumbnailUrl = cached.thumbnail_url;
      
      console.log('📦 Using cached analysis:', analysis);
    } else {
      // 2. Analyze video (2-3 frames only)
      const analysisResult = await simpleVideoAnalyzer.analyzeVideo(instagramUrl);
      analysis = analysisResult;
      thumbnailUrl = analysisResult.thumbnailUrl;
      
      console.log('📊 Fresh analysis result:', analysis);
    }
    
    let experiences = [];
    let viatorExperiences = [];
    let message = '';
    // NO LIMIT - show all relevant experiences
    
    if (analysis.type === 'activity' && analysis.activity) {
      // Activity detected - find similar experiences in DB
      console.log(`🏄 Activity detected: ${analysis.activity}`);
      
      // Get ALL matching experiences from our DB (no limit)
      experiences = await Experience.findSimilarActivities(
        analysis.activity,
        userCity,
        50 // High limit to get all relevant
      );
      
      // Mark all DB experiences with source field AND parse images
      experiences = experiences.map(exp => ({
        ...exp,
        images: parseImages(exp.images), // Parse images correctly from JSONB
        source: 'database'
      }));
      
      // Fetch Viator with strict activity matching
      const viatorPromise = viatorService.smartSearch(
        analysis.activity,
        userCity,
        'EUR',
        50, // Get more results to filter properly
        true // Strict matching flag
      );
      
      viatorExperiences = await viatorPromise;
      
      viatorExperiences = await viatorPromise;
      
      // Filter Viator results to only show relevant experiences (anti-bored tourist)
      viatorExperiences = viatorExperiences.filter(exp => {
        const title = exp.title.toLowerCase();
        const activity = analysis.activity.toLowerCase();
        
        // Comprehensive activity synonyms dictionary (200+ activities)
        const synonyms = {
          // Water Sports
          'surfing': ['surf', 'surfing', 'surf lesson', 'surf class', 'surf course', 'wave'],
          'scuba diving': ['scuba', 'diving', 'dive', 'underwater'],
          'snorkeling': ['snorkel', 'snorkeling', 'snorkelling'],
          'kayaking': ['kayak', 'kayaking', 'paddle'],
          'white water rafting': ['rafting', 'white water', 'rapids'],
          'jet skiing': ['jet ski', 'jet-ski', 'jetski', 'pwc'],
          'kitesurfing': ['kitesurf', 'kite surf', 'kite boarding'],
          'windsurfing': ['windsurf', 'wind surf'],
          'wakeboarding': ['wakeboard', 'wake board'],
          'water skiing': ['water ski', 'waterski'],
          'sup': ['paddleboard', 'paddle board', 'stand up paddle', 'sup'],
          'sailing': ['sail', 'sailing', 'yacht'],
          'cliff jumping': ['cliff jump', 'cliff diving'],
          'bodyboarding': ['bodyboard', 'boogie board'],
          'freediving': ['freedive', 'free dive', 'apnea'],
          'flyboarding': ['flyboard', 'fly board'],
          'parasailing': ['parasail', 'parachute'],
          'canoeing': ['canoe', 'canoeing'],
          'coasteering': ['coasteer', 'coastal'],
          'cave diving': ['cave dive', 'cavern'],
          
          // Winter Sports
          'skiing': ['ski', 'skiing', 'snow ski'],
          'snowboarding': ['snowboard', 'snow board'],
          'ice climbing': ['ice climb', 'frozen'],
          'snowmobiling': ['snowmobile', 'snow mobile'],
          'heli-skiing': ['heli ski', 'helicopter ski'],
          'dog sledding': ['dog sled', 'husky', 'mushing'],
          'snowshoeing': ['snowshoe', 'snow shoe'],
          'ice skating': ['ice skate', 'skating'],
          'glacier': ['glacier', 'ice'],
          
          // Air/Sky Sports
          'skydiving': ['skydive', 'parachute', 'freefall'],
          'paragliding': ['paraglide', 'paraglider'],
          'hang gliding': ['hang glide', 'hang glider'],
          'bungee jumping': ['bungee', 'bungee jump'],
          'base jumping': ['base jump', 'base'],
          'hot air balloon': ['balloon', 'ballooning'],
          'helicopter': ['helicopter', 'heli'],
          'wingsuit': ['wingsuit', 'wing suit'],
          'zip line': ['zipline', 'zip line', 'zip-line', 'canopy'],
          
          // Land/Mountain Sports
          'hiking': ['hike', 'hiking', 'trekking', 'trail'],
          'rock climbing': ['climb', 'climbing', 'rock climb'],
          'mountain biking': ['mtb', 'mountain bike', 'downhill'],
          'camping': ['camp', 'camping'],
          'bouldering': ['boulder', 'bouldering'],
          'mountaineering': ['mountaineer', 'alpinism'],
          'caving': ['cave', 'caving', 'spelunking'],
          'atv': ['atv', 'quad', 'quadbike', 'four wheeler'],
          'buggy': ['buggy', 'dune buggy', 'off-road'],
          'safari': ['safari', 'game drive'],
          'sandboarding': ['sandboard', 'sand board', 'dune'],
          'horseback': ['horse', 'horseback', 'riding', 'equestrian'],
          'camel': ['camel', 'camel ride'],
          'elephant': ['elephant', 'elephant ride'],
          'zorbing': ['zorb', 'zorbing', 'sphere'],
          'via ferrata': ['via ferrata', 'ferrata'],
          'rappelling': ['rappel', 'abseil', 'abseiling'],
          'parkour': ['parkour', 'freerunning'],
          'bmx': ['bmx', 'bike'],
          'skateboard': ['skate', 'skateboard'],
          'motocross': ['motocross', 'mx', 'dirt bike'],
          
          // Motorsports
          'moto': ['moto', 'motorcycle', 'motorbike'],
          'drifting': ['drift', 'drifting'],
          'karting': ['kart', 'go-kart', 'go kart'],
          '4x4': ['4x4', 'off-road', 'off road'],
          
          // Wildlife & Nature
          'whale watching': ['whale', 'whale watch'],
          'dolphin': ['dolphin', 'dolphin watch'],
          'shark': ['shark', 'shark cage'],
          'safari': ['safari', 'wildlife', 'game drive'],
          'bird watching': ['bird', 'birding', 'birdwatching'],
          'gorilla': ['gorilla', 'gorilla trek'],
          'penguin': ['penguin', 'penguin colony'],
        };
        
        // Get synonyms for this activity, or use the activity itself
        const activityTerms = synonyms[activity] || [activity];
        
        // Check if title contains the activity or any synonym
        const hasMatch = activityTerms.some(term => title.includes(term));
        
        if (!hasMatch) {
          // Check for partial word match (e.g., "surf" in "surfing")
          const words = activity.split(' ');
          const hasPartialMatch = words.some(word => 
            word.length > 3 && title.includes(word)
          );
          
          if (!hasPartialMatch) {
            console.log(`🚫 Filtered out: ${exp.title} (not relevant to ${activity})`);
            return false;
          }
        }
        
        // STRICT: Exclude BORED TOURIST activities
        const boringKeywords = [
          'city tour', 'sightseeing', 'castle', 'museum', 'templar', 
          'monastery', 'cathedral', 'historic', 'walking tour', 'food tour',
          'wine tasting', 'cultural', 'heritage', 'guided tour', 'hop-on hop-off',
          'brewery', 'temple', 'palace', 'archaeological', 'market visit',
          'cooking class', 'festival', 'pilgrimage', 'architecture', 'ghost tour',
          'segway tour', 'night tour', 'theater', 'opera', 'concert', 'gallery',
          'village visit', 'tribal', 'dance show', 'spa', 'massage', 'wellness',
          'yoga retreat', 'meditation', 'thermal bath', 'hammam', 'sauna',
          'botanical garden', 'beach relaxation'
        ];
        
        const isBoring = boringKeywords.some(keyword => title.includes(keyword));
        if (isBoring) {
          console.log(`🚫 Filtered out: ${exp.title} (bored tourist activity)`);
          return false;
        }
        
        return true;
      });
      
      // Combine all results (DB + Viator filtered)
      experiences = [...experiences, ...viatorExperiences];
      
      if (experiences.length >= 3) {
        console.log(`✅ Found ${experiences.length} relevant ${analysis.activity} experiences`);
        message = `We found ${experiences.length} ${analysis.activity} experiences near you!`;
        
      } else if (experiences.length > 0) {
        console.log(`✅ Found ${experiences.length} ${analysis.activity} experiences`);
        message = `We found ${experiences.length} ${analysis.activity} experiences for you!`;
        
      } else {
        console.log(`❌ No relevant ${analysis.activity} experiences found`);
        message = `No ${analysis.activity} experiences found. Try a different location!`;
      }
      
    } else if (analysis.type === 'landscape' && analysis.location) {
      // Landscape detected - suggest generic activities
      console.log(`🏔️ Landscape detected: ${analysis.location}`);
      
      // Get diverse activities from both sources (user's location!)
      const dbPromise = Experience.getAllExperiences(20, 0);
      const viatorPromise = viatorService.smartSearch(
        'activities', // Generic search
        userCity, // ← User's city for local activities
        'EUR',
        20
      );
      
      [experiences, viatorExperiences] = await Promise.all([dbPromise, viatorPromise]);
      
      // Mark all DB experiences with source field
      experiences = experiences.map(exp => ({
        ...exp,
        images: parseImages(exp.images), // Parse images correctly
        source: 'database'
      }));
      
      // Add all Viator results
      experiences = [...experiences, ...viatorExperiences];
      
      message = `${analysis.location} looks amazing! Here are ${experiences.length} activities you can do:`;
    }
    
    // NO LIMIT - return all relevant experiences
    
    // Save to cache if this was a fresh analysis (not from cache)
    if (!cached) {
      await saveCachedAnalysis(instagramUrl, analysis, experiences, thumbnailUrl);
    }
    
    res.json({
      success: true,
      data: {
        analysis: {
          type: analysis.type,
          activity: analysis.activity,
          location: analysis.location,
          confidence: analysis.confidence,
          thumbnailUrl: thumbnailUrl
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
 * Body: { activity: string, userLocation: string, fullActivity?: string, prioritizeBored?: boolean }
 */
router.post('/by-activity', async (req, res) => {
  try {
    const { activity, fullActivity, userLocation, prioritizeBored } = req.body;
    
    if (!activity) {
      return res.status(400).json({
        success: false,
        message: 'Activity is required'
      });
    }
    
    const userCity = userLocation || 'Lisbon';
    
    console.log('🔍 Searching experiences by activity...');
    console.log('   Activity:', activity);
    console.log('   Full Activity:', fullActivity);
    console.log('   Location:', userCity);
    console.log('   Prioritize Bored:', prioritizeBored);
    
    const TARGET_COUNT = 5;
    let experiences = [];
    
    // For Bored Tourist: expand search with synonyms/related activities
    const boredActivities = prioritizeBored ? getBoredActivitySynonyms(activity) : [activity];
    console.log('   Bored activities to search:', boredActivities);
    
    // Search our DB with expanded activities
    for (const boredActivity of boredActivities) {
      const dbExperiences = await Experience.findSimilarActivities(
        boredActivity,
        userCity,
        TARGET_COUNT
      );
      
      // Add to results if we found something
      if (dbExperiences.length > 0) {
        experiences.push(...dbExperiences.map(exp => ({
          ...exp,
          images: parseImages(exp.images),
          source: 'database'
        })));
        
        // Stop if we have enough
        if (experiences.length >= TARGET_COUNT) break;
      }
    }
    
    // Remove duplicates based on ID
    experiences = experiences.filter((exp, index, self) => 
      index === self.findIndex(e => e.id === exp.id)
    );
    
    // Get from Viator (strict match only)
    const viatorExperiences = await viatorService.smartSearch(
      activity,
      userCity,
      'EUR',
      TARGET_COUNT
    );
    
    // Combine: DB first (Bored Tourist priority), complete with Viator
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
        fullActivity: fullActivity || activity, // Pass full activity to frontend
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

/**
 * Get activity synonyms for Bored Tourist database
 * Expands search to related activities to increase Bored Tourist matches
 */
function getBoredActivitySynonyms(activity) {
  const activityLower = activity.toLowerCase();
  const synonyms = [activityLower]; // Always include original
  
  // Water activities
  if (activityLower.includes('snorkel')) {
    synonyms.push('diving', 'scuba diving', 'snorkeling', 'underwater');
  }
  if (activityLower.includes('div')) {
    synonyms.push('snorkeling', 'scuba diving', 'underwater');
  }
  if (activityLower.includes('kayak')) {
    synonyms.push('kayaking', 'paddling', 'canoeing');
  }
  if (activityLower.includes('paddle')) {
    synonyms.push('paddleboarding', 'sup', 'kayaking');
  }
  if (activityLower.includes('surf')) {
    synonyms.push('surfing', 'surf lesson', 'wave riding');
  }
  
  // Land activities
  if (activityLower.includes('hik')) {
    synonyms.push('hiking', 'trekking', 'walking', 'trail');
  }
  if (activityLower.includes('walk')) {
    synonyms.push('walking tour', 'city tour', 'guided walk');
  }
  if (activityLower.includes('bike') || activityLower.includes('cycling')) {
    synonyms.push('biking', 'cycling', 'bike tour', 'bicycle');
  }
  if (activityLower.includes('climb')) {
    synonyms.push('climbing', 'rock climbing', 'bouldering');
  }
  
  // Adventure activities  
  if (activityLower.includes('atv') || activityLower.includes('quad')) {
    synonyms.push('atv', 'quad', 'buggy', 'quad biking', 'atv riding');
  }
  if (activityLower.includes('buggy')) {
    synonyms.push('atv', 'quad', 'dune buggy', 'quad biking');
  }
  if (activityLower.includes('zip') || activityLower.includes('zipline')) {
    synonyms.push('zipline', 'ziplining', 'canopy tour');
  }
  if (activityLower.includes('paraglid') || activityLower.includes('skydiv')) {
    synonyms.push('paragliding', 'skydiving', 'parachute', 'tandem');
  }
  
  // Cultural activities
  if (activityLower.includes('food') || activityLower.includes('culinary')) {
    synonyms.push('food tour', 'culinary', 'tasting', 'gastronomic');
  }
  if (activityLower.includes('wine')) {
    synonyms.push('wine tasting', 'vineyard', 'winery');
  }
  if (activityLower.includes('art') || activityLower.includes('museum')) {
    synonyms.push('art', 'museum', 'gallery', 'cultural');
  }
  
  // Remove duplicates
  return [...new Set(synonyms)];
}

module.exports = router;
