/**
 * Social Media Metadata Extraction Routes
 * 
 * Extracts metadata (description, username, hashtags) from TikTok and Instagram Reels
 * Uses Apify for robust scraping and Gemini AI for intelligent experience matching
 */

const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Facebook/Instagram oEmbed API credentials
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

// Apify API credentials for more robust scraping
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

// Google AI credentials for smart matching
const GOOGLE_AI_KEY = process.env.GOOGLE_AI_KEY || process.env.EXPO_PUBLIC_GOOGLE_AI_KEY;

// Supabase for fetching experiences - lazy initialization
const { createClient } = require('@supabase/supabase-js');
let supabase = null;

function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      console.error('⚠️ Supabase credentials not configured');
      return null;
    }
    
    supabase = createClient(url, key);
  }
  return supabase;
}

/**
 * Extract metadata from TikTok URL
 * Uses TikTok's oEmbed API (free, no auth required)
 * Falls back to Apify if oEmbed fails
 */
async function extractTikTokMetadata(url) {
  try {
    // First try TikTok oEmbed API
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl);
    
    if (response.ok) {
      const data = await response.json();
      
      // Extract hashtags from title
      const hashtagRegex = /#[\w\u00C0-\u024F]+/g;
      const hashtags = data.title?.match(hashtagRegex) || [];
      
      // Clean description (remove hashtags for cleaner text)
      const description = data.title?.replace(hashtagRegex, '').trim() || '';
      
      return {
        platform: 'tiktok',
        success: true,
        username: data.author_name || null,
        userUrl: data.author_url || null,
        description: description,
        fullTitle: data.title || null,
        hashtags: hashtags,
        thumbnailUrl: data.thumbnail_url || null,
        thumbnailWidth: data.thumbnail_width || null,
        thumbnailHeight: data.thumbnail_height || null,
        embedHtml: data.html || null,
        method: 'oembed',
      };
    }
    
    // Fallback to Apify if oEmbed fails
    if (APIFY_API_TOKEN) {
      console.log('🔄 TikTok oEmbed failed, trying Apify...');
      return await extractWithApify(url, 'tiktok');
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
 * Extract metadata from Instagram Reel URL
 * Uses Apify instagram-scraper as primary method
 * Falls back to Facebook Graph API oEmbed if available
 */
async function extractInstagramMetadata(url) {
  try {
    // Clean the URL - handle various Instagram URL formats
    let cleanUrl = url;
    
    // Handle shortened URLs (instagr.am)
    if (url.includes('instagr.am')) {
      const redirectResponse = await fetch(url, { redirect: 'follow' });
      cleanUrl = redirectResponse.url;
    }
    
    // Remove query parameters for cleaner URL
    cleanUrl = cleanUrl.split('?')[0];
    
    // PRIMARY: Use Apify Instagram Scraper
    if (APIFY_API_TOKEN) {
      console.log('🤖 Using Apify Instagram Scraper...');
      const apifyResult = await extractWithApify(cleanUrl, 'instagram');
      if (apifyResult.success) {
        return apifyResult;
      }
      console.log('⚠️ Apify failed, trying fallback...');
    }
    
    // FALLBACK: Use Facebook Graph API oEmbed (official API)
    if (FACEBOOK_APP_ID && FACEBOOK_APP_SECRET) {
      console.log('Using Facebook Graph API for Instagram oEmbed...');
      
      const accessToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
      const graphUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(cleanUrl)}&access_token=${accessToken}`;
      
      const response = await fetch(graphUrl);
      
      if (response.ok) {
        const data = await response.json();
        
        console.log('✅ Facebook Graph API response:', JSON.stringify(data, null, 2));
        
        // The title field contains the caption with hashtags
        const fullTitle = data.title || '';
        
        // Extract hashtags from title
        const hashtagRegex = /#[\w\u00C0-\u024F]+/g;
        const hashtags = fullTitle.match(hashtagRegex) || [];
        
        // Clean description (remove hashtags for cleaner text)
        const description = fullTitle.replace(hashtagRegex, '').trim();
        
        return {
          platform: 'instagram',
          success: true,
          username: data.author_name || null,
          userUrl: data.author_url || null,
          description: description,
          fullTitle: fullTitle,
          hashtags: hashtags,
          thumbnailUrl: data.thumbnail_url || null,
          thumbnailWidth: data.thumbnail_width || null,
          thumbnailHeight: data.thumbnail_height || null,
          method: 'facebook_graph_api',
        };
      } else {
        const errorData = await response.json();
        console.log('❌ Facebook Graph API error:', errorData);
      }
    }
    
    // LAST FALLBACK: Try legacy Instagram oEmbed API
    console.log('Trying legacy Instagram oEmbed API...');
    const legacyOembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(cleanUrl)}`;
    const legacyResponse = await fetch(legacyOembedUrl);
    
    if (legacyResponse.ok) {
      const data = await legacyResponse.json();
      
      const hashtagRegex = /#[\w\u00C0-\u024F]+/g;
      const hashtags = data.title?.match(hashtagRegex) || [];
      const description = data.title?.replace(hashtagRegex, '').trim() || '';
      
      return {
        platform: 'instagram',
        success: true,
        username: data.author_name || null,
        userUrl: data.author_url || null,
        description: description,
        fullTitle: data.title || null,
        hashtags: hashtags,
        thumbnailUrl: data.thumbnail_url || null,
        method: 'legacy_oembed',
      };
    }
    
    // If all APIs fail, return error
    return {
      platform: 'instagram',
      success: false,
      error: 'Could not extract metadata from Instagram',
      originalUrl: url,
    };
    
  } catch (error) {
    console.error('Instagram extraction error:', error);
    return {
      platform: 'instagram',
      success: false,
      error: error.message,
    };
  }
}

/**
 * Extract metadata using Apify scrapers (fallback)
 * More robust than oEmbed but requires API token
 */
async function extractWithApify(url, platform) {
  if (!APIFY_API_TOKEN) {
    return {
      platform,
      success: false,
      error: 'Apify API token not configured',
    };
  }
  
  try {
    console.log(`🤖 Using Apify to scrape ${platform}...`);
    
    // Apify actor IDs for different platforms
    const actorIds = {
      instagram: 'apify/instagram-scraper',
      tiktok: 'clockworks/tiktok-scraper',
    };
    
    const actorId = actorIds[platform];
    if (!actorId) {
      throw new Error(`Unsupported platform for Apify: ${platform}`);
    }
    
    // Build input based on platform
    let input;
    if (platform === 'instagram') {
      // apify/instagram-scraper input format
      input = {
        directUrls: [url],
        resultsType: 'posts',
        resultsLimit: 1,
        searchType: 'hashtag',
        searchLimit: 1,
      };
    } else if (platform === 'tiktok') {
      // clockworks/tiktok-scraper input format
      input = {
        postURLs: [url],
        resultsPerPage: 1,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
      };
    }
    
    // Run the Apify actor
    const runResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_API_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    
    if (!runResponse.ok) {
      throw new Error('Failed to start Apify actor');
    }
    
    const runData = await runResponse.json();
    const runId = runData.data?.id;
    
    // Wait for the run to complete (with timeout)
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`);
      const statusData = await statusResponse.json();
      
      if (statusData.data?.status === 'SUCCEEDED') {
        // Get the results
        const datasetId = statusData.data?.defaultDatasetId;
        const resultsResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`);
        const results = await resultsResponse.json();
        
        if (results && results.length > 0) {
          const item = results[0];
          console.log('📦 Apify raw result:', JSON.stringify(item, null, 2).substring(0, 500));
          
          // Extract data based on platform format
          let caption, username, thumbnailUrl;
          
          if (platform === 'instagram') {
            // apify/instagram-scraper output format
            caption = item.caption || item.alt || item.text || '';
            username = item.ownerUsername || item.owner?.username || null;
            thumbnailUrl = item.displayUrl || item.thumbnailUrl || item.previewUrl || null;
          } else if (platform === 'tiktok') {
            // clockworks/tiktok-scraper output format
            caption = item.text || item.desc || item.description || '';
            username = item.authorMeta?.name || item.author?.uniqueId || item.authorName || null;
            thumbnailUrl = item.videoMeta?.coverUrl || item.covers?.default || item.cover || null;
          }
          
          // Extract hashtags
          const hashtagRegex = /#[\w\u00C0-\u024F]+/g;
          const hashtags = caption.match(hashtagRegex) || [];
          const description = caption.replace(hashtagRegex, '').trim();
          
          return {
            platform,
            success: true,
            username: username,
            userUrl: null,
            description: description,
            fullTitle: caption,
            hashtags: hashtags,
            thumbnailUrl: thumbnailUrl,
            method: 'apify',
          };
        }
        break;
      } else if (statusData.data?.status === 'FAILED' || statusData.data?.status === 'ABORTED') {
        throw new Error('Apify actor failed');
      }
      
      attempts++;
    }
    
    throw new Error('Apify scraping timed out');
  } catch (error) {
    console.error('Apify extraction error:', error);
    return {
      platform,
      success: false,
      error: error.message,
      method: 'apify_failed',
    };
  }
}

/**
 * Use Gemini AI to intelligently match experiences based on social media content
 */
async function matchExperiencesWithAI(metadata, experiences) {
  if (!GOOGLE_AI_KEY) {
    console.log('⚠️ Google AI key not configured, using keyword matching');
    return null;
  }
  
  try {
    console.log('🤖 Using Gemini AI for smart experience matching...');
    
    const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    // Create a summary of available experiences
    const experiencesSummary = experiences.map(exp => ({
      id: exp.id,
      title: exp.title,
      category: exp.category,
      tags: exp.tags,
      location: exp.location,
      description: exp.description?.substring(0, 200),
    }));
    
    const prompt = `You are an experience matching assistant for Bored Tourist, a travel app in Portugal.

A user shared this social media content:
- Platform: ${metadata.platform}
- Description: "${metadata.description || metadata.fullTitle || 'No description'}"
- Hashtags: ${(metadata.hashtags || []).join(', ') || 'None'}
- Username: ${metadata.username || 'Unknown'}

Here are the available experiences in our app:
${JSON.stringify(experiencesSummary, null, 2)}

TASK: Based on the social media content, identify which experiences would be the BEST matches for someone interested in this type of content.

RULES:
1. Return ONLY a JSON array of experience IDs, ordered by relevance (best match first)
2. Maximum 5 experiences
3. Only include experiences that are genuinely relevant
4. If nothing matches well, return an empty array []
5. Consider: activity type, location, vibe, hashtags, and general interest

IMPORTANT: Return ONLY the JSON array, no explanation. Example: [3, 18, 5]`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3, // Lower temperature for more consistent matching
        maxOutputTokens: 100,
      },
    });

    const response = await result.response;
    const text = response.text().trim();
    
    console.log('🤖 AI Response:', text);
    
    // Parse the JSON array
    const matchedIds = JSON.parse(text);
    
    if (Array.isArray(matchedIds) && matchedIds.length > 0) {
      // Return matched experiences in order
      const matchedExperiences = matchedIds
        .map(id => experiences.find(exp => exp.id === id || exp.id === String(id)))
        .filter(Boolean);
      
      console.log('✅ AI matched experiences:', matchedExperiences.map(e => e.title));
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
  
  // Keywords mapping to experience categories
  const keywordMap = {
    surf: ['surf', 'surfing', 'waves', 'ondas', 'surfboard', 'beach'],
    yoga: ['yoga', 'meditation', 'wellness', 'mindfulness', 'zen'],
    wine: ['wine', 'vinho', 'vineyard', 'winery', 'tasting'],
    cooking: ['cooking', 'cook', 'chef', 'kitchen', 'culinary', 'food'],
    adventure: ['adventure', 'adrenaline', 'extreme', 'thrill'],
    nature: ['nature', 'outdoor', 'hiking', 'natureza', 'forest'],
    dolphins: ['dolphin', 'dolphins', 'whale', 'marine', 'boat'],
    horse: ['horse', 'horseback', 'riding', 'equestrian'],
    climb: ['climbing', 'climb', 'bridge', 'rappel'],
    diving: ['diving', 'scuba', 'underwater', 'snorkel'],
    paragliding: ['paragliding', 'gliding', 'parapente', 'flying'],
    quad: ['quad', 'atv', '4x4', 'offroad', 'buggy'],
    tiles: ['tiles', 'azulejos', 'ceramic', 'pottery', 'craft'],
    sintra: ['sintra', 'palace', 'castle', 'pena'],
  };
  
  // Score each experience
  const scored = experiences.map(exp => {
    let score = 0;
    const expContent = `${exp.title} ${exp.description || ''} ${exp.category} ${(exp.tags || []).join(' ')}`.toLowerCase();
    
    for (const [category, keywords] of Object.entries(keywordMap)) {
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          // Check if experience matches this category
          if (expContent.includes(keyword)) {
            score += 10;
          }
          for (const tag of (exp.tags || [])) {
            if (tag.toLowerCase().includes(keyword)) {
              score += 5;
            }
          }
        }
      }
    }
    
    return { experience: exp, score };
  });
  
  // Return top matches
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.experience);
}

/**
 * Detect platform from URL
 */
function detectPlatform(url) {
  if (!url) return null;
  
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('tiktok.com') || lowerUrl.includes('vm.tiktok')) {
    return 'tiktok';
  }
  
  if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagr.am')) {
    return 'instagram';
  }
  
  return null;
}

/**
 * POST /api/social-media/extract
 * Extract metadata from a social media URL
 * 
 * Body: { url: string }
 * Returns: { platform, success, username, description, hashtags, ... }
 */
router.post('/extract', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }
    
    const platform = detectPlatform(url);
    
    if (!platform) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported platform. Only TikTok and Instagram are supported.',
        supportedPlatforms: ['tiktok', 'instagram'],
      });
    }
    
    let metadata;
    
    if (platform === 'tiktok') {
      metadata = await extractTikTokMetadata(url);
    } else if (platform === 'instagram') {
      metadata = await extractInstagramMetadata(url);
    }
    
    // Add the original URL to the response
    metadata.originalUrl = url;
    
    res.json(metadata);
    
  } catch (error) {
    console.error('Social media extraction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to extract metadata',
      details: error.message,
    });
  }
});

/**
 * GET /api/social-media/test
 * Test endpoint
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Social media extraction API is working',
    supportedPlatforms: ['tiktok', 'instagram'],
    features: ['metadata_extraction', 'ai_matching', 'apify_fallback'],
  });
});

/**
 * GET /api/social-media/debug
 * Debug endpoint - check env vars
 */
router.get('/debug', (req, res) => {
  res.json({
    success: true,
    env: {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
      hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
      hasApifyToken: !!process.env.APIFY_API_TOKEN,
      hasGoogleAiKey: !!process.env.GOOGLE_AI_KEY,
      hasFacebookAppId: !!process.env.FACEBOOK_APP_ID,
    },
  });
});

/**
 * POST /api/social-media/smart-match
 * Extract metadata AND find matching experiences using AI
 * 
 * Body: { url: string }
 * Returns: { 
 *   success: boolean,
 *   metadata: { platform, description, hashtags, ... },
 *   matchedExperiences: Experience[],
 *   matchMethod: 'ai' | 'keywords' | 'suggested'
 * }
 */
router.post('/smart-match', async (req, res) => {
  try {
    const { url } = req.body;
    
    console.log('🔍 Smart match request for:', url);
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }
    
    const platform = detectPlatform(url);
    
    if (!platform) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported platform. Only TikTok and Instagram are supported.',
        supportedPlatforms: ['tiktok', 'instagram'],
      });
    }
    
    // Step 1: Extract metadata from social media
    console.log('📱 Step 1: Extracting metadata...');
    let metadata;
    
    if (platform === 'tiktok') {
      metadata = await extractTikTokMetadata(url);
    } else if (platform === 'instagram') {
      metadata = await extractInstagramMetadata(url);
    }
    
    metadata.originalUrl = url;
    console.log('📱 Metadata extracted:', metadata);
    
    // Step 2: Fetch all experiences from database
    console.log('📦 Step 2: Fetching experiences...');
    
    const db = getSupabase();
    if (!db) {
      return res.json({
        success: true,
        metadata,
        matchedExperiences: [],
        matchMethod: 'none',
        error: 'Database not configured',
      });
    }
    
    const { data: experiences, error: dbError } = await db
      .from('experiences')
      .select('id, title, description, category, tags, location, price, currency, duration, rating, review_count, image_url, operator_name')
      .eq('active', true)
      .order('rating', { ascending: false });
    
    if (dbError) {
      console.error('Database error:', dbError);
      return res.json({
        success: true,
        metadata,
        matchedExperiences: [],
        matchMethod: 'none',
        error: 'Could not fetch experiences',
      });
    }
    
    console.log(`📦 Found ${experiences?.length || 0} experiences`);
    
    if (!experiences || experiences.length === 0) {
      return res.json({
        success: true,
        metadata,
        matchedExperiences: [],
        matchMethod: 'none',
      });
    }
    
    // Step 3: Try AI matching first
    console.log('🤖 Step 3: Trying AI matching...');
    let matchedExperiences = await matchExperiencesWithAI(metadata, experiences);
    let matchMethod = 'ai';
    
    // Step 4: Fallback to keyword matching if AI fails
    if (!matchedExperiences || matchedExperiences.length === 0) {
      console.log('🔤 Step 4: Falling back to keyword matching...');
      matchedExperiences = matchExperiencesWithKeywords(metadata, experiences);
      matchMethod = 'keywords';
    }
    
    // Step 5: If still no matches, suggest top-rated experiences
    if (!matchedExperiences || matchedExperiences.length === 0) {
      console.log('⭐ Step 5: No matches found, suggesting top experiences...');
      matchedExperiences = experiences
        .filter(e => e.rating >= 4.0)
        .slice(0, 5);
      matchMethod = 'suggested';
    }
    
    // Transform experiences to match frontend format
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
    
    console.log(`✅ Returning ${transformedExperiences.length} matched experiences (${matchMethod})`);
    
    res.json({
      success: true,
      metadata,
      matchedExperiences: transformedExperiences,
      matchMethod,
    });
    
  } catch (error) {
    console.error('Smart match error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process social media content',
      details: error.message,
    });
  }
});

module.exports = router;
