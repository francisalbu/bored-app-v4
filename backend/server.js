/**
 * Bored Travel App - Backend Server
 * 
 * TikTok-style travel app with video experiences, authentication, and booking
 * 
 * Features:
 * - User authentication (email/password, Google OAuth, Apple OAuth)
 * - Experience discovery with video feed
 * - Booking requests (server-side managed)
 * - User profiles
 * - Media URLs from Google Cloud Storage
 * 
 * Database: Supabase PostgreSQL
 * Auth: JWT tokens with bcrypt password hashing
 * Server listens on 0.0.0.0:3000 for network access
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('./config/passport');
const { initDB, closeDB } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const supabaseAuthRoutes = require('./routes/supabaseAuth');
const experienceRoutes = require('./routes/experiences');
const bookingRoutes = require('./routes/bookings');
const profileRoutes = require('./routes/profile');
const favoritesRoutes = require('./routes/favorites');
const availabilityRoutes = require('./routes/availability');
const paymentsRoutes = require('./routes/payments');
const reviewsRoutes = require('./routes/reviews');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// =======================
// MIDDLEWARE SETUP
// =======================

// Enable CORS for all origins (adjust for production)
app.use(cors({
  origin: '*', // Allow all origins - important for mobile app access
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport for OAuth
app.use(passport.initialize());

// Request logging (development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// =======================
// ROUTES
// =======================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/supabase', supabaseAuthRoutes);
app.use('/api/experiences', experienceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/reviews', reviewsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handler (must be last)
app.use(errorHandler);

// =======================
// DATABASE & SERVER STARTUP
// =======================

// Initialize database and start server
initDB().then(() => {
  // Start server on 0.0.0.0 to accept connections from network (mobile devices)
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 Bored Travel Backend Server');
    console.log('='.repeat(50));
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌐 Local: http://localhost:${PORT}`);
    console.log(`📱 Network: http://0.0.0.0:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: Supabase PostgreSQL`);
    console.log('='.repeat(50) + '\n');
    console.log('API Endpoints:');
    console.log('  POST   /api/auth/register');
    console.log('  POST   /api/auth/login');
    console.log('  GET    /api/auth/google');
    console.log('  GET    /api/auth/apple');
    console.log('  GET    /api/auth/me');
    console.log('  GET    /api/experiences');
    console.log('  GET    /api/experiences/trending');
    console.log('  GET    /api/experiences/:id');
    console.log('  POST   /api/bookings');
    console.log('  GET    /api/bookings');
    console.log('  GET    /api/bookings/:id');
    console.log('  PUT    /api/bookings/:id/cancel');
    console.log('  GET    /api/profile');
    console.log('  PUT    /api/profile');
    console.log('='.repeat(50) + '\n');
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      closeDB().then(() => process.exit(0));
    });
  });

  process.on('SIGTERM', () => {
    console.log('\n\n🛑 SIGTERM received, shutting down...');
    server.close(() => {
      console.log('✅ Server closed');
      closeDB().then(() => process.exit(0));
    });
  });
}).catch(error => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});

module.exports = app;
