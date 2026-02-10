# Feed Analytics Events 📊

## Video Feed Tracking - Complete User Journey

This document lists all the analytics events being tracked in the main video feed and booking funnel.

---

## 🎥 FEED EVENTS

### Screen View
**Event:** `Feed` (screen view)
**When:** User opens/focuses the feed tab
**Properties:**
- `total_experiences`: Total number of experiences available
- `filtered_experiences`: Number after applying filters
- `active_filters`: Count of active filters

### Experience Viewed
**Event:** `feed_experience_viewed`
**When:** User scrolls to a new experience in the feed
**Properties:**
- `experience_id`: Unique ID
- `experience_name`: Title
- `category`: Experience category
- `price`: Price value
- `position_in_feed`: Index in the feed (0, 1, 2...)
- `has_video`: Boolean if experience has video
- `rating`: Star rating
- `provider`: Provider name

**Why:** Most important metric! Shows what users actually see and how far they scroll.

### Experience Tapped
**Event:** `feed_experience_tapped`
**When:** User taps on a video/card to view details
**Properties:**
- `experience_id`
- `experience_name`
- `category`
- `price`
- `provider`
- `rating`
- `source`: `'feed_video_tap'`

**Why:** Measures engagement - how many views convert to taps.

### Experience Saved
**Event:** `feed_experience_saved`
**When:** User saves/bookmarks an experience
**Properties:**
- `experience_id`
- `experience_name`
- `category`
- `price`

**Event:** `feed_experience_unsaved`
**When:** User removes bookmark
**Properties:** Same as above

**Event:** `feed_save_attempted_unauthenticated`
**When:** Non-logged user tries to save
**Properties:**
- `experience_id`

**Why:** Shows intent without commitment (saved but not booked yet).

### Experience Shared
**Event:** `feed_experience_shared`
**When:** User successfully shares an experience
**Properties:**
- `experience_id`
- `experience_name`
- `share_method`: Platform used (WhatsApp, Instagram, etc.)
- `category`
- `price`

**Event:** `feed_share_dismissed`
**When:** User cancels share modal
**Properties:**
- `experience_id`

**Why:** Viral coefficient - how many users promote your experiences.

---

## 🔍 FILTER EVENTS

### Filters Applied
**Event:** `feed_filters_applied`
**When:** User applies/changes filters
**Properties:**
- `categories`: Array of selected categories
- `has_price_filter`: Boolean
- `price_range`: Selected price range
- `availability`: Selected availability (today, tomorrow, this-week)
- `total_filters`: Count of active filters

**Why:** Shows what users are looking for and if filters help them find it.

---

## 📈 KEY METRICS TO TRACK

### Engagement Funnel
1. **Feed Views** → How many users open the feed
2. **Experience Views** → How many experiences are actually seen
3. **Experience Taps** → How many convert to detail views
4. **Bookings Started** → How many proceed to booking
5. **Bookings Completed** → How many finish payment

### Drop-off Points
- **Feed → Experience View**: Users not scrolling
- **View → Tap**: Videos not engaging enough
- **Tap → Booking**: Details page not convincing
- **Booking → Payment**: Pricing/checkout issues

### Engagement Metrics
- **Average scroll depth**: How far users scroll (position_in_feed)
- **Save rate**: % of views that result in saves
- **Share rate**: % of views that result in shares
- **Filter usage**: % of users applying filters

---

## 🎯 NEXT: BOOKING FLOW EVENTS

To complete the funnel, add these events to the booking pages:

### Experience Detail Page
```typescript
// When details page opens
trackEvent('experience_details_viewed', {
  experience_id,
  experience_name,
  source: 'feed' | 'explore' | 'search' | 'saved',
});

// When user clicks "Book Now"
trackEvent('booking_started', {
  experience_id,
  experience_name,
  price,
  selected_date,
  selected_time,
  participants,
});
```

### Booking Page
```typescript
// Step 1: Contact info
trackEvent('booking_contact_info_entered', {
  experience_id,
  has_phone: boolean,
});

// Step 2: Payment
trackEvent('booking_payment_initiated', {
  experience_id,
  amount,
  payment_method: 'stripe',
});

// Success
trackEvent('booking_completed', {
  experience_id,
  experience_name,
  amount,
  payment_method,
  booking_id,
  participants,
  date,
  time,
});

// Failure
trackEvent('booking_failed', {
  experience_id,
  amount,
  error_reason,
  step: 'payment' | 'contact' | 'validation',
});
```

---

## 📊 POSTHOG DASHBOARD SETUP

### Recommended Insights

1. **Feed Engagement Funnel**
   - Feed screen views
   - → Experience views
   - → Experience taps
   - → Bookings started
   - → Bookings completed

2. **Top Performing Experiences**
   - By views (most seen)
   - By taps (most engaging)
   - By saves (most desired)
   - By bookings (most purchased)

3. **User Behavior Flow**
   - Paths from feed → booking
   - Drop-off points
   - Time to conversion

4. **Filter Analysis**
   - Most used filters
   - Filter combinations
   - Conversion rate by filter

5. **Video Performance**
   - Average position viewed (scroll depth)
   - Videos with highest engagement
   - Video vs image performance

---

## 🚀 HOW TO USE THIS DATA

### Week 1-2: Baseline
- Collect data
- Identify patterns
- Find drop-off points

### Week 3+: Optimize
- Test video positions (popular experiences at top?)
- A/B test thumbnails
- Improve low-performing experiences
- Adjust filter UX based on usage

### Monthly Review
- Which categories perform best?
- What price points convert?
- When do users book? (same day? week ahead?)
- Mobile vs. iOS performance

---

## 🎬 CURRENT STATUS

✅ **Implemented:**
- Feed screen tracking
- Experience view tracking
- Tap/engagement tracking
- Save/unsave tracking
- Share tracking
- Filter tracking
- User authentication tracking (login/logout/register)

⏳ **Next Steps:**
- Add booking flow tracking
- Add payment success/failure tracking
- Add experience detail page tracking
- Add search tracking (if applicable)
- Add onboarding completion tracking
