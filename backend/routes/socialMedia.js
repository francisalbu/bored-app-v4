/**
 * Social Media Metadata Extraction Routes
 * 
 * Extracts metadata (description, username, hashtags) from TikTok and Instagram Reels
 */

const express = require('express');
const router = express.Router();

// Facebook/Instagram oEmbed API credentials
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

/**
 * Extract metadata from TikTok URL
 * Uses TikTok's oEmbed API (free, no auth required)
 */
async function extractTikTokMetadata(url) {
  try {
    // TikTok oEmbed API
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch TikTok metadata');
    }
    
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
    };
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
 * Uses Facebook Graph API oEmbed (official, requires App credentials)
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
    
    // Use Facebook Graph API oEmbed (official API)
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
    
    // Fallback: Try legacy Instagram oEmbed API
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
  });
});

module.exports = router;
