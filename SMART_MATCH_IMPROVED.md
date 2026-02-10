# 🚀 Smart Match Feature - Improved Version

## Overview

The Smart Match feature now uses **4 levels of analysis** to match social media content to experiences:

1. **Text Metadata Extraction** - Get description, hashtags from the post
2. **Vision AI Analysis** - Analyze the thumbnail image when text is insufficient  
3. **AI Matching** - Gemini AI matches content to experiences
4. **Keyword Matching** - Fallback with comprehensive keyword database

## How It Works

### Flow Diagram

```
User shares Instagram/TikTok URL
           ↓
┌─────────────────────────────────┐
│ Extract Text Metadata           │
│ (RapidAPI → Apify → oEmbed)     │
└─────────────┬───────────────────┘
              ↓
       Has good text?
       ↙         ↘
     YES          NO
      ↓            ↓
      │    ┌──────────────────┐
      │    │ Vision AI        │
      │    │ Analyze thumbnail│
      │    └────────┬─────────┘
      │             ↓
      └─────────────┴──────────────┐
                                   ↓
                    ┌──────────────────────────┐
                    │ AI Matching (Gemini)     │
                    │ Uses text + image context│
                    └────────────┬─────────────┘
                                 ↓
                        Got matches?
                        ↙         ↘
                      YES          NO
                       ↓            ↓
                Return matches  Keyword Matching
                                   ↓
                             Got matches?
                             ↙         ↘
                           YES          NO
                            ↓            ↓
                    Return matches  Suggest Top Rated
```

## Required Environment Variables

### On Render (Backend)

```bash
# At least ONE of these for Instagram scraping:
RAPIDAPI_KEY=your_rapidapi_key          # Recommended - free tier
APIFY_API_TOKEN=your_apify_token        # Alternative
FACEBOOK_APP_ID=your_app_id             # Legacy fallback
FACEBOOK_APP_SECRET=your_secret         # Legacy fallback

# Required for AI matching & Vision:
GOOGLE_AI_KEY=your_gemini_api_key

# Required for database:
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## Getting API Keys

### 1. RapidAPI Key (Recommended)

1. Go to https://rapidapi.com
2. Sign up for free
3. Search for "Instagram Scraper API" 
4. Subscribe to free tier (50 requests/month free)
5. Copy your API key from the header snippet

**Best option:** `instagram-scraper-api2.p.rapidapi.com`

### 2. Google AI Key (Required for Vision)

1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key
3. Copy the key

### 3. Apify Token (Alternative)

1. Go to https://apify.com
2. Sign up
3. Get token from Settings → Integrations

## Vision AI Analysis

When we can't extract good text metadata from the post (which happens often with Instagram), the system now:

1. Downloads the thumbnail image
2. Sends it to Gemini Vision AI
3. AI analyzes the image and returns:
   - Activities detected (surfing, yoga, cooking, etc.)
   - Location hints (beach, mountains, city, etc.)
   - Mood (adventure, relaxation, cultural, etc.)
   - Keywords for matching

This allows us to match experiences even when we can't read the post text!

## Testing

```bash
# Test the smart-match endpoint
curl -X POST "https://bored-tourist-api.onrender.com/api/social-media/smart-match" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.instagram.com/reel/ABC123/"}'
```

## Troubleshooting

### "Experiences don't match the video"

1. Check if metadata extraction is working:
   - Look at `matchMethod` in response
   - If `suggested` - extraction failed, using top rated

2. Check environment variables on Render:
   - `RAPIDAPI_KEY` or `APIFY_API_TOKEN` must be set
   - `GOOGLE_AI_KEY` must be set

3. Check logs on Render for errors

### "No experiences returned"

- Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Ensure experiences table has `active = true` records

### "Vision analysis failed"

- Check `GOOGLE_AI_KEY` is valid
- Check if thumbnail URL is accessible
- Some private posts may not have accessible thumbnails
