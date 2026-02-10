# Discount Code System - Complete Implementation

## Overview
Full discount code system implementation for FORGETYOURGUIDE10 promotion (10% off, one-time use per user).

## Files Created

### Backend
1. **backend/routes/discountCodes.js**
   - POST `/api/discount-codes/validate` - Validate code and check user eligibility
   - POST `/api/discount-codes/apply` - Mark code as used by user
   - GET `/api/discount-codes/my-usage` - Get user's discount code history

2. **backend/migrations/005_add_discount_codes.sql**
   - Creates `discount_codes` table (code, discount_percentage, max_uses_per_user)
   - Creates `discount_code_usage` table (tracks who used which codes)
   - Sets up RLS policies for security
   - Pre-inserts FORGETYOURGUIDE10 code with 10% discount

3. **backend/migrations/006_add_discount_code_to_bookings.sql**
   - Adds `discount_code` column to bookings table
   - Creates index for performance
   - Allows tracking which bookings used discount codes

### Frontend
1. **components/DiscountCodeInput.tsx**
   - Reusable React Native component
   - Auto-uppercase input field
   - Apply/Remove functionality with visual feedback
   - Success state with checkmark icon
   - Error handling with messages

2. **services/api.ts** (updated)
   - Added `validateDiscountCode(code)` method
   - Added `applyDiscountCode(code, booking_id?)` method
   - Added `getMyDiscountUsage()` method

3. **app/booking/payment.tsx** (updated)
   - Imported DiscountCodeInput component
   - Added discount state management (code, percentage, isApplied)
   - Calculates originalPrice and discounted totalPrice
   - Shows discount breakdown in price details
   - Integrated DiscountCodeInput between price details and total
   - Passes discount_code to booking creation

### Backend Updates
4. **backend/server.js**
   - Added `/api/discount-codes` route mounting

5. **backend/routes/bookings.js**
   - Added discount_code field to bookingData

6. **backend/models/Booking.js**
   - Added discount_code parameter to createBooking function
   - Includes discount_code in booking INSERT statement

## Database Schema

### discount_codes table
```sql
- id (SERIAL PRIMARY KEY)
- code (VARCHAR UNIQUE) - e.g., "FORGETYOURGUIDE10"
- discount_percentage (INTEGER) - e.g., 10
- is_active (BOOLEAN)
- max_uses_per_user (INTEGER) - e.g., 1
- created_at, updated_at
```

### discount_code_usage table
```sql
- id (SERIAL PRIMARY KEY)
- discount_code_id (FK to discount_codes)
- user_id (UUID FK to users via supabase_uid)
- booking_id (INTEGER FK to bookings, nullable)
- used_at (TIMESTAMP)
```

### bookings table (updated)
```sql
- discount_code (VARCHAR) - stores the code used for this booking
```

## How It Works

### User Flow
1. User goes to checkout screen with booking details
2. Between "Price details" and "Total", there's a discount code input field
3. User types "FORGETYOURGUIDE10" and clicks Apply
4. Frontend calls `/api/discount-codes/validate` to check:
   - Code exists and is active
   - User hasn't used it before
   - Returns discount percentage (10%)
5. Component shows success state with ✓ icon
6. Price details update to show:
   - Original price: €22.00
   - Discount (10% off): -€2.20
   - Total: €19.80
7. On payment, discount_code is included in booking creation
8. Backend calls `/api/discount-codes/apply` to mark code as used
9. Booking record stores the discount code used

### Security
- RLS policies ensure users can only see their own discount usage
- Only authenticated users can apply discount codes
- Backend validates code before applying
- One-time use enforced at database level

### Validation Logic
```javascript
// Check code exists and is active
// Check max_uses_per_user limit
// Check if user already used this code
// Return discount_percentage if valid
```

## Testing Steps

### 1. Run Database Migrations
```sql
-- In Supabase SQL Editor:
-- Run 005_add_discount_codes.sql
-- Run 006_add_discount_code_to_bookings.sql
```

### 2. Test API Endpoints
```bash
# Validate code (requires auth token)
curl -X POST http://localhost:3000/api/discount-codes/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"code":"FORGETYOURGUIDE10"}'

# Expected response:
{
  "valid": true,
  "discount_percentage": 10,
  "code": "FORGETYOURGUIDE10"
}
```

### 3. Test in App
1. Sign in to app
2. Browse experiences and select one
3. Choose date/time and proceed to checkout
4. See discount code input field
5. Enter "FORGETYOURGUIDE10" and click Apply
6. Verify price updates with 10% discount
7. Complete booking
8. Try to use code again - should show "already used" error

### 4. Verify Database
```sql
-- Check discount code usage
SELECT * FROM discount_code_usage WHERE user_id = 'YOUR_SUPABASE_UID';

-- Check bookings with discount codes
SELECT booking_reference, customer_name, discount_code, total_amount 
FROM bookings 
WHERE discount_code IS NOT NULL;
```

## Configuration

### Pre-loaded Discount Codes
- **FORGETYOURGUIDE10**: 10% off, 1 use per user

### Adding New Codes
```sql
INSERT INTO discount_codes (code, discount_percentage, is_active, max_uses_per_user)
VALUES ('NEWCODE20', 20, TRUE, 1);
```

## Future Enhancements
- Admin panel to create/manage discount codes
- Expiration dates for codes
- Minimum purchase amount requirements
- Usage limits (total uses across all users)
- Category or experience-specific codes
- Percentage vs. fixed amount discounts
- Automatic code application for referrals

## Files to Commit
```
backend/routes/discountCodes.js (new)
backend/migrations/005_add_discount_codes.sql (new)
backend/migrations/006_add_discount_code_to_bookings.sql (new)
backend/server.js (updated)
backend/routes/bookings.js (updated)
backend/models/Booking.js (updated)
components/DiscountCodeInput.tsx (new)
services/api.ts (updated)
app/booking/payment.tsx (updated)
```

## Deployment Notes
1. Commit and push all changes
2. Backend will auto-deploy to Render
3. Run migrations in Supabase dashboard
4. Test with real bookings
5. Monitor discount code usage in analytics
