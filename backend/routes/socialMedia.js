/**
 * Social Media Metadata Extraction Routes
 * 
 * Extracts metadata (description, username, hashtags) from TikTok and Instagram Reels
 */

const express = require('express');
const router = express.Router();

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
 * Uses Instagram's oEmbed API (free, no auth required)
 * Falls back to page scraping if oEmbed fails (for Reels)
 */
async function extractInstagramMetadata(url) {
  try {
    // Clean the URL - handle various Instagram URL formats
    let cleanUrl = url;
    
    // Handle shortened URLs (instagr.am)
    if (url.includes('instagr.am')) {
      // Follow redirect to get full URL
      const redirectResponse = await fetch(url, { redirect: 'follow' });
      cleanUrl = redirectResponse.url;
    }
    
    // Try oEmbed API first
    const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(cleanUrl)}`;
    const response = await fetch(oembedUrl);
    
    if (response.ok) {
      const data = await response.json();
      
      // Extract hashtags from title
      const hashtagRegex = /#[\w\u00C0-\u024F]+/g;
      const hashtags = data.title?.match(hashtagRegex) || [];
      
      // Clean description (remove hashtags for cleaner text)
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
        thumbnailWidth: data.thumbnail_width || null,
        thumbnailHeight: data.thumbnail_height || null,
      };
    }
    
    // oEmbed failed (common for Reels), try scraping the page
    console.log('oEmbed failed, trying page scraping for:', cleanUrl);
    
    const pageResponse = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
      }
    });
    
    if (pageResponse.ok) {
      const html = await pageResponse.text();
      
      // Try to extract from meta tags
      const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"/) ||
                         html.match(/<meta name="twitter:title" content="([^"]*)"/) ||
                         html.match(/<title>([^<]*)<\/title>/);
      
      const descMatch = html.match(/<meta property="og:description" content="([^"]*)"/) ||
                        html.match(/<meta name="description" content="([^"]*)"/) ||
                        html.match(/<meta name="twitter:description" content="([^"]*)"/);
      
      const imageMatch = html.match(/<meta property="og:image" content="([^"]*)"/);
      
      // Extract username from URL or meta
      const usernameMatch = cleanUrl.match(/instagram\.com\/([^\/]+)\//) ||
                           html.match(/"username":"([^"]+)"/);
      
      const fullTitle = titleMatch ? titleMatch[1] : '';
      const fullDesc = descMatch ? descMatch[1] : '';
      const combinedText = `${fullTitle} ${fullDesc}`;
      
      // Extract hashtags from the content
      const hashtagRegex = /#[\w\u00C0-\u024F]+/g;
      const hashtags = combinedText.match(hashtagRegex) || [];
      
      // Clean description
      const description = combinedText.replace(hashtagRegex, '').trim();
      
      return {
        platform: 'instagram',
        success: hashtags.length > 0 || description.length > 0,
        username: usernameMatch ? usernameMatch[1] : null,
        userUrl: usernameMatch ? `https://instagram.com/${usernameMatch[1]}` : null,
        description: description,
        fullTitle: fullTitle,
        hashtags: hashtags,
        thumbnailUrl: imageMatch ? imageMatch[1] : null,
        thumbnailWidth: null,
        thumbnailHeight: null,
        method: 'scraping',
      };
    }
    
    throw new Error('Both oEmbed and scraping failed');
    
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
