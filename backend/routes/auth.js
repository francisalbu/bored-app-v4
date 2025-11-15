/**
 * Authentication Routes
 * 
 * Handles user registration, login, and OAuth flows
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const passport = require('../config/passport');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Register a new user with email and password
 */
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty()
  ],
  async (req, res, next) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const { email, password, name } = req.body;
      
      // Create user
      const user = await User.createUser(email, password, name);
      
      // Generate JWT token
      const token = generateToken(user);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name
          },
          token
        }
      });
    } catch (error) {
      if (error.message === 'User with this email already exists') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }
);

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res, next) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const { email, password } = req.body;
      
      // Verify credentials
      const user = await User.verifyPassword(email, password);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
      
      // Generate JWT token
      const token = generateToken(user);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 */
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
);

/**
 * GET /api/auth/google/callback
 * Google OAuth callback
 */
router.get('/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = generateToken(req.user);
      
      // Redirect to frontend with token
      // Frontend should extract token from URL and store it
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=token_generation_failed`);
    }
  }
);

/**
 * GET /api/auth/apple
 * Initiate Apple OAuth flow
 */
router.get('/apple',
  passport.authenticate('apple', {
    session: false
  })
);

/**
 * POST /api/auth/apple/callback
 * Apple OAuth callback (Apple uses POST)
 */
router.post('/apple/callback',
  passport.authenticate('apple', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=apple_auth_failed`
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = generateToken(req.user);
      
      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=token_generation_failed`);
    }
  }
);

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
});

module.exports = router;
