/**
 * Authentication Middleware
 * 
 * Protects routes by requiring a valid JWT token
 */

const { verifyToken } = require('../utils/jwt');
const { get } = require('../config/database');

/**
 * Middleware to authenticate requests using JWT
 * Expects token in Authorization header: "Bearer <token>"
 */
async function authenticate(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please include Authorization header with Bearer token.'
      });
    }
    
    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Get user from database
    const user = await get('SELECT id, email, name, created_at FROM users WHERE id = ?', [decoded.id]);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid token'
    });
  }
}

/**
 * Optional authentication - doesn't fail if no token
 * Useful for routes that behave differently for authenticated users
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      const user = await get('SELECT id, email, name, created_at FROM users WHERE id = ?', [decoded.id]);
      
      if (user) {
        req.user = user;
      }
    }
  } catch (error) {
    // Silently fail - user remains unauthenticated
  }
  
  next();
}

module.exports = {
  authenticate,
  optionalAuth
};
