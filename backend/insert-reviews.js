const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function insertReviews() {
  try {
    // Read the reviews JSON file
    const reviewsPath = '/Users/francisalbu/Documents/Bored Partners/reviews_final.json';
    const rawData = fs.readFileSync(reviewsPath, 'utf8');
    const data = JSON.parse(rawData);
    
    console.log(`\n📊 Reviews file loaded:`);
    console.log(`   Total reviews: ${data.metadata.total_reviews}`);
    console.log(`   Total experiences: ${data.metadata.total_experiences}`);
    console.log(`   Experience ID range: ${data.metadata.experience_id_range}`);
    console.log(`   Note: ${data.metadata.note}\n`);

    // Check if reviews table already has data
    const { count: existingCount } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📋 Existing reviews in database: ${existingCount || 0}`);

    if (existingCount > 0) {
      console.log('\n⚠️  Reviews table already has data.');
      console.log('   Do you want to:');
      console.log('   1. Add new reviews (may create duplicates)');
      console.log('   2. Clear existing and insert fresh');
      console.log('\n   Running in "add new" mode by default...\n');
    }

    // Prepare reviews for insertion (remove the 'id' field to let Supabase auto-generate)
    const reviewsToInsert = data.reviews.map(review => {
      const { id, ...reviewWithoutId } = review;
      return reviewWithoutId;
    });

    // Insert in batches of 100 to avoid timeouts
    const batchSize = 100;
    let insertedCount = 0;
    let errorCount = 0;

    console.log(`🚀 Starting insertion of ${reviewsToInsert.length} reviews in batches of ${batchSize}...\n`);

    for (let i = 0; i < reviewsToInsert.length; i += batchSize) {
      const batch = reviewsToInsert.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(reviewsToInsert.length / batchSize);

      const { data: insertedData, error } = await supabase
        .from('reviews')
        .insert(batch)
        .select();

      if (error) {
        console.error(`❌ Batch ${batchNumber}/${totalBatches} failed:`, error.message);
        errorCount += batch.length;
      } else {
        insertedCount += insertedData.length;
        console.log(`✅ Batch ${batchNumber}/${totalBatches}: Inserted ${insertedData.length} reviews (Total: ${insertedCount})`);
      }
    }

    console.log(`\n📊 Insertion complete!`);
    console.log(`   ✅ Successfully inserted: ${insertedCount}`);
    if (errorCount > 0) {
      console.log(`   ❌ Failed: ${errorCount}`);
    }

    // Verify final count
    const { count: finalCount } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📋 Total reviews now in database: ${finalCount}`);

    // Show sample of reviews by experience
    const { data: sampleReviews } = await supabase
      .from('reviews')
      .select('experience_id, rating, author_name, source')
      .order('experience_id')
      .limit(10);

    console.log('\n📝 Sample reviews inserted:');
    sampleReviews?.forEach(r => {
      console.log(`   Experience ${r.experience_id}: ${r.rating}★ by ${r.author_name} (${r.source})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the insertion
insertReviews();
