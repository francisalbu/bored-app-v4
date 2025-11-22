# Email Login Flow from Payment Screen

## 🎯 What Was Fixed

### Problem
When users clicked "Sign in" on the payment screen and chose "Continue with email", they were incorrectly routed to the **signup page** instead of the **login page**. This was confusing because:
- Users clicking "Sign in" expect to LOGIN (they already have an account)
- The signup page asks for name, phone, etc. - not what they need
- Existing users couldn't easily sign in with their email/password

### Solution
Changed the email authentication flow to:
1. Route to `/auth/login` instead of `/auth/signup`
2. Pre-fill the email field from the entered email
3. Show password field for login
4. Return to payment screen after successful authentication

---

## 📱 Complete User Flow

### Scenario: Existing User Wants to Book While Signed In

1. **Browse Experience**
   - User explores experiences on the Explore tab
   - Clicks on an experience they like

2. **Select Time Slot**
   - Views available dates and times
   - Selects a slot and number of adults
   - Clicks "Book Now"

3. **Payment Screen (Not Signed In)**
   - Sees contact form with empty fields
   - Sees "Sign in to autofill your details" link at top
   - Clicks "Sign in" link

4. **Auth Bottom Sheet Opens**
   - Options: Google, Apple, Facebook, Email
   - User enters their email: `user@example.com`
   - Clicks "Continue with email"

5. **Login Page** ✨ (FIXED)
   - Email field is **pre-filled** with `user@example.com`
   - Password field is shown (was showing signup form before ❌)
   - User enters password
   - Clicks "Sign In"

6. **Back to Payment Screen** ✨
   - User is now authenticated
   - **"✓ Signed in"** badge appears in form header
   - Name, email, and phone fields are **auto-filled**
   - User reviews info, adds promo code if desired
   - Clicks "Pay €XX.XX"

7. **Stripe Checkout**
   - Proceeds to Stripe payment
   - Completes booking

---

## 🧪 Test Cases

### Test 1: Email Login from Payment
**Prerequisites:**
- Have an existing user account with email/password
- Be signed out

**Steps:**
1. Navigate to any experience
2. Select a time slot
3. On payment screen, click "Sign in"
4. Enter your email in the Auth Bottom Sheet
5. Click "Continue with email"

**Expected:**
- ✅ Routes to `/auth/login`
- ✅ Email field is pre-filled
- ✅ Password field is shown
- ✅ Can enter password and sign in
- ✅ Returns to payment screen after successful login
- ✅ Form is auto-filled with your details
- ✅ "✓ Signed in" badge is visible

**Previous Behavior (BUG):**
- ❌ Routed to `/auth/signup`
- ❌ Showed name, phone, password fields (signup form)
- ❌ User had to manually navigate to login

---

### Test 2: New User Wants to Sign Up
**Prerequisites:**
- No existing account
- Be signed out

**Steps:**
1. Navigate to any experience
2. Select a time slot
3. On payment screen, click "Sign in"
4. At bottom of Auth Bottom Sheet, click "Don't have an account? Sign Up"

**Expected:**
- ✅ Routes to `/auth/signup`
- ✅ Shows full signup form (name, email, phone, password)
- ✅ Can create new account

---

### Test 3: Google Sign In from Payment
**Prerequisites:**
- Have Google account configured
- Be signed out

**Steps:**
1. Navigate to any experience
2. Select a time slot
3. On payment screen, click "Sign in"
4. Click "Continue with Google"
5. Complete Google OAuth flow

**Expected:**
- ✅ Redirects to Google login
- ✅ After success, returns to payment screen
- ✅ Form is auto-filled
- ✅ "✓ Signed in" badge is visible

---

### Test 4: Guest Checkout (No Authentication)
**Prerequisites:**
- Be signed out

**Steps:**
1. Navigate to any experience
2. Select a time slot
3. On payment screen, do NOT click "Sign in"
4. Manually fill in name, email, phone
5. Click "Pay €XX.XX"

**Expected:**
- ✅ Can complete booking as guest
- ✅ No authentication required
- ✅ Booking is created with guest info
- ✅ Confirmation email sent

---

## 🔧 Technical Changes

### Files Modified

#### 1. `components/AuthBottomSheet.tsx`
**Location:** `handleEmailContinue()` function (lines 116-124)

**Before:**
```typescript
const handleEmailContinue = () => {
  if (!email || !email.includes('@')) {
    Alert.alert('Error', 'Please enter a valid email address');
    return;
  }
  
  router.push({
    pathname: '/auth/signup',  // ❌ Wrong!
    params: { email },
  });
};
```

**After:**
```typescript
const handleEmailContinue = () => {
  if (!email || !email.includes('@')) {
    Alert.alert('Error', 'Please enter a valid email address');
    return;
  }
  
  router.push({
    pathname: '/auth/login',  // ✅ Correct
    params: { 
      email,
      returnTo: onSuccess ? 'payment' : 'home'  // Tell login where to return
    },
  });
};
```

**Why:** Users entering email from "Sign in" want to LOGIN, not sign up.

---

#### 2. `app/auth/login.tsx`
**Enhancements:**
- Import `useLocalSearchParams` to read URL parameters
- Import `useEffect` to pre-fill email on mount
- Accept `email` and `returnTo` params

**Before:**
```typescript
export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');  // Empty
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    // ... login logic
    if (result.success) {
      router.replace('/(tabs)');  // Always goes to home
    }
  };
```

**After:**
```typescript
export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const params = useLocalSearchParams();  // ✨ Read params
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ✨ Pre-fill email from params
  useEffect(() => {
    if (params.email && typeof params.email === 'string') {
      setEmail(params.email);
    }
  }, [params.email]);

  const handleLogin = async () => {
    // ... login logic
    if (result.success) {
      const returnTo = params.returnTo;
      if (returnTo === 'payment') {
        router.back();  // ✨ Return to payment screen
      } else {
        router.replace('/(tabs)');
      }
    }
  };
```

**Why:** 
- Pre-filling email saves user time
- Using `router.back()` preserves all booking params on payment screen
- Conditional navigation ensures smooth UX

---

## 🚀 Deployment Checklist

- [x] Update AuthBottomSheet to route to /auth/login
- [x] Update login page to accept email param
- [x] Update login page to accept returnTo param
- [x] Add useEffect to pre-fill email
- [x] Add conditional navigation after login
- [ ] **Commit changes to Git**
- [ ] **Push to GitHub**
- [ ] **Test on device/simulator**
- [ ] **Verify complete flow works end-to-end**

---

## 📝 Git Commit

```bash
git add components/AuthBottomSheet.tsx app/auth/login.tsx EMAIL_LOGIN_FLOW.md
git commit -m "fix: email login flow from payment screen

Changes:
- AuthBottomSheet now routes to /auth/login instead of /auth/signup
- Login page pre-fills email from URL params
- Login page accepts returnTo param for post-auth navigation
- After successful login, returns to payment screen with router.back()
- Preserves all booking params (experienceId, slotId, etc.)

Fixes UX issue where clicking 'Sign in' → 'Continue with email'
incorrectly took users to signup page instead of login page.

Affected files:
- components/AuthBottomSheet.tsx (handleEmailContinue routing)
- app/auth/login.tsx (param handling + navigation)
- EMAIL_LOGIN_FLOW.md (documentation)"

git push origin main
```

---

## 🎉 Benefits

1. **Better UX**: Users clicking "Sign in" get the login page they expect
2. **Faster**: Email is pre-filled, saving time
3. **Seamless**: Returns to payment screen without losing booking context
4. **Intuitive**: Matches user mental model (sign in = login, not signup)

---

## 🔍 Related Documentation

- `BOOKING_AUTH_FIXES.md` - Comprehensive testing checklist for all booking/auth flows
- `GOOGLE_SIGNIN_FIX.md` - Google OAuth setup guide
- `app/booking/payment.tsx` - Payment screen implementation with auth integration
