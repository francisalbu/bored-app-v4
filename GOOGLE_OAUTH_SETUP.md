# Google OAuth Setup Guide

## Implementation Complete ✅

The Google Sign-In has been implemented using Supabase Auth with PKCE flow.

## What's Implemented

### 1. **AuthBottomSheet Component**
- Clean Google OAuth integration
- PKCE (Proof Key for Code Exchange) flow for security
- Deep link handling for OAuth callbacks
- Loading states and error handling
- In-app browser (WebBrowser) for OAuth

### 2. **Flow Overview**
```
User clicks "Continue with Google"
  ↓
Opens Google OAuth in in-app browser (Safari View/Chrome Custom Tab)
  ↓
User authenticates with Google
  ↓
Google redirects to: boredtourist://auth/callback?code=xxx
  ↓
App intercepts deep link
  ↓
Exchanges authorization code for session tokens
  ↓
Session established, user logged in ✅
```

## Supabase Configuration Required

To make this work, you need to configure Google OAuth in your Supabase project:

### 1. **Get Google OAuth Credentials**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen if needed
6. For **iOS**:
   - Application type: **iOS**
   - Bundle ID: `app.rork.bored-explorer`
7. For **Android**:
   - Application type: **Android**
   - Package name: `app.rork.bored_explorer`
   - SHA-1 certificate: Get from your keystore
8. For **Web** (required for Supabase):
   - Application type: **Web application**
   - Authorized redirect URIs: `https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback`

### 2. **Configure Supabase**

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Enable **Google** provider
4. Add your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
5. Configure Redirect URLs:
   - **Site URL**: `boredtourist://`
   - **Redirect URLs**: Add these:
     - `boredtourist://auth/callback`
     - `boredtourist://**`
     - `exp://192.168.1.136:8087` (for Expo Go during development)

### 3. **Test the Implementation**

1. Start your backend: `cd backend && node server.js`
2. Start Expo: `npx expo start`
3. Open app on physical device (OAuth doesn't work in simulator)
4. Click "Continue with Google"
5. Sign in with your Google account
6. You should be redirected back to the app with authentication complete

## Key Files Modified

- `components/AuthBottomSheet.tsx` - Google OAuth UI and logic
- `lib/supabase.ts` - Already configured with PKCE flow
- `app.json` - Deep link scheme: `boredtourist`

## Deep Link Configuration

The app is already configured to handle deep links:

```json
{
  "expo": {
    "scheme": "boredtourist"
  }
}
```

This allows the app to receive callbacks at: `boredtourist://auth/callback?code=xxx`

## Security Features

✅ **PKCE Flow**: More secure than implicit flow, authorization code is exchanged server-side  
✅ **In-App Browser**: Uses Safari View Controller (iOS) / Chrome Custom Tabs (Android)  
✅ **Secure Storage**: Tokens stored in Expo SecureStore (iOS Keychain / Android Keystore)  
✅ **Auto Refresh**: Supabase automatically refreshes expired tokens  

## Troubleshooting

### "No OAuth URL returned"
- Ensure Google provider is enabled in Supabase
- Check that Client ID and Secret are configured correctly

### "Safari não consegue abrir a página porque o endereço não é válido"
- **SOLUÇÃO**: Usar `boredtourist://auth/callback` diretamente, NÃO usar `Linking.createURL()`
- `Linking.createURL()` gera `exp://` que Safari não reconhece como válido
- O código já está corrigido para usar o URL scheme customizado diretamente

### "Authentication Error"
- Verify redirect URLs in Supabase match exactly: `boredtourist://auth/callback`
- Check that URL scheme in app.json matches: `boredtourist`

### OAuth works but no session created
- Check console logs for authorization code
- Verify PKCE flow is enabled in supabase.ts (`flowType: 'pkce'`)

### Works in Expo Go but not in production build
- Ensure bundle ID (iOS) / package name (Android) matches Google OAuth client configuration
- Add native OAuth client IDs for iOS and Android in Google Cloud Console

## Next Steps

1. Configure Google OAuth credentials in Google Cloud Console
2. Add credentials to Supabase Dashboard
3. Test on physical device
4. Build for production with proper bundle identifiers

## Additional Notes

- OAuth must be tested on a physical device (not simulator)
- Expo Go may have limitations - test in development build for best results
- For production, use EAS Build with proper bundle identifiers

## Support

If you encounter issues, check:
1. Supabase Dashboard logs: Authentication → Logs
2. App console logs (filter for 🔗, ✅, ❌ emojis)
3. Google Cloud Console OAuth consent screen configuration
