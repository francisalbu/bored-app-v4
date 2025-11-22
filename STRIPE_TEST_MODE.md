# Stripe Test Mode Setup

## 🎯 Overview

This guide helps you set up Stripe **Test Mode** for development so you can test payments without charging real money. You'll be able to use test credit cards from Stripe's documentation.

---

## 🔑 Step 1: Get Your Test API Keys

1. Go to **[Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)**
2. Make sure you're in **Test Mode** (toggle in top-right corner)
3. Copy your test keys:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...`

> ⚠️ **Important**: Test keys start with `pk_test_` and `sk_test_`, while live keys start with `pk_live_` and `sk_live_`

---

## 🛠️ Step 2: Update Backend Environment Variables

### File: `backend/.env`

Replace your live Stripe keys with test keys:

```env
# Stripe Configuration - TEST MODE
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_PUBLISHABLE_KEY_HERE
# Webhook secret (if testing webhooks locally)
STRIPE_WEBHOOK_SECRET=whsec_your_test_webhook_secret_here
```

**Example:**
```env
STRIPE_SECRET_KEY=sk_test_51Abc123YourTestSecretKeyHereXXXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_PUBLISHABLE_KEY=pk_test_51Abc123YourTestPublishableKeyHereXXXXXXXXXXXXXXXXXX
```

---

## 📱 Step 3: Update App Environment Variables

### File: `app.json` or your app config

If you have Stripe keys in your app config, update them:

```json
{
  "expo": {
    "extra": {
      "stripePublishableKey": "pk_test_YOUR_TEST_PUBLISHABLE_KEY_HERE"
    }
  }
}
```

### If using `.env` file in the app:

```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_PUBLISHABLE_KEY_HERE
```

---

## 💳 Step 4: Test Card Numbers

### ✅ Successful Payments

Use these test card numbers for successful payments:

| Card Number | Brand | Description |
|------------|-------|-------------|
| `4242 4242 4242 4242` | Visa | Basic successful payment |
| `4000 0025 0000 3155` | Visa | Requires 3D Secure authentication |
| `5555 5555 5555 4444` | Mastercard | Basic successful payment |
| `3782 822463 10005` | American Express | Basic successful payment |

**Card Details to Use:**
- **Expiry Date**: Any future date (e.g., `12/34`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP/Postal Code**: Any valid format (e.g., `12345`)

---

### ❌ Failed Payments (for testing error handling)

| Card Number | Description |
|------------|-------------|
| `4000 0000 0000 9995` | Card declined (generic) |
| `4000 0000 0000 9987` | Card declined (lost card) |
| `4000 0000 0000 9979` | Card declined (stolen card) |
| `4000 0000 0000 0069` | Card declined (expired) |
| `4000 0000 0000 0127` | Card declined (incorrect CVC) |
| `4000 0000 0000 0119` | Processing error |

---

### 🔐 Special Test Cases

| Card Number | Description |
|------------|-------------|
| `4000 0025 0000 3155` | **3D Secure authentication** - Tests the authentication flow |
| `4000 0000 0000 3220` | **3D Secure required** - Must complete authentication |
| `4000 0027 6000 3184` | **Requires authentication** - Tests Strong Customer Authentication |

---

## 🍎 Step 5: Test Apple Pay & Google Pay

### Apple Pay Test Mode
- **Apple Pay works in test mode** on real devices with test Stripe keys
- Use the test card numbers above when adding cards to Apple Wallet
- On simulators, Apple Pay may not work

### Google Pay Test Mode
- **Google Pay works in test mode** on real Android devices
- Add test cards to your Google Pay wallet
- Use the test card numbers listed above

---

## 🧪 Complete Test Flow

### Test Scenario 1: Basic Successful Payment
1. Start your backend: `cd backend && node server.js`
2. Start your app: `npx expo start`
3. Navigate to an experience
4. Select a time slot
5. On payment screen, fill in details
6. Click "Pay €XX.XX"
7. In Stripe sheet, use: `4242 4242 4242 4242`
8. **Expected**: Payment succeeds, booking is confirmed

---

### Test Scenario 2: Declined Card
1. Follow steps 1-6 above
2. In Stripe sheet, use: `4000 0000 0000 9995`
3. **Expected**: Payment fails with "Card was declined" error

---

### Test Scenario 3: 3D Secure Authentication
1. Follow steps 1-6 above
2. In Stripe sheet, use: `4000 0025 0000 3155`
3. **Expected**: Additional authentication screen appears
4. Click "Complete authentication"
5. Payment succeeds after authentication

---

### Test Scenario 4: Apple Pay (iOS Device)
1. Ensure you have a test card in Apple Wallet
2. On payment screen, tap Apple Pay button
3. Authenticate with Face ID/Touch ID
4. **Expected**: Payment succeeds

---

## 🔍 Viewing Test Payments

### Stripe Dashboard
1. Go to **[Stripe Dashboard (Test Mode)](https://dashboard.stripe.com/test/payments)**
2. You'll see all your test payments here
3. Click on a payment to see full details
4. You can refund, capture, or cancel test payments

### Check Payment Status
- **In App**: Check "Bookings" tab to see completed bookings
- **In Dashboard**: See payment status (succeeded, failed, etc.)
- **Backend Logs**: Watch for payment confirmation logs

---

## 🚀 Restart Services After Changes

After updating environment variables:

### Restart Backend:
```bash
cd backend
# Kill existing process
lsof -ti :3000 | xargs kill -9 2>/dev/null

# Start server
node server.js
```

### Restart App:
```bash
# In your app terminal
# Press Ctrl+C to stop, then
npx expo start --clear
```

---

## ⚠️ Important Notes

### 1. **Never Commit Live Keys to Git**
```bash
# Make sure .env is in .gitignore
echo "backend/.env" >> .gitignore
```

### 2. **Use Test Keys in Development**
- Always use `sk_test_...` and `pk_test_...` during development
- Only switch to live keys (`sk_live_...`, `pk_live_...`) in production

### 3. **Test Data is Separate**
- Test mode has its own database
- Test payments don't affect your live Stripe account
- You can safely test without risk

### 4. **Webhook Testing (Optional)**
If you want to test webhooks locally:
```bash
# Install Stripe CLI
brew install stripe/stripe-brew/stripe

# Login
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/payments/webhook
```

---

## 🎉 Benefits of Test Mode

1. ✅ **No Real Money**: Test payments don't charge real cards
2. ✅ **Unlimited Testing**: Test as many times as you want
3. ✅ **Test Edge Cases**: Try declined cards, authentication flows, etc.
4. ✅ **Safe Development**: No risk of accidentally charging customers
5. ✅ **Easy Debugging**: See all test data in Stripe Dashboard

---

## 📚 Additional Resources

- **[Stripe Testing Docs](https://docs.stripe.com/testing)** - Official testing guide
- **[Test Cards](https://docs.stripe.com/testing#cards)** - All available test cards
- **[Test API Keys](https://dashboard.stripe.com/test/apikeys)** - Get your test keys
- **[Test Webhooks](https://docs.stripe.com/webhooks/test)** - Testing webhook events
- **[Payment Methods](https://docs.stripe.com/payments/payment-methods)** - Supported payment types

---

## 🔄 Switching Between Test and Production

### Development (Use Test Keys)
```env
# backend/.env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Production (Use Live Keys)
```env
# On Render.com dashboard or production server
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

> 💡 **Pro Tip**: Use environment-based configuration so you automatically use test keys in development and live keys in production.

---

## ✅ Checklist

- [ ] Get test API keys from Stripe Dashboard (Test Mode)
- [ ] Update `backend/.env` with test secret key
- [ ] Update app config with test publishable key
- [ ] Restart backend server
- [ ] Restart Expo app
- [ ] Test with card `4242 4242 4242 4242`
- [ ] Verify payment appears in Stripe Dashboard (Test Mode)
- [ ] Test declined card `4000 0000 0000 9995`
- [ ] Test 3D Secure card `4000 0025 0000 3155`
- [ ] Confirm booking shows in app's Bookings tab

---

## 🆘 Troubleshooting

### "Invalid API Key" Error
- **Check**: Make sure you're using `sk_test_...` not `sk_live_...`
- **Check**: Key is correctly copied (no extra spaces)
- **Restart**: Backend server after changing `.env`

### Payment Sheet Won't Open
- **Check**: App has correct `pk_test_...` publishable key
- **Check**: Stripe React Native is installed: `npm ls @stripe/stripe-react-native`
- **Restart**: Expo app with `npx expo start --clear`

### Payment Succeeds but No Booking
- **Check**: Backend logs for errors
- **Check**: Database connection is working
- **Check**: Booking context is properly set up

### Can't See Payments in Dashboard
- **Check**: You're in **Test Mode** (toggle in top-right)
- **Check**: You're using test keys, not live keys
- **Check**: Payment actually completed (check app logs)

---

## 📞 Support

If you run into issues:
1. Check backend logs: `tail -f backend/logs/app.log`
2. Check Stripe Dashboard logs
3. Review Stripe [testing documentation](https://docs.stripe.com/testing)
4. Test with basic card first: `4242 4242 4242 4242`

Good luck testing! 🚀
