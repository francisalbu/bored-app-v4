/**
 * User Model
 * 
 * Handles user database operations using Supabase
 * Assumes existing users table with fields: id, email, password, name, google_id, apple_id, etc.
 */

const { from } = require('../config/database');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * Find user by email
 */
async function findByEmail(email) {
  const { data, error } = await from('users')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found, which is ok
  return data;
}

/**
 * Find user by ID
 */
async function findById(id) {
  const { data, error } = await from('users')
    .select('id, email, name, birthdate, location, avatar_icon, created_at')
    .eq('id', id)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
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
  const { data, error } = await from('users')
    .insert({
      email,
      password: hashedPassword,
      name,
      email_verified: false
    })
    .select('id, email, name, created_at')
    .single();
  
  if (error) throw error;
  return data;
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
  const allowedFields = ['name', 'bio', 'avatar_url', 'birthdate', 'location', 'avatar_icon'];
  
  const updateData = {};
  
  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      updateData[key] = updates[key];
    }
  });
  
  if (Object.keys(updateData).length === 0) {
    throw new Error('No valid fields to update');
  }
  
  const { data, error } = await from('users')
    .update(updateData)
    .eq('id', userId)
    .select('id, email, name, birthdate, location, avatar_icon, created_at')
    .single();
  
  if (error) throw error;
  return data;
}

module.exports = {
  findByEmail,
  findById,
  createUser,
  verifyPassword,
  updateProfile
};
