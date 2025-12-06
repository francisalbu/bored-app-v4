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

// API credentials
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const GOOGLE_AI_KEY = process.env.GOOGLE_AI_KEY || process.env.EXPO_PUBLIC_GOOGLE_AI_KEY;

// Supabase for fetching experiences
const { createClient } = require('@supabase/supabase-js');
let supabase = null;

function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      console.error('Supabase credentials not configured');
      return null;
    }
    
    supabase = createClient(url, key);
  }
  return supabase;
}

/**
 * Extract metadata from TikTok URL using oEmbed API
 */
async function extractTikTokMetadata(url) {
  try {
    const oembedUrl = 'https://www.tiktok.com/oembed?url=' + encodeURIComponent(url);
    const response = await fetch(oembedUrl);
    
    if (response.ok) {
      const data = await response.json();
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
    return { platform: 'tiktok', success: false, error: error.message };
  }
}

/**
 * Extract Instagram metadata using RapidAPI
 */
async function extractInstagramMetadata(url) {
  try {
    let cleanUrl = url;
    if (url.includes('instagr.am')) {
      const redirectResponse = await fetch(url, { redirect: 'follow' });
      cleanUrl = redirectResponse.url;
    }
    cleanUrl = cleanUrl.split('?')[0];
    
    if (!RAPIDAPI_KEY) {
      return { platform: 'instagram', success: false, error: 'RapidAPI key not configured' };
    }
    
    console.log('Using RapidAPI for Instagram scraping...');
    
    const shortcodeMatch = cleanUrl.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
    if (!shortcodeMatch) {
      return { platform: 'instagram', success: false, error: 'Could not extract shortcode from URL' };
    }
    
    const shortcode = shortcodeMatch[2];
    const isReel = shortcodeMatch[1] === 'reel' || shortcodeMatch[1] === 'reels';
    
    console.log('Shortcode:', shortcode, '| isReel:', isReel);
    
    const endpoint = isReel 
      ? 'https://instagram-scraper-stable-api.p.rapidapi.com/get_reel_title.php?reel_post_code_or_url=' + shortcode + '&type=reel'
      : 'https://instagram-scraper-stable-api.p.rapidapi.com/get_post_title.php?post_code_or_url=' + shortcode + '&type=post';
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com',
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
    });
    
    if (!response.ok) {
      console.log('RapidAPI error:', response.status);
      return { platform: 'instagram', success: false, error: 'RapidAPI request failed: ' + response.status };
    }
    
    const data = await response.json();
    console.log('RapidAPI response:', JSON.stringify(data).substring(0, 500));
    
    if (data && (data.post_caption || data.description)) {
      const caption = data.post_caption || data.description || '';
      const hashtagRegex = /#[\w\u00C0-\u024F]+/g;
      const hashtags = caption.match(hashtagRegex) || [];
      const description = caption.replace(hashtagRegex, '').trim();
      
      console.log('Caption extracted:', caption.substring(0, 200));
      
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
 * Use Gemini AI to match experiences
 */
async function matchExperiencesWithAI(metadata, experiences) {
  if (!GOOGLE_AI_KEY) {
    console.log('Google AI key not configured, using keyword matching');
    return null;
  }
  
  try {
    console.log('Using Gemini AI for experience matching...');
    
    const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const experiencesSummary = experiences.map(function(exp) {
      return { id: exp.id, title: exp.title, category: exp.category, tags: exp.tags, location: exp.location };
    });
    
    let contentContext = '';
    if (metadata.description || metadata.fullTitle) {
      contentContext += 'Description: "' + (metadata.description || metadata.fullTitle) + '"\n';
    }
    if (metadata.hashtags && metadata.hashtags.length > 0) {
      contentContext += 'Hashtags: ' + metadata.hashtags.join(', ') + '\n';
    }
    
    if (!contentContext.trim()) return null;
    
    const prompt = 'You are matching social media content to travel experiences in Portugal.\n\nSOCIAL MEDIA CONTENT:\n' + contentContext + '\n\nAVAILABLE EXPERIENCES:\n' + JSON.stringify(experiencesSummary, null, 2) + '\n\nMATCHING RULES:\n- surf/waves/surfing -> surf experiences\n- wine/vineyard/tasting -> wine experiences\n- cooking/chef/food -> cooking classes\n- yoga/meditation -> yoga experiences\n- horse/riding -> horseback riding\n- beach/praia -> beach activities\n- adventure/adrenaline -> adventure experiences\n- sintra/palace -> Sintra tours\n- lisbon/lisboa -> Lisbon tours\n\nReturn ONLY a JSON array of experience IDs (max 5), ordered by relevance.\nExample: [18, 19, 5]\n\nIf nothing matches well, return [].';

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 100 },
    });

    const text = result.response.text().trim();
    console.log('AI Response:', text);
    
    const matchedIds = JSON.parse(text);
    
    if (Array.isArray(matchedIds) && matchedIds.length > 0) {
      const matchedExperiences = matchedIds
        .map(function(id) { return experiences.find(function(exp) { return exp.id === id || exp.id === String(id); }); })
        .filter(Boolean);
      
      console.log('AI matched:', matchedExperiences.map(function(e) { return e.title; }));
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
  const content = (metadata.description || '') + ' ' + (metadata.fullTitle || '') + ' ' + (metadata.hashtags || []).join(' ');
  const contentLower = content.toLowerCase();
  
  console.log('Keyword matching:', contentLower.substring(0, 200));
  
  const keywordMap = {
    surf: ['surf', 'surfing', 'waves', 'ondas', 'surfboard', 'surfer'],
    yoga: ['yoga', 'meditation', 'wellness', 'mindfulness', 'zen'],
    wine: ['wine', 'vinho', 'vineyard', 'winery', 'tasting'],
    cooking: ['cooking', 'cook', 'chef', 'kitchen', 'culinary', 'food', 'pastel', 'nata'],
    dolphins: ['dolphin', 'dolphins', 'whale', 'golfinho', 'marine'],
    horse: ['horse', 'horseback', 'riding', 'equestrian', 'cavalo'],
    beach: ['beach', 'praia', 'coast', 'seaside', 'comporta', 'caparica'],
    adventure: ['adventure', 'adrenaline', 'extreme', 'quad', 'atv', 'buggy'],
    sintra: ['sintra', 'palace', 'castle', 'pena', 'regaleira'],
    lisbon: ['lisbon', 'lisboa', 'alfama', 'baixa', 'chiado', 'tram'],
    tiles: ['tiles', 'azulejos', 'ceramic', 'pottery', 'craft'],
    climbing: ['climbing', 'climb', 'bridge', 'rappel', '25 abril'],
  };
  
  var scored = experiences.map(function(exp) {
    var score = 0;
    var expContent = (exp.title + ' ' + (exp.description || '') + ' ' + exp.category + ' ' + (exp.tags || []).join(' ')).toLowerCase();
    
    Object.keys(keywordMap).forEach(function(category) {
      keywordMap[category].forEach(function(keyword) {
        if (contentLower.includes(keyword)) {
          if (expContent.includes(keyword)) {
            score += 20;
          }
          if (Array.isArray(exp.tags)) {
            exp.tags.forEach(function(tag) {
              if (tag && tag.toLowerCase().includes(keyword)) {
                score += 10;
              }
            });
          }
        }
      });
    });
    
    return { experience: exp, score: score };
  });
  
  var topMatches = scored.filter(function(s) { return s.score > 0; }).sort(function(a, b) { return b.score - a.score; }).slice(0, 5);
  console.log('Top matches:', topMatches.map(function(m) { return { title: m.experience.title, score: m.score }; }));
  
  return topMatches.map(function(s) { return s.experience; });
}

/**
 * Detect platform from URL
 */
function detectPlatform(url) {
  if (!url) return null;
  var lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('tiktok.com') || lowerUrl.includes('vm.tiktok')) return 'tiktok';
  if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagr.am')) return 'instagram';
  
  return null;
}

// ============ ROUTES ============

router.post('/extract', async function(req, res) {
  try {
    var url = req.body.url;
    
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }
    
    var platform = detectPlatform(url);
    
    if (!platform) {
      return res.status(400).json({ success: false, error: 'Unsupported platform. Only TikTok and Instagram are supported.' });
    }
    
    var metadata;
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

router.get('/test', function(req, res) {
  res.json({ success: true, message: 'Social media API is working', supportedPlatforms: ['tiktok', 'instagram'] });
});

router.get('/debug', function(req, res) {
  res.json({
    success: true,
    env: {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasRapidApiKey: !!process.env.RAPIDAPI_KEY,
      hasGoogleAiKey: !!process.env.GOOGLE_AI_KEY,
    },
  });
});

router.post('/smart-match', async function(req, res) {
  try {
    var url = req.body.url;
    
    console.log('Smart match for:', url);
    
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }
    
    var platform = detectPlatform(url);
    
    if (!platform) {
      return res.status(400).json({ success: false, error: 'Unsupported platform. Only TikTok and Instagram are supported.' });
    }
    
    console.log('Extracting metadata...');
    var metadata;
    if (platform === 'tiktok') {
      metadata = await extractTikTokMetadata(url);
    } else {
      metadata = await extractInstagramMetadata(url);
    }
    metadata.originalUrl = url;
    console.log('Metadata:', metadata);
    
    var db = getSupabase();
    if (!db) {
      return res.json({ success: true, metadata: metadata, matchedExperiences: [], matchMethod: 'none', error: 'Database not configured' });
    }
    
    var result = await db.from('experiences').select('id, title, description, category, tags, location, price, currency, duration, rating, review_count, image_url, operator_name').order('rating', { ascending: false });
    
    if (result.error || !result.data || !result.data.length) {
      return res.json({ success: true, metadata: metadata, matchedExperiences: [], matchMethod: 'none' });
    }
    
    var experiences = result.data;
    console.log('Found ' + experiences.length + ' experiences');
    
    var matchedExperiences = await matchExperiencesWithAI(metadata, experiences);
    var matchMethod = 'ai';
    
    if (!matchedExperiences || !matchedExperiences.length) {
      console.log('Falling back to keyword matching...');
      matchedExperiences = matchExperiencesWithKeywords(metadata, experiences);
      matchMethod = 'keywords';
    }
    
    if (!matchedExperiences || !matchedExperiences.length) {
      console.log('Suggesting top experiences...');
      matchedExperiences = experiences.filter(function(e) { return e.rating >= 4.0; }).slice(0, 5);
      matchMethod = 'suggested';
    }
    
    var transformedExperiences = matchedExperiences.map(function(exp) {
      var tags = exp.tags;
      if (!Array.isArray(tags)) {
        try { tags = JSON.parse(tags); } catch(e) { tags = []; }
      }
      return {
        id: String(exp.id),
        title: exp.title,
        description: exp.description,
        category: exp.category,
        tags: tags,
        location: exp.location,
        price: exp.price,
        currency: exp.currency || 'EUR',
        duration: exp.duration,
        rating: exp.rating,
        reviewCount: exp.review_count,
        image: exp.image_url,
        provider: exp.operator_name,
      };
    });
    
    console.log('Returning ' + transformedExperiences.length + ' experiences (' + matchMethod + ')');
    
    res.json({ success: true, metadata: metadata, matchedExperiences: transformedExperiences, matchMethod: matchMethod });
    
  } catch (error) {
    console.error('Smart match error:', error);
    res.status(500).json({ success: false, error: 'Failed to process content' });
  }
});

module.exports = router;
