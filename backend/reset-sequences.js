/**
 * Reset PostgreSQL Sequences in Supabase
 * Fixes "duplicate key value" errors after data migration
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetSequences() {
  console.log('\n🔧 Resetting PostgreSQL Sequences...\n');
  console.log('═══════════════════════════════════════════════\n');
  
  const sequences = [
    'users_id_seq',
    'bookings_id_seq',
    'experiences_id_seq',
    'availability_slots_id_seq',
    'reviews_id_seq',
    'operators_id_seq'
  ];
  
  for (const seq of sequences) {
    const tableName = seq.replace('_id_seq', '');
    
    try {
      // Get max ID from table
      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .order('id', { ascending: false })
        .limit(1);
      
      if (error) {
        console.log(`❌ ${tableName}: Error -`, error.message);
        continue;
      }
      
      const maxId = data && data.length > 0 ? data[0].id : 0;
      const nextValue = maxId + 1;
      
      // Reset sequence using raw SQL
      const { error: sqlError } = await supabase.rpc('exec_sql', {
        sql: `SELECT setval('${seq}', ${nextValue});`
      });
      
      if (sqlError) {
        // RPC might not exist, show manual SQL instead
        console.log(`⚠️  ${tableName}: Manual SQL needed`);
        console.log(`   Run: SELECT setval('${seq}', ${nextValue});\n`);
      } else {
        console.log(`✅ ${tableName}: Sequence set to ${nextValue} (max ID: ${maxId})`);
      }
      
    } catch (err) {
      console.log(`❌ ${tableName}: ${err.message}`);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════');
  console.log('⚠️  If you see errors above, run the SQL manually:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/hnivuisqktlrusyqywaz/sql');
  console.log('2. Copy and paste the SQL from: backend/reset-sequences.sql');
  console.log('3. Click "Run"\n');
  console.log('OR run each command shown above manually.');
  console.log('═══════════════════════════════════════════════\n');
}

resetSequences().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
