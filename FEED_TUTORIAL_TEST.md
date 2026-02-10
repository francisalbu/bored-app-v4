# Feed Tutorial Testing Guide

## How to Test the Feed Tutorial

The feed tutorial will automatically show:
1. **For first-time users**: After completing the 3-step onboarding
2. **Only once**: Won't show again after user clicks "Start Exploring"

## Features Implemented

### 1. **TikTok-Style Overlay**
   - Semi-transparent dark background with blur effect
   - Video feed visible underneath
   - Professional, modern design

### 2. **Arrow & Highlight**
   - Animated arrow pointing to the import button (top right)
   - Pulsing circle effect for emphasis
   - Clear visual guidance

### 3. **Main Message Card**
   - Instagram & TikTok icons
   - Bold headline: "Convert your Reels & TikToks into real experiences"
   - Descriptive subtitle explaining the feature
   - Feature badges with icons:
     - ⚡ AI-powered matching
     - 📍 Location-based
     - 📅 Instant booking

### 4. **Call-to-Action**
   - Large "Start Exploring" button with gradient
   - Arrow icon for forward action
   - Prominent placement at bottom

### 5. **Swipe Hint**
   - Subtle "Swipe up to explore experiences" hint
   - Helps users understand feed navigation

## How to Reset and Test Again

To see the tutorial again, add this temporary button to your settings or use the console:

```typescript
// In React Native Debugger or Console:
import AsyncStorage from '@react-native-async-storage/async-storage';

// Reset feed tutorial
await AsyncStorage.removeItem('@bored_tourist_feed_tutorial_shown');

// Reset onboarding too (to test full flow)
await AsyncStorage.removeItem('@bored_tourist_onboarding_shown');

// Then reload the app
```

## Quick Test Script

Run this in your terminal while the app is running:

```bash
# This will reset both onboarding and feed tutorial
# (You'll need to implement a dev menu button or use the debugger)
```

## Visual Flow

1. User opens app for first time
2. See 3-step onboarding → Complete
3. **FEED TUTORIAL APPEARS** (0.5s delay)
   - Dark overlay over feed
   - Arrow pointing to import button
   - Message card with Instagram/TikTok icons
   - "Start Exploring" button
4. User taps "Start Exploring"
5. Tutorial disappears
6. User can start using feed normally

## Design Highlights

- **Colors**: Primary brand color (#BFFF00) for highlights
- **Icons**: Instagram pink, TikTok black/white
- **Typography**: Bold, clear hierarchy
- **Spacing**: Generous padding for readability
- **Effects**: Blur, gradients, shadows for depth
- **Animation**: Subtle (arrow, could add more if needed)

## Optional Enhancements (Future)

- [ ] Animated arrow bouncing
- [ ] Pulse animation on message card
- [ ] Confetti effect when clicking "Start Exploring"
- [ ] Video/GIF showing the import flow
- [ ] Multi-step tutorial (swipe to see more features)

---

**Note**: The tutorial only shows ONCE per user. After they dismiss it, they won't see it again unless they clear app data or reinstall.
