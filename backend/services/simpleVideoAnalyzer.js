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
   * Download Instagram video
   */
  async downloadInstagramVideo(url) {
    try {
      const apiKey = process.env.RAPIDAPI_KEY;
      
      const response = await axios.get('https://instagram-scraper-api2.p.rapidapi.com/v1/post_info', {
        params: { code_or_id_or_url: url },
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com'
        }
      });
      
      const videoUrl = response.data?.data?.video_url;
      if (!videoUrl) throw new Error('No video URL found');
      
      const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
      return Buffer.from(videoResponse.data);
      
    } catch (error) {
      console.error('Error downloading video:', error);
      throw error;
    }
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
