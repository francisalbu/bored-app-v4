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

// Extract Instagram metadata - Using Media Data V2 endpoint (recommended by RapidAPI support)
async function extractInstagramMetadata(url) {
  try {
    let cleanUrl = url.split('?')[0];
    if (!cleanUrl.endsWith('/')) cleanUrl += '/';
    
    // Extract shortcode from URL
    const shortcodeMatch = cleanUrl.match(/\/(p|reel|reels)\/([^\/]+)/);
    const mediaCode = shortcodeMatch ? shortcodeMatch[2] : null;
    
    console.log('📸 Extracting Instagram metadata for:', mediaCode);
    
    if (!mediaCode) {
      throw new Error('Could not extract media code from URL');
    }
    
    // Use get_media_data_v2.php endpoint (stable and recommended by support)
    const response = await fetch('https://instagram-scraper-stable-api.p.rapidapi.com/get_media_data_v2.php?media_code=' + encodeURIComponent(mediaCode), {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com'
      }
    });
    
    console.log('📸 RapidAPI response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      
      // Check for error responses
      if (data.message) {
        console.log('⚠️ RapidAPI error:', data.message);
        return { platform: 'instagram', success: false, error: data.message, originalUrl: url };
      }
      
      // Extract caption from edge_media_to_caption
      const captionEdges = data.edge_media_to_caption?.edges || [];
      const caption = captionEdges.length > 0 ? captionEdges[0]?.node?.text || '' : '';
      
      // Extract hashtags from caption
      const hashtagRegex = /#[\w\u00C0-\u024F]+/g;
      const hashtags = caption.match(hashtagRegex) || [];
      const description = caption.replace(hashtagRegex, '').trim();
      
      // If no description/hashtags, get top 5 comments as fallback
      let topComments = [];
      if (!description && hashtags.length === 0) {
        const commentEdges = data.edge_media_to_parent_comment?.edges || [];
        topComments = commentEdges.slice(0, 5).map(edge => edge.node?.text || '').filter(text => text.length > 0);
        console.log('📸 No caption found, using top comments as fallback');
      }
      
      console.log('📸 Extracted - Description:', description.substring(0, 100) + '...');
      console.log('📸 Extracted - Hashtags:', hashtags);

      return {
        platform: 'instagram',
        success: true,
        description: description,
        hashtags: hashtags,
        topComments: topComments,
        username: data.owner?.username || null,
        originalUrl: url
      };
    }
    throw new Error('RapidAPI failed: ' + response.status);
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
      .select('id, title, description, category, tags, location, price, currency, duration, rating, review_count, image_url, images, highlights')
      .order('rating', { ascending: false });
    
    if (dbError || !experiences?.length) {
      console.error('❌ Supabase error:', dbError);
      return res.json({ success: true, metadata, matchedExperiences: [], matchMethod: 'none' });
    }
    console.log('📦 Found', experiences.length, 'experiences');
    
    // Call Gemini AI
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const experiencesSummary = experiences.map(exp => ({
      id: exp.id, title: exp.title, category: exp.category, tags: exp.tags, location: exp.location
    }));
    
    // Build content context - use comments as fallback if no description/hashtags
    let contentContext = '';
    if (metadata.description || (metadata.hashtags && metadata.hashtags.length > 0)) {
      contentContext = 'Description: "' + (metadata.description || '') + '"\nHashtags: ' + (metadata.hashtags || []).join(', ');
    } else if (metadata.topComments && metadata.topComments.length > 0) {
      contentContext = 'Top Comments (no description available):\n' + metadata.topComments.map((c, i) => `${i+1}. "${c}"`).join('\n');
    } else {
      contentContext = 'No content available';
    }
    
    const prompt = `You are matching social media content to travel experiences in Portugal.

SOCIAL MEDIA CONTENT:
${contentContext}

AVAILABLE EXPERIENCES:
${JSON.stringify(experiencesSummary, null, 2)}

STRICT MATCHING RULES:

1. ONLY return experiences with a CLEAR, DIRECT connection to the content
2. Quality over quantity - if only 1-2 experiences truly match, return only those
3. DO NOT force matches just to fill slots - empty array is better than bad matches

WHAT COUNTS AS A MATCH:
✅ Same activity (kayak content → kayak experience)
✅ Same environment (ocean/water content → water-based experiences)
✅ Same theme (adventure content → adventure experiences)

WHAT DOES NOT COUNT:
❌ Same location only (both mention "Atlantic" but different activities)
❌ Vague connections (beach content → random outdoor activity)
❌ Forcing unrelated experiences to reach a number

Return ONLY a JSON array of experience IDs, ordered by relevance.
Return between 0-3 IDs depending on how many TRULY match.
Example: [26, 18] or [5] or []

IMPORTANT: It's better to return 1-2 perfect matches than 3+ mediocre ones.`;

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
      .map(exp => {
        // Get the first image from images array (JSONB), fallback to image_url
        let firstImage = null;
        if (exp.images) {
          // images can be a JSON string or already parsed array
          const imagesArray = typeof exp.images === 'string' ? JSON.parse(exp.images) : exp.images;
          if (Array.isArray(imagesArray) && imagesArray.length > 0) {
            firstImage = imagesArray[0];
          }
        }
        
        return {
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
          image: firstImage || exp.image_url, // USE images[0] first!
          images: exp.images, // Also send full array
        };
      });
    
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
