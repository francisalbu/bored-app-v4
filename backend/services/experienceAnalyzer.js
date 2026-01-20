const ffmpeg = require('fluent-ffmpeg');
const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * SIMPLIFIED Experience Analyzer
 * 
 * Focus: Identify ONLY the experience/activity happening in the video
 * Speed: Use only 2-3 frames for fast analysis
 * Goal: Match with experiences in database OR suggest activities for landscapes
 */
class ExperienceAnalyzer {
  constructor() {
    this.openaiClient = null;
    this.tempDir = path.join(__dirname, '../temp');
    
    // Create temp dir
    try {
      const fsSync = require('fs');
      if (!fsSync.existsSync(this.tempDir)) {
        fsSync.mkdirSync(this.tempDir, { recursive: true });
        console.log('✅ Created temp directory:', this.tempDir);
      }
    } catch (error) {
      console.error('❌ Error creating temp directory:', error);
    }
  }

  get openai() {
    if (!this.openaiClient) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY required');
      }
      this.openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return this.openaiClient;
  }

  /**
   * Main analysis function - SIMPLIFIED
   */
  async analyzeInstagramVideo(url) {
    const startTime = Date.now();
    console.log('\n🎬 SIMPLIFIED Experience Analysis:', url);
    
    try {
      // 1. Download video
      const videoPath = await this.downloadInstagramVideo(url);
      console.log('✅ Video downloaded');
      
      // 2. Extract only 2-3 frames (faster!)
      const framePaths = await this.extractFrames(videoPath, 3);
      console.log(`✅ Extracted ${framePaths.length} frames`);
      
      // 3. Analyze frames to detect activity/experience
      const analysis = await this.analyzeFramesForExperience(framePaths);
      
      // 4. Cleanup
      await this.cleanup(videoPath, framePaths);
      
      return {
        activity: analysis.activity,
        location: analysis.location,
        isExperience: analysis.isExperience, // true = experience, false = landscape
        confidence: analysis.confidence,
        description: analysis.description,
        thumbnailUrl: analysis.thumbnailUrl,
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('❌ Analysis error:', error);
      throw error;
    }
  }

  /**
   * Analyze frames to detect experience/activity
   */
  async analyzeFramesForExperience(framePaths) {
    console.log('\n🔍 Analyzing frames for experience detection...');
    
    // Encode frames as base64
    const encodedFrames = await Promise.all(
      framePaths.map(async (framePath) => {
        const imageBuffer = await fs.readFile(framePath);
        return imageBuffer.toString('base64');
      })
    );
    
    // Build prompt for GPT-4o Vision
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze these video frames and determine:

1. Is this an EXPERIENCE (activity being done) or a LANDSCAPE (scenic view)?
   - Experience examples: surfing, cooking class, yoga, diving, rock climbing, wine tasting
   - Landscape examples: waterfall, desert, mountain view, beach scenery, national park

2. What is the main ACTIVITY or LOCATION?
   - If experience: What activity? (e.g., "surfing", "cooking", "yoga")
   - If landscape: Where? (e.g., "Namib Desert", "Victoria Falls")

3. Location/Region (e.g., "Portugal", "Namibia", "Bali")

4. Brief description (1 sentence)

Respond ONLY with JSON:
{
  "isExperience": true/false,
  "activity": "surf" OR "Namib Desert",
  "location": "Portugal" OR "Namibia",
  "description": "...",
  "confidence": 0.0-1.0
}`
          },
          ...encodedFrames.map(frame => ({
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${frame}` }
          }))
        ]
      }
    ];
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 300,
      temperature: 0.2
    });
    
    const result = JSON.parse(response.choices[0].message.content);
    console.log('✅ Analysis result:', result);
    
    return {
      ...result,
      thumbnailUrl: framePaths[1] // Use middle frame as thumbnail
    };
  }

  /**
   * Download Instagram video
   */
  async downloadInstagramVideo(url) {
    console.log('📥 Downloading video...');
    
    try {
      const response = await axios.get('https://instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com/get-info-rapidapi', {
        params: { url },
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com'
        }
      });
      
      const videoUrl = response.data?.download_url;
      if (!videoUrl) throw new Error('No video URL in response');
      
      // Download video file
      const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
      const videoPath = path.join(this.tempDir, `video_${Date.now()}.mp4`);
      await fs.writeFile(videoPath, videoResponse.data);
      
      console.log('✅ Video saved:', videoPath);
      return videoPath;
      
    } catch (error) {
      console.error('❌ Download error:', error.message);
      throw error;
    }
  }

  /**
   * Extract frames from video
   */
  async extractFrames(videoPath, count = 3) {
    console.log(`\n📸 Extracting ${count} frames...`);
    
    const framePaths = [];
    
    for (let i = 0; i < count; i++) {
      const framePath = path.join(this.tempDir, `frame_${Date.now()}_${i}.jpg`);
      const timestamp = (i / (count - 1)) * 100; // Spread across video: 0%, 50%, 100%
      
      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .screenshots({
            timestamps: [`${timestamp}%`],
            filename: path.basename(framePath),
            folder: this.tempDir,
            size: '800x?'
          })
          .on('end', resolve)
          .on('error', reject);
      });
      
      framePaths.push(framePath);
    }
    
    console.log(`✅ Extracted ${framePaths.length} frames`);
    return framePaths;
  }

  /**
   * Cleanup temp files
   */
  async cleanup(videoPath, framePaths) {
    try {
      if (videoPath) await fs.unlink(videoPath).catch(() => {});
      for (const framePath of framePaths || []) {
        await fs.unlink(framePath).catch(() => {});
      }
      console.log('🧹 Cleanup complete');
    } catch (error) {
      console.error('⚠️ Cleanup error:', error.message);
    }
  }
}

module.exports = new ExperienceAnalyzer();
