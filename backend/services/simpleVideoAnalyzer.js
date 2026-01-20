const OpenAI = require('openai');
const axios = require('axios');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class SimpleVideoAnalyzer {
  /**
   * Analyze video with 2-3 frames - FAST and SIMPLE
   * PRIORITY 1: Check caption/hashtags first (cheaper & faster)
   * PRIORITY 2: Frame analysis if no metadata
   */
  async analyzeVideo(instagramUrl) {
    console.log('🎬 Simple Video Analysis Started');
    console.log('📱 Instagram URL:', instagramUrl);
    
    try {
      // Step 1: Download video and get metadata
      const videoData = await this.downloadInstagramVideo(instagramUrl);
      console.log('✅ Video downloaded');
      
      const envFrames = Number.parseInt(process.env.VIDEO_ANALYSIS_FRAMES || '', 10);
      const frameCount = Number.isFinite(envFrames) && envFrames > 0 ? envFrames : 3;
      
      // Step 2-3: Run metadata extraction and frame extraction IN PARALLEL
      console.log('📝 Step 2: Extracting from Instagram metadata (PRIORITY 1)...');
      console.log(`🎞️ Step 3: Extracting ${frameCount} frames...`);
      
      const metadataPromise = (videoData.caption || videoData.hashtags?.length > 0) 
        ? this.extractFromMetadata(videoData.caption, videoData.hashtags, videoData.location)
        : Promise.resolve({ activity: null, location: null, confidence: 0 });
      
      const framesPromise = this.extractFrames(videoData.videoBuffer, frameCount);
      
      const [metadataResult, frames] = await Promise.all([
        metadataPromise,
        framesPromise
      ]);
      
      console.log(`✅ Metadata: activity="${metadataResult.activity}", confidence=${metadataResult.confidence}`);
      console.log(`✅ Extracted ${frames.length} frames`);
      
      // Step 4: ALWAYS analyze frames to complement metadata (even if metadata is good)
      console.log('🤖 Step 4: Analyzing frames to complement metadata...');
      const frameAnalysis = await this.analyzeFramesWithVision(frames);
      console.log('✅ Frame analysis complete:', frameAnalysis);
      
      // Decide which result to use based on confidence
      let finalResult;
      if (metadataResult.activity && metadataResult.confidence >= 0.7) {
        console.log(`✅ Using metadata result (high confidence: ${metadataResult.confidence})`);
        finalResult = {
          type: 'activity',
          activity: metadataResult.activity,
          location: metadataResult.location || frameAnalysis.location,
          confidence: metadataResult.confidence,
          source: 'metadata'
        };
      } else if (frameAnalysis.confidence > metadataResult.confidence) {
        console.log(`✅ Using frame analysis (higher confidence: ${frameAnalysis.confidence})`);
        finalResult = {
          type: frameAnalysis.type,
          activity: frameAnalysis.activity,
          location: frameAnalysis.location || metadataResult.location,
          confidence: frameAnalysis.confidence,
          source: 'frames'
        };
      } else {
        console.log(`✅ Using metadata result (fallback)`);
        finalResult = {
          type: 'activity',
          activity: metadataResult.activity,
          location: metadataResult.location || frameAnalysis.location,
          confidence: metadataResult.confidence,
          source: 'metadata'
        };
      }
      
      return {
        success: true,
        ...finalResult
      };
      
    } catch (error) {
      console.error('❌ Error in video analysis:', error);
      throw error;
    }
  }
  
  /**
   * Download Instagram video with RapidAPI + Apify fallback
   * Returns: videoBuffer, caption, hashtags, location
   */
  async downloadInstagramVideo(url) {
    console.log('📥 Downloading Instagram video...');
    
    let videoUrl = null;
    let caption = '';
    let hashtags = [];
    let location = null;
    
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
      caption = response.data?.data?.caption || response.data?.caption || '';
      location = response.data?.data?.location?.name || response.data?.location?.name || null;
      hashtags = this.extractHashtags(caption);
      
      if (videoUrl) {
        console.log('✅ Got video URL from RapidAPI');
        if (location) console.log('📍 Location tag:', location);
        if (hashtags.length) console.log('🏷️ Hashtags:', hashtags.join(', '));
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
              waitForFinish: 120
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
          caption = item.caption || '';
          location = item.locationName || null;
          hashtags = this.extractHashtags(caption);
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
    return {
      videoBuffer: Buffer.from(videoResponse.data),
      caption,
      hashtags,
      location
    };
  }
  
  /**
   * Extract activity from Instagram metadata (caption/hashtags/location)
   * PRIORITY 1 - Always check this first before analyzing frames!
   */
  async extractFromMetadata(caption = '', hashtags = [], locationTag = '') {
    console.log('📝 Analyzing Instagram metadata...');
    
    const metadataText = `
Caption: ${caption}
Hashtags: ${hashtags.join(' ')}
Location Tag: ${locationTag || 'none'}
`.trim();
    
    if (!caption && !hashtags.length && !locationTag) {
      console.log('⚠️ No metadata available');
      return { activity: null, location: null, confidence: 0 };
    }
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: "Extract travel activity and location from Instagram metadata. Be specific with activities."
        }, {
          role: "user",
          content: `Extract activity and location from this Instagram post:

${metadataText}

RULES:
1. Extract SPECIFIC activity from hashtags and caption (e.g., #surf = surfing, #yoga = yoga, #dive = diving)
2. If location tag exists, use it
3. If no clear activity found, return null
4. Return confidence 0.9 if clear hashtags, 0.5-0.7 if from caption only

Return JSON only:
{
  "activity": "specific activity or null",
  "location": "location or null",
  "confidence": 0.0-1.0
}`
        }],
        temperature: 0.2,
        max_tokens: 100
      });
      
      const text = response.choices[0].message.content.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(text);
      
      console.log(`📊 Metadata: activity="${result.activity}", location="${result.location}", confidence=${result.confidence}`);
      return result;
      
    } catch (error) {
      console.error('❌ Metadata extraction failed:', error.message);
      return { activity: null, location: null, confidence: 0 };
    }
  }
  
  /**
   * Extract hashtags from text
   */
  extractHashtags(text) {
    if (!text) return [];
    const matches = text.match(/#[\w]+/g);
    return matches || [];
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
   * Analyze frames with GPT-4o Vision with parallelism
   * Determine: Activity OR Landscape
   */
  async analyzeFramesWithVision(frames) {
    try {
      const envConcurrency = Number.parseInt(process.env.VIDEO_ANALYSIS_CONCURRENCY || '', 10);
      const concurrency = Number.isFinite(envConcurrency) && envConcurrency > 0 ? envConcurrency : 2;
      const visionModel = process.env.OPENAI_VISION_MODEL || 'gpt-4o';
      
      console.log(`🔍 Analyzing ${frames.length} frames with concurrency=${concurrency}, model=${visionModel}`);
      
      const results = new Array(frames.length);
      let nextIndex = 0;
      
      const processNext = async () => {
        while (true) {
          const index = nextIndex++;
          if (index >= frames.length) return;
          
          console.log(`📊 Analyzing frame ${index + 1}/${frames.length}...`);
          
          const messages = [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Frame ${index + 1}/${frames.length} - Determine:

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
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${frames[index]}`
                }
              }
            ]
          }];
          
          const response = await openai.chat.completions.create({
            model: visionModel,
            messages: messages,
            max_tokens: 300,
            temperature: 0.3
          });
          
          const content = response.choices[0].message.content;
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            results[index] = JSON.parse(jsonMatch[0]);
          }
          
          if (global.gc) global.gc();
        }
      };
      
      // Run workers in parallel
      const workers = [];
      for (let i = 0; i < Math.min(concurrency, frames.length); i++) {
        workers.push(processNext());
      }
      await Promise.all(workers);
      
      console.log('✅ All frames analyzed with parallelism!');
      
      // Aggregate results - take most confident result
      const validResults = results.filter(Boolean);
      if (!validResults.length) {
        throw new Error('No valid analysis results');
      }
      
      // Return the result with highest confidence
      return validResults.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      
    } catch (error) {
      console.error('Error in vision analysis:', error);
      throw error;
    }
  }
}

module.exports = new SimpleVideoAnalyzer();
