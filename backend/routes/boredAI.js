/**
 * Bored AI - Social Media to Experiences Matching
 * 
 * Flow: User shares Reel/TikTok → Extract metadata → Gemini AI match → Return 3 bookable experiences
 * 
 * This is based on test-gemini-match.js that WORKS!
 */

const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

// HARDCODED CREDENTIALS (same as test-gemini-match.js that works!)
const SUPABASE_URL = 'https://hnivuisqktlrusyqywaz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXZ1aXNxa3RscnVzeXF5d2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNzE2NzgsImV4cCI6MjA3ODc0NzY3OH0.amqHQkxh9tun5cIHUJN23ocGImZek6QfoSGpLDSUhDA';
const GOOGLE_AI_KEY = 'AIzaSyAlvnCcn8ndC6avTq2BlW7LJ-H3VgCEAk4';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '13e6fed9b4msh7770b0604d16a75p11d71ejsn0d42966b3d99';

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);

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

/**
 * Extract TikTok metadata using oEmbed (FREE, no API key needed)
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
      };
    }
    throw new Error('Failed to fetch TikTok metadata');
  } catch (error) {
    console.error('TikTok extraction error:', error);
    return { platform: 'tiktok', success: false, error: error.message };
  }
}

/**
 * Extract Instagram metadata using RapidAPI - Media Data V2 endpoint
 * Only extracts: description, hashtags, and top 5 comments as fallback
 */
async function extractInstagramMetadata(url) {
  try {
    // Clean URL - extract shortcode (media_code)
    let cleanUrl = url.split('?')[0];
    if (!cleanUrl.endsWith('/')) cleanUrl += '/';
    
    // Extract shortcode from URL (works for /p/, /reel/, /reels/)
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
        return { 
          platform: 'instagram', 
          success: false, 
          error: data.message,
          originalUrl: url
        };
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
        topComments = commentEdges
          .slice(0, 5)
          .map(edge => edge.node?.text || '')
          .filter(text => text.length > 0);
        console.log('📸 No caption found, using top comments as fallback');
      }
      
      console.log('📸 Extracted - Description:', description.substring(0, 100) + '...');
      console.log('📸 Extracted - Hashtags:', hashtags);
      if (topComments.length > 0) {
        console.log('📸 Extracted - Top Comments:', topComments.length);
      }

      return {
        platform: 'instagram',
        success: true,
        description: description,
        hashtags: hashtags,
        topComments: topComments, // Only populated if no description/hashtags
        originalUrl: url
      };
    }
    throw new Error('Failed to fetch Instagram metadata: ' + response.status);
  } catch (error) {
    console.error('Instagram extraction error:', error);
    return { platform: 'instagram', success: false, error: error.message, originalUrl: url };
  }
}

/**
 * POST /api/bored-ai/match
 * 
 * Main endpoint: Receive URL → Extract → Match → Return 3 experiences
 */
router.post('/match', async (req, res) => {
  try {
    const { url } = req.body;
    
    console.log('\n🚀 ========== BORED AI MATCH ==========');
    console.log('📱 URL received:', url);
    
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }
    
    // Step 1: Detect platform
    const platform = detectPlatform(url);
    if (!platform) {
      return res.status(400).json({ 
        success: false, 
        error: 'Unsupported platform. Only Instagram and TikTok are supported.' 
      });
    }
    console.log('🎯 Platform detected:', platform);
    
    // Step 2: Extract metadata
    console.log('📱 Extracting metadata...');
    let metadata;
    if (platform === 'tiktok') {
      metadata = await extractTikTokMetadata(url);
    } else {
      metadata = await extractInstagramMetadata(url);
    }
    
    if (!metadata.success) {
      console.log('⚠️ Metadata extraction failed:', metadata.error);
      return res.json({
        success: false,
        error: metadata.error || 'Failed to extract metadata from ' + platform,
        message: metadata.error === 'Post is private or unavailable' 
          ? 'This post seems to be private or unavailable. Try sharing a public post!' 
          : 'Could not read this post. Try a different one!',
        metadata
      });
    }
    
    console.log('✅ Metadata extracted:');
    console.log('   Description:', metadata.description?.substring(0, 100) + '...');
    console.log('   Hashtags:', metadata.hashtags?.slice(0, 5).join(', '));
    
    // Step 3: Fetch experiences from Supabase
    console.log('📦 Fetching experiences from Supabase...');
    const { data: experiences, error: dbError } = await supabase
      .from('experiences')
      .select('id, title, description, category, tags, location, price, currency, duration, rating, review_count, image_url, images')
      .order('rating', { ascending: false });
    
    if (dbError) {
      console.error('❌ Supabase error:', dbError);
      return res.json({ success: false, error: 'Database error', metadata });
    }
    
    console.log('📦 Total experiences:', experiences.length);
    
    // Step 4: Call Gemini AI for matching
    console.log('🤖 Calling Gemini AI...');
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const experiencesSummary = experiences.map(exp => ({
      id: exp.id, 
      title: exp.title, 
      category: exp.category, 
      tags: exp.tags, 
      location: exp.location
    }));
    
    // Build content context - use comments as fallback if no description/hashtags
    let contentContext = '';
    if (metadata.description || (metadata.hashtags && metadata.hashtags.length > 0)) {
      contentContext = 'Description: "' + (metadata.description || '') + '"\nHashtags: ' + (metadata.hashtags || []).join(', ');
    } else if (metadata.topComments && metadata.topComments.length > 0) {
      contentContext = 'Top Comments (no description available):\n' + metadata.topComments.map((c, i) => `${i+1}. "${c}"`).join('\n');
    } else {
      contentContext = 'No content available - match based on general travel experiences';
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

Return ONLY a JSON array of experience IDs (max 5), ordered by relevance (direct matches first).
Example: [26, 18, 19, 5, 3]

If nothing matches well, return [].`;

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
    
    // Step 5: Get full experience data for matched IDs (TOP 3)
    const matchedExperiences = matchedIds
      .slice(0, 3)
      .map(id => experiences.find(exp => exp.id === id || exp.id === String(id)))
      .filter(Boolean)
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
        provider: exp.operator_name,
      }));
    
    console.log('\n✅ TOP 3 MATCHED EXPERIENCES:');
    matchedExperiences.forEach((exp, i) => {
      console.log(`   ${i + 1}. ${exp.title} (${exp.location})`);
    });
    console.log('========================================\n');
    
    // Return response
    res.json({
      success: true,
      metadata: {
        platform: metadata.platform,
        description: metadata.description,
        hashtags: metadata.hashtags,
        thumbnail: metadata.thumbnailUrl,
        username: metadata.username,
      },
      experiences: matchedExperiences,
      matchCount: matchedExperiences.length,
    });
    
  } catch (error) {
    console.error('❌ Bored AI error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process: ' + error.message 
    });
  }
});

/**
 * GET /api/bored-ai/test
 * Health check endpoint
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Bored AI is ready! 🚀',
    supportedPlatforms: ['instagram', 'tiktok'],
    endpoint: 'POST /api/bored-ai/match with { "url": "..." }',
  });
});

module.exports = router;
