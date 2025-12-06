/**
 * Social Media Metadata Extraction Routes
 * 
 * Extracts metadata (description, username, hashtags) from TikTok and Instagram Reels
 * Uses RapidAPI Instagram Scraper Stable API for Instagram
 * Uses TikTok oEmbed API for TikTok
 * Uses Gemini AI for intelligent experience matching
 */

const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// API credentials - with hardcoded fallbacks
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const GOOGLE_AI_KEY = process.env.GOOGLE_AI_KEY || process.env.EXPO_PUBLIC_GOOGLE_AI_KEY || 'AIzaSyAlvnCcn8ndC6avTq2BlW7LJ-H3VgCEAk4';

// Supabase credentials - with hardcoded fallbacks
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hnivuisqktlrusyqywaz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXZ1aXNxa3RscnVzeXF5d2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNzE2NzgsImV4cCI6MjA3ODc0NzY3OH0.amqHQkxh9tun5cIHUJN23ocGImZek6QfoSGpLDSUhDA';

// Supabase for fetching experiences
const { createClient } = require('@supabase/supabase-js');
let supabase = null;

function getSupabase() {
  if (!supabase) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('⚠️ Supabase credentials not configured');
      return null;
    }
    
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabase;
}

/**
 * Extract metadata from TikTok URL using oEmbed API (free, no auth required)
 */
async function extractTikTokMetadata(url) {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl);
    
    if (response.ok) {
      const data = await response.json();
      
      // Extract hashtags from title
      const hashtagRegex = /#[\w\u00C0-\u024F]+/g;
      const hashtags = data.title?.match(hashtagRegex) || [];
      const description = data.title?.replace(hashtagRegex, '').trim() || '';
      
      return {
        platform: 'tiktok',
        success: true,
        username: data.author_name || null,
        description: description,
        fullTitle: data.title || null,
        hashtags: hashtags,
        thumbnailUrl: data.thumbnail_url || null,
        method: 'oembed',
      };
    }
    
    throw new Error('Failed to fetch TikTok metadata');
  } catch (error) {
    console.error('TikTok extraction error:', error);
    return {
      platform: 'tiktok',
      success: false,
      error: error.message,
    };
  }
}

/**
 * Extract Instagram metadata using RapidAPI (Instagram Scraper Stable API)
 */
async function extractInstagramMetadata(url) {
  try {
    // Clean the URL
    let cleanUrl = url;
    if (url.includes('instagr.am')) {
      const redirectResponse = await fetch(url, { redirect: 'follow' });
      cleanUrl = redirectResponse.url;
    }
    cleanUrl = cleanUrl.split('?')[0];
    
    if (!RAPIDAPI_KEY) {
      return { platform: 'instagram', success: false, error: 'RapidAPI key not configured' };
    }
    
    console.log('🚀 Using RapidAPI for Instagram scraping...');
    
    // Extract shortcode from URL
    const shortcodeMatch = cleanUrl.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
    if (!shortcodeMatch) {
      return { platform: 'instagram', success: false, error: 'Could not extract shortcode from URL' };
    }
    
    const shortcode = shortcodeMatch[2];
    const isReel = shortcodeMatch[1] === 'reel' || shortcodeMatch[1] === 'reels';
    
    console.log('📝 Shortcode:', shortcode, '| isReel:', isReel);
    
    // Use Instagram Scraper Stable API
    const endpoint = isReel 
      ? `https://instagram-scraper-stable-api.p.rapidapi.com/get_reel_title.php?reel_post_code_or_url=${shortcode}&type=reel`
      : `https://instagram-scraper-stable-api.p.rapidapi.com/get_post_title.php?post_code_or_url=${shortcode}&type=post`;
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com',
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
    });
    
    if (!response.ok) {
      console.log('❌ RapidAPI error:', response.status);
      return { platform: 'instagram', success: false, error: `RapidAPI request failed: ${response.status}` };
    }
    
    const data = await response.json();
    console.log('📦 RapidAPI response:', JSON.stringify(data).substring(0, 500));
    
    if (data && (data.post_caption || data.description)) {
      const caption = data.post_caption || data.description || '';
      
      // Extract hashtags
      const hashtagRegex = /#[\w\u00C0-\u024F]+/g;
      const hashtags = caption.match(hashtagRegex) || [];
      const description = caption.replace(hashtagRegex, '').trim();
      
      console.log('✅ Caption extracted:', caption.substring(0, 200));
      
      return {
        platform: 'instagram',
        success: true,
        username: null,
        description: description,
        fullTitle: caption,
        hashtags: hashtags,
        thumbnailUrl: null,
        method: 'rapidapi',
      };
    }
    
    return { platform: 'instagram', success: false, error: 'No caption data in response' };
  } catch (error) {
    console.error('Instagram extraction error:', error);
    return { platform: 'instagram', success: false, error: error.message };
  }
}

/**
 * Use Gemini AI to match experiences based on social media content
 */
async function matchExperiencesWithAI(metadata, experiences) {
  if (!GOOGLE_AI_KEY) {
    console.log('⚠️ Google AI key not configured, using keyword matching');
    return null;
  }
  
  try {
    console.log('🤖 Using Gemini AI for experience matching...');
    
    const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    // Create summary of experiences
    const experiencesSummary = experiences.map(exp => ({
      id: exp.id,
      title: exp.title,
      category: exp.category,
      tags: exp.tags,
      location: exp.location,
    }));
    
    // Build context from metadata
    let contentContext = '';
    if (metadata.description || metadata.fullTitle) {
      contentContext += `Description: "${metadata.description || metadata.fullTitle}"\n`;
    }
    if (metadata.hashtags && metadata.hashtags.length > 0) {
      contentContext += `Hashtags: ${metadata.hashtags.join(', ')}\n`;
    }
    
    if (!contentContext.trim()) {
      return null;
    }
    
    const prompt = `You are matching social media content to travel experiences in Portugal.

SOCIAL MEDIA CONTENT:
${contentContext}

AVAILABLE EXPERIENCES:
${JSON.stringify(experiencesSummary, null, 2)}

MATCHING PRIORITY (follow strictly):

1. DIRECT MATCH (highest priority): If a hashtag is a SPECIFIC activity (surf, yoga, wine, cooking, horse), 
   ALWAYS include ALL experiences that contain that exact word in title or tags.
   Example: #surf → MUST include every experience with "surf" in title/tags

2. RELATED MATCH (second priority): After direct matches, add experiences with related concepts.
   Example: #surf → also add beach experiences, water sports, coastal activities

3. CONTEXTUAL MATCH (third priority): For GENERIC hashtags (beach, summer, paradise, vacation, adventure),
   use creativity to find thematically related experiences.
   Example: #summer → beach activities, outdoor tours, water sports

KEYWORD MAPPINGS:
- surf/surfing/waves → surf lessons, surf camps, beach activities
- wine/vineyard/tasting → wine tours, wine experiences
- cooking/chef/food/gastronomy → cooking classes, food tours
- yoga/meditation/wellness → yoga retreats, wellness experiences
- horse/riding/equestrian → horseback riding
- beach/praia/coastal → beach activities, coastal tours
- adventure/adrenaline/extreme → adventure experiences, outdoor activities

Return ONLY a JSON array of experience IDs (max 5), ordered by relevance (direct matches first).
Example: [26, 18, 19, 5, 3]

If nothing matches well, return [].`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 100 },
    });

    let text = result.response.text().trim();
    console.log('🤖 AI Response (raw):', text);
    
    // Clean markdown wrapper if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const matchedIds = JSON.parse(text);
    
    if (Array.isArray(matchedIds) && matchedIds.length > 0) {
      const matchedExperiences = matchedIds
        .map(id => experiences.find(exp => exp.id === id || exp.id === String(id)))
        .filter(Boolean);
      
      console.log('✅ AI matched:', matchedExperiences.map(e => e.title));
      return matchedExperiences;
    }
    
    return null;
  } catch (error) {
    console.error('AI matching error:', error);
    return null;
  }
}

/**
 * Keyword-based matching fallback
 */
function matchExperiencesWithKeywords(metadata, experiences) {
  const content = `${metadata.description || ''} ${metadata.fullTitle || ''} ${(metadata.hashtags || []).join(' ')}`.toLowerCase();
  
  console.log('🔤 Keyword matching:', content.substring(0, 200));
  
  const keywordMap = {
    surf: ['surf', 'surfing', 'waves', 'ondas', 'surfboard', 'surfer'],
    yoga: ['yoga', 'meditation', 'wellness', 'mindfulness', 'zen'],
    wine: ['wine', 'vinho', 'vineyard', 'winery', 'tasting', 'degustação'],
    cooking: ['cooking', 'cook', 'chef', 'kitchen', 'culinary', 'food', 'pastel', 'nata'],
    dolphins: ['dolphin', 'dolphins', 'whale', 'golfinho', 'marine'],
    horse: ['horse', 'horseback', 'riding', 'equestrian', 'cavalo'],
    beach: ['beach', 'praia', 'coast', 'seaside', 'comporta', 'caparica'],
    adventure: ['adventure', 'adrenaline', 'extreme', 'quad', 'atv', 'buggy'],
    sintra: ['sintra', 'palace', 'palácio', 'castle', 'pena', 'regaleira'],
    lisbon: ['lisbon', 'lisboa', 'alfama', 'baixa', 'chiado', 'tram'],
    tiles: ['tiles', 'azulejos', 'ceramic', 'pottery', 'craft'],
    climbing: ['climbing', 'climb', 'bridge', 'rappel', '25 abril'],
  };
  
  // Score experiences
  const scored = experiences.map(exp => {
    let score = 0;
    const expContent = `${exp.title} ${exp.description || ''} ${exp.category} ${(exp.tags || []).join(' ')}`.toLowerCase();
    
    for (const [category, keywords] of Object.entries(keywordMap)) {
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          if (expContent.includes(keyword)) {
            score += 20;
          }
          for (const tag of (Array.isArray(exp.tags) ? exp.tags : [])) {
            if (tag && tag.toLowerCase().includes(keyword)) {
              score += 10;
            }
          }
        }
      }
    }
    
    return { experience: exp, score };
  });
  
  const topMatches = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
  console.log('🔤 Top matches:', topMatches.map(m => ({ title: m.experience.title, score: m.score })));
  
  return topMatches.map(s => s.experience);
}

/**
 * Detect platform from URL
 */
function detectPlatform(url) {
  if (!url) return null;
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('tiktok.com') || lowerUrl.includes('vm.tiktok')) return 'tiktok';
  if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagr.am')) return 'instagram';
  
  return null;
}

// ============ ROUTES ============

/**
 * POST /api/social-media/extract
 */
router.post('/extract', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }
    
    const platform = detectPlatform(url);
    
    if (!platform) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported platform. Only TikTok and Instagram are supported.',
      });
    }
    
    let metadata;
    if (platform === 'tiktok') {
      metadata = await extractTikTokMetadata(url);
    } else {
      metadata = await extractInstagramMetadata(url);
    }
    
    metadata.originalUrl = url;
    res.json(metadata);
    
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({ success: false, error: 'Failed to extract metadata' });
  }
});

/**
 * GET /api/social-media/test
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Social media API is working',
    supportedPlatforms: ['tiktok', 'instagram'],
  });
});

/**
 * GET /api/social-media/debug
 */
router.get('/debug', (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const googleKey = process.env.GOOGLE_AI_KEY || process.env.EXPO_PUBLIC_GOOGLE_AI_KEY;
  
  res.json({
    success: true,
    env: {
      hasSupabaseUrl: !!supabaseUrl,
      supabaseUrlPrefix: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : null,
      hasSupabaseKey: !!supabaseKey,
      supabaseKeyPrefix: supabaseKey ? supabaseKey.substring(0, 20) + '...' : null,
      hasRapidApiKey: !!process.env.RAPIDAPI_KEY,
      hasGoogleAiKey: !!googleKey,
      googleKeyPrefix: googleKey ? googleKey.substring(0, 15) + '...' : null,
    },
  });
});

/**
 * POST /api/social-media/smart-match
 * Extract metadata AND find matching experiences
 * Using the EXACT same logic as test-gemini-match.js that works!
 */
router.post('/smart-match', async (req, res) => {
  try {
    const { url } = req.body;
    
    console.log('🔍 Smart match for:', url);
    
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }
    
    const platform = detectPlatform(url);
    
    if (!platform) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported platform. Only TikTok and Instagram are supported.',
      });
    }
    
    // Step 1: Extract metadata
    console.log('📱 Extracting metadata...');
    let metadata;
    if (platform === 'tiktok') {
      metadata = await extractTikTokMetadata(url);
    } else {
      metadata = await extractInstagramMetadata(url);
    }
    metadata.originalUrl = url;
    console.log('📱 Metadata:', metadata);
    
    // Step 2: Connect to Supabase with HARDCODED credentials (same as test)
    const SUPABASE_URL_DIRECT = 'https://hnivuisqktlrusyqywaz.supabase.co';
    const SUPABASE_KEY_DIRECT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXZ1aXNxa3RscnVzeXF5d2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNzE2NzgsImV4cCI6MjA3ODc0NzY3OH0.amqHQkxh9tun5cIHUJN23ocGImZek6QfoSGpLDSUhDA';
    const GOOGLE_AI_KEY_DIRECT = 'AIzaSyAlvnCcn8ndC6avTq2BlW7LJ-H3VgCEAk4';
    
    const supabaseClient = createClient(SUPABASE_URL_DIRECT, SUPABASE_KEY_DIRECT);
    
    const { data: experiences, error: dbError } = await supabaseClient
      .from('experiences')
      .select('id, title, description, category, tags, location, price, currency, duration, rating, review_count, image_url, operator_name')
      .order('rating', { ascending: false });
    
    if (dbError || !experiences?.length) {
      console.error('❌ Supabase error:', dbError);
      return res.json({
        success: true,
        metadata,
        matchedExperiences: [],
        matchMethod: 'none',
        error: 'Database error'
      });
    }
    
    console.log(`📦 Found ${experiences.length} experiences`);
    
    // Step 3: Call Gemini AI (same as test)
    const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY_DIRECT);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const experiencesSummary = experiences.map(exp => ({
      id: exp.id, title: exp.title, category: exp.category, tags: exp.tags, location: exp.location
    }));
    
    const contentContext = 'Description: "' + (metadata.description || metadata.fullTitle || '') + '"\nHashtags: ' + (metadata.hashtags || []).join(', ');
    
    const prompt = `You are matching social media content to travel experiences in Portugal.

SOCIAL MEDIA CONTENT:
${contentContext}

AVAILABLE EXPERIENCES:
${JSON.stringify(experiencesSummary, null, 2)}

MATCHING PRIORITY (follow strictly):

1. DIRECT MATCH (highest priority): If a hashtag is a SPECIFIC activity (surf, yoga, wine, cooking, horse), 
   ALWAYS include ALL experiences that contain that exact word in title or tags.
   Example: #surf → MUST include every experience with "surf" in title/tags

2. RELATED MATCH (second priority): After direct matches, add experiences with related concepts.
   Example: #surf → also add beach experiences, water sports, coastal activities

3. CONTEXTUAL MATCH (third priority): For GENERIC hashtags (beach, summer, paradise, vacation, adventure),
   use creativity to find thematically related experiences.
   Example: #summer → beach activities, outdoor tours, water sports

Return ONLY a JSON array of experience IDs (max 5), ordered by relevance (direct matches first).
Example: [26, 18, 19, 5, 3]

If nothing matches well, return [].`;

    console.log('🤖 Calling Gemini AI...');
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 100 },
    });

    let text = result.response.text().trim();
    console.log('🤖 Gemini Response (raw):', text);
    
    // Clean markdown wrapper if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    console.log('🧹 Cleaned:', text);
    
    const matchedIds = JSON.parse(text);
    
    // Get full experience data for matched IDs
    const matchedExperiences = matchedIds
      .map(id => experiences.find(exp => exp.id === id || exp.id === String(id)))
      .filter(Boolean)
      .slice(0, 5);
    
    // Transform for frontend
    const transformedExperiences = matchedExperiences.map(exp => ({
      id: String(exp.id),
      title: exp.title,
      description: exp.description,
      category: exp.category,
      tags: Array.isArray(exp.tags) ? exp.tags : (exp.tags ? JSON.parse(exp.tags) : []),
      location: exp.location,
      price: exp.price,
      currency: exp.currency || 'EUR',
      duration: exp.duration,
      rating: exp.rating,
      reviewCount: exp.review_count,
      image: exp.image_url,
      provider: exp.operator_name,
    }));
    
    console.log(`✅ Returning ${transformedExperiences.length} experiences (ai)`);
    
    res.json({
      success: true,
      metadata,
      matchedExperiences: transformedExperiences,
      matchMethod: 'ai',
    });
    
  } catch (error) {
    console.error('Smart match error:', error);
    res.status(500).json({ success: false, error: 'Failed to process content: ' + error.message });
  }
});

module.exports = router;
