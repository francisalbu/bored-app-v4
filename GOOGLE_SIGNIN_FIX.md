# Google Sign In Setup Guide

## Issue: Google Sign In Not Working

If Google Sign In opens the browser but doesn't redirect back to the app, or shows errors, follow these steps:

## ✅ Step 1: Configure Google OAuth in Supabase

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/hnivuisqktlrusyqywaz
   - Go to: **Authentication** → **Providers**

2. **Enable Google Provider**
   - Find "Google" in the list
   - Toggle it **ON**
   - You'll need:
     - **Google Client ID**
     - **Google Client Secret**

3. **Get Google Credentials** (if you don't have them)
   - Go to: https://console.cloud.google.com/
   - Select your project or create a new one
   - Go to: **APIs & Services** → **Credentials**
   - Click: **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Name: `Bored Explorer - Supabase`
   - Add **Authorized JavaScript origins**:
     - `https://hnivuisqktlrusyqywaz.supabase.co`
   - Add **Authorized redirect URIs**:
     - `https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback`
   - Click **Create**
   - Copy the **Client ID** and **Client Secret**

4. **Enter Credentials in Supabase**
   - Paste **Client ID** into Supabase
   - Paste **Client Secret** into Supabase
   - Click **Save**

## ✅ Step 2: Configure Redirect URLs

In Supabase Dashboard → **Authentication** → **URL Configuration**:

### For Development (Testing on iPhone):
```
boredtourist://auth/callback
exp://192.168.1.136:8081/--/auth/callback
```
*Replace `192.168.1.136` with your current Mac's IP address*

### For Production (App Store):
```
boredtourist://auth/callback
```

## ✅ Step 3: Update app.json (if needed)

Make sure `app.json` has the correct scheme:

```json
{
  "expo": {
    "scheme": "boredtourist",
    "ios": {
      "bundleIdentifier": "com.boredexplorer.app",
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLSchemes": ["boredtourist"]
          }
        ]
      }
    }
  }
}
```

## ✅ Step 4: Test the Flow

1. **Start the backend:**
   ```bash
   cd backend && node server.js
   ```

2. **Start the app:**
   ```bash
   npx expo start
   ```

3. **Test Google Sign In:**
   - Open app on iPhone
   - Go to payment screen or profile
   - Click "Sign in"
   - Click "Continue with Google"
   - Should open Safari/Chrome
   - Select Google account
   - Should redirect back to app
   - Should show "✓ Signed in" badge

## 🐛 Troubleshooting

### Issue: "Configuration Error" when clicking Google
**Cause:** Google OAuth not enabled in Supabase
**Fix:** Follow Step 1 above

### Issue: Opens browser but doesn't redirect back
**Cause:** Redirect URL mismatch
**Fix:** 
1. Check redirect URLs in Supabase (Step 2)
2. Make sure IP address matches your Mac's current IP
3. Restart Expo: `r` in terminal

### Issue: Redirects back but shows error
**Cause:** Auth callback not processing correctly
**Fix:**
1. Check terminal for errors
2. Check `app/auth/callback.tsx` is working
3. Look for `db.get is not a function` error (should be fixed now)

### Issue: "db.get is not a function"
**Status:** ✅ **FIXED** in latest commit
**Cause:** Auth middleware was using SQLite instead of Supabase
**Fix:** Already applied - just pull/restart backend

## 📱 How It Works

```
User clicks "Sign in with Google"
    ↓
AuthBottomSheet calls supabase.auth.signInWithOAuth()
    ↓
Opens Safari/Chrome with Google OAuth URL
    ↓
User selects Google account
    ↓
Google redirects to: boredtourist://auth/callback?access_token=...
    ↓
iOS opens app at app/auth/callback.tsx
    ↓
callback.tsx extracts tokens and calls supabase.auth.setSession()
    ↓
Session established in Supabase
    ↓
Backend GET /api/auth/supabase/me syncs user to database
    ↓
User sees "✓ Signed in" badge
    ↓
Contact form auto-fills with user data
```

## 🎯 Expected Behavior

### Before Sign In:
- Payment screen shows empty contact form
- "Already have an account? Sign in" link at top

### During Sign In:
- Browser opens with Google account selection
- User selects account
- Browser redirects back to app
- Shows "Processing authentication..." briefly

### After Sign In:
- "✓ Signed in" badge appears
- Name field shows: User's Google name
- Email field shows: User's Google email
- Phone field: Empty (user can fill in)
- Can proceed to payment

## 🔒 Security Notes

- Never commit Google Client Secret to git
- Use environment variables for sensitive keys
- Supabase tokens are stored securely by Expo SecureStore
- Backend uses service role key (never exposed to app)

## 📞 Still Not Working?

1. **Check Supabase Logs:**
   - Dashboard → Logs → Auth Logs
   - Look for failed OAuth attempts

2. **Check Backend Logs:**
   - Should see: "🔄 [SYNC START] Syncing user to Supabase DB"
   - Should NOT see: "❌ [SYNC ERROR] db.get is not a function"

3. **Check App Logs:**
   - Should see: "✅ Session established!"
   - Should see: "✅ User synced with backend!"

4. **Verify Configuration:**
   ```bash
   # Check if Google OAuth is configured
   curl https://hnivuisqktlrusyqywaz.supabase.co/.well-known/openid-configuration
   ```

## ✅ Verification Checklist

- [ ] Google OAuth enabled in Supabase
- [ ] Client ID and Secret configured
- [ ] Redirect URLs added in Supabase
- [ ] Redirect URLs added in Google Console
- [ ] app.json has correct scheme
- [ ] Backend running (no db.get errors)
- [ ] App running on same network as backend
- [ ] IP address matches in all configs
- [ ] Can open browser from app
- [ ] Browser can redirect back to app
- [ ] User data syncs to Supabase users table
