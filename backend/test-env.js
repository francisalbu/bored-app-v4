require('dotenv').config();

console.log('Testing .env loading...');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET (length: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ')' : 'NOT SET');
console.log('PORT:', process.env.PORT);
console.log('DB_PATH:', process.env.DB_PATH);
