const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://hnivuisqktlrusyqywaz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXZ1aXNxa3RscnVzeXF5d2F6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzE3MTY3OCwiZXhwIjoyMDc4NzQ3Njc4fQ.gGLIYOJgNvm_LnsOm87LMCMAd0qgoJt1owpDY-DrjNw'
);

const DEFAULT_SPOTS = 5;
const START_DATE = new Date('2024-12-01');
const END_DATE = new Date('2026-02-28');

const BLACKOUT_DATES = [
  { month: 11, day: 24 }, // 24 Dez
  { month: 11, day: 25 }, // 25 Dez
  { month: 11, day: 31 }, // 31 Dez
  { month: 0, day: 1 }    // 01 Jan
];

function generateIntervalTimes(startStr, endStr, intervalMinutes) {
  const times = [];
  let [currH, currM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);
  
  while (currH < endH || (currH === endH && currM <= endM)) {
    times.push(`${String(currH).padStart(2, '0')}:${String(currM).padStart(2, '0')}`);
    currM += intervalMinutes;
    if (currM >= 60) {
      currH += Math.floor(currM / 60);
      currM = currM % 60;
    }
  }
  return times;
}

function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m + minutes, 0);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function isBlackoutDate(date) {
  const m = date.getMonth();
  const d = date.getDate();
  return BLACKOUT_DATES.some(bd => bd.month === m && bd.day === d);
}

function getDayOfWeek(date) {
  return date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
}

// Configuração das Experiências
const EXPERIENCES = [
  {
    id: 6, // Traditional Portuguese Cooking Class
    name: 'Traditional Portuguese Cooking Class',
    durationMinutes: 180, // 3 horas (estimado)
    getTimesForDay: (dayOfWeek) => {
      // 1=Monday, 3=Wednesday, 5=Friday: 10:30, 11:00
      // 2=Tuesday, 4=Thursday: 17:30, 18:00
      // 0=Sunday, 6=Saturday: no slots (doesn't work weekends)
      if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
        return ['10:30', '11:00'];
      } else if (dayOfWeek === 2 || dayOfWeek === 4) {
        return ['17:30', '18:00'];
      }
      return []; // Weekends
    }
  },
  {
    id: 15, // Dream Fly
    name: 'Dream Fly',
    durationMinutes: 120, // 2 horas (estimado)
    getTimesForDay: () => ['13:30', '16:00', '18:30'] // Every day
  },
  {
    id: 13, // Epic Day - Famingo Experiences
    name: 'Epic Day - Famingo Experiences',
    durationMinutes: 480, // 8 horas (full day)
    getTimesForDay: () => ['09:30'] // Every day
  },
  {
    id: 8, // Sintra Treasure Hunt
    name: 'Sintra Treasure Hunt',
    durationMinutes: 90, // 1.5 horas (estimado)
    getTimesForDay: () => generateIntervalTimes('10:00', '16:30', 30), // Every 30 min
    minParticipants: 2
  },
  {
    id: 18, // Duckdive
    name: 'Duckdive',
    durationMinutes: 120, // 2 horas (estimado)
    getTimesForDay: (dayOfWeek) => {
      if (dayOfWeek === 1) return []; // No Mondays
      return ['11:00', '13:00', '15:00'];
    }
  },
  {
    id: 14, // One Day Pilot
    name: 'One Day Pilot',
    durationMinutes: 90, // 1.5 horas (estimado)
    getTimesForDay: (dayOfWeek) => {
      if (dayOfWeek === 1) return []; // No Mondays
      return ['09:00', '10:30', '14:00', '15:30', '17:00'];
    }
  },
  {
    id: 20, // Paragliding
    name: 'Paragliding',
    durationMinutes: 60, // 1 hora (estimado)
    getTimesForDay: () => generateIntervalTimes('10:00', '16:00', 30) // Every 30 min
  }
];

async function run() {
  console.log('\n🚀 Criando slots para experiências adicionais...\n');
  
  let totalSlotsGenerated = 0;

  for (const exp of EXPERIENCES) {
    console.log(`📍 ${exp.name} (ID: ${exp.id})`);
    
    const slotsToInsert = [];
    let currentDate = new Date(START_DATE);

    while (currentDate <= END_DATE) {
      if (!isBlackoutDate(currentDate)) {
        const dayOfWeek = getDayOfWeek(currentDate);
        const times = exp.getTimesForDay(dayOfWeek);
        
        for (const time of times) {
          slotsToInsert.push({
            experience_id: exp.id,
            date: formatDate(currentDate),
            start_time: time + ':00',
            end_time: addMinutes(time, exp.durationMinutes),
            max_participants: DEFAULT_SPOTS,
            booked_participants: 0,
            is_available: true
          });
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`   💾 Inserindo ${slotsToInsert.length} slots...`);
    
    const BATCH_SIZE = 500;
    for (let i = 0; i < slotsToInsert.length; i += BATCH_SIZE) {
      const batch = slotsToInsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('availability_slots').insert(batch);
      
      if (error) {
        console.error(`   ❌ Erro no batch ${i}: ${error.message}`);
      } else {
        process.stdout.write('.');
      }
    }

    console.log('\n   ✅ Concluído!\n');
    totalSlotsGenerated += slotsToInsert.length;
  }

  console.log(`\n✨ PROCESSO FINALIZADO!`);
  console.log(`📊 Total de slots criados: ${totalSlotsGenerated}`);
  console.log(`🎯 5 spots por slot`);
  console.log(`🚫 Excluindo: 24-25 Dez e 31 Dez-1 Jan\n`);
}

run().catch(console.error);
