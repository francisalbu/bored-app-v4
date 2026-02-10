# Bored AI - Setup Instructions

## Overview
The Bored AI tab replaces the Saved tab and provides an interactive AI-powered recommendation system for Lisbon experiences. Users can type their current "vibe" and get sassy, personalized recommendations from a Gemini-powered AI.

## Features
- 🤖 AI-powered recommendations using Google's Gemini 2.0 Flash
- 🎭 Preset mood buttons (Chaos, Chill, Rave, History, Food, Surf)
- ✨ Sassy, Gen Z-friendly AI personality focused on Lisbon
- 📝 Conversation history showing past vibe checks
- 🎨 Bold design matching boredtourist.com aesthetic

## Setup

### 1. Get Google AI API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Add API Key to Environment

Create a `.env` file in the root directory:

```bash
EXPO_PUBLIC_GOOGLE_AI_KEY=your_actual_api_key_here
```

**Important:** Never commit your `.env` file to GitHub! It's already in `.gitignore`.

### 3. Install Dependencies

The Google Generative AI SDK is already installed:

```bash
npm install @google/generative-ai
```

### 4. Test the Feature

1. Start your development server:
```bash
npm start
```

2. Navigate to the "Bored AI" tab (previously "Saved")
3. Try typing a vibe or clicking a mood button
4. You should get a sassy AI recommendation about Lisbon!

## Architecture

### Files Created/Modified

- `services/boredAI.ts` - AI service handling Gemini API calls
- `app/(tabs)/saved.tsx` - Transformed into Bored AI tab
- `app/(tabs)/_layout.tsx` - Updated tab icon and title
- `app/(tabs)/profile.tsx` - Already has saved experiences section

### How It Works

1. User inputs their vibe or selects a mood
2. `getVibeCheckRecommendation()` sends prompt to Gemini API
3. AI responds with a specific Lisbon recommendation
4. Response is displayed with "AI CHOICE" badge
5. All responses are saved to conversation history

### AI Personality

The AI is configured to be:
- **Sassy & irreverent** - like a cool older sibling
- **Lisbon-focused** - only recommends actual places/experiences
- **Brief** - max 40 words per response
- **Non-basic** - avoids touristy generic suggestions
- **Slang-aware** - uses "slaps", "lit", "mid" appropriately

## Migrated: Saved Experiences

The saved experiences functionality has been moved to the **Profile** tab:
- View saved count in stats
- Click "Saved Experiences" button to see all favorites
- Navigate to `/saved-experiences` route for full list

## API Costs

Google AI (Gemini) pricing:
- Gemini 2.0 Flash: Free tier available
- 15 requests per minute limit (free tier)
- Check [Google AI Pricing](https://ai.google.dev/pricing) for details

## Troubleshooting

### "System offline. The developer forgot the API key"
- Ensure `.env` file exists in root directory
- Check that `EXPO_PUBLIC_GOOGLE_AI_KEY` is set correctly
- Restart your Expo development server

### "The AI is on a coffee break"
- Check your internet connection
- Verify API key is valid on Google AI Studio
- Check if you've exceeded free tier limits
- Look at terminal logs for specific error messages

### Tab not updating
- Clear Expo cache: `rm -rf .expo`
- Restart bundler: `npm start --clear`

## Design Notes

The UI matches the boredtourist.com aesthetic:
- **Colors:** Lime green (#CFFF04) primary, dark charcoal backgrounds
- **Typography:** Bold (fontWeight 900) throughout
- **Cards:** #2a2a2a background for visual hierarchy
- **Inputs:** Rounded, dark with subtle borders
- **Mood chips:** Emoji + label in pill-shaped buttons

## Future Enhancements

Potential improvements:
- [ ] Save favorite AI recommendations
- [ ] Share recommendations to social media
- [ ] Filter by category (food, nightlife, culture, etc.)
- [ ] Integration with experiences - tap to book recommended activity
- [ ] Rate AI suggestions (thumbs up/down)
- [ ] Voice input for vibe check
