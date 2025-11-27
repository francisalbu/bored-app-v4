const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBookings() {
  try {
    console.log('🔍 Verificando bookings para francisalbu@gmail.com...\n');

    // First, get the user ID from auth.users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'francisalbu@gmail.com');

    if (usersError) {
      console.error('❌ Erro ao buscar utilizador:', usersError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('❌ Utilizador não encontrado com email: francisalbu@gmail.com');
      console.log('\n📋 Vamos ver todos os utilizadores:');
      
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, email, name')
        .limit(10);
      
      console.log(allUsers);
      return;
    }

    const user = users[0];
    console.log('✅ Utilizador encontrado:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.name);
    console.log('');

    // Now get bookings for this user
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        experiences (
          title,
          image_url,
          video_url,
          location,
          duration,
          price
        ),
        availability_slots (
          date,
          start_time,
          end_time
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.error('❌ Erro ao buscar bookings:', bookingsError);
      return;
    }

    console.log(`📦 Encontrados ${bookings?.length || 0} bookings:\n`);
    
    if (bookings && bookings.length > 0) {
      bookings.forEach((booking, index) => {
        console.log(`${index + 1}. Booking #${booking.id}`);
        console.log(`   Ref: ${booking.booking_reference}`);
        console.log(`   Experiência: ${booking.experiences?.title}`);
        console.log(`   Data: ${booking.availability_slots?.date}`);
        console.log(`   Hora: ${booking.availability_slots?.start_time}`);
        console.log(`   Status: ${booking.status}`);
        console.log(`   Criado: ${booking.created_at}`);
        console.log('');
      });
    } else {
      console.log('⚠️ Nenhum booking encontrado!');
      console.log('\n🔍 Vamos verificar se existem bookings na tabela:');
      
      const { data: allBookings, error: allError } = await supabase
        .from('bookings')
        .select('id, user_id, booking_reference, status')
        .limit(10);
      
      if (allError) {
        console.error('❌ Erro:', allError);
      } else {
        console.log(`\n📊 Total de bookings na base de dados: ${allBookings?.length || 0}`);
        if (allBookings && allBookings.length > 0) {
          console.log('\nPrimeiros 10 bookings:');
          allBookings.forEach(b => {
            console.log(`   - ID: ${b.id}, User: ${b.user_id}, Ref: ${b.booking_reference}, Status: ${b.status}`);
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkBookings();
