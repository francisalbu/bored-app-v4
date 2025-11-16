/**
 * User Model
 * 
 * Handles user database operations
 * Assumes existing users table with fields: id, email, password, name, google_id, apple_id, etc.
 */

const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

// Helper to get database functions (lazy load to avoid circular dependency)
function getDB() {
  return require('../config/database');
}

/**
 * Find user by email
 */
async function findByEmail(email) {
  const { get } = getDB();
  return await get('SELECT * FROM users WHERE email = ?', [email]);
}

/**
 * Find user by ID
 */
async function findById(id) {
  const { get } = getDB();
  return await get('SELECT id, email, name, created_at FROM users WHERE id = ?', [id]);
}

/**
 * Create new user with email and password
 */
async function createUser(email, password, name) {
  // Check if user already exists
  const existing = await findByEmail(email);
  if (existing) {
    throw new Error('User with this email already exists');
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  
  // Insert user
  const { run } = getDB();
  const result = await run(`
    INSERT INTO users (email, password, name, email_verified, created_at)
    VALUES (?, ?, ?, 0, datetime('now'))
  `, [email, hashedPassword, name]);
  
  return await findById(result.lastID);
}

/**
 * Verify user password
 */
async function verifyPassword(email, password) {
  const user = await findByEmail(email);
  
  if (!user || !user.password) {
    return null;
  }
  
  const isValid = await bcrypt.compare(password, user.password);
  
  if (!isValid) {
    return null;
  }
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Update user profile
 */
async function updateProfile(userId, updates) {
  const allowedFields = ['name', 'bio', 'avatar_url'];
  
  const fields = [];
  const values = [];
  
  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  });
  
  if (fields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  values.push(userId);
  
  const { run } = getDB();
  await run(`
    UPDATE users 
    SET ${fields.join(', ')}, updated_at = datetime('now')
    WHERE id = ?
  `, values);
  
  return await findById(userId);
}

module.exports = {
  findByEmail,
  findById,
  createUser,
  verifyPassword,
  updateProfile
};
