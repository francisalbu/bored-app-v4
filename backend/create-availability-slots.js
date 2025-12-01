const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://hnivuisqktlrusyqywaz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXZ1aXNxa3RscnVzeXF5d2F6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzE3MTY3OCwiZXhwIjoyMDc4NzQ3Njc4fQ.gGLIYOJgNvm_LnsOm87LMCMAd0qgoJt1owpDY-DrjNw'
);

const DEFAULT_SPOTS = 5;
const START_DATE = new Date('2024-12-01');
const DEFAULT_END_DATE = new Date('2026-02-28');

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

const EXPERIENCES = [
  {
    id: 15, // Rodas ao Vento
    name: 'Rodas ao Vento (Buggy)',
    times: ['11:00'],
    durationMinutes: 60,
    endDate: DEFAULT_END_DATE
  },
  {
    id: 11, // Azulejos Design
    name: 'Azulejos Design',
    times: ['10:00', '14:00'],
    durationMinutes: 120,
    endDate: DEFAULT_END_DATE
  },
  {
    id: 10, // Horses by the Beach
    name: 'Horses by the Beach',
    times: ['09:30', '14:30'],
    durationMinutes: 90,
    endDate: DEFAULT_END_DATE
  },
  {
    id: 13, // Souldreamers
    name: 'Souldreamers',
    times: ['15:15'],
    durationMinutes: 120,
    endDate: new Date('2026-12-22')
  },
  {
    id: 12, // Natelier
    name: 'Natelier',
    times: ['10:00'],
    durationMinutes: 120,
    endDate: DEFAULT_END_DATE
  },
  {
    id: 9, // Dolphin Watching
    name: 'Dolphin Watching',
    times: ['09:30', '14:00'],
    durationMinutes: 180,
    endDate: DEFAULT_END_DATE
  },
  {
    id: 14, // Spinach Tours
    name: 'Spinach Tours',
    times: generateIntervalTimes('10:00', '16:00', 30),
    durationMinutes: 60,
    endDate: DEFAULT_END_DATE
  }
];

async function run() {
  console.log('\n🚀 Iniciando criação de slots no Supabase...\n');
  
  let totalSlotsGenerated = 0;

  for (const exp of EXPERIENCES) {
    console.log(`📍 ${exp.name} (ID: ${exp.id})`);
    console.log(`   Horários: ${exp.times.length > 5 ? exp.times.length + ' slots/dia' : exp.times.join(', ')}`);
    console.log(`   Até: ${formatDate(exp.endDate)}`);
    
    const slotsToInsert = [];
    let currentDate = new Date(START_DATE);

    while (currentDate <= exp.endDate) {
      if (!isBlackoutDate(currentDate)) {
        for (const time of exp.times) {
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
