# 🔧 Google Login Fix Guide

## Problem
Google OAuth opens the browser but doesn't redirect back to the app.

## Root Causes
1. ✅ **Deep linking not properly configured**
2. ✅ **Redirect URL mismatch between Supabase and app**
3. ⚠️ **Google OAuth might not be enabled in Supabase**

---

## ✅ Step 1: Configure Google OAuth in Supabase

### 1.1 Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Go to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
5. Application type: **Web application**
6. Name: `Bored Explorer Web`
7. **Authorized redirect URIs** - Add:
   ```
   https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback
   ```
8. Click **CREATE**
9. **Copy the Client ID and Client Secret**

### 1.2 Enable Google in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/hnivuisqktlrusyqywaz)
2. Click **Authentication** (🔒 icon in sidebar)
3. Click **Providers**
4. Find **Google** and click to expand
5. Toggle **Enable Sign in with Google** to ON
6. Paste:
   - **Client ID** (from Google Cloud Console)
   - **Client Secret** (from Google Cloud Console)
7. Verify the **Redirect URL** shows:
   ```
   https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback
   ```
8. Click **Save**

---

## ✅ Step 2: Configure Deep Linking

Your app uses the scheme `boredtravel://` which needs to be properly configured.

### 2.1 Verify app.json

Your `app.json` should have:
```json
{
  "expo": {
    "scheme": "boredtravel",
    "ios": {
      "bundleIdentifier": "app.rork.bored-explorer"
    }
  }
}
```

### 2.2 Rebuild the app (Important!)

After changing deep linking, you MUST rebuild:

```bash
# Clean and rebuild
rm -rf ios/
npx expo prebuild --clean --platform ios
```

---

## ✅ Step 3: Test the Flow

1. **Start your app:**
   ```bash
   npx expo start
   ```

2. **Try Google Login:**
   - Open the app
   - Click "Sign in with Google"
   - Browser should open with Google login
   - After login, it should redirect back to the app

3. **Check logs:**
   ```
   🔐 Starting Google Sign-In...
   🌐 Opening browser with URL...
   📱 Browser result: { type: 'success', url: '...' }
   ✅ OAuth redirect success!
   🔑 Access token found: true
   🔑 Refresh token found: true
   ✅ Session established!
   ```

---

## 🐛 Troubleshooting

### Issue: "Redirect URI mismatch"

**Problem:** Google shows error about redirect URI.

**Solution:**
1. Make sure the redirect URI in Google Cloud Console is EXACTLY:
   ```
   https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback
   ```
2. No trailing slash
3. Use https, not http

### Issue: Browser doesn't redirect back

**Problem:** After Google login, stays in browser.

**Solution:**
1. Rebuild the app (see Step 2.2)
2. Make sure `expo-web-browser` is installed:
   ```bash
   npx expo install expo-web-browser
   ```
3. Verify deep link scheme in app.json

### Issue: "No tokens in redirect URL"

**Problem:** App redirects back but can't find tokens.

**Solution:**
1. Check if Google OAuth is enabled in Supabase (Step 1.2)
2. Verify the redirect URL in Supabase matches Google Cloud Console
3. Check the browser logs for the redirect URL

### Issue: "Invalid client"

**Problem:** Google shows "Invalid client" error.

**Solution:**
1. Double-check Client ID and Secret in Supabase
2. Make sure they match Google Cloud Console exactly
3. No extra spaces or characters

---

## 📋 Quick Checklist

- [ ] Google OAuth credentials created in Google Cloud Console
- [ ] Redirect URI added: `https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback`
- [ ] Google provider enabled in Supabase Dashboard
- [ ] Client ID and Secret pasted in Supabase
- [ ] App scheme is `boredtravel` in app.json
- [ ] App rebuilt with `npx expo prebuild --clean`
- [ ] expo-web-browser installed
- [ ] Tested on real device or simulator

---

## 🎯 Expected User Flow

1. User clicks "Continuar com o Google"
2. Browser opens with Google login page
3. User selects Google account
4. Google redirects to Supabase callback
5. Supabase redirects to `boredtravel://auth/callback`
6. App catches the deep link
7. App extracts tokens and creates session
8. User is logged in and redirected to home screen

---

## 📱 Testing on Different Platforms

### iOS Simulator
- Deep links work automatically
- No special setup needed

### iOS Device
- Make sure app is installed from Expo Go or built locally
- Deep links should work

### Android
- Deep links require app to be installed
- Test with `adb shell am start -W -a android.intent.action.VIEW -d "boredtravel://auth/callback"`

---

## 🔄 Alternative: Email-Only Auth (Temporary)

If you want to skip Google OAuth for now:

1. Comment out the Google button in `AuthBottomSheet.tsx`
2. Use only email signup
3. Users can register and login with email/password

---

## 💡 Tips

- **Always test on a real device** - OAuth flows can behave differently
- **Check Supabase logs** - Go to Supabase Dashboard → Logs → Auth
- **Use console.log** - The code has extensive logging to debug issues
- **Check browser redirect** - Use Safari/Chrome dev tools to see the redirect URL

---

## 📞 Still Having Issues?

Check the console logs for:
- `❌` errors
- `⚠️` warnings
- `🔐` auth events

The logs will tell you exactly where the flow is failing.
