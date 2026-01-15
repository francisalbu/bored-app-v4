const ffmpeg = require('fluent-ffmpeg');
const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class VideoAnalyzer {
  constructor() {
    this.openaiClient = null; // Lazy load
    this.tempDir = path.join(__dirname, '../temp');
    // Create temp dir synchronously to avoid race conditions
    try {
      const fsSync = require('fs');
      console.log('🔍 Checking temp directory:', this.tempDir);
      console.log('📂 __dirname:', __dirname);
      if (!fsSync.existsSync(this.tempDir)) {
        fsSync.mkdirSync(this.tempDir, { recursive: true });
        console.log('✅ Created temp directory:', this.tempDir);
      } else {
        console.log('✅ Temp directory already exists:', this.tempDir);
      }
    } catch (error) {
      console.error('❌ Error creating temp directory:', error);
      console.error('Stack:', error.stack);
    }
  }

  // Lazy load OpenAI client
  get openai() {
    if (!this.openaiClient) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required for video analysis');
      }
      this.openaiClient = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY 
      });
    }
    return this.openaiClient;
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }

  /**
   * Get direct video URL from Instagram using multiple methods
   * Priority: RapidAPI → Direct Scraping → oEmbed
   */
  async getDirectVideoUrl(url) {
    console.log('🔗 Getting video URL for:', url);
    
    // Method 1: Try RapidAPI (Instagram Scraper Stable API)
    try {
      const rapidApiKey = process.env.RAPIDAPI_KEY || '13e6fed9b4msh7770b0604d16a75p11d71ejsn0d42966b3d99';
      const mediaCode = this.extractInstagramId(url);
      
      if (!mediaCode) {
        throw new Error('Could not extract media code from URL');
      }
      
      console.log('📡 Calling RapidAPI with media_code:', mediaCode);
      
      const response = await axios.get('https://instagram-scraper-stable-api.p.rapidapi.com/get_media_data_v2.php', {
        params: { media_code: mediaCode },
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com'
        },
        timeout: 15000
      });
      
      console.log('📦 RapidAPI Response Status:', response.status);
      console.log('📦 RapidAPI Response Data:', JSON.stringify(response.data, null, 2));
      
      const videoUrl = response.data?.video_url || response.data?.video_versions?.[0]?.url;
      const caption = response.data?.caption || response.data?.edge_media_to_caption?.edges?.[0]?.node?.text || '';
      
      if (videoUrl) {
        console.log('✅ Got video via RapidAPI:', videoUrl.substring(0, 60) + '...');
        return {
          videoUrl,
          caption,
          hashtags: this.extractHashtags(caption)
        };
      }
      
      console.log('⚠️ No video URL found in RapidAPI response');
    } catch (error) {
      console.error('❌ RapidAPI error:', error.response?.status, error.response?.data || error.message);
    }
    
    // Method 2: Direct Instagram scraping
    try {
      const postId = this.extractInstagramId(url);
      const response = await axios.get(
        `https://www.instagram.com/p/${postId}/?__a=1&__d=dis`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          timeout: 10000
        }
      );
      
      const videoUrl = response.data?.items?.[0]?.video_versions?.[0]?.url ||
                       response.data?.graphql?.shortcode_media?.video_url;
      const caption = response.data?.items?.[0]?.caption?.text ||
                      response.data?.graphql?.shortcode_media?.edge_media_to_caption?.edges?.[0]?.node?.text || '';
      
      if (videoUrl) {
        console.log('✅ Got video via direct scraping');
        return {
          videoUrl,
          caption,
          hashtags: this.extractHashtags(caption)
        };
      }
    } catch (error) {
      console.log('⚠️ Direct scraping failed, trying oEmbed...');
    }
    
    // Method 3: oEmbed (thumbnail only, but better than nothing)
    try {
      const response = await axios.get(
        `https://www.instagram.com/p/oembed/?url=${encodeURIComponent(url)}`,
        { timeout: 10000 }
      );
      
      console.log('⚠️ Using thumbnail URL (oEmbed)');
      return {
        videoUrl: response.data.thumbnail_url, // Will be an image, not video
        caption: response.data.title || '',
        hashtags: [],
        isThumbna: true
      };
    } catch (error) {
      console.error('❌ All methods failed');
    }
    
    throw new Error('Could not get video URL. Instagram may be blocking requests.');
  }

  /**
   * Extract multiple frames directly from video URL (NO DOWNLOAD!)
   * Using the SIMPLE ffmpeg screenshots method
   */
  async extractFramesFromUrl(videoUrl, numFrames = 3) {
    await this.ensureTempDir();
    
    const sessionId = Date.now();
    
    return new Promise((resolve, reject) => {
      const frameFiles = [];
      
      // Build expected frame filenames
      for (let i = 1; i <= numFrames; i++) {
        frameFiles.push(path.join(this.tempDir, `frame-${i}.jpg`));
      }
      
      console.log(`📸 Extracting ${numFrames} frames automatically...`);
      
      ffmpeg(videoUrl)
        .screenshots({
          count: numFrames,
          folder: this.tempDir,
          size: '1280x?',
          filename: 'frame-%i.jpg'
        })
        .on('end', () => {
          console.log(`✅ ${numFrames} frames extracted!`);
          resolve(frameFiles);
        })
        .on('error', (err) => {
          console.error('❌ Frame extraction failed:', err.message);
          reject(err);
        });
    });
  }

  /**
   * Analyze single frame with GPT-4 Vision (OpenAI)
   */
  async analyzeFrame(framePath, frameNumber, totalFrames, description = '') {
    const imageBase64 = await fs.readFile(framePath, 'base64');
    
    const prompt = `This is frame ${frameNumber} of ${totalFrames} from a travel/activity video shared on Instagram or TikTok.

Extract:
1. Activity type (e.g., surfing, scuba diving, hiking, food tour, nightlife, sightseeing, etc.)
2. Location (city, country - be as specific as possible!)
3. Any visible landmarks or distinctive features
4. Key objects, scenery, or atmosphere

User description/context: ${description || 'None provided'}

Return ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "activity": "specific_activity_name",
  "location": "City, Country",
  "landmarks": ["landmark1", "landmark2"],
  "features": ["feature1", "feature2"],
  "confidence": 0.85
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Usa o mesmo modelo que já usas
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      });

      const responseText = response.choices[0].message.content;
      const jsonText = responseText.replace(/```json\n?|\n?```/g, '').trim();
      
      const parsed = JSON.parse(jsonText);
      
      return {
        frameNumber,
        activity: parsed.activity || null,
        location: parsed.location || null,
        landmarks: parsed.landmarks || [],
        features: parsed.features || [],
        confidence: parsed.confidence || 0.5
      };
    } catch (error) {
      console.error(`❌ Error analyzing frame ${frameNumber}:`, error);
      return {
        frameNumber,
        activity: null,
        location: null,
        landmarks: [],
        features: [],
        confidence: 0
      };
    }
  }

  /**
   * Analyze all frames in parallel for speed
   */
  async analyzeAllFrames(framePaths, description) {
    console.log(`🔍 Analyzing ${framePaths.length} frames in parallel...`);
    
    const analysisPromises = framePaths.map((framePath, index) =>
      this.analyzeFrame(framePath, index + 1, framePaths.length, description)
    );
    
    const results = await Promise.all(analysisPromises);
    console.log('✅ All frames analyzed!');
    
    return results;
  }

  /**
   * Combine multiple frame analyses using voting + confidence
   */
  combineFrameAnalyses(frameAnalyses) {
    console.log('🧮 Combining frame analyses...');
    
    // Activity voting (weighted by confidence)
    const activityVotes = {};
    const locationVotes = {};
    const allLandmarks = [];
    const allFeatures = [];
    
    frameAnalyses.forEach(analysis => {
      if (analysis.activity) {
        const activity = analysis.activity.toLowerCase();
        activityVotes[activity] = (activityVotes[activity] || 0) + analysis.confidence;
      }
      if (analysis.location) {
        locationVotes[analysis.location] = (locationVotes[analysis.location] || 0) + analysis.confidence;
      }
      if (analysis.landmarks) {
        allLandmarks.push(...analysis.landmarks);
      }
      if (analysis.features) {
        allFeatures.push(...analysis.features);
      }
    });
    
    // Get winners
    const topActivity = Object.entries(activityVotes)
      .sort((a, b) => b[1] - a[1])[0];
    
    const topLocation = Object.entries(locationVotes)
      .sort((a, b) => b[1] - a[1])[0];
    
    // Calculate overall confidence
    const avgConfidence = frameAnalyses.reduce((sum, a) => sum + a.confidence, 0) / frameAnalyses.length;
    
    // Remove duplicates
    const uniqueLandmarks = [...new Set(allLandmarks.filter(Boolean))];
    const uniqueFeatures = [...new Set(allFeatures.filter(Boolean))];
    
    return {
      activity: topActivity ? topActivity[0] : 'unknown',
      location: topLocation ? topLocation[0] : 'unknown',
      confidence: Math.min(avgConfidence * 1.1, 1.0), // Small boost for multiple frame consensus
      landmarks: uniqueLandmarks,
      features: uniqueFeatures,
      frameAnalyses: frameAnalyses,
      votingScores: {
        activities: activityVotes,
        locations: locationVotes
      }
    };
  }

  /**
   * Get video thumbnail from Instagram/TikTok (quick alternative)
   */
  async getVideoThumbnail(url) {
    try {
      if (url.includes('instagram.com')) {
        const postId = this.extractInstagramId(url);
        const response = await axios.get(
          `https://www.instagram.com/p/${postId}/?__a=1&__d=dis`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
          }
        );
        return response.data?.graphql?.shortcode_media?.display_url;
      }
      
      if (url.includes('tiktok.com')) {
        const response = await axios.get(
          `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
          { timeout: 10000 }
        );
        return response.data.thumbnail_url;
      }
    } catch (error) {
      console.error('⚠️ Thumbnail extraction failed:', error);
      return null;
    }
  }

  extractInstagramId(url) {
    const match = url.match(/\/p\/([^\/\?]+)|\/reel\/([^\/\?]+)/);
    return match ? (match[1] || match[2]) : null;
  }
  
  extractHashtags(text) {
    if (!text) return [];
    const matches = text.match(/#[\w]+/g);
    return matches || [];
  }

  /**
   * Main analysis pipeline - NO VIDEO DOWNLOAD NEEDED!
   */
  async analyzeVideoUrl(url, description = '') {
    const startTime = Date.now();
    let framePaths = [];
    let metadata = {};
    
    try {
      console.log(`\n🎬 Starting video analysis for: ${url}`);
      console.log('⚡ Using RapidAPI + OpenAI Vision (multimodal approach)');
      
      // Step 1: Get direct video URL + metadata via RapidAPI
      console.log('🔗 Step 1: Getting video via RapidAPI...');
      const videoData = await this.getDirectVideoUrl(url);
      metadata.caption = videoData.caption;
      metadata.hashtags = videoData.hashtags;
      console.log(`✅ Got video URL + metadata`);
      
      // Step 2: Extract frames DIRECTLY from URL (no download!)
      console.log('🎞️ Step 2: Extracting 3 key frames...');
      framePaths = await this.extractFramesFromUrl(videoData.videoUrl, 3);
      console.log(`✅ Extracted ${framePaths.length} frames`);
      
      // Step 3: Analyze with multimodal AI (frames + caption + hashtags)
      // Process SEQUENTIALLY to save memory!
      console.log('🤖 Step 3: Analyzing with OpenAI Vision (memory-optimized)...');
      const frameAnalyses = await this.analyzeFramesSequentially(
        framePaths, 
        description,
        metadata.caption,
        metadata.hashtags
      );
      
      // Step 4: Combine results
      console.log('🧮 Step 4: Combining results...');
      const finalAnalysis = this.combineFrameAnalyses(frameAnalyses);
      
      const processingTime = Date.now() - startTime;
      console.log(`\n✅ Analysis complete in ${(processingTime/1000).toFixed(1)}s`);
      console.log(`📍 Activity: ${finalAnalysis.activity}`);
      console.log(`🌍 Location: ${finalAnalysis.location}`);
      console.log(`💯 Confidence: ${(finalAnalysis.confidence * 100).toFixed(1)}%`);
      console.log(`⚡ Used RapidAPI + multimodal analysis!`);
      
      return {
        ...finalAnalysis,
        processingTime,
        method: 'rapidapi_multimodal',
        userDescription: description,
        caption: metadata.caption,
        hashtags: metadata.hashtags,
        // Include individual frame analysis to verify frames were extracted
        detailedFrameAnalysis: finalAnalysis.frameAnalyses
      };
      
    } catch (error) {
      console.error('❌ Video analysis failed:', error);
      throw error;
    } finally {
      // Cleanup only the frames (no video file!)
      await this.cleanup(null, framePaths);
    }
  }

  /**
   * Analyze frames SEQUENTIALLY to save memory (Render has 512MB limit)
   */
  async analyzeFramesSequentially(framePaths, userDescription, caption, hashtags) {
    console.log(`🔍 Analyzing ${framePaths.length} frames SEQUENTIALLY (memory-optimized)...`);
    
    // Build context from all available info
    const contextInfo = [];
    if (caption) contextInfo.push(`Caption: "${caption}"`);
    if (hashtags && hashtags.length > 0) contextInfo.push(`Hashtags: ${hashtags.join(' ')}`);
    if (userDescription) contextInfo.push(`User note: "${userDescription}"`);
    
    const fullContext = contextInfo.join('\n');
    
    const results = [];
    
    // Process ONE frame at a time to save memory
    for (let i = 0; i < framePaths.length; i++) {
      console.log(`📊 Analyzing frame ${i + 1}/${framePaths.length}...`);
      const analysis = await this.analyzeFrame(framePaths[i], i + 1, framePaths.length, fullContext);
      results.push(analysis);
      
      // Cleanup frame immediately after analysis
      try {
        await fs.unlink(framePaths[i]);
        console.log(`🗑️ Cleaned frame ${i + 1}`);
      } catch (e) {
        console.error(`Failed to cleanup frame ${i + 1}:`, e.message);
      }
      
      // Force garbage collection hint
      if (global.gc) global.gc();
    }
    
    console.log('✅ All frames analyzed sequentially!');
    return results;
  }
  
  /**
   * Analyze frames with full context (caption + hashtags) - PARALLEL VERSION (kept for reference)
   */
  async analyzeAllFramesWithContext(framePaths, userDescription, caption, hashtags) {
    console.log(`🔍 Analyzing ${framePaths.length} frames with full context...`);
    
    // Build context from all available info
    const contextInfo = [];
    if (caption) contextInfo.push(`Caption: "${caption}"`);
    if (hashtags && hashtags.length > 0) contextInfo.push(`Hashtags: ${hashtags.join(' ')}`);
    if (userDescription) contextInfo.push(`User note: "${userDescription}"`);
    
    const fullContext = contextInfo.join('\n');
    
    const analysisPromises = framePaths.map((framePath, index) =>
      this.analyzeFrame(framePath, index + 1, framePaths.length, fullContext)
    );
    
    const results = await Promise.all(analysisPromises);
    console.log('✅ All frames analyzed with context!');
    
    return results;
  }

  /**
   * Cleanup temporary files (most are already cleaned sequentially)
   */
  async cleanup(videoPath, framePaths) {
    console.log('🧹 Final cleanup check...');
    
    // Only frames to delete now (no video!)
    const filesToDelete = [...framePaths].filter(Boolean);
    
    let deletedCount = 0;
    for (const file of filesToDelete) {
      try {
        await fs.unlink(file);
        deletedCount++;
        console.log(`🗑️ Deleted: ${path.basename(file)}`);
      } catch (error) {
        // File already deleted sequentially - no problem
        if (error.code !== 'ENOENT') {
          console.error(`Failed to delete ${file}:`, error.message);
        }
      }
    }
    
    console.log(`✅ Cleanup complete (${deletedCount} files remaining)`);
  }
}

module.exports = new VideoAnalyzer();
