/**
 * Script to delete ghost users from Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hnivuisqktlrusyqywaz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXZ1aXNxa3RscnVzeXF5d2F6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzE3MTY3OCwiZXhwIjoyMDc4NzQ3Njc4fQ.w1j2_MJV0hxFqvQE7-eIcnxFOvW0WGG7aEzC-8G_dz4'; // Preciso do SERVICE ROLE KEY

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteUserByEmail(email) {
  try {
    console.log(`🔍 Searching for user: ${email}`);
    
    // List all users (admin only)
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.log(`⚠️ User not found: ${email}`);
      return;
    }

    console.log(`✅ Found user: ${user.id} - ${user.email}`);
    
    // Delete user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error('❌ Error deleting user:', deleteError);
      return;
    }

    console.log(`✅ User deleted: ${email}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function main() {
  console.log('🧹 Cleaning up ghost users from Supabase...\n');
  
  // List of emails to delete
  const emailsToDelete = [
    'olecas@top.pt',
    'francisalbu@top.pt',
    'francisalbu@gmail.com'
  ];

  for (const email of emailsToDelete) {
    await deleteUserByEmail(email);
    console.log('');
  }

  console.log('✅ Done!');
  process.exit(0);
}

main();
