# 🤖 Smart Match Setup Guide

## Overview

The Smart Match feature allows users to share Instagram Reels or TikTok videos to the Bored Tourist app, which then:

1. **Extracts metadata** (description, hashtags, username) using oEmbed APIs or Apify as fallback
2. **Uses Gemini AI** to intelligently match the content with available experiences
3. **Falls back to keyword matching** if AI is unavailable
4. **Suggests popular experiences** if no match is found

## Required Environment Variables

Add these to your backend `.env` file:

```bash
# Required for Instagram oEmbed (already configured)
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Required for AI matching (use the same key as the frontend)
GOOGLE_AI_KEY=your_google_ai_key

# Optional: For more robust scraping when oEmbed fails
APIFY_API_TOKEN=your_apify_api_token

# Supabase (already configured)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

## How It Works

### 1. Metadata Extraction

When a user shares a social media URL:

**TikTok:**
- Primary: TikTok oEmbed API (free, no auth)
- Fallback: Apify TikTok Scraper

**Instagram:**
- Primary: Facebook Graph API oEmbed (requires App credentials)
- Fallback 1: Apify Instagram Post Scraper
- Fallback 2: Legacy Instagram oEmbed API

### 2. AI Matching (Gemini)

The extracted metadata (description, hashtags) is sent to Gemini AI with a list of all available experiences. The AI analyzes:

- Activity type (surf, yoga, wine tasting, etc.)
- Location references
- Vibe/mood of the content
- Hashtags

Returns a ranked list of matching experience IDs.

### 3. Keyword Matching (Fallback)

If AI fails or is unavailable, the system uses keyword-based matching:

- Maps keywords to experience categories
- Scores experiences based on keyword matches
- Returns top 5 matches

### 4. Suggested Experiences (Final Fallback)

If no matches found, shows top-rated experiences.

## API Endpoints

### POST `/api/social-media/smart-match`

**Request:**
```json
{
  "url": "https://www.instagram.com/reel/xxxxx/"
}
```

**Response:**
```json
{
  "success": true,
  "metadata": {
    "platform": "instagram",
    "success": true,
    "username": "timeless.lisbon",
    "description": "Amazing escape game in Lisbon!",
    "hashtags": ["#lisbon", "#escaperoom", "#adventure"],
    "method": "facebook_graph_api"
  },
  "matchedExperiences": [
    {
      "id": "8",
      "title": "Sintra Mystery Treasure Hunt",
      "category": "Adventure",
      "location": "Sintra",
      "price": 45,
      "rating": 4.8
    }
  ],
  "matchMethod": "ai"
}
```

## Deployment Notes

1. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Deploy to Render:**
   - Add `GOOGLE_AI_KEY` to environment variables
   - Optionally add `APIFY_API_TOKEN` for better Instagram scraping

3. **Getting Apify Token (Optional):**
   - Create account at https://apify.com
   - Get API token from Settings → Integrations
   - Free tier includes 5 USD/month

## Troubleshooting

### "Could not extract metadata from Instagram"
- Check `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET`
- The Instagram reel might be private or deleted

### AI matching not working
- Check `GOOGLE_AI_KEY` is set correctly
- Check Gemini API quotas

### Experiences not loading
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Ensure experiences table has `active = true` records

## Flow Diagram

```
User shares URL from Instagram/TikTok
           ↓
    [shared-content.tsx]
           ↓
    POST /api/social-media/smart-match
           ↓
    ┌─────────────────┐
    │ Extract Metadata │
    │ (oEmbed/Apify)   │
    └────────┬────────┘
             ↓
    ┌─────────────────┐
    │ Fetch Experiences │
    │ from Supabase    │
    └────────┬────────┘
             ↓
    ┌─────────────────┐
    │ AI Matching     │──── Fails ────→ Keyword Matching ──── Fails ────→ Suggested
    │ (Gemini)        │
    └────────┬────────┘
             ↓
    Return matched experiences
           ↓
    Display in app
```
