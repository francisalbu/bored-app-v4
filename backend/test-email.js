/**
 * Test script to verify email sending works
 * Run with: node test-email.js
 */

require('dotenv').config();

const emailService = require('./services/emailService');

// Test booking data
const testBooking = {
  id: 999,
  booking_reference: 'TEST-EMAIL-123',
  customer_name: 'Francisco Albuquerque',
  customer_email: 'francisalbu@gmail.com', // CHANGE TO YOUR EMAIL
  customer_phone: '+351967407859',
  participants: 2,
  total_amount: 65.00,
  currency: '€',
  experience_title: 'Atlantic Coast Quad Bike Tour',
  experience_location: 'Sintra, Portugal',
  experience_duration: '3 hours',
  experience_image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
  slot_date: '2025-12-25',
  slot_start_time: '14:00:00',
  slot_end_time: '17:00:00',
};

async function testEmail() {
  console.log('🧪 ====== EMAIL TEST STARTING ======');
  console.log('');
  console.log('📧 Checking RESEND_API_KEY...');
  
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is NOT configured!');
    console.error('');
    console.error('Please create a .env file in the backend folder with:');
    console.error('RESEND_API_KEY=re_your_api_key_here');
    console.error('');
    console.error('Get your API key from: https://resend.com/api-keys');
    process.exit(1);
  }
  
  console.log('✅ RESEND_API_KEY found:', process.env.RESEND_API_KEY.substring(0, 10) + '...');
  console.log('');
  console.log('📧 Sending test email to:', testBooking.customer_email);
  console.log('');
  
  try {
    const result = await emailService.sendBookingConfirmation(testBooking);
    
    console.log('');
    console.log('====== RESULT ======');
    console.log(JSON.stringify(result, null, 2));
    console.log('');
    
    if (result.success) {
      console.log('✅ ====== EMAIL SENT SUCCESSFULLY! ======');
      console.log('✅ Check your inbox at:', testBooking.customer_email);
      console.log('✅ Email ID:', result.emailId);
    } else {
      console.error('❌ ====== EMAIL FAILED ======');
      console.error('❌ Error:', result.message);
    }
  } catch (error) {
    console.error('❌ ====== EXCEPTION ======');
    console.error(error);
  }
  
  console.log('');
  console.log('🧪 ====== EMAIL TEST COMPLETE ======');
}

testEmail();
