# Bored Travel App - Backend

TikTok-style travel app backend with video experiences, authentication, and booking system.

## Features

- ✅ User authentication (email/password, Google OAuth, Apple OAuth)
- ✅ JWT token-based auth with bcrypt password hashing
- ✅ Experience discovery with video feed
- ✅ Search and filter experiences
- ✅ Booking requests (server-side managed)
- ✅ User profiles
- ✅ SQLite database integration
- ✅ Google Cloud Storage media URLs
- ✅ CORS enabled for mobile app access
- ✅ Server listens on 0.0.0.0 for network access

## Tech Stack

- **Framework**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Authentication**: JWT + Passport.js (Google & Apple OAuth)
- **Password Hashing**: bcrypt
- **Validation**: express-validator

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Important variables:
- `JWT_SECRET` - Change to a secure random string
- `DB_PATH` - Path to your bored_tourist.db file
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - For Google OAuth
- `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID` - For Apple OAuth

### 3. Place Your Database

Ensure `bored_tourist.db` is in the backend folder (or update `DB_PATH` in `.env`).

### 4. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://0.0.0.0:3000` and be accessible from:
- Local: `http://localhost:3000`
- Network: `http://YOUR_IP:3000` (for mobile devices on same network)

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register with email/password
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/apple` - Initiate Apple OAuth
- `POST /api/auth/apple/callback` - Apple OAuth callback
- `GET /api/auth/me` - Get current user (requires auth)

### Experiences

- `GET /api/experiences` - Get all experiences (feed)
  - Query params: `limit`, `offset`, `category`, `search`
- `GET /api/experiences/trending` - Get trending experiences
- `GET /api/experiences/:id` - Get single experience details

### Bookings

- `POST /api/bookings` - Create booking request (requires auth)
- `GET /api/bookings` - Get user's bookings (requires auth)
  - Query params: `status` (pending, confirmed, cancelled)
- `GET /api/bookings/:id` - Get single booking (requires auth)
- `PUT /api/bookings/:id/cancel` - Cancel booking (requires auth)

### Profile

- `GET /api/profile` - Get user profile (requires auth)
- `PUT /api/profile` - Update profile (requires auth)

## Authentication Flow

### Email/Password

**Register:**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Login:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

Both return:
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "email": "...", "name": "..." },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Using JWT Token

Include the token in the `Authorization` header for protected routes:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Google/Apple OAuth

1. Frontend initiates OAuth by redirecting to `/api/auth/google` or `/api/auth/apple`
2. User authenticates with Google/Apple
3. Backend receives callback and generates JWT
4. Backend redirects to frontend with token: `FRONTEND_URL/auth/callback?token=...`
5. Frontend extracts and stores token

## Database Schema

The backend expects these tables in `bored_tourist.db`:

### users
- id (INTEGER PRIMARY KEY)
- email (TEXT UNIQUE)
- password (TEXT, nullable for OAuth users)
- name (TEXT)
- bio (TEXT)
- avatar_url (TEXT)
- google_id (TEXT)
- apple_id (TEXT)
- email_verified (INTEGER)
- created_at (TEXT)
- updated_at (TEXT)

### experiences
- id (INTEGER PRIMARY KEY)
- title (TEXT)
- description (TEXT)
- location (TEXT)
- price (REAL)
- duration (INTEGER)
- video_url (TEXT) - Google Cloud Storage URL
- thumbnail_url (TEXT) - Google Cloud Storage URL
- images (TEXT) - JSON array of image URLs
- category (TEXT)
- rating (REAL)
- views (INTEGER)
- latitude (REAL)
- longitude (REAL)
- included_items (TEXT) - JSON array
- requirements (TEXT) - JSON array
- cancellation_policy (TEXT)
- created_at (TEXT)

### bookings
- id (INTEGER PRIMARY KEY)
- user_id (INTEGER)
- experience_id (INTEGER)
- booking_date (TEXT)
- participants (INTEGER)
- total_amount (REAL)
- status (TEXT) - pending, confirmed, cancelled
- notes (TEXT)
- created_at (TEXT)
- updated_at (TEXT)

## Media Integration

All media files (videos, images) are stored in Google Cloud Storage. The database contains URLs pointing to these files:

- `video_url` - Direct URL to video file
- `thumbnail_url` - Video thumbnail
- `images` - JSON array of image URLs

Example:
```json
{
  "video_url": "https://storage.googleapis.com/bucket/video.mp4",
  "thumbnail_url": "https://storage.googleapis.com/bucket/thumb.jpg",
  "images": [
    "https://storage.googleapis.com/bucket/img1.jpg",
    "https://storage.googleapis.com/bucket/img2.jpg"
  ]
}
```

## OAuth Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
6. Copy Client ID and Secret to `.env`

### Apple OAuth

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create an App ID with Sign in with Apple capability
3. Create a Service ID
4. Create a Key for Sign in with Apple
5. Download the `.p8` key file and place in backend folder
6. Update `.env` with Apple credentials

## Project Structure

```
backend/
├── server.js              # Main server file
├── package.json           # Dependencies
├── .env                   # Environment variables
├── bored_tourist.db       # SQLite database
├── config/
│   ├── database.js        # Database connection
│   └── passport.js        # OAuth strategies
├── middleware/
│   ├── auth.js            # JWT authentication
│   └── errorHandler.js    # Error handling
├── models/
│   ├── User.js            # User operations
│   ├── Experience.js      # Experience operations
│   └── Booking.js         # Booking operations
├── routes/
│   ├── auth.js            # Auth endpoints
│   ├── experiences.js     # Experience endpoints
│   ├── bookings.js        # Booking endpoints
│   └── profile.js         # Profile endpoints
└── utils/
    └── jwt.js             # JWT utilities
```

## Development Tips

1. **Testing API**: Use Postman, Insomnia, or curl
2. **Mobile Access**: Find your computer's IP with `ipconfig getifaddr en0` (macOS)
3. **Database Browsing**: Use [DB Browser for SQLite](https://sqlitebrowser.org/)
4. **Logs**: Server logs all requests in development mode

## Common Issues

### Can't connect from mobile device
- Ensure server is running on `0.0.0.0:3000`
- Check firewall settings
- Use your computer's local IP (not localhost)
- Ensure mobile device is on same network

### OAuth not working
- Verify redirect URLs match in OAuth provider settings
- Check environment variables are set correctly
- Ensure callback URLs are accessible

### Database errors
- Verify `bored_tourist.db` exists and has correct schema
- Check file permissions
- Ensure DB_PATH in `.env` is correct

## License

ISC
