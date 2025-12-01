const path = require('path');
const { createClient } = require('@supabase/supabase-js');

console.log('🏁 Script iniciado...');

// Tenta carregar .env da raiz do projeto (um nível acima da pasta backend)
const envPath = path.resolve(__dirname, '../.env');
console.log(`🔍 Procurando arquivo .env em: ${envPath}`);

const dotenvResult = require('dotenv').config({ path: envPath });

if (dotenvResult.error) {
  console.log('⚠️  Não foi possível ler o .env da raiz. Tentando ler da pasta atual...');
  require('dotenv').config();
}

// Verificação de segurança
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n❌ ERRO CRÍTICO: Variáveis de ambiente não encontradas!');
  console.error('   Verifique se o arquivo .env existe na raiz do projeto.');
  console.error('   Esperado: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('✅ Variáveis de ambiente carregadas com sucesso.');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- CONFIGURAÇÃO ---

const DEFAULT_SPOTS = 5;
const START_DATE = new Date(); // Começa hoje
const DEFAULT_END_DATE = new Date('2026-02-28'); // Fim de Fev 2026

// Dias a excluir (Mês é 0-indexado: 0=Jan, 11=Dez)
const BLACKOUT_DATES = [
  { month: 11, day: 24 }, // 24 Dez
  { month: 11, day: 25 }, // 25 Dez
  { month: 11, day: 31 }, // 31 Dez
  { month: 0, day: 1 },   // 01 Jan
];

// Configuração das Experiências
const EXPERIENCES = [
  {
    id: 17,
    name: 'Rodas ao Vento (Buggy)',
    times: ['11:00'],
    durationMinutes: 60, // 1 hora
    endDate: DEFAULT_END_DATE
  },
  {
    id: 11,
    name: 'Azulejos Design',
    times: ['10:00', '14:00'],
    durationMinutes: 120, // 2 horas (estimado)
    endDate: DEFAULT_END_DATE
  },
  {
    id: 10,
    name: 'Horses by the Beach',
    times: ['09:30', '14:30'],
    durationMinutes: 90, // 1h30 (estimado)
    endDate: DEFAULT_END_DATE
  },
  {
    id: 9,
    name: 'Souldreamers',
    times: ['15:15'],
    durationMinutes: 120, // 2 horas (estimado)
    endDate: new Date('2026-12-22') // Data específica pedida
  },
  {
    id: 5,
    name: 'Natelier',
    times: ['10:00'],
    durationMinutes: 120, // 2 horas (estimado)
    endDate: DEFAULT_END_DATE
  },
  {
    id: 4,
    name: 'Dolphin Watching',
    times: ['09:30', '14:00'],
    durationMinutes: 180, // 3 horas (comum para golfinhos)
    endDate: DEFAULT_END_DATE
  },
  {
    id: 7,
    name: 'Spinach Tours',
    // Gera array: ['10:00', '10:30', ... '16:00']
    times: generateIntervalTimes('10:00', '16:00', 30),
    durationMinutes: 60, // 1 hora (estimado)
    endDate: DEFAULT_END_DATE
  }
];

// --- FUNÇÕES AUXILIARES ---

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

// --- SCRIPT PRINCIPAL ---

async function run() {
  console.log('\n🚀 Iniciando geração de slots para o MVP...\n');

  let totalSlotsGenerated = 0;

  for (const exp of EXPERIENCES) {
    console.log(`📍 Processando: ${exp.name} (ID: ${exp.id})`);
    console.log(`   Horários: ${exp.times.length > 5 ? exp.times.length + ' slots/dia' : exp.times.join(', ')}`);
    console.log(`   Até: ${formatDate(exp.endDate)}`);

    const slotsToInsert = [];
    let currentDate = new Date(START_DATE);

    while (currentDate <= exp.endDate) {
      // Pula datas bloqueadas (Natal/Ano Novo)
      if (!isBlackoutDate(currentDate)) {
        
        for (const time of exp.times) {
          slotsToInsert.push({
            experience_id: exp.id,
            date: formatDate(currentDate),
            start_time: time + ':00', // Formato HH:MM:SS
            end_time: addMinutes(time, exp.durationMinutes),
            max_participants: DEFAULT_SPOTS,
            booked_participants: 0,
            is_available: true
          });
        }
      }
      
      // Avança 1 dia
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Inserir em batches de 500 para não sobrecarregar o Supabase
    const BATCH_SIZE = 500;
    console.log(`   💾 Preparando para inserir ${slotsToInsert.length} slots...`);
    
    for (let i = 0; i < slotsToInsert.length; i += BATCH_SIZE) {
      const batch = slotsToInsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('availability_slots').insert(batch);
      
      if (error) {
        console.error(`   ❌ Erro no batch ${i}:`, error.message);
      } else {
        process.stdout.write('.'); // Barra de progresso simples
      }
    }
    
    console.log('\n   ✅ Concluído!\n');
    totalSlotsGenerated += slotsToInsert.length;
  }

  console.log(`✨ Processo finalizado! Total de slots criados: ${totalSlotsGenerated}`);
}

run().catch(console.error);