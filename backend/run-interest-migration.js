const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://hnivuisqktlrusyqywaz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXZ1aXNxa3RscnVzeXF5d2F6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzE3MTY3OCwiZXhwIjoyMDc4NzQ3Njc4fQ.gGLIYOJgNvm_LnsOm87LMCMAd0qgoJt1owpDY-DrjNw'
);

async function runMigration() {
  console.log('\n🚀 Running migration: Create experience_interests table...\n');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'migrations', 'create_experience_interests_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If rpc doesn't work, we'll need to execute it manually via Supabase dashboard
      console.log('⚠️  Please run this SQL manually in Supabase SQL Editor:\n');
      console.log('─'.repeat(80));
      console.log(sql);
      console.log('─'.repeat(80));
      console.log('\n📋 Instructions:');
      console.log('1. Go to https://supabase.com/dashboard/project/hnivuisqktlrusyqywaz/sql');
      console.log('2. Copy the SQL above');
      console.log('3. Paste it into the SQL Editor');
      console.log('4. Click "Run"\n');
      process.exit(0);
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 experience_interests table created\n');
    
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    process.exit(1);
  }
}

runMigration();
