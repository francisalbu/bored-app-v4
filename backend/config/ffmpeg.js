/**
 * FFmpeg Configuration
 * Sets up custom FFmpeg path for Render deployment
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

// In production (Render), use custom installed FFmpeg
if (process.env.NODE_ENV === 'production') {
  const customFFmpegPath = '/opt/render/project/src/backend/bin/ffmpeg';
  const customFFprobePath = '/opt/render/project/src/backend/bin/ffprobe';
  
  // Check if custom paths exist
  if (fs.existsSync(customFFmpegPath)) {
    console.log('✅ Using custom FFmpeg:', customFFmpegPath);
    ffmpeg.setFfmpegPath(customFFmpegPath);
  } else {
    console.log('⚠️ Custom FFmpeg not found, using system FFmpeg');
  }
  
  if (fs.existsSync(customFFprobePath)) {
    ffmpeg.setFfprobePath(customFFprobePath);
  }
} else {
  console.log('📍 Development mode - using system FFmpeg');
}

module.exports = ffmpeg;
