/**
 * Social Media Routes - CLEAN VERSION
 * Based on test-gemini-match.js that WORKS!
 */

const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

// HARDCODED credentials (same as test-gemini-match.js)
const SUPABASE_URL = 'https://hnivuisqktlrusyqywaz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXZ1aXNxa3RscnVzeXF5d2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNzE2NzgsImV4cCI6MjA3ODc0NzY3OH0.amqHQkxh9tun5cIHUJN23ocGImZek6QfoSGpLDSUhDA';
const GOOGLE_AI_KEY = 'AIzaSyAlvnCcn8ndC6avTq2BlW7LJ-H3VgCEAk4';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '13e6fed9b4msh7770b0604d16a75p11d71ejsn0d42966b3d99';

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);

// Extract TikTok metadata
async function extractTikTokMetadata(url) {
  try {
    const response = await fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(url));
    if (response.ok) {
      const data = await response.json();
      const hashtags = data.title?.match(/#[\w\u00C0-\u024F]+/g) || [];
      return {
        platform: 'tiktok',
        success: true,
        description: data.title?.replace(/#[\w\u00C0-\u024F]+/g, '').trim() || '',
        fullTitle: data.title || '',
        hashtags,
        username: data.author_name || null,
      };
    }
    throw new Error('TikTok oEmbed failed');
  } catch (error) {
    return { platform: 'tiktok', success: false, error: error.message };
  }
}

// Extract Instagram metadata - CORRECT ENDPOINT from RapidAPI docs
async function extractInstagramMetadata(url) {
  try {
    let cleanUrl = url.split('?')[0];
    if (!cleanUrl.endsWith('/')) cleanUrl += '/';
    
    console.log('📸 Calling RapidAPI with URL:', cleanUrl);
    console.log('📸 Using key:', RAPIDAPI_KEY.substring(0, 10) + '...');
    
    // CORRECT ENDPOINT: GET request with query params
    const apiUrl = `https://instagram-scraper-stable-api.p.rapidapi.com/get_reel_title.php?reel_post_code_or_url=${encodeURIComponent(cleanUrl)}&type=reel`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com',
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
    });
    
    console.log('📸 RapidAPI response status:', response.status);
    const data = await response.json();
    console.log('📸 RapidAPI response data:', JSON.stringify(data).substring(0, 500));
    
    // Extract caption from response - field is "post_caption"
    const caption = data.post_caption || data.description || data.caption || '';
    if (caption) {
      const hashtags = caption.match(/#[\w\u00C0-\u024F]+/g) || [];
      const description = caption.replace(/#[\w\u00C0-\u024F]+/g, '').trim();
      
      return {
        platform: 'instagram',
        success: true,
        description,
        fullTitle: caption,
        hashtags,
        username: data.username || data.owner?.username || null,
      };
    }
    throw new Error('RapidAPI failed: ' + JSON.stringify(data).substring(0, 200));
  } catch (error) {
    console.error('📸 Instagram extraction error:', error.message);
    return { platform: 'instagram', success: false, error: error.message };
  }
}

// Detect platform
function detectPlatform(url) {
  if (!url) return null;
  if (url.includes('tiktok.com') || url.includes('vm.tiktok')) return 'tiktok';
  if (url.includes('instagram.com') || url.includes('instagr.am')) return 'instagram';
  return null;
}

// MAIN ENDPOINT - POST /api/social-media/smart-match
router.post('/smart-match', async (req, res) => {
  try {
    const { url } = req.body;
    console.log('🔍 Smart match for:', url);
    
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }
    
    const platform = detectPlatform(url);
    if (!platform) {
      return res.status(400).json({ success: false, error: 'Only TikTok and Instagram supported' });
    }
    
    // Extract metadata
    console.log('📱 Extracting metadata...');
    const metadata = platform === 'tiktok' 
      ? await extractTikTokMetadata(url)
      : await extractInstagramMetadata(url);
    metadata.originalUrl = url;
    console.log('📱 Metadata:', metadata);
    
    // Fetch experiences from Supabase
    const { data: experiences, error: dbError } = await supabase
      .from('experiences')
      .select('id, title, description, category, tags, location, price, currency, duration, rating, review_count, image_url, highlights')
      .order('rating', { ascending: false });
    
    if (dbError || !experiences?.length) {
      console.error('❌ Supabase error:', dbError);
      return res.json({ success: true, metadata, matchedExperiences: [], matchMethod: 'none' });
    }
    console.log('📦 Found', experiences.length, 'experiences');
    
    // Call Gemini AI
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const experiencesSummary = experiences.map(exp => ({
      id: exp.id, title: exp.title, category: exp.category, tags: exp.tags, location: exp.location, highlights: exp.highlights
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

    console.log('🤖 Calling Gemini AI...');
    console.log('🤖 Content context:', contentContext);
    
    let matchedIds = [];
    let matchMethod = 'none';
    
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 100 },
      });

      let text = result.response.text().trim();
      console.log('🤖 Gemini Response (raw):', text);
      
      // Clean markdown wrapper
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      console.log('🧹 Cleaned:', text);
      
      matchedIds = JSON.parse(text);
      matchMethod = 'ai';
      console.log('✅ Parsed IDs:', matchedIds);
    } catch (geminiError) {
      console.error('❌ Gemini error:', geminiError.message);
      // Fallback: return empty but don't crash
      matchedIds = [];
      matchMethod = 'none';
    }
    
    // Get full experience data - return TOP 3 only
    const matchedExperiences = matchedIds
      .map(id => experiences.find(exp => exp.id === id || exp.id === String(id)))
      .filter(Boolean)
      .slice(0, 3)
      .map(exp => ({
        id: String(exp.id),
        title: exp.title,
        description: exp.description,
        category: exp.category,
        tags: Array.isArray(exp.tags) ? exp.tags : [],
        location: exp.location,
        price: exp.price,
        currency: exp.currency || 'EUR',
        duration: exp.duration,
        rating: exp.rating,
        reviewCount: exp.review_count,
        image: exp.image_url,
      }));
    
    console.log('✅ Returning', matchedExperiences.length, 'experiences');
    
    res.json({
      success: true,
      metadata,
      matchedExperiences,
      matchMethod,
    });
    
  } catch (error) {
    console.error('❌ Smart match error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Social media API is working!' });
});

// Extract only (no matching)
router.post('/extract', async (req, res) => {
  try {
    const { url } = req.body;
    const platform = detectPlatform(url);
    
    if (!platform) {
      return res.status(400).json({ success: false, error: 'Unsupported platform' });
    }
    
    const metadata = platform === 'tiktok'
      ? await extractTikTokMetadata(url)
      : await extractInstagramMetadata(url);
    
    metadata.originalUrl = url;
    res.json(metadata);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
