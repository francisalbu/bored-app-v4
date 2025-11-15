/**
 * Database Configuration
 * 
 * Connects to the existing SQLite database (bored_tourist.db)
 * The database already contains:
 * - users table (id, email, password, name, etc.)
 * - experiences table (id, title, description, location, price, media URLs, etc.)
 * - bookings table (id, user_id, experience_id, date, status, etc.)
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path from environment or default
const DB_PATH = process.env.DB_PATH || '/Users/francisalbu/Documents/Bored New Backend/bored_tourist.db';

let db;

/**
 * Initialize database connection
 */
function initDB() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Error connecting to database:', err.message);
        reject(err);
      } else {
        console.log('✅ Connected to SQLite database:', DB_PATH);
        resolve(db);
      }
    });
  });
}

/**
 * Get database instance
 */
function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
}

/**
 * Helper to run queries with promises
 */
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Helper to get single row
 */
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Helper to run insert/update/delete
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Close database connection
 */
function closeDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) reject(err);
        else {
          console.log('Database connection closed');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  initDB,
  getDB,
  query,
  get,
  run,
  closeDB
};
