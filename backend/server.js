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

// Force rebuild: 2025-12-05
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
const boredAIRoutes = require('./routes/boredAI');
const aiConciergeRoutes = require('./routes/aiConcierge');
const preferencesRoutes = require('./routes/preferences');
const suggestionsRoutes = require('./routes/suggestions');
const discountCodesRoutes = require('./routes/discountCodes');

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
app.use('/api/bored-ai', boredAIRoutes);
app.use('/api/ai-concierge', aiConciergeRoutes);
app.use('/api/preferences', preferencesRoutes); // User preferences and quiz data
app.use('/api/suggestions', suggestionsRoutes); // Activity suggestions from users
app.use('/api/discount-codes', discountCodesRoutes); // Discount codes validation and usage

// Privacy Policy page (required for App Store)
app.get('/privacy', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Privacy Policy - Bored Tourist</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 20px; 
          line-height: 1.6; 
          background-color: #1a1a2e;
          color: #ffffff;
        }
        h1 { color: #F4E04D; margin-bottom: 8px; }
        h2 { color: #F4E04D; margin-top: 30px; font-size: 18px; }
        p { color: #b0b0b0; margin-bottom: 16px; }
        .date { color: #666; font-size: 12px; margin-bottom: 24px; }
        a { color: #F4E04D; }
        ul { color: #b0b0b0; padding-left: 20px; }
        li { margin-bottom: 8px; }
      </style>
    </head>
    <body>
      <h1>🌍 Privacy Policy</h1>
      <p class="date">Last updated: November 22, 2025</p>
      
      <h2>1. Information We Collect</h2>
      <p>We collect information that you provide directly to us, including:</p>
      <ul>
        <li>Name and contact information</li>
        <li>Email address</li>
        <li>Payment information</li>
        <li>Booking history</li>
        <li>Reviews and ratings</li>
        <li>Location data (with your permission)</li>
      </ul>
      
      <h2>2. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Process your bookings and payments</li>
        <li>Send booking confirmations and updates</li>
        <li>Provide customer support</li>
        <li>Personalize your experience</li>
        <li>Send marketing communications (with your consent)</li>
        <li>Improve our services</li>
      </ul>
      
      <h2>3. Information Sharing</h2>
      <p>We share your information with:</p>
      <ul>
        <li>Experience providers to facilitate your bookings</li>
        <li>Payment processors to handle transactions</li>
        <li>Service providers who assist in operating our platform</li>
        <li>Law enforcement when required by law</li>
      </ul>
      
      <h2>4. Data Security</h2>
      <p>We implement appropriate security measures to protect your personal information. However, no method of transmission over the internet is 100% secure.</p>
      
      <h2>5. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access your personal information</li>
        <li>Correct inaccurate data</li>
        <li>Request deletion of your data</li>
        <li>Object to processing of your data</li>
        <li>Withdraw consent at any time</li>
      </ul>
      
      <h2>6. Cookies and Tracking</h2>
      <p>We use cookies and similar technologies to enhance your experience, analyze usage patterns, and deliver personalized content.</p>
      
      <h2>7. Children's Privacy</h2>
      <p>Our Service is not intended for children under 16. We do not knowingly collect personal information from children under 16.</p>
      
      <h2>8. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>
      
      <h2>9. Contact Us</h2>
      <p>If you have questions about this Privacy Policy, please contact us at:<br>
      <a href="mailto:francisco.albuquerque@boredtourist.com">francisco.albuquerque@boredtourist.com</a></p>
    </body>
    </html>
  `);
});

// Terms of Service page (required for App Store)
app.get('/terms', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Terms of Service - Bored Tourist</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 20px; 
          line-height: 1.6; 
          background-color: #1a1a2e;
          color: #ffffff;
        }
        h1 { color: #F4E04D; margin-bottom: 8px; }
        h2 { color: #F4E04D; margin-top: 30px; font-size: 18px; }
        p { color: #b0b0b0; margin-bottom: 16px; }
        .date { color: #666; font-size: 12px; margin-bottom: 24px; }
        a { color: #F4E04D; }
      </style>
    </head>
    <body>
      <h1>🌍 Terms of Service</h1>
      <p class="date">Last updated: November 22, 2025</p>
      
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
      <p>For questions about these Terms, contact us at:<br>
      <a href="mailto:francisco.albuquerque@boredtourist.com">francisco.albuquerque@boredtourist.com</a></p>
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

