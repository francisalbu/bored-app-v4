/**
 * SUPABASE MIGRATION SCRIPT
 * Migrates data from SQLite to Supabase PostgreSQL
 * 
 * Usage: node migrate-to-supabase.js
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SQLITE_DB_PATH = process.env.DB_PATH || '/Users/francisalbu/Documents/Bored New Backend/bored_tourist.db';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for admin operations

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize clients
const sqliteDb = new sqlite3.Database(SQLITE_DB_PATH);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Utility: Promisify SQLite queries
const sqliteAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    sqliteDb.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Utility: Parse JSON fields from SQLite TEXT
const parseJsonField = (field) => {
  if (!field) return null;
  try {
    return JSON.parse(field);
  } catch (e) {
    return null;
  }
};

// Utility: Convert SQLite boolean (0/1) to PostgreSQL boolean
const toBool = (val) => val === 1 || val === true;

// Migration functions
async function migrateUsers() {
  console.log('\n📊 Migrating users...');
  const users = await sqliteAll('SELECT * FROM users');
  
  if (users.length === 0) {
    console.log('   No users to migrate');
    return;
  }

  for (const user of users) {
    const { error } = await supabase
      .from('users')
      .insert({
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        bio: user.bio,
        google_id: user.google_id,
        apple_id: user.apple_id,
        email_verified: toBool(user.email_verified),
        is_active: toBool(user.is_active),
        supabase_uid: user.supabase_uid,
        created_at: user.created_at,
        updated_at: user.updated_at
      });

    if (error) {
      console.error(`   ❌ Error migrating user ${user.email}:`, error.message);
    } else {
      console.log(`   ✅ Migrated user: ${user.email}`);
    }
  }
}

async function migrateOperators() {
  console.log('\n🏢 Migrating operators...');
  const operators = await sqliteAll('SELECT * FROM operators');
  
  if (operators.length === 0) {
    console.log('   No operators to migrate');
    return;
  }

  for (const op of operators) {
    const { error } = await supabase
      .from('operators')
      .insert({
        id: op.id,
        user_id: op.user_id,
        company_name: op.company_name,
        logo_url: op.logo_url,
        description: op.description,
        website: op.website,
        phone: op.phone,
        address: op.address,
        city: op.city,
        verified: toBool(op.verified),
        rating: op.rating,
        total_reviews: op.total_reviews,
        created_at: op.created_at,
        updated_at: op.updated_at
      });

    if (error) {
      console.error(`   ❌ Error migrating operator ${op.company_name}:`, error.message);
    } else {
      console.log(`   ✅ Migrated operator: ${op.company_name}`);
    }
  }
}

async function migrateExperiences() {
  console.log('\n🎯 Migrating experiences...');
  const experiences = await sqliteAll('SELECT * FROM experiences');
  
  if (experiences.length === 0) {
    console.log('   No experiences to migrate');
    return;
  }

  for (const exp of experiences) {
    const { error } = await supabase
      .from('experiences')
      .insert({
        id: exp.id,
        operator_id: exp.operator_id,
        title: exp.title,
        description: exp.description,
        location: exp.location,
        address: exp.address,
        meeting_point: exp.meeting_point,
        latitude: exp.latitude,
        longitude: exp.longitude,
        distance: exp.distance,
        price: exp.price,
        currency: exp.currency,
        duration: exp.duration,
        max_group_size: exp.max_group_size,
        category: exp.category,
        tags: parseJsonField(exp.tags),
        video_url: exp.video_url,
        image_url: exp.image_url,
        images: parseJsonField(exp.images),
        provider_logo: exp.provider_logo,
        highlights: parseJsonField(exp.highlights),
        included: parseJsonField(exp.included),
        what_to_bring: parseJsonField(exp.what_to_bring),
        languages: parseJsonField(exp.languages),
        cancellation_policy: exp.cancellation_policy,
        important_info: exp.important_info,
        instant_booking: toBool(exp.instant_booking),
        available_today: toBool(exp.available_today),
        verified: toBool(exp.verified),
        is_active: toBool(exp.is_active),
        rating: exp.rating,
        review_count: exp.review_count,
        created_at: exp.created_at,
        updated_at: exp.updated_at
      });

    if (error) {
      console.error(`   ❌ Error migrating experience ${exp.title}:`, error.message);
    } else {
      console.log(`   ✅ Migrated experience: ${exp.title}`);
    }
  }
}

async function migrateAvailabilitySlots() {
  console.log('\n📅 Migrating availability slots...');
  const slots = await sqliteAll('SELECT * FROM availability_slots');
  
  if (slots.length === 0) {
    console.log('   No slots to migrate');
    return;
  }

  console.log(`   Migrating ${slots.length} slots in batches...`);
  
  // Batch insert for better performance
  const batchSize = 100;
  for (let i = 0; i < slots.length; i += batchSize) {
    const batch = slots.slice(i, i + batchSize);
    const data = batch.map(slot => ({
      id: slot.id,
      experience_id: slot.experience_id,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      max_participants: slot.max_participants,
      booked_participants: slot.booked_participants,
      is_available: toBool(slot.is_available),
      created_at: slot.created_at
    }));

    const { error } = await supabase
      .from('availability_slots')
      .insert(data);

    if (error) {
      console.error(`   ❌ Error migrating batch ${i / batchSize + 1}:`, error.message);
    } else {
      console.log(`   ✅ Migrated batch ${i / batchSize + 1} (${data.length} slots)`);
    }
  }
}

async function migrateFavorites() {
  console.log('\n❤️  Migrating favorites...');
  const favorites = await sqliteAll('SELECT * FROM favorites');
  
  if (favorites.length === 0) {
    console.log('   No favorites to migrate');
    return;
  }

  for (const fav of favorites) {
    const { error } = await supabase
      .from('favorites')
      .insert({
        id: fav.id,
        user_id: fav.user_id,
        experience_id: fav.experience_id,
        created_at: fav.created_at
      });

    if (error) {
      console.error(`   ❌ Error migrating favorite:`, error.message);
    } else {
      console.log(`   ✅ Migrated favorite`);
    }
  }
}

async function migrateBookings() {
  console.log('\n📝 Migrating bookings...');
  const bookings = await sqliteAll('SELECT * FROM bookings');
  
  if (bookings.length === 0) {
    console.log('   No bookings to migrate');
    return;
  }

  for (const booking of bookings) {
    const { error } = await supabase
      .from('bookings')
      .insert({
        id: booking.id,
        booking_reference: booking.booking_reference,
        user_id: booking.user_id,
        experience_id: booking.experience_id,
        slot_id: booking.slot_id,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        participants: booking.participants,
        total_amount: booking.total_amount,
        currency: booking.currency,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        customer_phone: booking.customer_phone,
        status: booking.status,
        payment_status: booking.payment_status,
        payment_intent_id: booking.payment_intent_id,
        created_at: booking.created_at,
        updated_at: booking.updated_at
      });

    if (error) {
      console.error(`   ❌ Error migrating booking ${booking.booking_reference}:`, error.message);
    } else {
      console.log(`   ✅ Migrated booking: ${booking.booking_reference}`);
    }
  }
}

async function migrateReviews() {
  console.log('\n⭐ Migrating reviews...');
  const reviews = await sqliteAll('SELECT * FROM reviews');
  
  if (reviews.length === 0) {
    console.log('   No reviews to migrate');
    return;
  }

  for (const review of reviews) {
    const { error } = await supabase
      .from('reviews')
      .insert({
        id: review.id,
        user_id: review.user_id,
        experience_id: review.experience_id,
        booking_id: review.booking_id,
        rating: review.rating,
        comment: review.comment,
        operator_response: review.operator_response,
        response_date: review.response_date,
        source: review.source,
        author_name: review.author_name,
        author_avatar: review.author_avatar,
        verified_purchase: toBool(review.verified_purchase),
        helpful_count: review.helpful_count,
        created_at: review.created_at,
        updated_at: review.updated_at
      });

    if (error) {
      console.error(`   ❌ Error migrating review:`, error.message);
    } else {
      console.log(`   ✅ Migrated review`);
    }
  }
}

// Update sequences after migration (PostgreSQL specific)
async function updateSequences() {
  console.log('\n🔄 Updating PostgreSQL sequences...');
  
  const tables = ['users', 'operators', 'experiences', 'availability_slots', 'favorites', 'bookings', 'reviews'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `SELECT setval('${table}_id_seq', (SELECT MAX(id) FROM ${table}));`
      });
      
      if (error) {
        console.log(`   ⚠️  Could not update sequence for ${table} (may need manual update)`);
      } else {
        console.log(`   ✅ Updated sequence for ${table}`);
      }
    } catch (e) {
      console.log(`   ⚠️  Could not update sequence for ${table} (may need manual update)`);
    }
  }
}

// Main migration
async function migrate() {
  console.log('🚀 Starting Supabase Migration...');
  console.log(`📁 SQLite DB: ${SQLITE_DB_PATH}`);
  console.log(`🌐 Supabase: ${SUPABASE_URL}`);
  
  try {
    await migrateUsers();
    await migrateOperators();
    await migrateExperiences();
    await migrateAvailabilitySlots();
    await migrateFavorites();
    await migrateBookings();
    await migrateReviews();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n⚠️  IMPORTANT: Update sequences manually in Supabase SQL Editor:');
    console.log('   Run this SQL in Supabase Dashboard > SQL Editor:');
    console.log(`
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('operators_id_seq', (SELECT MAX(id) FROM operators));
SELECT setval('experiences_id_seq', (SELECT MAX(id) FROM experiences));
SELECT setval('availability_slots_id_seq', (SELECT MAX(id) FROM availability_slots));
SELECT setval('favorites_id_seq', (SELECT MAX(id) FROM favorites));
SELECT setval('bookings_id_seq', (SELECT MAX(id) FROM bookings));
SELECT setval('reviews_id_seq', (SELECT MAX(id) FROM reviews));
    `);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
  } finally {
    sqliteDb.close();
    console.log('\n👋 Database connections closed');
  }
}

// Run migration
migrate();
