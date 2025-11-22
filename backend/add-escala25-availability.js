const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Escala 25 experience ID
const EXPERIENCE_ID = 3;

// Schedule configuration
const SCHEDULE = {
  0: ['11:00', '12:00', '15:00', '17:00'], // Sunday
  1: ['15:00', '18:00', '19:00'],          // Monday
  2: ['11:00', '15:00', '19:00'],          // Tuesday
  3: ['11:00', '15:00'],                   // Wednesday
  4: ['15:00', '19:00'],                   // Thursday
  5: ['11:00', '17:00', '20:00'],          // Friday
  6: ['12:00', '15:00', '17:00']           // Saturday
};

const SPOTS_PER_SLOT = 5;

// Helper to format date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Helper to format time as HH:MM:SS
function formatTime(time) {
  return `${time}:00`;
}

async function addAvailabilitySlots() {
  console.log('🎯 Adding availability slots for Escala 25...\n');

  // Start date: today
  const startDate = new Date();
  
  // End date: January 31, 2026
  const endDate = new Date('2026-01-31');

  const slots = [];
  let currentDate = new Date(startDate);

  // Generate slots for each day until end date
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
    const times = SCHEDULE[dayOfWeek];

    if (times && times.length > 0) {
      times.forEach(time => {
        const startTime = formatTime(time);
        // End time is 2 hours after start time for climbing activities
        const [hours, minutes] = time.split(':');
        const endHour = (parseInt(hours) + 2).toString().padStart(2, '0');
        const endTime = `${endHour}:${minutes}:00`;
        
        slots.push({
          experience_id: EXPERIENCE_ID,
          date: formatDate(currentDate),
          start_time: startTime,
          end_time: endTime,
          max_participants: SPOTS_PER_SLOT,
          booked_participants: 0,
          is_available: true
        });
      });
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`📅 Generated ${slots.length} time slots from ${formatDate(startDate)} to ${formatDate(endDate)}`);
  console.log(`\nBreakdown by day:`);
  Object.keys(SCHEDULE).forEach(day => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    console.log(`  ${dayNames[day]}: ${SCHEDULE[day].length} slots - ${SCHEDULE[day].join(', ')}`);
  });

  // Insert in batches of 100 to avoid timeout
  const BATCH_SIZE = 100;
  let inserted = 0;
  let errors = 0;

  console.log(`\n🔄 Inserting slots in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < slots.length; i += BATCH_SIZE) {
    const batch = slots.slice(i, i + BATCH_SIZE);
    
    try {
      const { data, error } = await supabase
        .from('availability_slots')
        .insert(batch);

      if (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
        errors += batch.length;
      } else {
        inserted += batch.length;
        console.log(`✅ Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(slots.length / BATCH_SIZE)} (${batch.length} slots)`);
      }
    } catch (err) {
      console.error(`❌ Exception inserting batch:`, err.message);
      errors += batch.length;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Successfully inserted: ${inserted} slots`);
  console.log(`  ❌ Failed: ${errors} slots`);
  console.log(`  📅 Date range: ${formatDate(startDate)} to ${formatDate(endDate)}`);
  console.log(`  🎫 Spots per slot: ${SPOTS_PER_SLOT}`);
  console.log(`  🔢 Total capacity: ${inserted * SPOTS_PER_SLOT} people`);

  // Verify insertion
  console.log(`\n🔍 Verifying data...`);
  const { data: verification, error: verifyError } = await supabase
    .from('availability_slots')
    .select('date, start_time, end_time, max_participants, booked_participants')
    .eq('experience_id', EXPERIENCE_ID)
    .order('date', { ascending: true })
    .limit(5);

  if (verifyError) {
    console.error('❌ Verification error:', verifyError.message);
  } else {
    console.log('✅ First 5 slots in database:');
    verification.forEach(slot => {
      console.log(`  ${slot.date} at ${slot.start_time}-${slot.end_time} - ${slot.max_participants - slot.booked_participants}/${slot.max_participants} spots available`);
    });
  }

  console.log('\n✨ Done!');
}

// Run the script
addAvailabilitySlots().catch(console.error);
