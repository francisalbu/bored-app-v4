# Fix: API Key Not Valid

## Problem
Error: `[400] API key not valid. Please pass a valid API key.`

## Solution

The API key you're using (`AIzaSyA4XzSo7Ft0SfT9vBSJiSuTeYg0PvVnSulw`) appears to be configured for **Google Maps API**, not **Generative AI API**.

### Steps to Fix:

### Option 1: Create a New API Key (Recommended - 2 minutes)

1. **Go to Google AI Studio:**
   - Visit: https://aistudio.google.com/app/apikey

2. **Create New API Key:**
   - Click "Create API Key"
   - Select "Create API key in new project"
   - Copy the NEW key

3. **Replace in .env file:**
   ```bash
   EXPO_PUBLIC_GOOGLE_AI_KEY=AIzaSy_YOUR_NEW_KEY_HERE
   ```

4. **Restart Expo:**
   - Stop Expo (Ctrl+C in terminal)
   - Start again: `npx expo start`

---

### Option 2: Enable Generative AI on Existing Key (3-5 minutes)

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/apis/credentials

2. **Find your API key:**
   - Look for the key ending in `...VnSulw`

3. **Edit API key restrictions:**
   - Click on the API key
   - Scroll to "API restrictions"
   - If "Restrict key" is selected:
     - Add "Generative Language API" to the allowed APIs
     - Save changes

4. **Enable the Generative Language API:**
   - Go to: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
   - Click "Enable"
   - Wait 1-2 minutes for it to activate

5. **Restart Expo:**
   - Stop and restart: `npx expo start`

---

## Quick Test

After updating, check the Expo terminal. You should see:

```
✅ API Key found, length: 39
🔑 Key starts with: AIzaSy...
🤖 Sending vibe check to Gemini: hungry but make it fancy...
✨ Got AI response: ...
```

If you see `❌ Gemini API Error`, the key still isn't working.

---

## Why This Happened

You likely copied the API key from your backend `.env` file, which was set up for Google Maps. The Generative AI API requires a different key or the same key with additional API permissions enabled.

---

## Still Not Working?

1. **Check key hasn't expired:**
   - Keys can be revoked/expired in Google Cloud Console

2. **Verify project has billing enabled:**
   - Go to: https://console.cloud.google.com/billing
   - Gemini has a generous free tier but requires billing enabled

3. **Try the test endpoint manually:**
   ```bash
   curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_KEY" \
     -H 'Content-Type: application/json' \
     -d '{"contents":[{"parts":[{"text":"Say hello"}]}]}'
   ```

4. **Create a completely new key:**
   - Sometimes old keys have cached restrictions
   - Creating fresh is fastest

---

## Need Help?

Check the logs in your Expo terminal after trying to use the AI. The error message will tell you exactly what's wrong!
