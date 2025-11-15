/**
 * JWT Utilities
 * 
 * Functions for generating and verifying JWT tokens
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days

/**
 * Generate JWT token for a user
 * @param {Object} user - User object from database
 * @returns {String} JWT token
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

module.exports = {
  generateToken,
  verifyToken
};
