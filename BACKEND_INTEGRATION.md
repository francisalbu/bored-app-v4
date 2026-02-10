# Backend Integration Guide

## Setup

Your backend is located at: `/Users/francisalbu/Documents/Bored Backend`

### Starting the Backend

```bash
cd "/Users/francisalbu/Documents/Bored Backend"
npm run dev
```

The backend will run on: **http://localhost:3000**

### API Service

The app now has a complete API service layer in `/services/api.ts` that handles:

- ✅ Authentication (login, register)
- ✅ Experiences (get all, get one, trending)
- ✅ Bookings (create, get, cancel)
- ✅ Reviews (get, create)
- ✅ Saved experiences
- ✅ User profile

### Usage Examples

#### 1. In a Component (using hooks):

```typescript
import { useExperiences } from '@/hooks/useApi';

function ExploreScreen() {
  const { experiences, loading, error, refetch } = useExperiences();

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error}</Text>;

  return (
    <FlatList data={experiences} ... />
  );
}
```

#### 2. Direct API calls:

```typescript
import { api } from '@/services/api';

// Login
const response = await api.login('user@example.com', 'password');
if (response.success) {
  api.setAuthToken(response.data.token);
}

// Create booking
const booking = await api.createBooking({
  experienceId: '1',
  date: '2025-11-15',
  time: '15:00',
  participants: 2,
  totalAmount: 120,
});

// Get experience details
const exp = await api.getExperience('1');
```

### Next Steps to Fully Integrate

1. **Replace static data with API calls:**
   - Update `app/(tabs)/explore.tsx` to use `useExperiences()` hook
   - Update `app/(tabs)/index.tsx` to fetch from API
   - Update `app/experience/[id].tsx` to use `useExperience(id)` hook
   - Update `app/(tabs)/bookings.tsx` to use `useBookings()` hook

2. **Add authentication:**
   - Create login/register screens
   - Store auth token securely (use expo-secure-store)
   - Add auth context/provider

3. **Update .env configuration:**
   - Set production API URL when deploying

## Testing the Backend

The backend includes test scripts. From the backend folder:

```bash
# Test all API endpoints
./test-api.sh
```

## Available Backend Endpoints

See `/Users/francisalbu/Documents/Bored Backend/API_DOCS.md` for full API documentation.

Main endpoints:
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/experiences` - Get all experiences
- `GET /api/experiences/:id` - Get single experience
- `POST /api/bookings` - Create booking
- `GET /api/bookings/my` - Get user's bookings
- `GET /api/reviews/experience/:id` - Get experience reviews
- `POST /api/reviews` - Create review

## Current Status

✅ Backend server ready
✅ API service layer created
✅ React hooks for data fetching created
✅ TypeScript types configured
⏳ Components still using static data (need to be updated)
⏳ Authentication not implemented in app yet
