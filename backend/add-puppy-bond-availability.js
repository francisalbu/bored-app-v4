const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Puppy Bond experience ID
const EXPERIENCE_ID = 2;

// Specific slots requested
const SLOTS = [
  { date: '2025-11-23', spots: 1 },
  { date: '2025-11-30', spots: 9 },
  { date: '2025-12-01', spots: 16 },
  { date: '2025-12-06', spots: 13 },
  { date: '2025-12-07', spots: 18 },
  { date: '2025-12-08', spots: 18 },
  { date: '2025-12-13', spots: 16 },
  { date: '2025-12-14', spots: 6 },
];

// Puppy yoga sessions are typically in the morning (10:00 AM - 12:00 PM)
const SESSION_START_TIME = '10:00:00';
const SESSION_END_TIME = '12:00:00';

async function addPuppyBondAvailability() {
  console.log('🐶 Adding Puppy Bond availability slots...\n');

  const slotsToInsert = SLOTS.map(slot => ({
    experience_id: EXPERIENCE_ID,
    date: slot.date,
    start_time: SESSION_START_TIME,
    end_time: SESSION_END_TIME,
    max_participants: slot.spots,
    booked_participants: 0,
    is_available: true
  }));

  console.log(`📅 Creating ${slotsToInsert.length} time slots:\n`);
  SLOTS.forEach(slot => {
    console.log(`  ${slot.date}: ${slot.spots} spot${slot.spots > 1 ? 's' : ''}`);
  });

  console.log(`\n🔄 Inserting slots into database...`);

  try {
    const { data, error } = await supabase
      .from('availability_slots')
      .insert(slotsToInsert);

    if (error) {
      console.error('❌ Error inserting slots:', error.message);
      return;
    }

    console.log(`✅ Successfully inserted ${slotsToInsert.length} slots!`);

    // Verify insertion
    console.log(`\n🔍 Verifying data...`);
    const { data: verification, error: verifyError } = await supabase
      .from('availability_slots')
      .select('date, start_time, end_time, max_participants, booked_participants')
      .eq('experience_id', EXPERIENCE_ID)
      .order('date', { ascending: true });

    if (verifyError) {
      console.error('❌ Verification error:', verifyError.message);
    } else {
      console.log(`✅ All Puppy Bond slots in database (${verification.length} total):`);
      verification.forEach(slot => {
        console.log(`  ${slot.date} at ${slot.start_time}-${slot.end_time} - ${slot.max_participants - slot.booked_participants}/${slot.max_participants} spots available`);
      });
    }

    console.log(`\n📊 Summary:`);
    console.log(`  🐕 Experience: Puppy Bond (Puppy Yoga)`);
    console.log(`  📅 Dates: Nov 23 - Dec 14, 2025`);
    console.log(`  ⏰ Time: 10:00 AM - 12:00 PM`);
    console.log(`  🎫 Total spots across all dates: ${SLOTS.reduce((sum, s) => sum + s.spots, 0)}`);

  } catch (err) {
    console.error('❌ Exception:', err.message);
  }

  console.log('\n✨ Done!');
}

// Run the script
addPuppyBondAvailability().catch(console.error);
