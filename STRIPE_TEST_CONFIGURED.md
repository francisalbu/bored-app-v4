# ✅ Stripe Test Mode - CONFIGURED

**Date:** November 21, 2025  
**Status:** ✅ **WORKING**

---

## 🔑 Test Keys Configured

### Backend (`backend/.env`)
```
STRIPE_SECRET_KEY=sk_test_51Qe0OB2ZCSSBkVXw7nUpLtNCSnjRwTl7ju...
STRIPE_PUBLISHABLE_KEY=pk_test_51Qe0OB2ZCSSBkVXw7lyC4hrAer9sx...
```

### App (`app/_layout.tsx`)
```typescript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51Qe0OB2ZCSSBkVXw7lyC4hrAer9sx...';
```

---

## ✅ Verification Test Results

```
🧪 Stripe initialized in TEST MODE
💳 Use test cards: https://docs.stripe.com/testing
   ✅ Success: 4242 4242 4242 4242
   ❌ Decline: 4000 0000 0000 9995
🔑 Key preview: sk_test_51Qe...

✅ Payment Intent Created Successfully!

Details:
  Payment Intent ID: pi_3SW3Fy2ZCSSBkVXw0QsqNaKA
  Amount: €50.00
  Currency: EUR

Supported Payment Methods:
  💳 Card: ✅
  🍎 Apple Pay: ✅
  🤖 Google Pay: ✅
  🔗 Stripe Link: ✅
```

---

## 💳 Test Cards to Use

### ✅ **Successful Payments**

| Card Number | Type | Details |
|-------------|------|---------|
| `4242 4242 4242 4242` | Visa | Basic success |
| `5555 5555 5555 4444` | Mastercard | Basic success |
| `3782 822463 10005` | Amex | Basic success |

**Use with:**
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any valid format (e.g., `12345`)

---

### ❌ **Failed Payments** (for error testing)

| Card Number | Error Type |
|-------------|------------|
| `4000 0000 0000 9995` | Generic decline |
| `4000 0000 0000 9987` | Lost card |
| `4000 0000 0000 9979` | Stolen card |
| `4000 0000 0000 0069` | Expired card |
| `4000 0000 0000 0127` | Incorrect CVC |

---

### 🔐 **3D Secure Authentication**

| Card Number | Description |
|-------------|-------------|
| `4000 0025 0000 3155` | Requires authentication |
| `4000 0027 6000 3184` | Auth required (SCA) |

---

## 🧪 Testing Workflow

### 1. **Start Backend** (if not running)
```bash
cd backend
node server.js
```

You should see:
```
🧪 Stripe initialized in TEST MODE
💳 Use test cards: https://docs.stripe.com/testing
   ✅ Success: 4242 4242 4242 4242
   ❌ Decline: 4000 0000 0000 9995
```

---

### 2. **Start Your App**
```bash
npx expo start
```

---

### 3. **Test Payment Flow**

#### Test Case 1: Successful Payment
1. Browse to any experience
2. Select a time slot (tomorrow or later)
3. On payment screen, fill in details
4. Click "Pay €XX.XX"
5. In Stripe payment sheet, enter:
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/34`
   - CVC: `123`
   - ZIP: `12345`
6. **Expected:** ✅ Payment succeeds, booking is created

---

#### Test Case 2: Declined Payment
1. Follow steps 1-4 above
2. In Stripe payment sheet, enter:
   - Card: `4000 0000 0000 9995`
   - Expiry: `12/34`
   - CVC: `123`
3. **Expected:** ❌ Payment fails with "Card was declined" error

---

#### Test Case 3: 3D Secure Authentication
1. Follow steps 1-4 above
2. In Stripe payment sheet, enter:
   - Card: `4000 0025 0000 3155`
   - Expiry: `12/34`
   - CVC: `123`
3. **Expected:** 🔐 Authentication screen appears
4. Click "Complete authentication"
5. **Expected:** ✅ Payment succeeds after authentication

---

## 📊 View Test Payments

### Stripe Dashboard (Test Mode)
🔗 https://dashboard.stripe.com/test/payments

You'll see all test payments here with status:
- ✅ **Succeeded** - Payment completed
- ❌ **Failed** - Card declined or error
- ⏳ **Requires payment method** - User abandoned
- 🔐 **Requires action** - Awaiting 3D Secure

---

## 🛠️ Useful Commands

### Test Stripe Configuration
```bash
cd backend
node test-stripe.js
```

### Check Current Stripe Keys
```bash
cd backend
./stripe-helper.sh
# Select option 1: "Check current Stripe keys"
```

### View Test Card Numbers
```bash
cd backend
./stripe-helper.sh
# Select option 2: "Show test card numbers"
```

### Open Stripe Dashboard
```bash
cd backend
./stripe-helper.sh
# Select option 3: "Open Stripe Dashboard (Test Mode)"
```

---

## ⚠️ Important Notes

### 1. **No Real Money**
- Test mode payments **do not charge real money**
- Test data is completely separate from live data
- You can test unlimited times for free

### 2. **Test vs Live Keys**
- **TEST keys:** `sk_test_...` and `pk_test_...` ✅ Currently using
- **LIVE keys:** `sk_live_...` and `pk_live_...` ⚠️ Only for production

### 3. **Keep Keys Secret**
- Never commit keys to Git (`.env` is in `.gitignore`)
- Don't share keys publicly
- Rotate keys if exposed

### 4. **Production Deployment**
On Render.com, you'll need to add **LIVE** keys as environment variables:
- `STRIPE_SECRET_KEY=sk_live_...`
- `STRIPE_PUBLISHABLE_KEY=pk_live_...`

---

## 🎉 What's Working Now

✅ Backend configured with test secret key  
✅ App configured with test publishable key  
✅ Payment intent creation verified  
✅ All payment methods enabled (Card, Apple Pay, Google Pay, Link)  
✅ Test cards documented  
✅ Automatic mode detection (shows "TEST MODE" in logs)  
✅ Helper script for managing Stripe keys  

---

## 📚 Resources

- **Stripe Testing Docs:** https://docs.stripe.com/testing
- **Test Cards:** https://docs.stripe.com/testing#cards
- **Dashboard (Test):** https://dashboard.stripe.com/test/dashboard
- **Dashboard (Live):** https://dashboard.stripe.com/dashboard
- **API Keys:** https://dashboard.stripe.com/test/apikeys

---

## 🚀 Next Steps

1. ✅ **Test payment flow** in your app with `4242 4242 4242 4242`
2. ✅ **Test declined card** with `4000 0000 0000 9995`
3. ✅ **Test 3D Secure** with `4000 0025 0000 3155`
4. ✅ **Verify booking creation** after successful payment
5. ✅ **Check Stripe Dashboard** to see test payments
6. ⏳ **When ready for production:** Switch to live keys on Render.com

---

**Happy Testing! 🎉**
