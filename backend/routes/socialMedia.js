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

// RapidAPI credentials (alternative to Apify - has free tier)
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

/**
 * Extract Instagram metadata using RapidAPI (instagram120 API)
 */
async function extractWithRapidAPI(url) {
  if (!RAPIDAPI_KEY) {
    return { success: false, error: 'RapidAPI key not configured' };
  }
  
  try {
    console.log('🚀 Using RapidAPI (instagram120) for Instagram scraping...');
    
    // Extract shortcode from URL
    const shortcodeMatch = url.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
    if (!shortcodeMatch) {
      return { success: false, error: 'Could not extract shortcode from URL' };
    }
    const shortcode = shortcodeMatch[2];
    
    console.log('📝 Extracted shortcode:', shortcode);
    
    // Use instagram120 API on RapidAPI
    const response = await fetch('https://instagram120.p.rapidapi.com/api/instagram/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'instagram120.p.rapidapi.com',
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
      body: JSON.stringify({
        shortcode: shortcode,
      }),
    });
    
    if (!response.ok) {
      console.log('❌ RapidAPI error:', response.status);
      return { success: false, error: `RapidAPI request failed: ${response.status}` };
    }
    
    const data = await response.json();
    console.log('📦 RapidAPI response:', JSON.stringify(data).substring(0, 800));
    
    // Parse the response - instagram120 has different response format
    if (data) {
      // Try different possible response structures
      const post = data.data || data.result || data;
      
      // Get caption from various possible fields
      let caption = '';
      if (post.caption?.text) {
        caption = post.caption.text;
      } else if (post.edge_media_to_caption?.edges?.[0]?.node?.text) {
        caption = post.edge_media_to_caption.edges[0].node.text;
      } else if (typeof post.caption === 'string') {
        caption = post.caption;
      } else if (post.text) {
        caption = post.text;
      }
      
      console.log('📝 Caption extracted:', caption.substring(0, 200));
      
      // Extract hashtags
      const hashtagRegex = /#[\w\u00C0-\u024F]+/g;
      const hashtags = caption.match(hashtagRegex) || [];
      const description = caption.replace(hashtagRegex, '').trim();
      
      // Get username
      const username = post.owner?.username || 
                       post.user?.username || 
                       post.username || 
                       null;
      
      // Get thumbnail
      const thumbnailUrl = post.thumbnail_url ||
                           post.display_url ||
                           post.image_versions2?.candidates?.[0]?.url ||
                           post.thumbnail_src ||
                           null;
      
      return {
        platform: 'instagram',
        success: true,
        username: username,
        description: description,
        fullTitle: caption,
        hashtags: hashtags,
        thumbnailUrl: thumbnailUrl,
        method: 'rapidapi_instagram120',
      };
    }
    
    return { success: false, error: 'No data in RapidAPI response' };
  } catch (error) {
    console.error('RapidAPI error:', error);
    return { success: false, error: error.message };
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
    
    // PRIMARY: Try RapidAPI first (more reliable, has free tier)
    if (RAPIDAPI_KEY) {
      const rapidResult = await extractWithRapidAPI(cleanUrl);
      if (rapidResult.success) {
        return rapidResult;
      }
      console.log('⚠️ RapidAPI failed, trying Apify...');
    }
    
    // SECONDARY: Use Apify Instagram Scraper
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
 * Use Gemini Vision AI to analyze an image and extract activity/content information
 */
async function analyzeImageWithVision(imageUrl) {
  if (!GOOGLE_AI_KEY || !imageUrl) {
    return null;
  }
  
  try {
    console.log('👁️ Analyzing image with Gemini Vision:', imageUrl);
    
    const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    // Fetch the image and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.log('❌ Failed to fetch image');
      return null;
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
    
    const prompt = `Analyze this image from a social media travel/experience video. 
Identify what activity, location, or experience is shown.

Return a JSON object with:
{
  "activities": ["list of activities shown, e.g. surfing, yoga, wine tasting, hiking, cooking"],
  "location_hints": ["any location clues like beach, city, mountains, vineyard"],
  "mood": "adventure/relaxation/cultural/nature/food/romantic",
  "keywords": ["relevant keywords for matching travel experiences"]
}

Be specific about the activity. If you see:
- Water/waves/boards → surfing
- Horses → horseback riding
- Wine glasses/vineyards → wine tasting
- Kitchen/food prep → cooking class
- Cliffs/heights → paragliding or climbing
- Historic buildings → cultural tour
- Dogs/puppies → puppy yoga
- Tiles/ceramics → tile workshop
- Beach → beach activities
- Dolphins/whales → dolphin watching

Return ONLY the JSON, no explanation.`;

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text().trim();
    
    console.log('👁️ Vision analysis result:', text);
    
    // Parse the JSON response
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(cleanedText);
    
    return analysis;
  } catch (error) {
    console.error('Vision analysis error:', error);
    return null;
  }
}

/**
 * Use Gemini AI to intelligently match experiences based on social media content
 * Now includes Vision analysis fallback when text metadata is insufficient
 */
async function matchExperiencesWithAI(metadata, experiences, imageAnalysis = null) {
  if (!GOOGLE_AI_KEY) {
    console.log('⚠️ Google AI key not configured, using keyword matching');
    return null;
  }
  
  try {
    console.log('🤖 Using Gemini AI for smart experience matching...');
    
    const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    // Create a detailed summary of available experiences
    const experiencesSummary = experiences.map(exp => ({
      id: exp.id,
      title: exp.title,
      category: exp.category,
      tags: exp.tags,
      location: exp.location,
      description: exp.description?.substring(0, 300),
    }));
    
    // Build context from metadata AND image analysis
    let contentContext = '';
    
    if (metadata.description || metadata.fullTitle) {
      contentContext += `Text from post: "${metadata.description || metadata.fullTitle}"\n`;
    }
    if (metadata.hashtags && metadata.hashtags.length > 0) {
      contentContext += `Hashtags: ${metadata.hashtags.join(', ')}\n`;
    }
    if (metadata.username) {
      contentContext += `Posted by: @${metadata.username}\n`;
    }
    
    // Add image analysis if available
    if (imageAnalysis) {
      contentContext += `\nVISUAL ANALYSIS of the video thumbnail:\n`;
      if (imageAnalysis.activities && imageAnalysis.activities.length > 0) {
        contentContext += `- Activities detected: ${imageAnalysis.activities.join(', ')}\n`;
      }
      if (imageAnalysis.location_hints && imageAnalysis.location_hints.length > 0) {
        contentContext += `- Location hints: ${imageAnalysis.location_hints.join(', ')}\n`;
      }
      if (imageAnalysis.mood) {
        contentContext += `- Mood/vibe: ${imageAnalysis.mood}\n`;
      }
      if (imageAnalysis.keywords && imageAnalysis.keywords.length > 0) {
        contentContext += `- Keywords: ${imageAnalysis.keywords.join(', ')}\n`;
      }
    }
    
    // If we have very little context, note that
    if (!contentContext.trim() || contentContext.length < 30) {
      contentContext = 'Minimal information available - suggest popular diverse experiences.';
    }
    
    const prompt = `You are an experience matching assistant for Bored Tourist, a travel experiences app in Portugal.

A user shared a ${metadata.platform || 'social media'} video. Here's what we know about it:

${contentContext}

Here are ALL available experiences in our app:
${JSON.stringify(experiencesSummary, null, 2)}

YOUR TASK: Match the social media content to the MOST RELEVANT experiences.

MATCHING RULES:
1. If we detected surfing/waves → prioritize surf experiences
2. If we detected horses → prioritize horseback riding
3. If we detected wine/vineyard → prioritize wine tasting
4. If we detected cooking/food → prioritize cooking classes, food tours
5. If we detected beach → prioritize beach activities (surf, beach yoga, etc.)
6. If we detected city/urban → prioritize city tours, street art
7. If we detected adventure/extreme → prioritize quad, climbing, skydiving
8. If we detected relaxation → prioritize yoga, wellness
9. If we detected cultural/historic → prioritize cultural tours, Sintra
10. Match location when possible (Lisbon, Sintra, Setúbal, etc.)

CRITICAL: Be STRICT about relevance. A surf video should return surf experiences, NOT random tours.

Return ONLY a JSON array of experience IDs (numbers), ordered by relevance (best first).
Maximum 5 experiences. If nothing matches well, return fewer or [].

Example: [18, 19, 20]`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2, // Lower temperature for more consistent matching
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
 * Keyword-based matching fallback - now more comprehensive
 */
function matchExperiencesWithKeywords(metadata, experiences) {
  const content = `${metadata.description || ''} ${metadata.fullTitle || ''} ${(metadata.hashtags || []).join(' ')}`.toLowerCase();
  
  console.log('🔤 Keyword matching content:', content.substring(0, 200));
  
  // Comprehensive keywords mapping to experience categories
  // Each category maps to keywords AND preferred experience IDs
  const keywordMap = {
    surf: {
      keywords: ['surf', 'surfing', 'waves', 'ondas', 'surfboard', 'wave', 'surfer', 'barrel', 'board', 'surfcamp', 'surfschool'],
      expIds: [18, 19], // Surf experiences
    },
    yoga: {
      keywords: ['yoga', 'meditation', 'wellness', 'mindfulness', 'zen', 'stretch', 'breathe', 'relax', 'relaxation', 'namaste'],
      expIds: [2, 16, 19], // Yoga experiences
    },
    puppy: {
      keywords: ['puppy', 'puppies', 'dog', 'dogs', 'cachorro', 'pet', 'animal', 'cute'],
      expIds: [2], // Puppy yoga
    },
    wine: {
      keywords: ['wine', 'vinho', 'vineyard', 'winery', 'tasting', 'degustação', 'grapes', 'cellar', 'adega', 'sommelier'],
      expIds: [16], // Wine tasting
    },
    cooking: {
      keywords: ['cooking', 'cook', 'chef', 'kitchen', 'culinary', 'food', 'recipe', 'cuisine', 'gastronomia', 'gastronomy'],
      expIds: [5, 6], // Cooking classes
    },
    pastry: {
      keywords: ['pastel', 'pasteis', 'nata', 'custard', 'tart', 'bakery', 'baking', 'pastry', 'belem'],
      expIds: [5], // Pastel de nata workshop
    },
    adventure: {
      keywords: ['adventure', 'adrenaline', 'extreme', 'thrill', 'exciting', 'aventura', 'radical'],
      expIds: [1, 3, 13, 14, 15, 17, 20], // Adventure experiences
    },
    nature: {
      keywords: ['nature', 'outdoor', 'hiking', 'natureza', 'forest', 'floresta', 'green', 'natural', 'trail', 'walk'],
      expIds: [8, 10, 12, 13], // Nature experiences
    },
    dolphins: {
      keywords: ['dolphin', 'dolphins', 'whale', 'whales', 'marine', 'cetacean', 'golfinho', 'baleia', 'ocean', 'sea'],
      expIds: [4], // Dolphin watching
    },
    boat: {
      keywords: ['boat', 'barco', 'sailing', 'yacht', 'cruise', 'catamaran', 'speedboat', 'maritime'],
      expIds: [4], // Boat tours
    },
    horse: {
      keywords: ['horse', 'horseback', 'riding', 'equestrian', 'cavalo', 'pony', 'stable', 'equitação'],
      expIds: [10], // Horseback riding
    },
    beach: {
      keywords: ['beach', 'praia', 'coast', 'seaside', 'comporta', 'caparica', 'sand', 'shore', 'atlantic', 'summer'],
      expIds: [10, 18, 19, 20], // Beach activities
    },
    climb: {
      keywords: ['climbing', 'climb', 'bridge', 'rappel', 'abseil', 'escalada', 'ponte', '25 abril', 'heights'],
      expIds: [3, 22], // Climbing experiences
    },
    diving: {
      keywords: ['diving', 'dive', 'scuba', 'underwater', 'snorkel', 'snorkeling', 'mergulho', 'ocean'],
      expIds: [21], // Scuba diving
    },
    paragliding: {
      keywords: ['paragliding', 'paraglide', 'parapente', 'gliding', 'flying', 'soaring', 'tandem', 'cliffs', 'sky'],
      expIds: [20], // Paragliding
    },
    skydiving: {
      keywords: ['skydiving', 'skydive', 'freefall', 'windtunnel', 'indoor skydive', 'paraquedismo'],
      expIds: [15], // Indoor skydiving
    },
    flying: {
      keywords: ['pilot', 'airplane', 'aircraft', 'cockpit', 'flight', 'aviation', 'fly', 'avião', 'piloto'],
      expIds: [14], // Flying experience
    },
    quad: {
      keywords: ['quad', 'atv', '4x4', 'offroad', 'buggy', 'jeep', 'dirt', 'mud', 'terrain'],
      expIds: [1, 13, 17], // Quad/ATV experiences
    },
    tiles: {
      keywords: ['tiles', 'azulejos', 'ceramic', 'pottery', 'craft', 'workshop', 'art', 'handmade', 'paint'],
      expIds: [11], // Tile workshop
    },
    sintra: {
      keywords: ['sintra', 'palace', 'palácio', 'castle', 'castelo', 'pena', 'regaleira', 'monserrate', 'mystery', 'treasure'],
      expIds: [8, 13], // Sintra experiences
    },
    lisbon: {
      keywords: ['lisbon', 'lisboa', 'alfama', 'baixa', 'chiado', 'bairro alto', 'tram', 'elétrico', 'belém'],
      expIds: [7, 9, 11], // Lisbon city experiences
    },
    streetart: {
      keywords: ['street art', 'graffiti', 'mural', 'urban', 'art tour', 'cultural', 'multicultural'],
      expIds: [9], // Street art tour
    },
    bees: {
      keywords: ['bee', 'bees', 'beekeeping', 'honey', 'mel', 'abelha', 'apicultura', 'hive', 'farm'],
      expIds: [12], // Beekeeping
    },
    romantic: {
      keywords: ['romantic', 'couple', 'honeymoon', 'date', 'love', 'sunset', 'golden hour', 'anniversary'],
      expIds: [4, 10, 16, 20], // Romantic experiences
    },
    family: {
      keywords: ['family', 'kids', 'children', 'família', 'crianças', 'family-friendly'],
      expIds: [4, 5, 7, 8], // Family-friendly experiences
    },
  };
  
  // Score each experience
  const scored = experiences.map(exp => {
    let score = 0;
    const matchedCategories = [];
    const expContent = `${exp.title} ${exp.description || ''} ${exp.category} ${(exp.tags || []).join(' ')}`.toLowerCase();
    
    for (const [category, config] of Object.entries(keywordMap)) {
      for (const keyword of config.keywords) {
        if (content.includes(keyword)) {
          // Direct match - high priority if exp ID is in the preferred list
          if (config.expIds.includes(exp.id) || config.expIds.includes(parseInt(exp.id))) {
            score += 25; // High score for direct ID match
            matchedCategories.push(category);
          }
          // Check if experience content matches this keyword
          else if (expContent.includes(keyword)) {
            score += 10;
            matchedCategories.push(category);
          }
          // Check tags
          for (const tag of (Array.isArray(exp.tags) ? exp.tags : [])) {
            if (tag && tag.toLowerCase().includes(keyword)) {
              score += 5;
            }
          }
        }
      }
    }
    
    return { experience: exp, score, matchedCategories: [...new Set(matchedCategories)] };
  });
  
  // Log top matches for debugging
  const topMatches = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
  console.log('🔤 Top keyword matches:', topMatches.map(m => ({
    title: m.experience.title,
    score: m.score,
    categories: m.matchedCategories
  })));
  
  // Return top matches
  return topMatches.map(s => s.experience);
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
      hasRapidApiKey: !!process.env.RAPIDAPI_KEY,
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
    
    // Step 3: Check if we have enough text metadata
    const hasGoodTextMetadata = (metadata.description && metadata.description.length > 20) || 
                                 (metadata.hashtags && metadata.hashtags.length >= 2);
    
    // Step 3b: If we don't have good text, analyze the thumbnail image
    let imageAnalysis = null;
    if (!hasGoodTextMetadata && metadata.thumbnailUrl) {
      console.log('👁️ Step 3b: Not enough text metadata, analyzing thumbnail...');
      imageAnalysis = await analyzeImageWithVision(metadata.thumbnailUrl);
      if (imageAnalysis) {
        console.log('👁️ Image analysis successful:', imageAnalysis);
      }
    }
    
    // Step 4: Try AI matching with all available context
    console.log('🤖 Step 4: Trying AI matching...');
    let matchedExperiences = await matchExperiencesWithAI(metadata, experiences, imageAnalysis);
    let matchMethod = 'ai';
    
    // Step 5: Fallback to keyword matching if AI fails
    if (!matchedExperiences || matchedExperiences.length === 0) {
      console.log('🔤 Step 5: Falling back to keyword matching...');
      
      // Include image analysis keywords in matching
      if (imageAnalysis) {
        // Create enhanced metadata with image analysis
        const enhancedMetadata = {
          ...metadata,
          description: [
            metadata.description || '',
            (imageAnalysis.activities || []).join(' '),
            (imageAnalysis.keywords || []).join(' '),
            (imageAnalysis.location_hints || []).join(' '),
            imageAnalysis.mood || '',
          ].join(' '),
        };
        matchedExperiences = matchExperiencesWithKeywords(enhancedMetadata, experiences);
      } else {
        matchedExperiences = matchExperiencesWithKeywords(metadata, experiences);
      }
      matchMethod = 'keywords';
    }
    
    // Step 6: If still no matches, suggest top-rated experiences
    if (!matchedExperiences || matchedExperiences.length === 0) {
      console.log('⭐ Step 6: No matches found, suggesting top experiences...');
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
