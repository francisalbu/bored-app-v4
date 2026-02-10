/**
 * Import Google Maps Reviews from JSON
 * 
 * This script imports reviews from /Users/francisalbu/Documents/google_maps_reviews.json
 * into the database for each experience
 * 
 * Run: node backend/import-google-reviews.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database path - use the same path as backend server
const DB_PATH = process.env.DB_PATH || '/Users/francisalbu/Documents/Bored New Backend/bored_tourist.db';
const JSON_PATH = '/Users/francisalbu/Documents/google_maps_reviews.json';

// Experience ID mappings
const EXPERIENCE_MAPPING = {
  'Lx4 Tours': 1,          // Atlantic Coast Guided Quad Bike Tour
  'Escala25': 3,           // Escalada Ponte 25 de Abril
  'Puppy Bond': 2          // Puppy Yoga Experience
};

function importReviews() {
  // Read the JSON file
  const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  
  console.log('🔄 Importing Google Maps reviews...\n');
  console.log(`📊 Total reviews to import: ${jsonData.reviews.length}\n`);

  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Error connecting to database:', err);
      return;
    }
    console.log('✅ Connected to database\n');
  });

  const stmt = db.prepare(`
    INSERT INTO reviews (
      experience_id,
      user_id,
      rating,
      comment,
      source,
      author_name,
      verified_purchase,
      helpful_count,
      created_at,
      updated_at
    ) VALUES (?, NULL, ?, ?, 'google', ?, 0, 0, datetime('now'), datetime('now'))
  `);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  jsonData.reviews.forEach((review) => {
    const experienceId = EXPERIENCE_MAPPING[review.place];
    
    if (!experienceId) {
      console.warn(`⚠️  Unknown place: ${review.place} - skipping`);
      skipped++;
      return;
    }

    // Skip reviews without text
    if (!review.review || review.review.trim() === '') {
      console.log(`⚠️  Skipping empty review from ${review.username} for ${review.place}`);
      skipped++;
      return;
    }

    stmt.run(
      experienceId,
      review.stars,
      review.review,
      review.username,
      (err) => {
        if (err) {
          console.error(`❌ Error inserting review from ${review.username}:`, err.message);
          errors++;
        } else {
          inserted++;
          console.log(`✅ Imported: ${review.username} (${review.stars}⭐) → ${review.place}`);
        }
      }
    );
  });

  stmt.finalize();

  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err);
    } else {
      console.log('\n' + '='.repeat(60));
      console.log('📊 Import Summary:');
      console.log('='.repeat(60));
      console.log(`✅ Successfully imported: ${inserted}`);
      console.log(`⚠️  Skipped: ${skipped}`);
      console.log(`❌ Errors: ${errors}`);
      console.log('='.repeat(60));
      console.log('\n🎉 Google Maps reviews imported to database!');
      console.log('\nNext steps:');
      console.log('1. Restart your backend server');
      console.log('2. Reviews will now appear in the app via API');
    }
  });
}

// Run the import
try {
  importReviews();
} catch (error) {
  console.error('❌ Fatal error:', error);
  process.exit(1);
}
