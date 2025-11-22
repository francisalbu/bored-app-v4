# Quick Setup: Google AI API Key

## Steps to Get Started

### 1. Get Your API Key (2 minutes)

1. **Visit Google AI Studio:**
   - Go to: https://aistudio.google.com/app/apikey
   
2. **Sign in:**
   - Use your Google account (any Gmail account works)
   
3. **Create API Key:**
   - Click the blue "Create API Key" button
   - Choose "Create API key in new project" (recommended)
   - Copy the API key shown

### 2. Add to Your Project

Create a file named `.env` in your project root:

```bash
EXPO_PUBLIC_GOOGLE_AI_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Replace the `XXXXX` with your actual API key.

### 3. Restart Expo

Stop your current Expo server (Ctrl+C) and restart:

```bash
npm start
```

### 4. Test It!

1. Open your app in Expo Go
2. Navigate to the "Bored AI" tab
3. Type something like: "hungry but make it fancy"
4. Hit send and watch the magic! ✨

## Important Notes

⚠️ **Never share your API key publicly!**
- Don't commit `.env` to GitHub
- Don't share screenshots with your key visible
- Don't paste it in Discord/Slack

✅ **Free Tier Limits:**
- 15 requests per minute
- 1500 requests per day
- More than enough for development and testing!

🔒 **Security:**
- For production, move API calls to your backend
- Never expose API keys in client-side code for production
- This is fine for development and MVP testing

## Troubleshooting

### "System offline" message?
- Check that `.env` file exists in root folder
- Verify the API key is correct (no extra spaces)
- Restart Expo server

### No response from AI?
- Check your internet connection
- Verify API key is active in Google AI Studio
- Look at terminal logs for error messages

### Environment variable not loading?
- Expo uses `EXPO_PUBLIC_` prefix for client-side env vars
- Make sure you're using exactly: `EXPO_PUBLIC_GOOGLE_AI_KEY`
- Restart Expo completely (kill terminal and start fresh)

## What's Next?

Once working, you can:
- Customize the AI personality in `services/boredAI.ts`
- Add more mood presets in `app/(tabs)/saved.tsx`
- Change the response style/length in the system instruction
- Add experience booking integration (tap AI suggestion → book)

---

Need help? Check `BORED_AI_SETUP.md` for full documentation!
