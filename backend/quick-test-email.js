require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

console.log('API Key found:', process.env.RESEND_API_KEY ? 'YES' : 'NO');
console.log('Key starts with:', process.env.RESEND_API_KEY?.substring(0, 10));

async function test() {
  try {
    const result = await resend.emails.send({
      from: 'Bored Tourist <bookings@boredtourist.com>',
      to: 'francisalbu@gmail.com',
      subject: 'TEST - Booking Confirmation Works!',
      html: '<h1>Test Email</h1><p>If you received this, the email system is working!</p>'
    });
    
    console.log('SUCCESS:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('ERROR:', error.message);
    console.log('Full error:', JSON.stringify(error, null, 2));
  }
}

test();
