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
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
    this.tempDir = path.join(__dirname, '../temp');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }

  /**
   * Get direct video URL from Instagram/TikTok using yt-dlp
   * This gets the actual video URL without downloading the file
   */
  async getDirectVideoUrl(url) {
    try {
      console.log('🔗 Getting direct video URL...');
      
      // Use yt-dlp to get the direct URL without downloading
      const command = `yt-dlp -f "best[ext=mp4]" --get-url "${url}"`;
      const { stdout } = await execAsync(command, { timeout: 15000 });
      
      const videoUrl = stdout.trim();
      console.log('✅ Got direct video URL');
      
      return videoUrl;
    } catch (error) {
      console.error('⚠️ Failed to get direct URL:', error.message);
      
      // Fallback: try to use oEmbed or other APIs
      if (url.includes('instagram.com')) {
        return this.getInstagramVideoUrl(url);
      }
      
      if (url.includes('tiktok.com')) {
        return this.getTikTokVideoUrl(url);
      }
      
      throw new Error('Could not get video URL. Make sure yt-dlp is installed.');
    }
  }

  /**
   * Get Instagram video URL via oEmbed (fallback)
   */
  async getInstagramVideoUrl(url) {
    try {
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
      
      return response.data?.graphql?.shortcode_media?.video_url || 
             response.data?.items?.[0]?.video_versions?.[0]?.url;
    } catch (error) {
      throw new Error('Failed to get Instagram video URL');
    }
  }

  /**
   * Get TikTok video URL (fallback)
   */
  async getTikTokVideoUrl(url) {
    // TikTok requires more complex handling
    throw new Error('TikTok requires yt-dlp. Please install: brew install yt-dlp');
  }

  /**
   * Extract multiple frames directly from video URL (NO DOWNLOAD!)
   * FFmpeg can read from URLs directly - much faster!
   */
  async extractFramesFromUrl(videoUrl, numFrames = 6) {
    return new Promise((resolve, reject) => {
      const sessionId = Date.now();
      const frameFiles = [];
      
      // First, get video duration from URL
      ffmpeg.ffprobe(videoUrl, async (err, metadata) => {
        if (err) {
          console.error('❌ FFprobe error:', err);
          return reject(err);
        }
        
        const duration = metadata.format.duration;
        console.log(`📹 Video duration: ${duration}s (analyzing from URL, no download!)`);
        
        // Calculate timestamps evenly distributed
        const timestamps = [];
        for (let i = 0; i < numFrames; i++) {
          const position = (duration / (numFrames - 1)) * i;
          timestamps.push(Math.max(0, position));
        }
        
        console.log(`⏱️ Extracting ${numFrames} frames at: ${timestamps.map(t => t.toFixed(1)).join('s, ')}s`);
        
        // Extract each frame directly from URL (no download!)
        const framePromises = [];
        
        for (let i = 0; i < timestamps.length; i++) {
          const outputPath = path.join(this.tempDir, `frame_${sessionId}_${i}.jpg`);
          frameFiles.push(outputPath);
          
          const framePromise = new Promise((resolveFrame, rejectFrame) => {
            ffmpeg(videoUrl)  // ← Directly from URL!
              .seekInput(timestamps[i])
              .frames(1)
              .output(outputPath)
              .outputOptions([
                '-q:v 2',              // High quality
                '-vf scale=1280:-1'    // Resize for faster AI processing
              ])
              .on('end', () => {
                console.log(`✅ Frame ${i+1}/${numFrames} extracted`);
                resolveFrame(outputPath);
              })
              .on('error', (err) => {
                console.error(`❌ Frame ${i+1} failed:`, err.message);
                rejectFrame(err);
              })
              .run();
          });
          
          framePromises.push(framePromise);
        }
        
        // Wait for all frames
        try {
          await Promise.all(framePromises);
          resolve(frameFiles);
        } catch (error) {
          console.error('❌ Frame extraction failed:', error);
          reject(error);
        }
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

  /**
   * Main analysis pipeline - NO VIDEO DOWNLOAD NEEDED!
   */
  async analyzeVideoUrl(url, description = '') {
    const startTime = Date.now();
    let framePaths = [];
    
    try {
      console.log(`\n🎬 Starting video analysis for: ${url}`);
      console.log('⚡ NEW METHOD: Extracting frames directly from URL (no download!)');
      
      // Step 1: Get direct video URL
      console.log('🔗 Step 1: Getting direct video URL...');
      const directVideoUrl = await this.getDirectVideoUrl(url);
      console.log(`✅ Got video URL`);
      
      // Step 2: Extract frames DIRECTLY from URL (no download!)
      console.log('🎞️ Step 2: Extracting frames from URL...');
      framePaths = await this.extractFramesFromUrl(directVideoUrl, 6);
      console.log(`✅ Extracted ${framePaths.length} frames (without downloading video!)`);
      
      // Step 3: Analyze all frames with AI
      console.log('🤖 Step 3: Analyzing frames with AI...');
      const frameAnalyses = await this.analyzeAllFrames(framePaths, description);
      
      // Step 4: Combine results
      console.log('🧮 Step 4: Combining results...');
      const finalAnalysis = this.combineFrameAnalyses(frameAnalyses);
      
      const processingTime = Date.now() - startTime;
      console.log(`\n✅ Analysis complete in ${(processingTime/1000).toFixed(1)}s`);
      console.log(`📍 Activity: ${finalAnalysis.activity}`);
      console.log(`🌍 Location: ${finalAnalysis.location}`);
      console.log(`💯 Confidence: ${(finalAnalysis.confidence * 100).toFixed(1)}%`);
      console.log(`⚡ No video download required!`);
      
      return {
        ...finalAnalysis,
        processingTime,
        method: 'streaming_frames',
        userDescription: description
      };
      
    } catch (error) {
      console.error('❌ Video analysis failed:', error);
      throw error;
    } finally {
      // Cleanup only the frames (no video file to delete!)
      await this.cleanup(null, framePaths);
    }
  }

  /**
   * Cleanup temporary files
   */
  async cleanup(videoPath, framePaths) {
    console.log('🧹 Cleaning up temporary files...');
    
    // Only frames to delete now (no video!)
    const filesToDelete = [...framePaths].filter(Boolean);
    
    for (const file of filesToDelete) {
      try {
        await fs.unlink(file);
        console.log(`🗑️ Deleted: ${path.basename(file)}`);
      } catch (error) {
        console.error(`Failed to delete ${file}:`, error.message);
      }
    }
    
    console.log('✅ Cleanup complete');
  }
}

module.exports = new VideoAnalyzer();
