const express = require('express');
const router = express.Router();
const simpleVideoAnalyzer = require('../services/simpleVideoAnalyzer');
const viatorService = require('../services/viatorService');
const Experience = require('../models/Experience');
const { from } = require('../config/database');
const axios = require('axios');

// Cache for experience searches to avoid duplicate API calls
const searchCache = new Map();
const SEARCH_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Use OpenAI to filter experiences by semantic relevance (BATCH mode)
 * Much faster and cheaper than individual calls - processes all titles at once
 * Example: "Ocean Dive" is relevant to "snorkeling", but "Indoor Skydiving" is not
 */
async function filterRelevantActivities(experiences, targetActivity) {
  if (!experiences || experiences.length === 0) return [];
  
  try {
    // Build numbered list of titles
    const titlesList = experiences
      .map((exp, i) => `${i + 1}. ${exp.title}`)
      .join('\n');
    
    const prompt = `Activity search: "${targetActivity}"

Which of these are RELEVANT?
${titlesList}

Rules:
- Water activities (snorkeling, diving, scuba) are related
- Land activities (hiking, biking) are related  
- Air activities (skydiving, paragliding) are related
- BUT different categories are NOT related (snorkeling ≠ skydiving)

Return ONLY numbers of relevant activities (comma-separated).
Example: 1,3,5`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 100
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    const answer = response.data.choices[0].message.content.trim();
    console.log(`   🤖 OpenAI relevance filter: ${answer}`);
    
    // Parse comma-separated numbers
    const relevantIndices = answer
      .split(',')
      .map(n => parseInt(n.trim()) - 1)
      .filter(i => !isNaN(i) && i >= 0 && i < experiences.length);
    
    const filtered = experiences.filter((_, i) => relevantIndices.includes(i));
    console.log(`   ✅ AI filtered: ${experiences.length} → ${filtered.length} relevant`);
    
    return filtered;
    
  } catch (error) {
    console.error('   ⚠️ OpenAI filter failed, using all results:', error.message);
    return experiences; // Fallback: return all if AI fails
  }
}

/**
 * Reverse geocoding: Convert GPS coordinates to city name
 * Uses Nominatim (OpenStreetMap) - FREE, no API key required!
 */
async function reverseGeocode(latitude, longitude) {
  try {
    // Nominatim (OpenStreetMap) - FREE reverse geocoding
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'BoredTouristApp/1.0' // Required by Nominatim
      }
    });

    if (response.data && response.data.address) {
      const address = response.data.address;
      
      // Extract city - try multiple fields in order of preference
      const city = address.city || address.town || address.village || 
                   address.municipality || address.county || address.state;
      const country = address.country;

      const location = city ? `${city}${country ? ', ' + country : ''}` : null;
      console.log(`   🌍 Reverse geocoded: ${latitude}, ${longitude} → ${location}`);
      return location;
    }

    return null;
  } catch (error) {
    console.error('❌ Reverse geocoding error:', error.message);
    return null;
  }
}

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
 * Helper: Parse coordinates from experience data
 * Tries to extract lat/lng from various fields
 */
function parseCoordinates(experience) {
  // Direct lat/lng fields
  if (experience.latitude && experience.longitude) {
    return { 
      latitude: parseFloat(experience.latitude), 
      longitude: parseFloat(experience.longitude) 
    };
  }
  
  // Coordinates object
  if (experience.coordinates) {
    if (typeof experience.coordinates === 'string') {
      try {
        const parsed = JSON.parse(experience.coordinates);
        if (parsed.latitude && parsed.longitude) {
          return { latitude: parsed.latitude, longitude: parsed.longitude };
        }
      } catch (e) {}
    } else if (experience.coordinates.latitude && experience.coordinates.longitude) {
      return experience.coordinates;
    }
  }
  
  // Location object with lat/lng
  if (experience.location && typeof experience.location === 'object') {
    if (experience.location.lat && experience.location.lng) {
      return { latitude: experience.location.lat, longitude: experience.location.lng };
    }
  }
  
  return null;
}

/**
 * Helper: Calculate distance between two coordinates in km (Haversine formula)
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
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
    
    // CRITICAL: Check if activity is BORING before any searches!
    // This prevents wasting resources on transfers, bars, buses, etc.
    if (analysis.type === 'activity' && analysis.activity) {
      const simpleVideoAnalyzer = require('../services/simpleVideoAnalyzer');
      const isBoring = await simpleVideoAnalyzer.isBoringActivity(analysis.activity);
      
      if (isBoring) {
        console.log(`🚫 BORING ACTIVITY BLOCKED: "${analysis.activity}" - No search needed`);
        
        // Save to cache with type 'boring'
        if (!cached) {
          await saveToCache(instagramUrl, {
            type: 'boring',
            activity: analysis.activity,
            location: analysis.location,
            confidence: 1.0,
            thumbnailUrl: thumbnailUrl
          });
        }
        
        return res.json({
          success: true,
          type: 'boring',
          activity: analysis.activity,
          experiences: [],
          thumbnail: thumbnailUrl,
          message: "Sorry, that's too boring for us! Search something more epic! 🚀"
        });
      }
      
      console.log(`✅ Activity "${analysis.activity}" is EPIC - proceeding with search`);
    }
    
    // Validate if video is relevant (activity or landscape)
    // If not relevant: type is 'irrelevant' OR very low confidence OR (no activity AND no location)
    const isIrrelevant = (
      analysis.type === 'irrelevant' || // Explicitly marked as irrelevant by AI
      analysis.confidence < 0.3 || // Very low confidence
      (!analysis.activity && !analysis.location) // No activity AND no location
    );
    
    if (isIrrelevant) {
      console.log('❌ Irrelevant video detected:', {
        confidence: analysis.confidence,
        activity: analysis.activity,
        location: analysis.location,
        type: analysis.type
      });
      
      return res.status(400).json({
        success: false,
        message: "Not gonna lie, we're a bit confused right now... 😬\nWe're adventure hunters, not fortune tellers! Search for a destination or activity and let's find you something epic.",
        error: 'IRRELEVANT_VIDEO',
        analysis: {
          confidence: analysis.confidence,
          type: analysis.type
        }
      });
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
      
      // CRITICAL: Filter by location FIRST (only show experiences near user's location)
      viatorExperiences = viatorExperiences.filter(exp => {
        const expLocation = (exp.location || '').toLowerCase();
        const userLocation = (userCity || '').toLowerCase();
        
        // If no location info, skip this filter
        if (!expLocation || !userLocation) return true;
        
        // Check if experience location matches user location
        // Support variations: "Lisbon", "Lisboa", "Lisbon, Portugal"
        const userLocationVariations = [
          userLocation,
          userLocation.replace('lisbon', 'lisboa'),
          userLocation.replace('lisboa', 'lisbon'),
          // Get the base city name (remove country)
          userLocation.split(',')[0].trim()
        ];
        
        const isNearUser = userLocationVariations.some(variation => 
          expLocation.includes(variation)
        );
        
        if (!isNearUser) {
          console.log(`🚫 Filtered out (wrong location): ${exp.title} (${exp.location}) - User is in ${userCity}`);
          return false;
        }
        
        return true;
      });
      
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
      // Landscape detected - search activities at that location via Viator
      console.log(`🏔️ Landscape detected at: ${analysis.location}`);
      console.log(`   That view just broke our algorithm! 🔥`);
      
      // Use the detected location to search for activities on Viator
      // Similar to "As Seen on Reel" - search by location
      viatorExperiences = await viatorService.smartSearch(
        'tours activities things to do', // Generic activity search
        analysis.location, // ← The location from the landscape
        'EUR',
        20
      );
      
      console.log(`   📦 Viator returned ${viatorExperiences.length} activities for ${analysis.location}`);
      
      // No DB results for landscape - just Viator
      experiences = viatorExperiences;
      
      message = `That view just broke our algorithm! 🔥 We can't pinpoint the exact activity, but check out these experiences near ${analysis.location}:`;
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
 * Body: { 
 *   activity: string, 
 *   userLocation: string, 
 *   strictActivityMatch?: boolean, // Only exact activity matches
 *   fullActivity?: string, 
 *   prioritizeBored?: boolean 
 * }
 */
router.post('/by-activity', async (req, res) => {
  try {
    const { 
      activity, 
      fullActivity, 
      userLocation, // This is the reel location for "As Seen on Reel" or user city for "Near You"
      strictActivityMatch = false,
      prioritizeBored 
    } = req.body;
    
    if (!activity) {
      return res.status(400).json({
        success: false,
        message: 'Activity is required'
      });
    }
    
    // Create cache key
    const cacheKey = `${activity}_${userLocation}_${prioritizeBored}`;
    
    // Check cache first
    const cached = searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < SEARCH_CACHE_TTL)) {
      console.log(`⚡ CACHE HIT for: ${cacheKey} (${Math.round((Date.now() - cached.timestamp)/1000)}s old)`);
      return res.json(cached.data);
    }
    
    // Extract location from userLocation
    const location = userLocation;
    
    // NEAR YOU IS ALWAYS LISBON - no exceptions!
    const NEAR_YOU_CITY = 'Lisboa';
    
    console.log('🔍 Searching experiences by activity...');
    console.log('   Activity:', activity);
    console.log('   Full Activity:', fullActivity);
    console.log('   Location from reel:', location);
    console.log('   Prioritize Bored:', prioritizeBored);
    
    const TARGET_COUNT = 8;
    const MAX_BORED_TOURIST = 3; // Max 3 Bored Tourist experiences in Near You
    let experiences = [];
    
    // Get base word for matching (e.g., "surfing" -> "surf")
    const activityLower = activity.toLowerCase();
    const activityBase = activityLower.replace(/ing$/, '').replace(/s$/, '');
    
    // STRICT related activities - only truly similar activities
    // Water activities stay with water, land with land
    const relatedActivities = {
      // Water activities - can show related water sports
      'snorkel': ['snorkeling', 'diving', 'scuba', 'underwater'],
      'dive': ['diving', 'snorkeling', 'scuba', 'underwater'],
      'surf': ['surfing', 'bodyboard', 'wave', 'surf lesson'],
      'paddle': ['paddleboard', 'sup', 'stand up paddle'],
      'kayak': ['kayaking', 'canoeing', 'paddle'],
      // Land activities
      'quad': ['quad', 'buggy', 'atv', '4x4'],
      'buggy': ['buggy', 'quad', 'atv', '4x4'],
      'bike': ['biking', 'cycling', 'e-bike', 'bicycle'],
      'hike': ['hiking', 'trekking', 'walking tour', 'trail'],
      'climb': ['climbing', 'rock climbing', 'bouldering'],
    };
    
    // Get STRICT related terms - only for Bored Tourist expansion
    const getRelatedTerms = (act) => {
      const terms = [act, activityLower]; // Include base and original
      for (const [key, related] of Object.entries(relatedActivities)) {
        if (act.includes(key) || activityLower.includes(key)) {
          terms.push(...related);
        }
      }
      return [...new Set(terms)];
    };
    
    const searchTerms = getRelatedTerms(activityBase);
    console.log('   Search terms for Bored Tourist:', searchTerms);
    
    // Only search Bored Tourist DB if prioritizeBored = true (Near You section)
    // For "As Seen on Reel" (prioritizeBored = false), skip DB entirely
    if (prioritizeBored) {
      console.log('   Searching Bored Tourist DB for related activities...');
      // Search our DB - get experiences from LISBON only
      const dbExperiences = await Experience.findSimilarActivities(
        activity,
        NEAR_YOU_CITY,
        TARGET_COUNT * 3 // Get more to filter
      );
      
      console.log(`   📦 DB returned ${dbExperiences.length} experiences`);
      
      // OPTIMIZATION: Only use AI filter if we have many results (>10)
      // For smaller result sets, the scoring algorithm is already good enough
      if (dbExperiences.length > 10) {
        console.log(`   🤖 Filtering ${dbExperiences.length} Bored Tourist experiences with OpenAI...`);
        experiences = await filterRelevantActivities(dbExperiences, activity);
        console.log(`   ✅ AI filtered: ${dbExperiences.length} → ${experiences.length} relevant`);
      } else {
        // Use DB results directly (already scored and sorted)
        experiences = dbExperiences;
        console.log(`   ⚡ Skipping AI filter (${dbExperiences.length} results already good)`);
      }
      
      // LIMIT to MAX_BORED_TOURIST experiences
      experiences = experiences.slice(0, MAX_BORED_TOURIST);
      
      console.log(`   🎯 Bored Tourist matches: ${experiences.length} experiences (max ${MAX_BORED_TOURIST})`);
      
      // Mark with source and parse images
      experiences = experiences.map(exp => ({
        ...exp,
        images: parseImages(exp.images),
        source: 'database'
      }));
    } else {
      console.log('   ⚠️ Skipping Bored Tourist DB (As Seen on Reel mode)');
    }
    
    // Get from Viator
    // For "Near You" (prioritizeBored=true): Use GPS → city → destination ID + freetext hybrid
    // For "As Seen on Reel" (prioritizeBored=false): Use freetext search with location
    let viatorExperiences = [];
    
    if (prioritizeBored) {
      // NEAR YOU: GPS-based dynamic location search
      // Check if userLocation contains GPS coordinates
      let cityName = 'Lisboa'; // Default fallback
      let countryName = 'Portugal';
      
      if (userLocation && typeof userLocation === 'object' && userLocation.lat && userLocation.lng) {
        console.log(`   📍 GPS coordinates detected: ${userLocation.lat}, ${userLocation.lng}`);
        
        // Reverse geocode to get city name
        const reverseGeocodedLocation = await reverseGeocode(userLocation.lat, userLocation.lng);
        if (reverseGeocodedLocation) {
          // Format: "Barcelona, Spain" or "Lisboa, Portugal"
          const parts = reverseGeocodedLocation.split(',').map(p => p.trim());
          cityName = parts[0];
          countryName = parts[1] || '';
          console.log(`   🏙️ Reverse geocoded to: ${cityName}, ${countryName}`);
        }
      }
      
      // Get Viator destination ID for the city
      const destinationId = await viatorService.getDestinationId(cityName);
      
      if (destinationId) {
        console.log(`   🔍 Viator Near You: Using destination ID ${destinationId} for ${cityName}`);
        
        // HYBRID SEARCH: destination ID (city) + freetext (region)
        // This ensures city center results AND captures suburbs (Sintra, Cascais, Montserrat, etc.)
        const [destinationResults, freetextResults] = await Promise.all([
          viatorService.searchByDestinationId(
            destinationId,
            activity,
            'EUR',
            TARGET_COUNT * 2
          ),
          viatorService.smartSearch(
            activity,
            `${cityName}${countryName ? ' ' + countryName : ''}`,
            'EUR',
            TARGET_COUNT
          )
        ]);
        
        console.log(`   📦 Viator destination search returned ${destinationResults.length} experiences`);
        console.log(`   📦 Viator freetext search returned ${freetextResults.length} experiences`);
        
        // Combine and deduplicate by productCode
        const combinedMap = new Map();
        [...destinationResults, ...freetextResults].forEach(exp => {
          if (!combinedMap.has(exp.productCode)) {
            combinedMap.set(exp.productCode, exp);
          }
        });
        
        viatorExperiences = Array.from(combinedMap.values());
        console.log(`   🎯 Combined ${viatorExperiences.length} unique experiences`);
      } else {
        // Fallback to freetext search if destination ID not found
        console.log(`   ⚠️ No destination ID found for ${cityName}, using freetext search`);
        viatorExperiences = await viatorService.smartSearch(
          activity,
          `${cityName}${countryName ? ' ' + countryName : ''}`,
          'EUR',
          TARGET_COUNT * 2
        );
        console.log(`   📦 Viator freetext search returned ${viatorExperiences.length} experiences`);
      }
    } else {
      // AS SEEN ON REEL: Use freetext search with exact location
      const viatorSearchQuery = fullActivity || activity;
      const viatorSearchLocation = location || null;
      console.log(`   🔍 Viator Reel search: "${viatorSearchQuery}" in "${viatorSearchLocation || 'global'}"`);
      
      viatorExperiences = await viatorService.smartSearch(
        viatorSearchQuery,
        viatorSearchLocation,
        'EUR',
        TARGET_COUNT,
        true // strict matching
      );
      
      console.log(`   📦 Viator freetext returned ${viatorExperiences.length} experiences`);
    }
    
    // For Near You: Use AI to filter semantically relevant experiences ONLY if we have many results
    // Example: "snorkeling" allows "scuba diving" but blocks "indoor skydiving"
    if (prioritizeBored && viatorExperiences.length > 15) {
      console.log(`   🤖 Filtering ${viatorExperiences.length} Viator experiences with OpenAI...`);
      viatorExperiences = await filterRelevantActivities(viatorExperiences, activity);
      console.log(`   ✅ AI filtered: ${viatorExperiences.length} relevant`);
    } else if (prioritizeBored) {
      console.log(`   ⚡ Skipping AI filter for Viator (${viatorExperiences.length} results already filtered by smartSearch)`);
    }
    
    // Combine: 
    // - Near You: Max 3 Bored Tourist + fill with Viator (for the same activity in Lisboa)
    // - As Seen on Reel: Only Viator (specific to reel location)
    if (prioritizeBored) {
      // Near You: Bored Tourist first (max 3), then Viator to complete
      const boredCount = experiences.length;
      const viatorNeeded = TARGET_COUNT - boredCount;
      const viatorToAdd = viatorExperiences.slice(0, viatorNeeded);
      experiences = [...experiences, ...viatorToAdd];
      console.log(`   📊 Near You mix: ${boredCount} Bored Tourist + ${viatorToAdd.length} Viator`);
    } else {
      // As Seen on Reel: Only Viator from the specific location
      experiences = viatorExperiences.slice(0, TARGET_COUNT);
      console.log(`   📊 As Seen on Reel: ${experiences.length} Viator from reel location`);
    }
    
    console.log(`✅ Found ${experiences.length} experiences (${experiences.filter(e => e.source === 'database').length} DB + ${experiences.filter(e => e.source === 'viator').length} Viator)`);
    
    const response = {
      success: true,
      data: {
        experiences: experiences.slice(0, TARGET_COUNT),
        fullActivity: fullActivity || activity, // Pass full activity to frontend
        sources: {
          database: experiences.filter(e => e.source === 'database').length,
          viator: experiences.filter(e => e.source === 'viator').length
        }
      }
    };
    
    // Cache the response
    searchCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });
    console.log(`💾 Cached search result: ${cacheKey}`);
    
    res.json(response);
    
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
