# Booking & Authentication Fixes

## 🐛 Issues Fixed

### 1. Authentication Sync Error ✅
**Problem:** `db.get is not a function` in auth middleware
- **Root Cause:** `supabaseAuth.js` was still using SQLite methods (`db.get()`, `db.run()`)
- **Fix:** Converted to Supabase queries using `from()` helper
- **Files Changed:** `backend/middleware/supabaseAuth.js`

**Changes Made:**
```javascript
// OLD (SQLite)
db.get('SELECT * FROM users WHERE supabase_uid = ?', [supabaseUser.id], callback)

// NEW (Supabase)
const { data, error } = await from('users')
  .select('*')
  .eq('supabase_uid', supabaseUser.id)
  .single();
```

### 2. Availability Slots Loading ✅
**Problem:** "No Availability" error - slots not loading
- **Root Cause:** Variable naming collision (`from` query param overwriting `from()` function)
- **Fix:** Renamed query params to `fromDate` and `toDate`
- **Files Changed:** `backend/routes/availability.js`

### 3. Payment Screen UX Improvements ✅
**Problem:** No clear indication of auth status, duplicate prompts
- **Fixes:**
  - Added "✓ Signed in" badge for authenticated users
  - Auto-fill user info when logged in (name, email, phone)
  - Moved "Sign in" prompt to top of form
  - Removed duplicate prompt at bottom
- **Files Changed:** `app/booking/payment.tsx`

## 📱 Two Booking Flows

### Option 1: Guest Checkout (No Account)
1. User fills in contact info manually
2. Payment via Stripe (Apple Pay, Google Pay, cards)
3. Confirmation email sent
4. Post-payment: Prompt to create account

### Option 2: Authenticated Booking  
1. User clicks "Sign in" at top of payment form
2. AuthBottomSheet opens with Google/Email login
3. After login:
   - "✓ Signed in" badge appears
   - Contact info auto-fills from account
   - Booking saved to user's account
   - Can view in Bookings page

## 🧪 Testing Checklist

### Authentication Tests
- [ ] Google Sign In works
  - [ ] Opens browser correctly
  - [ ] Redirects back to app
  - [ ] Session established
  - [ ] User synced to Supabase
  - [ ] No `db.get is not a function` error
  
- [ ] Email Sign In works
  - [ ] Login with existing email
  - [ ] Session persists across app restarts

### Availability Tests
- [ ] Time slots load for all experiences
- [ ] Shows correct dates (next 5 days)
- [ ] Blocks slots < 180 minutes away
- [ ] Shows "No Availability" only when truly no slots

### Booking Flow Tests

#### Guest Checkout:
- [ ] Can enter name, email, phone without signing in
- [ ] Form validation works (email format, phone digits)
- [ ] Payment sheet opens
- [ ] Can complete payment
- [ ] Booking created in Supabase
- [ ] Confirmation email sent
- [ ] After payment: Prompted to create account

#### Authenticated Booking:
- [ ] "Sign in" button opens AuthBottomSheet
- [ ] Google Sign In works
- [ ] After sign in: Badge shows "✓ Signed in"
- [ ] Contact form auto-fills with user data
- [ ] Can modify pre-filled data if needed
- [ ] Payment sheet opens
- [ ] Can complete payment
- [ ] Booking linked to user account
- [ ] Booking appears in Bookings tab
- [ ] Confirmation email sent

### Email Confirmation Tests
- [ ] Guest booking sends email to provided address
- [ ] Authenticated booking sends email to account email
- [ ] Email contains:
  - [ ] Booking details (date, time, guests)
  - [ ] Experience name and info
  - [ ] Total price
  - [ ] Cancellation policy
  - [ ] Contact information

## 🔧 Configuration Checks

### Supabase Configuration
1. **Google OAuth**
   - [ ] Enabled in Supabase Dashboard → Authentication → Providers
   - [ ] Authorized redirect URLs configured:
     - `boredtourist://auth/callback`
     - `exp://[your-ip]:8081/--/auth/callback` (for development)

2. **Email Templates**
   - [ ] Booking confirmation template configured
   - [ ] Email sending enabled (SMTP or Supabase built-in)

3. **Environment Variables**
   - [ ] Backend `.env` has:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `STRIPE_SECRET_KEY`
     - Email credentials (if custom SMTP)
   
   - [ ] Render.com environment variables:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `STRIPE_SECRET_KEY`

### Stripe Configuration
- [ ] Test mode enabled during testing
- [ ] Webhook configured for production
- [ ] Apple Pay domain verified (for production)

## 🚀 Deployment

### Backend (Render.com)
```bash
git add -A
git commit -m "fix: auth sync issue and booking flow improvements"
git push origin main
```
Render will auto-deploy.

### App (EAS/Expo)
For testing:
```bash
npx expo start
```

For production build:
```bash
eas build --platform ios --profile production
```

## 📝 Known Issues & Workarounds

1. **Google Sign In requires browser**
   - Expected behavior: Opens Safari/Chrome
   - Redirect handled by app/auth/callback.tsx
   - No workaround needed - this is standard OAuth flow

2. **Today's slots blocked**
   - Slots < 180 minutes away are blocked
   - This is intentional (business rule)
   - Configure in availability.js if needs changing

3. **Email confirmation might go to spam**
   - Test with real email addresses
   - Check spam folder
   - Consider using custom SMTP in production

## 🎯 Success Criteria

- ✅ Availability slots load correctly
- ✅ Guest checkout works end-to-end
- ✅ Authenticated booking works end-to-end
- ✅ No `db.get is not a function` errors
- ✅ Google Sign In works
- ✅ Bookings saved to Supabase
- ✅ Email confirmations sent
- ✅ Bookings appear in user's Bookings tab

## 📞 Support

If issues persist:
1. Check terminal output for errors
2. Check Supabase Dashboard → Logs
3. Check Render logs (for production)
4. Verify all environment variables are set
