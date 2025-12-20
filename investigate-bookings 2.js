const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserAndBookings() {
  try {
    console.log('🔍 Investigando situação dos bookings...\n');

    // Check all users
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, email, name')
      .order('id');

    console.log('📋 Utilizadores na base de dados:');
    allUsers.forEach(u => {
      console.log(`   - ID: ${u.id}, Email: ${u.email}, Nome: ${u.name}`);
    });
    console.log('');

    // Check bookings with user details
    const { data: bookingsWithUser } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_reference,
        user_id,
        customer_email,
        status,
        created_at,
        experiences (title)
      `)
      .order('id');

    console.log('📦 Bookings na base de dados:');
    bookingsWithUser.forEach(b => {
      console.log(`   - Booking #${b.id}: user_id=${b.user_id}, email=${b.customer_email}, exp="${b.experiences?.title}"`);
    });
    console.log('');

    // Suggestion: Update bookings where customer_email matches
    console.log('💡 SUGESTÃO:');
    console.log('   Se esses bookings com user_id=null ou user_id=5 foram criados');
    console.log('   com o email francisalbu@gmail.com, podemos atualizá-los para');
    console.log('   user_id=116 (o teu ID atual no Supabase)');
    console.log('');
    console.log('   Bookings com customer_email=francisalbu@gmail.com:');
    
    const francisBookings = bookingsWithUser.filter(b => 
      b.customer_email?.includes('francisalbu') || 
      b.customer_email?.includes('erque')
    );
    
    if (francisBookings.length > 0) {
      francisBookings.forEach(b => {
        console.log(`      - Booking #${b.id}: ${b.customer_email}`);
      });
    } else {
      console.log('      (Nenhum encontrado)');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

checkUserAndBookings();
