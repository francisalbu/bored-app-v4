# Secure Booking System Documentation

## Overview

This booking system implements a secure, slot-based reservation system with comprehensive user privacy controls and double-booking prevention.

## Features

### 🔒 Security & Privacy
- **User Authentication Required**: All booking operations require authentication
- **Data Isolation**: Users can only view and manage their own bookings
- **Authorization Checks**: All endpoints verify user ownership before operations
- **Automatic Cleanup**: Booking data is cleared immediately on logout

### 🚫 Double-Booking Prevention
- **Transaction Safety**: Uses SQLite transactions for atomic operations
- **Slot Locking**: Prevents race conditions with IMMEDIATE transactions
- **Capacity Validation**: Checks available spots before confirming booking
- **Duplicate Detection**: Prevents same user from booking same slot twice

### 📊 Slot Management
- **Dynamic Availability**: Automatically updates slot availability
- **Capacity Tracking**: Maintains booked_participants count
- **Auto-Release**: Cancelled bookings release slot capacity
- **Real-time Updates**: Slot availability reflects current bookings

## Backend API Endpoints

### Bookings

#### Create Booking
```http
POST /api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "experience_id": 1,
  "slot_id": 5,
  "participants": 2,
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "id": 123,
    "booking_reference": "BK12345ABCDE",
    "status": "confirmed",
    "...": "..."
  }
}
```

**Error Cases:**
- Slot no longer available
- Insufficient capacity
- Duplicate booking detected
- User already booked this slot

#### Get User Bookings
```http
GET /api/bookings?upcoming=true
Authorization: Bearer <token>
```

**Query Parameters:**
- `status`: Filter by status (confirmed, cancelled, completed)
- `upcoming`: Boolean, only show future bookings

#### Get Booking Details
```http
GET /api/bookings/:id
Authorization: Bearer <token>
```

Returns 404 if booking doesn't exist or user doesn't own it.

#### Update Booking
```http
PUT /api/bookings/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "customer_name": "Jane Doe",
  "customer_email": "jane@example.com",
  "customer_phone": "+1234567890"
}
```

**Restrictions:**
- Only contact information can be updated
- Cannot update cancelled or completed bookings
- User must own the booking

#### Cancel Booking
```http
PUT /api/bookings/:id/cancel
Authorization: Bearer <token>
```

**Behavior:**
- Updates booking status to 'cancelled'
- Releases slot capacity
- Cannot cancel already cancelled or completed bookings

#### Delete Booking
```http
DELETE /api/bookings/:id
Authorization: Bearer <token>
```

**Restrictions:**
- Only cancelled bookings can be deleted
- Permanent removal from database

### Availability Slots

#### Get Experience Availability
```http
GET /api/availability/:experienceId
GET /api/availability/:experienceId?date=2025-11-20
GET /api/availability/:experienceId?from=2025-11-20&to=2025-11-30
```

Returns available slots with capacity information:
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "experience_id": 10,
      "date": "2025-11-20",
      "start_time": "09:00:00",
      "end_time": "11:00:00",
      "max_participants": 10,
      "booked_participants": 3,
      "available_spots": 7,
      "is_available": true
    }
  ]
}
```

#### Get Slot Details
```http
GET /api/availability/slot/:slotId
```

## Frontend Integration

### BookingsContext

The `BookingsContext` provides a centralized state management system for bookings.

#### Usage Example

```tsx
import { useBookings } from '@/contexts/BookingsContext';

function MyComponent() {
  const { 
    upcomingBookings, 
    pastBookings,
    createBooking,
    cancelBooking,
    refreshBookings 
  } = useBookings();

  // Create a booking
  const handleBooking = async () => {
    const result = await createBooking({
      experience_id: 1,
      slot_id: 5,
      participants: 2,
      customer_name: "John Doe",
      customer_email: "john@example.com",
      customer_phone: "+1234567890"
    });

    if (result.success) {
      Alert.alert('Success', 'Booking created!');
    } else {
      Alert.alert('Error', result.error);
    }
  };

  // Cancel a booking
  const handleCancel = async (bookingId: number) => {
    const result = await cancelBooking(bookingId);
    if (result.success) {
      Alert.alert('Success', 'Booking cancelled');
    }
  };

  return (
    <View>
      <Text>Upcoming: {upcomingBookings.length}</Text>
      <Text>Past: {pastBookings.length}</Text>
    </View>
  );
}
```

### Available Methods

- `createBooking(data)`: Create new booking
- `updateBooking(id, updates)`: Update contact info
- `cancelBooking(id)`: Cancel booking
- `deleteBooking(id)`: Delete cancelled booking
- `refreshBookings()`: Reload all bookings
- `getAvailabilitySlots(experienceId, date?)`: Get available slots

### Automatic Behaviors

1. **On Login**: Automatically fetches user bookings
2. **On Logout**: Immediately clears all booking data
3. **Real-time Updates**: Context state updates after each operation

## Database Schema

### bookings Table
```sql
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_reference VARCHAR(50) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  experience_id INTEGER NOT NULL,
  slot_id INTEGER,
  booking_date DATE NOT NULL,
  booking_time TIME,
  participants INTEGER DEFAULT 1,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'EUR',
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  payment_status VARCHAR(50) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (experience_id) REFERENCES experiences(id) ON DELETE CASCADE,
  FOREIGN KEY (slot_id) REFERENCES availability_slots(id) ON DELETE SET NULL
);
```

### availability_slots Table
```sql
CREATE TABLE availability_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  experience_id INTEGER NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_participants INTEGER NOT NULL,
  booked_participants INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (experience_id) REFERENCES experiences(id) ON DELETE CASCADE
);
```

## Transaction Flow

### Creating a Booking

1. **Begin Transaction**: Start IMMEDIATE transaction for row locking
2. **Check Slot**: Verify slot exists and has capacity
3. **Duplicate Check**: Ensure user hasn't already booked this slot
4. **Get Experience**: Fetch pricing details
5. **Create Booking**: Insert booking record
6. **Update Slot**: Increment booked_participants, update is_available
7. **Commit**: Complete transaction atomically
8. **Rollback on Error**: Any failure rolls back all changes

### Cancelling a Booking

1. **Begin Transaction**: Start IMMEDIATE transaction
2. **Verify Ownership**: Confirm user owns the booking
3. **Status Check**: Ensure booking is cancellable
4. **Update Booking**: Set status to 'cancelled'
5. **Release Capacity**: Decrement booked_participants on slot
6. **Commit**: Complete transaction

## Security Considerations

### Authorization
- All endpoints use `authenticate` middleware
- Booking ownership verified in model layer
- User ID from JWT token, not request body

### Data Validation
- Express-validator for input sanitization
- Type checking on all parameters
- Required fields enforced

### Error Handling
- Specific error messages for different failure types
- No sensitive data leaked in errors
- Transaction rollback on any failure

## Testing

### Test Double-Booking Prevention
```bash
# Terminal 1
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"experience_id":1,"slot_id":1,"participants":5,...}'

# Terminal 2 (simultaneously)
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"experience_id":1,"slot_id":1,"participants":6,...}'
```

One should succeed, other should fail with capacity error.

### Test User Isolation
```bash
# User A creates booking
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer USER_A_TOKEN" \
  -d '...'

# User B tries to access User A's booking (should fail)
curl -X GET http://localhost:3000/api/bookings/:id \
  -H "Authorization: Bearer USER_B_TOKEN"
```

Should return 404 (not found or unauthorized).

## Best Practices

### For Frontend Developers
1. Always use `useBookings()` hook for booking operations
2. Show loading states during async operations
3. Handle errors gracefully with user-friendly messages
4. Refresh booking list after operations
5. Clear sensitive data on logout

### For Backend Developers
1. Always use transactions for booking operations
2. Never skip authorization checks
3. Return consistent error formats
4. Log all booking operations for audit
5. Use proper HTTP status codes

## Future Enhancements

- [ ] Payment integration
- [ ] Email confirmations
- [ ] SMS notifications
- [ ] Booking modifications (reschedule)
- [ ] Waitlist functionality
- [ ] Admin dashboard for booking management
- [ ] Analytics and reporting
- [ ] Multi-currency support
- [ ] Group booking discounts
- [ ] Booking reminders

## Support

For issues or questions, contact the development team or create an issue in the repository.
