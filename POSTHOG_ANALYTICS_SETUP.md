# PostHog Analytics Setup ✅

## Installation Complete!

PostHog analytics has been successfully integrated into the Bored Tourist app.

## What's Been Configured

### 1. **Dependencies Installed**
- `posthog-react-native`
- `expo-file-system`
- `expo-application`
- `expo-device`
- `expo-localization`

### 2. **Environment Variables** (`.env`)
```env
EXPO_PUBLIC_POSTHOG_KEY=phc_LokNB17umzEfSPpoF2ZB8wrK6NfDuMXOOdg1cvmQweG
EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

### 3. **PostHogProvider** (`app/_layout.tsx`)
The entire app is wrapped with PostHogProvider, enabling automatic tracking.

### 4. **Custom Hook** (`hooks/useAnalytics.ts`)
A convenient hook to use analytics throughout the app:

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

const { trackEvent, trackScreen, identifyUser, resetUser } = useAnalytics();
```

### 5. **Auto-Tracked Events** ✅
Already tracking:
- ✅ **User Registration** (`user_registered`)
- ✅ **User Login** (`user_logged_in`)
- ✅ **User Logout** (`user_logged_out`)
- ✅ **User Identification** (on login/register)

## How to Track Custom Events

### In any component:

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

export function MyComponent() {
  const { trackEvent, trackScreen } = useAnalytics();

  useEffect(() => {
    // Track screen view
    trackScreen('Experience Details');
  }, []);

  const handleBooking = () => {
    // Track event with properties
    trackEvent('booking_started', {
      experience_id: experience.id,
      experience_name: experience.title,
      price: experience.price,
    });
  };

  return <View>...</View>;
}
```

### Common Events to Track

#### **Booking Flow**
```typescript
trackEvent('booking_started', { experience_id, price });
trackEvent('booking_completed', { experience_id, amount, payment_method });
trackEvent('booking_cancelled', { experience_id, reason });
```

#### **Experience Interactions**
```typescript
trackEvent('experience_viewed', { experience_id, category });
trackEvent('experience_saved', { experience_id });
trackEvent('experience_shared', { experience_id, share_method });
```

#### **Search & Discovery**
```typescript
trackEvent('search_performed', { query, results_count });
trackEvent('filter_applied', { filter_type, value });
trackEvent('category_browsed', { category });
```

#### **Social Features**
```typescript
trackEvent('instagram_link_pasted', { url });
trackEvent('tiktok_link_pasted', { url });
trackEvent('review_submitted', { experience_id, rating });
```

#### **Onboarding**
```typescript
trackEvent('onboarding_started');
trackEvent('onboarding_completed');
trackEvent('tutorial_viewed', { tutorial_type });
```

## Screen Tracking

PostHog can automatically track screen views, or you can manually track them:

```typescript
useEffect(() => {
  trackScreen('Feed');
}, []);
```

## User Properties

Set custom user properties:

```typescript
const { posthog } = useAnalytics();

posthog?.capture('$set', {
  preferred_language: 'pt',
  city: 'Lisbon',
  has_bookings: true,
});
```

## Dashboard Access

View your analytics at:
**https://eu.posthog.com**

Login with your PostHog account to see:
- User behavior flows
- Conversion funnels
- Event analytics
- User sessions
- Cohort analysis

## Next Steps

### Recommended Events to Add:

1. **Feed Interactions**
   - `app/(tabs)/index.tsx`: Track video views, swipes, interactions

2. **Booking Flow**
   - `app/booking/[id].tsx`: Track booking steps, payment success/failure

3. **Search & Filters**
   - `app/(tabs)/explore.tsx`: Track searches, filter usage

4. **Social Import**
   - Track when users import from Instagram/TikTok

5. **Experience Details**
   - Track which experiences get the most views

### Example: Track Feed Video Views

```typescript
// In app/(tabs)/index.tsx
const { trackEvent } = useAnalytics();

const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
  if (viewableItems.length > 0 && viewableItems[0].index !== null) {
    const experience = filteredExperiences[viewableItems[0].index];
    
    trackEvent('experience_viewed_in_feed', {
      experience_id: experience.id,
      experience_name: experience.title,
      category: experience.category,
      price: experience.price,
      position: viewableItems[0].index,
    });
    
    setCurrentIndex(viewableItems[0].index);
  }
}).current;
```

## Privacy & GDPR

PostHog is GDPR compliant and EU-hosted (`eu.i.posthog.com`). 

To respect user privacy:
- Don't track sensitive personal data
- Allow users to opt-out in settings
- Implement data deletion on account deletion

## Debugging

All tracking calls include console logs:
- `📊 Event: [event_name]`
- `📱 Screen: [screen_name]`
- `👤 User identified: [user_id]`

Check your console to verify events are being tracked.

## Support

PostHog Docs: https://posthog.com/docs
React Native Guide: https://posthog.com/docs/libraries/react-native
