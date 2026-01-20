const OpenAI = require('openai');
const axios = require('axios');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class SimpleVideoAnalyzer {
  /**
   * Analyze video with 2-3 frames - FAST and SIMPLE
   * Detect: Activity type OR Landscape location
   */
  async analyzeVideo(instagramUrl) {
    console.log('🎬 Simple Video Analysis Started');
    console.log('📱 Instagram URL:', instagramUrl);
    
    try {
      // 1. Download video
      const videoBuffer = await this.downloadInstagramVideo(instagramUrl);
      console.log('✅ Video downloaded');
      
      // 2. Extract 2-3 frames
      const frames = await this.extractFrames(videoBuffer, 3);
      console.log(`✅ Extracted ${frames.length} frames`);
      
      // 3. Analyze with GPT-4o Vision
      const analysis = await this.analyzeFramesWithVision(frames);
      console.log('✅ Analysis complete:', analysis);
      
      return {
        success: true,
        type: analysis.type, // 'activity' or 'landscape'
        activity: analysis.activity, // e.g., 'surfing', 'yoga', etc.
        location: analysis.location, // e.g., 'Namibia', 'Iguazu Falls', etc.
        confidence: analysis.confidence
      };
      
    } catch (error) {
      console.error('❌ Error in video analysis:', error);
      throw error;
    }
  }
  
  /**
   * Download Instagram video with RapidAPI + Apify fallback
   */
  async downloadInstagramVideo(url) {
    console.log('📥 Downloading Instagram video...');
    
    let videoUrl = null;
    
    // Method 1: Try RapidAPI first
    try {
      console.log('🔄 Trying RapidAPI...');
      const response = await axios.get('https://instagram-scraper-api2.p.rapidapi.com/v1/post_info', {
        params: { code_or_id_or_url: url },
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com'
        },
        timeout: 15000
      });
      
      videoUrl = response.data?.data?.video_url || response.data?.video_url;
      
      if (videoUrl) {
        console.log('✅ Got video URL from RapidAPI');
      } else {
        console.log('⚠️ No video URL in RapidAPI response');
      }
    } catch (error) {
      console.error('❌ RapidAPI error:', error.response?.status || error.message);
    }
    
    // Method 2: Try Apify as fallback
    if (!videoUrl && process.env.APIFY_API_TOKEN) {
      try {
        console.log('🔄 Trying Apify Instagram Scraper as fallback...');
        const apifyToken = process.env.APIFY_API_TOKEN;
        
        // Call Apify Instagram Scraper
        const apifyResponse = await axios.post(
          'https://api.apify.com/v2/acts/apify~instagram-scraper/runs',
          {
            directUrls: [url],
            resultsType: 'posts'
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apifyToken}`
            },
            params: {
              waitForFinish: 120 // Wait up to 2 minutes
            },
            timeout: 150000
          }
        );
        
        const runId = apifyResponse.data.data.id;
        const datasetId = apifyResponse.data.data.defaultDatasetId;
        console.log('✅ Apify run completed:', runId);
        
        // Get results from dataset
        const resultsResponse = await axios.get(
          `https://api.apify.com/v2/datasets/${datasetId}/items`,
          {
            headers: { 'Authorization': `Bearer ${apifyToken}` }
          }
        );
        
        if (resultsResponse.data && resultsResponse.data.length > 0) {
          const item = resultsResponse.data[0];
          videoUrl = item.videoUrl || item.displayUrl;
          console.log('✅ Got video URL from Apify');
        } else {
          console.log('❌ Apify returned no data');
        }
      } catch (error) {
        console.error('❌ Apify error:', error.response?.data || error.message);
      }
    } else if (!videoUrl) {
      console.log('⚠️ APIFY_API_TOKEN not set, skipping Apify fallback');
    }
    
    if (!videoUrl) {
      throw new Error('Failed to download video from Instagram - both RapidAPI and Apify failed');
    }
    
    // Download video file
    console.log('📥 Downloading video file...');
    const videoResponse = await axios.get(videoUrl, { 
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    console.log('✅ Video downloaded successfully');
    return Buffer.from(videoResponse.data);
  }
  
  /**
   * Extract frames from video (simplified - just get 3 evenly spaced frames)
   */
  async extractFrames(videoBuffer, count = 3) {
    const ffmpeg = require('fluent-ffmpeg');
    const fs = require('fs').promises;
    const path = require('path');
    const crypto = require('crypto');
    
    const tempId = crypto.randomBytes(8).toString('hex');
    const tempDir = path.join('/tmp', `frames_${tempId}`);
    const videoPath = path.join('/tmp', `video_${tempId}.mp4`);
    
    try {
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(videoPath, videoBuffer);
      
      return new Promise((resolve, reject) => {
        const frames = [];
        
        ffmpeg(videoPath)
          .screenshots({
            count: count,
            folder: tempDir,
            filename: 'frame_%i.jpg'
          })
          .on('end', async () => {
            try {
              const files = await fs.readdir(tempDir);
              for (const file of files.sort()) {
                const framePath = path.join(tempDir, file);
                const frameBuffer = await fs.readFile(framePath);
                frames.push(frameBuffer.toString('base64'));
              }
              
              // Cleanup
              await fs.unlink(videoPath);
              await fs.rm(tempDir, { recursive: true });
              
              resolve(frames);
            } catch (err) {
              reject(err);
            }
          })
          .on('error', reject);
      });
      
    } catch (error) {
      console.error('Error extracting frames:', error);
      throw error;
    }
  }
  
  /**
   * Analyze frames with GPT-4o Vision
   * Determine: Activity OR Landscape
   */
  async analyzeFramesWithVision(frames) {
    try {
      const messages = [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze these video frames and determine:

1. Is this an ACTIVITY (person doing something: surfing, yoga, climbing, diving, etc.)?
2. OR is this a LANDSCAPE (beautiful place: waterfall, desert, canyon, nature, etc.)?

If ACTIVITY:
- Return the activity name (e.g., "surfing", "yoga", "rock climbing")
- Be specific and accurate

If LANDSCAPE:
- Return the location/place name (e.g., "Namibia Desert", "Iguazu Falls", "Grand Canyon")
- Include country if identifiable

Respond in JSON format ONLY:
{
  "type": "activity" or "landscape",
  "activity": "activity name" or null,
  "location": "location name" or null,
  "confidence": 0.0-1.0
}`
          },
          ...frames.map(frame => ({
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${frame}`
            }
          }))
        ]
      }];
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages,
        max_tokens: 300,
        temperature: 0.3
      });
      
      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON in response');
      }
      
      return JSON.parse(jsonMatch[0]);
      
    } catch (error) {
      console.error('Error in vision analysis:', error);
      throw error;
    }
  }
}

module.exports = new SimpleVideoAnalyzer();
