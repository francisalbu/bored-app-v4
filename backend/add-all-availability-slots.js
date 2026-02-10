const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://hnivuisqktlrusyqywaz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXZ1aXNxa3RscnVzeXF5d2F6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzE3MTY3OCwiZXhwIjoyMDc4NzQ3Njc4fQ.gGLIYOJgNvm_LnsOm87LMCMAd0qgoJt1owpDY-DrjNw'
);

const DEFAULT_SPOTS = 10;
const START_DATE = new Date('2025-12-02'); // Start from TODAY
const END_DATE = new Date('2026-03-31'); // End of March 2026

// Blackout dates (no availability)
const BLACKOUT_DATES = [
  { month: 11, day: 24 }, // 24 Dec
  { month: 11, day: 25 }, // 25 Dec
  { month: 11, day: 31 }, // 31 Dec
  { month: 0, day: 1 }    // 01 Jan
];

function isBlackoutDate(date) {
  const m = date.getMonth();
  const d = date.getDate();
  return BLACKOUT_DATES.some(bd => bd.month === m && bd.day === d);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function formatTime(hours, minutes = 0) {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

function addMinutesToTime(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60);
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:00`;
}

// Generate times from start to end with interval
function generateIntervalTimes(startHour, startMin, endHour, endMin, intervalMinutes) {
  const times = [];
  let currentH = startHour;
  let currentM = startMin;
  
  while (currentH < endHour || (currentH === endHour && currentM <= endMin)) {
    times.push(formatTime(currentH, currentM));
    currentM += intervalMinutes;
    if (currentM >= 60) {
      currentH += Math.floor(currentM / 60);
      currentM = currentM % 60;
    }
  }
  return times;
}

// Day of week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
const EXPERIENCES = [
  // ID21: Every day except tuesday(2) and wednesday(3). 10:30 or 13:30
  {
    id: 21,
    name: 'Experience 21',
    times: ['10:30:00', '13:30:00'],
    durationMinutes: 120,
    excludeDays: [2, 3], // Tuesday, Wednesday
    minParticipants: 1
  },
  
  // ID22: Every tuesday(2), thursday(4) and saturday(6) at 9am
  {
    id: 22,
    name: 'Experience 22',
    times: ['09:00:00'],
    durationMinutes: 180,
    includeDays: [2, 4, 6], // Tuesday, Thursday, Saturday
    minParticipants: 1
  },
  
  // ID23: Every day at 10am, 12pm or 15pm
  {
    id: 23,
    name: 'Experience 23',
    times: ['10:00:00', '12:00:00', '15:00:00'],
    durationMinutes: 120,
    minParticipants: 1
  },
  
  // ID24: Every day at 10am or 14pm
  {
    id: 24,
    name: 'Experience 24',
    times: ['10:00:00', '14:00:00'],
    durationMinutes: 120,
    minParticipants: 1
  },
  
  // ID25: Every day at 7am or 7:30am
  {
    id: 25,
    name: 'Experience 25',
    times: ['07:00:00', '07:30:00'],
    durationMinutes: 180,
    minParticipants: 1
  },
  
  // ID26: Every day at 11am or 15pm
  {
    id: 26,
    name: 'Experience 26',
    times: ['11:00:00', '15:00:00'],
    durationMinutes: 120,
    minParticipants: 1
  },
  
  // ID27: Every day at 14:30pm
  {
    id: 27,
    name: 'Experience 27',
    times: ['14:30:00'],
    durationMinutes: 120,
    minParticipants: 1
  },
  
  // ID28: Every monday(1), wednesday(3) and sunday(0). Weekdays 11am, Sunday 9:30am
  {
    id: 28,
    name: 'Experience 28',
    customSchedule: {
      0: ['09:30:00'], // Sunday
      1: ['11:00:00'], // Monday
      3: ['11:00:00'], // Wednesday
    },
    durationMinutes: 120,
    minParticipants: 1
  },
  
  // ID29: Every day at 10am
  {
    id: 29,
    name: 'Experience 29',
    times: ['10:00:00'],
    durationMinutes: 120,
    minParticipants: 1
  },
  
  // ID30: Every day from 10am to 19pm in 30 minutes slots. Minimum 2 people.
  {
    id: 30,
    name: 'Experience 30',
    times: generateIntervalTimes(10, 0, 19, 0, 30),
    durationMinutes: 30,
    minParticipants: 2
  },
  
  // ID31: Every wednesday(3) at 7pm
  {
    id: 31,
    name: 'Experience 31',
    times: ['19:00:00'],
    durationMinutes: 120,
    includeDays: [3], // Wednesday only
    minParticipants: 1
  },
  
  // ID32: Every day at 9am or 14:30pm
  {
    id: 32,
    name: 'Experience 32',
    times: ['09:00:00', '14:30:00'],
    durationMinutes: 120,
    minParticipants: 1
  },
  
  // ID33: Show interest only - NO SLOTS (handled separately)
  
  // ID34: Every day at 16:15, 16:25 or 16:30
  {
    id: 34,
    name: 'Experience 34',
    times: ['16:15:00', '16:25:00', '16:30:00'],
    durationMinutes: 60,
    minParticipants: 1
  },
  
  // ID35: Every day at 14:30pm
  {
    id: 35,
    name: 'Experience 35',
    times: ['14:30:00'],
    durationMinutes: 120,
    minParticipants: 1
  },
  
  // ID36: Every day from 11am to 19pm in 30 minutes slots
  {
    id: 36,
    name: 'Experience 36',
    times: generateIntervalTimes(11, 0, 19, 0, 30),
    durationMinutes: 30,
    minParticipants: 1
  },
  
  // ID37: Every day from 12h to 23h - flexible (we'll do hourly slots)
  {
    id: 37,
    name: 'Experience 37',
    times: generateIntervalTimes(12, 0, 23, 0, 60),
    durationMinutes: 60,
    minParticipants: 1
  },
  
  // ID38: Show interest only - NO SLOTS
  
  // ID39: Every day 11am and 14pm
  {
    id: 39,
    name: 'Experience 39',
    times: ['11:00:00', '14:00:00'],
    durationMinutes: 120,
    minParticipants: 1
  },
  
  // ID40: Show interest only - NO SLOTS
  
  // ============================================
  // EXISTING EXPERIENCES - Extend to March 2026
  // ============================================
  
  // ID1-ID20 (existing experiences that need extended slots)
  {
    id: 1, // LX4Tours - Quad Bikes
    name: 'LX4Tours Quad Bikes',
    times: ['09:00:00', '14:00:00'],
    durationMinutes: 180,
    minParticipants: 1
  },
  {
    id: 2, // Sunset E-Bike Tour
    name: 'Sunset E-Bike Tour',
    times: ['16:00:00'],
    durationMinutes: 180,
    minParticipants: 1
  },
  {
    id: 3, // Secret Food Tour
    name: 'Secret Food Tour',
    times: ['10:00:00', '17:00:00'],
    durationMinutes: 240,
    minParticipants: 1
  },
  {
    id: 4, // Sailing Experience
    name: 'Sailing Experience',
    times: ['10:00:00', '15:00:00'],
    durationMinutes: 180,
    minParticipants: 1
  },
  {
    id: 5, // Surf Lesson
    name: 'Surf Lesson',
    times: ['09:00:00', '14:00:00'],
    durationMinutes: 120,
    minParticipants: 1
  },
  {
    id: 6, // Wine Tasting
    name: 'Wine Tasting',
    times: ['11:00:00', '16:00:00'],
    durationMinutes: 180,
    minParticipants: 1
  },
  {
    id: 7, // Street Art Walk
    name: 'Street Art Walk',
    times: ['10:00:00', '15:00:00'],
    durationMinutes: 150,
    minParticipants: 1
  },
  {
    id: 8, // Kayak Adventure
    name: 'Kayak Adventure',
    times: ['09:30:00', '14:30:00'],
    durationMinutes: 180,
    minParticipants: 1
  },
  {
    id: 9, // Cooking Class
    name: 'Cooking Class',
    times: ['10:00:00', '16:00:00'],
    durationMinutes: 240,
    minParticipants: 1
  },
  {
    id: 10, // Horses by the Beach
    name: 'Horses by the Beach',
    times: ['09:30:00', '14:30:00'],
    durationMinutes: 90,
    minParticipants: 1
  },
  {
    id: 11, // Azulejos Design
    name: 'Azulejos Design',
    times: ['10:00:00', '14:00:00'],
    durationMinutes: 120,
    minParticipants: 1
  },
  {
    id: 12, // Photography Walk
    name: 'Photography Walk',
    times: ['08:00:00', '16:00:00'],
    durationMinutes: 180,
    minParticipants: 1
  },
  {
    id: 13, // Souldreamers
    name: 'Souldreamers',
    times: ['15:15:00'],
    durationMinutes: 120,
    minParticipants: 1
  },
  {
    id: 14, // Fado Night
    name: 'Fado Night',
    times: ['20:00:00'],
    durationMinutes: 180,
    minParticipants: 1
  },
  {
    id: 15, // Rodas ao Vento
    name: 'Rodas ao Vento',
    times: ['11:00:00'],
    durationMinutes: 60,
    minParticipants: 1
  },
  {
    id: 16, // Tuk Tuk Tour
    name: 'Tuk Tuk Tour',
    times: ['10:00:00', '14:00:00', '17:00:00'],
    durationMinutes: 120,
    minParticipants: 1
  },
  {
    id: 17, // Rodas ao Vento Buggy
    name: 'Rodas ao Vento Buggy',
    times: ['11:00:00'],
    durationMinutes: 60,
    minParticipants: 1
  },
  {
    id: 18, // Helicopter Tour
    name: 'Helicopter Tour',
    times: ['10:00:00', '14:00:00'],
    durationMinutes: 30,
    minParticipants: 1
  },
  {
    id: 19, // Hot Air Balloon
    name: 'Hot Air Balloon',
    times: ['06:00:00'],
    durationMinutes: 180,
    minParticipants: 1
  },
  {
    id: 20, // Dolphin Watching
    name: 'Dolphin Watching',
    times: ['09:00:00', '14:00:00'],
    durationMinutes: 180,
    minParticipants: 1
  },
];

async function createSlots() {
  console.log('🚀 Starting to create availability slots...');
  console.log(`📅 Date range: ${formatDate(START_DATE)} to ${formatDate(END_DATE)}`);
  
  let totalCreated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const exp of EXPERIENCES) {
    console.log(`\n📌 Processing Experience ID ${exp.id}: ${exp.name}`);
    
    let expCreated = 0;
    let expSkipped = 0;
    
    const currentDate = new Date(START_DATE);
    
    while (currentDate <= END_DATE) {
      // Skip blackout dates
      if (isBlackoutDate(currentDate)) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
      
      const dayOfWeek = currentDate.getDay();
      const dateStr = formatDate(currentDate);
      
      // Determine which times to use for this day
      let timesToUse = [];
      
      if (exp.customSchedule) {
        // Custom schedule per day of week
        if (exp.customSchedule[dayOfWeek]) {
          timesToUse = exp.customSchedule[dayOfWeek];
        }
      } else if (exp.includeDays) {
        // Only include specific days
        if (exp.includeDays.includes(dayOfWeek)) {
          timesToUse = exp.times;
        }
      } else if (exp.excludeDays) {
        // Exclude specific days
        if (!exp.excludeDays.includes(dayOfWeek)) {
          timesToUse = exp.times;
        }
      } else {
        // Every day
        timesToUse = exp.times;
      }
      
      // Create slots for each time
      for (const startTime of timesToUse) {
        const endTime = addMinutesToTime(startTime, exp.durationMinutes);
        
        // Check if slot already exists
        const { data: existing } = await supabase
          .from('availability_slots')
          .select('id')
          .eq('experience_id', exp.id)
          .eq('date', dateStr)
          .eq('start_time', startTime)
          .single();
        
        if (existing) {
          expSkipped++;
          continue;
        }
        
        // Create the slot
        const { error } = await supabase
          .from('availability_slots')
          .insert({
            experience_id: exp.id,
            date: dateStr,
            start_time: startTime,
            end_time: endTime,
            max_participants: DEFAULT_SPOTS,
            booked_participants: 0,
            is_available: true
          });
        
        if (error) {
          console.error(`  ❌ Error creating slot for ${dateStr} ${startTime}:`, error.message);
          totalErrors++;
        } else {
          expCreated++;
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`  ✅ Created: ${expCreated} | Skipped (existing): ${expSkipped}`);
    totalCreated += expCreated;
    totalSkipped += expSkipped;
  }
  
  console.log('\n========================================');
  console.log(`🎉 DONE!`);
  console.log(`   Total created: ${totalCreated}`);
  console.log(`   Total skipped: ${totalSkipped}`);
  console.log(`   Total errors: ${totalErrors}`);
  console.log('========================================');
}

createSlots().catch(console.error);
