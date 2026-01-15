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
      const locationName = response.data?.location?.name || null;
      
      if (videoUrl) {
        console.log('✅ Got video via RapidAPI');
        console.log('🔗 URL length:', videoUrl.length, 'chars (NOT truncating to avoid hash errors)');
        if (locationName) {
          console.log('📍 Instagram location tag:', locationName);
        }
        return {
          videoUrl, // NEVER log or truncate - contains security hash!
          caption,
          hashtags: this.extractHashtags(caption),
          location: locationName
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
   * Extract multiple frames - Download from CDN with proper headers
   */
  async extractFramesFromUrl(videoUrl, numFrames = 3) {
    await this.ensureTempDir();
    
    // Clean old frames and videos first
    try {
      const fsSync = require('fs');
      const files = fsSync.readdirSync(this.tempDir);
      for (const file of files) {
        if (file.endsWith('.jpg') || file.endsWith('.mp4')) {
          fsSync.unlinkSync(path.join(this.tempDir, file));
        }
      }
      console.log('🧹 Cleaned temp directory');
    } catch (err) {
      console.log('⚠️ Could not clean temp directory:', err.message);
    }
    
    const videoPath = path.join(this.tempDir, `video_${Date.now()}.mp4`);
    
    try {
      console.log('⬇️ Downloading video from CDN (with browser headers)...');
      console.log('🔗 URL length:', videoUrl.length, 'chars');
      
      // CRITICAL: Use full browser headers to avoid "Bad URL hash"
      const response = await axios({
        url: videoUrl, // NEVER truncate this!
        method: 'GET',
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'identity',
          'Referer': 'https://www.instagram.com/',
          'Origin': 'https://www.instagram.com',
          'Sec-Fetch-Dest': 'video',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site'
        },
        timeout: 30000,
        maxContentLength: 50 * 1024 * 1024, // 50MB
        maxBodyLength: 50 * 1024 * 1024
      });
      
      const writer = require('fs').createWriteStream(videoPath);
      response.data.pipe(writer);
      
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      
      console.log('✅ Video downloaded to:', videoPath);
    } catch (error) {
      console.error('❌ CDN download failed:', error.message);
      if (error.response?.status) {
        console.error('HTTP Status:', error.response.status);
      }
      throw new Error('Could not download video from CDN - link may have expired or headers rejected');
    }
    
    return new Promise((resolve, reject) => {
      const frameFiles = [];
      
      for (let i = 1; i <= numFrames; i++) {
        frameFiles.push(path.join(this.tempDir, `frame-${i}.jpg`));
      }
      
      console.log(`📸 Extracting ${numFrames} frames from downloaded video...`);
      
      ffmpeg(videoPath)
        .inputOptions([
          '-t 10', // Process only first 10 seconds
          '-err_detect ignore_err', // Ignore errors in stream
          '-fflags +genpts' // Generate presentation timestamps
        ])
        .outputOptions([
          '-vsync vfr', // Variable frame rate
          '-qscale:v 2' // High quality
        ])
        .screenshots({
          count: numFrames,
          folder: this.tempDir,
          size: '1280x?',
          filename: 'frame-%i.jpg'
        })
        .on('end', () => {
          console.log(`✅ ${numFrames} frames extracted!`);
          // Delete video after extraction
          require('fs').unlink(videoPath, () => {});
          resolve(frameFiles);
        })
        .on('error', (err) => {
          console.error('❌ Frame extraction failed:', err.message);
          console.error('Error code:', err.code);
          // Try to clean up video file
          require('fs').unlink(videoPath, () => {});
          reject(new Error(`Failed to extract frames: ${err.message}. Video may be corrupted or in unsupported format.`));
        });
    });
  }

  /**
   * Analyze single frame with GPT-4 Vision (OpenAI)
   */
  async analyzeFrame(framePath, frameNumber, totalFrames, description = '') {
    const imageBase64 = await fs.readFile(framePath, 'base64');
    
    const prompt = `You are a travel detective analyzing frame ${frameNumber}/${totalFrames} from a social media video.

YOUR MISSION: Identify the activity AND location to suggest similar GetYourGuide experiences.

🔍 DETECTIVE RULES:
1. ACTIVITY: Be specific (Surfing, Wine Tasting, Alpine Skiing, Snorkeling, Street Food Tour)
2. LOCATION: You MUST make an educated guess. Use ALL clues:
   - Architecture style (Mediterranean? Nordic? Asian?)
   - Natural landscape (Alpine peaks? Tropical beach? Desert?)
   - Weather/lighting (sunny Mediterranean? snowy Alps?)
   - Visible brands, signs, language hints
   - Mountain shapes (are these the Alps? Rockies? Andes?)
   - Beach style (Caribbean? Bali? Australia?)

3. CONTEXT from post metadata: ${description || 'No metadata available'}

🚫 FORBIDDEN: Do NOT say "Unknown" unless the image is completely blurred or dark.
✅ REQUIRED: If unsure of exact city, give region/country based on visual probability.

Examples of GOOD answers:
- "Alpine Skiing, Les Trois Vallées, France" (if you see classic French Alps)
- "Beach Surfing, Bali, Indonesia" (if tropical with Hindu statues)
- "Hiking, Scottish Highlands, UK" (if you see heather and grey skies)

Return ONLY valid JSON (no markdown):
{
  "activity": "Specific Activity Name",
  "location": "Best Guess Location (City/Region, Country)",
  "landmarks": ["any recognizable features"],
  "features": ["visual clues used"],
  "confidence": 0.75
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
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
        max_tokens: 600,
        temperature: 0.4
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
      
      // Step 1: Get video URL + metadata via RapidAPI
      console.log('🔗 Step 1: Getting video URL via RapidAPI...');
      const videoData = await this.getDirectVideoUrl(url);
      metadata.caption = videoData.caption;
      metadata.hashtags = videoData.hashtags;
      metadata.location = videoData.location; // Instagram location tag!
      console.log(`✅ Got video URL + metadata`);
      
      // Step 2: Download + extract frames from CDN URL (must use immediately before expiration!)
      console.log('🎞️ Step 2: Extracting 3 key frames from CDN...');
      framePaths = await this.extractFramesFromUrl(videoData.videoUrl, 3);
      console.log(`✅ Extracted ${framePaths.length} frames`);
      
      // Step 3: Analyze with multimodal AI (frames + caption + hashtags + location!)
      // Process SEQUENTIALLY to save memory!
      console.log('🤖 Step 3: Analyzing with OpenAI Vision (memory-optimized)...');
      const analysisResult = await this.analyzeFramesSequentially(
        framePaths, 
        description,
        metadata.caption,
        metadata.hashtags,
        metadata.location // Instagram location tag!
      );
      
      const frameAnalyses = analysisResult.analyses;
      const extractedFrames = analysisResult.frames;
      
      // Step 4: Combine results
      console.log('🧮 Step 4: Combining results...');
      const finalAnalysis = this.combineFrameAnalyses(frameAnalyses);
      console.log('📊 DEBUG - frameAnalyses count:', frameAnalyses.length);
      console.log('📊 DEBUG - finalAnalysis.frameAnalyses:', finalAnalysis.frameAnalyses);
      
      const processingTime = Date.now() - startTime;
      console.log(`\n✅ Analysis complete in ${(processingTime/1000).toFixed(1)}s`);
      console.log(`📍 Activity: ${finalAnalysis.activity}`);
      console.log(`🌍 Location: ${finalAnalysis.location}`);
      console.log(`💯 Confidence: ${(finalAnalysis.confidence * 100).toFixed(1)}%`);
      console.log(`⚡ Used RapidAPI + multimodal analysis!`);
      
      return {
        activity: finalAnalysis.activity,
        location: finalAnalysis.location,
        confidence: finalAnalysis.confidence,
        landmarks: finalAnalysis.landmarks,
        features: finalAnalysis.features,
        votingScores: finalAnalysis.votingScores,
        processingTime,
        method: 'rapidapi_multimodal',
        userDescription: description,
        caption: metadata.caption,
        hashtags: metadata.hashtags,
        instagramLocation: metadata.location, // Original Instagram tag
        // Include individual frame analysis to verify frames were extracted
        detailedFrameAnalysis: finalAnalysis.frameAnalyses,
        // Debug: show frame paths (frames exist in these paths)
        _debug_framePaths: framePaths,
        // CRITICAL: Include extracted frames as base64 to verify they're correct
        extractedFrames: extractedFrames.map(f => ({
          frameNumber: f.frameNumber,
          imageBase64: `data:image/jpeg;base64,${f.base64}`
        }))
      };
      
    } catch (error) {
      console.error('❌ Video analysis failed:', error);
      throw error;
    } finally {
      // TEMP: Skip cleanup to verify frames are being extracted
      // await this.cleanup(null, framePaths);
      console.log('⚠️ Skipping cleanup - frames kept in temp/ for verification');
    }
  }

  /**
   * Analyze frames SEQUENTIALLY to save memory (Render has 512MB limit)
   */
  async analyzeFramesSequentially(framePaths, userDescription, caption, hashtags, instagramLocation) {
    console.log(`🔍 Analyzing ${framePaths.length} frames SEQUENTIALLY (memory-optimized)...`);
    
    // Build context from all available info
    const contextInfo = [];
    if (instagramLocation) contextInfo.push(`📍 INSTAGRAM LOCATION TAG: "${instagramLocation}" (USE THIS!)`);
    if (caption) contextInfo.push(`Caption: "${caption}"`);
    if (hashtags && hashtags.length > 0) contextInfo.push(`Hashtags: ${hashtags.join(' ')}`);
    if (userDescription) contextInfo.push(`User note: "${userDescription}"`);
    
    const fullContext = contextInfo.join('\n');
    
    const results = [];
    const framesBase64 = []; // To return images for debugging
    
    // Process ONE frame at a time to save memory
    for (let i = 0; i < framePaths.length; i++) {
      console.log(`📊 Analyzing frame ${i + 1}/${framePaths.length}...`);
      
      // Read frame as base64 for debugging
      try {
        const frameData = await fs.readFile(framePaths[i], 'base64');
        framesBase64.push({
          frameNumber: i + 1,
          base64: frameData,
          path: framePaths[i]
        });
      } catch (err) {
        console.error(`Failed to read frame ${i + 1}:`, err.message);
      }
      
      const analysis = await this.analyzeFrame(framePaths[i], i + 1, framePaths.length, fullContext);
      results.push(analysis);
      
      // TEMP: Keep frames to verify extraction is working
      // try {
      //   await fs.unlink(framePaths[i]);
      //   console.log(`🗑️ Cleaned frame ${i + 1}`);
      // } catch (e) {
      //   console.error(`Failed to cleanup frame ${i + 1}:`, e.message);
      // }
      
      // Force garbage collection hint
      if (global.gc) global.gc();
    }
    
    console.log('✅ All frames analyzed sequentially!');
    return { analyses: results, frames: framesBase64 };
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
