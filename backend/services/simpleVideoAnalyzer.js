const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Load valid activities from JSON database
let VALID_ACTIVITIES = null;
function loadValidActivities() {
  if (!VALID_ACTIVITIES) {
    try {
      const jsonPath = path.join(__dirname, '../../assets/COMPLETE_ACTIVITIES_DATABASE_WITH_PHOTOS.json');
      console.log('📂 Loading activities from:', jsonPath);
      console.log('📂 Path exists:', fs.existsSync(jsonPath));
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      VALID_ACTIVITIES = data.activities.map(a => a.activity.toLowerCase());
      console.log(`✅ Loaded ${VALID_ACTIVITIES.length} valid activities`);
      console.log(`✅ First 5 activities:`, VALID_ACTIVITIES.slice(0, 5));
    } catch (error) {
      console.error('⚠️ Failed to load activities database:', error.message);
      console.error('⚠️ Full error:', error);
      VALID_ACTIVITIES = [];
    }
  }
  return VALID_ACTIVITIES;
}

// Check if detected activity matches any valid activity
function isValidActivity(detectedActivity) {
  if (!detectedActivity) return false;
  
  const validActivities = loadValidActivities();
  const detected = detectedActivity.toLowerCase().trim();
  
  // Exact match
  if (validActivities.includes(detected)) {
    return true;
  }
  
  // Partial match (e.g., "scuba diving" matches "diving")
  for (const valid of validActivities) {
    if (detected.includes(valid) || valid.includes(detected)) {
      return true;
    }
  }
  
  return false;
}

class SimpleVideoAnalyzer {
  /**
   * Analyze video with 2-3 frames - FAST and SIMPLE
   * PRIORITY 1: Check caption/hashtags first (cheaper & faster)
   * PRIORITY 2: Frame analysis if no metadata
   */
  async analyzeVideo(instagramUrl) {
    console.log('🎬 Simple Video Analysis Started');
    console.log('📱 Instagram URL:', instagramUrl);
    
    // Wrap everything in a timeout promise
    const timeoutMs = 60000; // 60 seconds max
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Video analysis timeout after 60 seconds')), timeoutMs);
    });
    
    const analysisPromise = (async () => {
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
      
      // Merge location from both sources
      const mergedLocation = metadataResult.location || frameAnalysis.location;
      
      // CRITICAL RULE: If we have a valid location, NEVER mark as irrelevant
      // Location = landscape/destination content (e.g., Dolomites, Grand Canyon)
      if (mergedLocation && mergedLocation !== 'null' && frameAnalysis.type === 'irrelevant') {
        console.log(`🗺️ Location detected: "${mergedLocation}" - Converting irrelevant to landscape`);
        frameAnalysis.type = 'landscape';
        frameAnalysis.location = mergedLocation;
        frameAnalysis.confidence = Math.max(frameAnalysis.confidence, 0.8);
      }
      
      if (metadataResult.activity && metadataResult.confidence >= 0.7) {
        console.log(`✅ Using metadata result (high confidence: ${metadataResult.confidence})`);
        finalResult = {
          type: 'activity',
          activity: metadataResult.activity,
          location: mergedLocation,
          confidence: metadataResult.confidence,
          source: 'metadata'
        };
      } else if (frameAnalysis.confidence > metadataResult.confidence) {
        console.log(`✅ Using frame analysis (higher confidence: ${frameAnalysis.confidence})`);
        finalResult = {
          type: frameAnalysis.type,
          activity: frameAnalysis.activity,
          location: mergedLocation,
          confidence: frameAnalysis.confidence,
          source: 'frames'
        };
      } else {
        console.log(`✅ Using metadata result (fallback)`);
        
        // Determine type: 
        // - If we have activity → 'activity'
        // - If we have location but no activity → 'landscape'
        // - If frameAnalysis says landscape → 'landscape'
        let resultType = 'activity';
        if (frameAnalysis.type === 'landscape' || (!metadataResult.activity && mergedLocation)) {
          resultType = 'landscape';
        } else if (metadataResult.activity) {
          resultType = 'activity';
        }
        
        finalResult = {
          type: resultType,
          activity: metadataResult.activity,
          location: mergedLocation,
          confidence: metadataResult.confidence || 0.5,
          source: 'metadata'
        };
        console.log(`🎯 Final type determined: "${resultType}" (activity: ${metadataResult.activity}, location: ${mergedLocation})`);
      }
      
      // Step 5: VALIDATE if activity is in our 315 activities database
      // If type is 'activity' but not in our list → mark as irrelevant
      if (finalResult.type === 'activity' && finalResult.activity) {
        try {
          const isValid = isValidActivity(finalResult.activity);
          if (!isValid) {
            console.log(`❌ Activity "${finalResult.activity}" not in valid activities list - marking as irrelevant`);
            finalResult = {
              type: 'irrelevant',
              activity: null,
              location: null,
              confidence: 0.1,
              source: 'validation'
            };
          } else {
            console.log(`✅ Activity "${finalResult.activity}" is valid`);
          }
        } catch (validationError) {
          console.error('⚠️ Validation error, accepting activity by default:', validationError.message);
          // If validation fails, accept the activity (fail open)
        }
      }
      
      // If landscape → always valid
      if (finalResult.type === 'landscape') {
        console.log('✅ Landscape type - always valid');
      }
      
      // Use first frame as thumbnail if no thumbnail from provider
      const finalThumbnail = videoData.thumbnailUrl || (frames.length > 0 ? frames[0] : null);
      
      return {
        success: true,
        thumbnailUrl: finalThumbnail,
        ...finalResult
      };
      
      } catch (error) {
        console.error('❌ Error in video analysis:', error);
        throw error;
      }
    })();
    
    // Race between analysis and timeout
    try {
      return await Promise.race([analysisPromise, timeoutPromise]);
    } catch (error) {
      console.error('❌ Video analysis failed:', error.message);
      // Return irrelevant if analysis fails or times out
      return {
        success: true,
        type: 'irrelevant',
        activity: null,
        location: null,
        confidence: 0,
        source: 'error',
        thumbnailUrl: null
      };
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
    let thumbnailUrl = null;
    
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
      thumbnailUrl = response.data?.data?.thumbnail_url || response.data?.thumbnail_url || response.data?.data?.display_url || response.data?.display_url;
      hashtags = this.extractHashtags(caption);
      
      if (videoUrl) {
        console.log('✅ Got video URL from RapidAPI');
        if (location) console.log('📍 Location tag:', location);
        if (hashtags.length) console.log('🏷️ Hashtags:', hashtags.join(', '));
        if (thumbnailUrl) console.log('🖼️ Thumbnail URL:', thumbnailUrl);
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
          thumbnailUrl = item.displayUrl || item.thumbnailUrl;
          hashtags = this.extractHashtags(caption);
          console.log('✅ Got video URL from Apify');
          if (thumbnailUrl) console.log('🖼️ Thumbnail URL from Apify:', thumbnailUrl);
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
      location,
      thumbnailUrl
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
          content: "Extract ONLY travel/adventure activities and destinations from Instagram metadata. Reject food, home, daily life content."
        }, {
          role: "user",
          content: `Analyze this Instagram post metadata:

${metadataText}

ONLY ACCEPT these types of activities:
✅ Adventure: surfing, diving, hiking, climbing, skiing, paragliding, kayaking, safari
✅ Cultural: temple visits, historical sites, festivals, cultural tours
✅ Wellness: yoga retreats, meditation in nature (NOT at home)
✅ Food: food tours, cooking classes in destinations (NOT regular eating)

REJECT these:
❌ Regular eating/cooking at home or restaurants
❌ Home activities (cleaning, organizing, etc.)
❌ Pets, family content, random daily life
❌ Shopping, getting ready, fashion content

If this is NOT a travel/adventure/destination post, return NULL for activity.

Return JSON only:
{
  "activity": "specific travel activity or null",
  "location": "destination name or null",
  "confidence": 0.0-1.0
}`
        }],
        temperature: 0.2,
        max_tokens: 100,
        timeout: 20000 // 20 second timeout
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
                text: `Frame ${index + 1}/${frames.length} - Classify this video content:

VALID TYPES:
1. ACTIVITY - Travel/adventure activities like:
   ✅ Surfing, diving, hiking, climbing, skiing, kayaking, paragliding
   ✅ Yoga on beach, meditation in nature, fitness outdoors
   ✅ Food tours, cooking classes in exotic locations
   ✅ Cultural experiences (temples, monuments, festivals)
   ❌ NOT regular eating, shopping, home activities

2. LANDSCAPE - Beautiful destinations/places:
   ✅ Waterfalls, canyons, deserts, mountains, beaches, cities
   ✅ Famous landmarks, scenic viewpoints
   ❌ NOT restaurants, cafes, homes, offices

3. IRRELEVANT - Anything else:
   ❌ Food videos (unless it's a food tour/class in a destination)
   ❌ Home activities, pets, random content
   ❌ People talking/vlogging without activity/destination focus

If ACTIVITY: Return activity name (e.g., "surfing", "temple visit")
If LANDSCAPE: Return location (e.g., "Grand Canyon, USA")
If IRRELEVANT: Set both activity and location to null, confidence low

Respond in JSON format ONLY:
{
  "type": "activity" or "landscape" or "irrelevant",
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
            temperature: 0.3,
            timeout: 25000 // 25 second timeout per frame
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
