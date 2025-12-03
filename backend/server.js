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
const usersRoutes = require('./routes/users');
const interestRoutes = require('./routes/interest');
const socialMediaRoutes = require('./routes/socialMedia');

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
app.use('/api/users', usersRoutes);
app.use('/api/interest', interestRoutes);
app.use('/api/social-media', socialMediaRoutes);

// Privacy Policy page (required for Facebook App)
app.get('/privacy', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Privacy Policy - Bored Tourist</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1 { color: #F4E04D; }
        h2 { color: #333; margin-top: 30px; }
      </style>
    </head>
    <body>
      <h1>🌍 Bored Tourist - Privacy Policy</h1>
      <p><strong>Last updated:</strong> December 2025</p>
      
      <h2>1. Information We Collect</h2>
      <p>We collect information you provide directly, including your name, email address, and booking preferences when you use our app.</p>
      
      <h2>2. How We Use Your Information</h2>
      <p>We use your information to provide and improve our travel experience booking services, process your bookings, and communicate with you about your reservations.</p>
      
      <h2>3. Information Sharing</h2>
      <p>We do not sell your personal information. We may share your information with experience providers to fulfill your bookings.</p>
      
      <h2>4. Data Security</h2>
      <p>We implement appropriate security measures to protect your personal information.</p>
      
      <h2>5. Your Rights</h2>
      <p>You have the right to access, correct, or delete your personal information. Contact us at support@boredtourist.com.</p>
      
      <h2>6. Contact Us</h2>
      <p>For questions about this Privacy Policy, contact us at: <a href="mailto:support@boredtourist.com">support@boredtourist.com</a></p>
    </body>
    </html>
  `);
});

// Terms of Service page (required for Facebook App)
app.get('/terms', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Terms of Service - Bored Tourist</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1 { color: #F4E04D; }
        h2 { color: #333; margin-top: 30px; }
      </style>
    </head>
    <body>
      <h1>🌍 Bored Tourist - Terms of Service</h1>
      <p><strong>Last updated:</strong> December 2025</p>
      
      <h2>1. Acceptance of Terms</h2>
      <p>By using Bored Tourist, you agree to these Terms of Service. If you do not agree, please do not use our services.</p>
      
      <h2>2. Description of Service</h2>
      <p>Bored Tourist is a platform for discovering and booking unique travel experiences in Portugal.</p>
      
      <h2>3. User Responsibilities</h2>
      <p>You agree to provide accurate information and use our services in compliance with applicable laws.</p>
      
      <h2>4. Bookings and Payments</h2>
      <p>All bookings are subject to availability. Cancellation policies vary by experience provider.</p>
      
      <h2>5. Intellectual Property</h2>
      <p>All content on Bored Tourist is protected by copyright and other intellectual property laws.</p>
      
      <h2>6. Limitation of Liability</h2>
      <p>Bored Tourist is not liable for any damages arising from your use of our services or third-party experience providers.</p>
      
      <h2>7. Contact Us</h2>
      <p>For questions about these Terms, contact us at: <a href="mailto:support@boredtourist.com">support@boredtourist.com</a></p>
    </body>
    </html>
  `);
});

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
