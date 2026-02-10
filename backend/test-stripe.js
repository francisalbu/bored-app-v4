/**
 * Test Stripe Payment Intent Creation
 * Verifies that Stripe test keys are working correctly
 */

require('dotenv').config();
const stripeService = require('./services/stripeService');

console.log('\n🧪 Testing Stripe Payment Intent Creation\n');
console.log('═══════════════════════════════════════════════\n');

// Check environment
const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('❌ STRIPE_SECRET_KEY not found in .env');
  process.exit(1);
}

const isTestMode = key.startsWith('sk_test_');
const isLiveMode = key.startsWith('sk_live_');

console.log(`🔑 Stripe Key: ${key.substring(0, 15)}...`);
console.log(`🧪 Test Mode: ${isTestMode ? '✅ YES' : '❌ NO'}`);
console.log(`💰 Live Mode: ${isLiveMode ? '⚠️  YES' : '✅ NO'}`);
console.log('\n');

if (!isTestMode) {
  console.warn('⚠️  WARNING: Not using test keys! Real money could be charged!');
  console.log('   Use test keys starting with sk_test_...\n');
}

// Test payment creation
async function testPayment() {
  try {
    console.log('Creating test payment intent...\n');
    
    const result = await stripeService.createPaymentIntent(
      50.00, // €50.00
      'eur',
      {
        booking_id: 'test_123',
        test: true,
        description: 'Test booking from automated test'
      },
      {
        customer_email: 'test@example.com',
        description: 'Test Payment - Lisbon City Tour'
      }
    );

    console.log('✅ Payment Intent Created Successfully!\n');
    console.log('Details:');
    console.log(`  Payment Intent ID: ${result.paymentIntentId}`);
    console.log(`  Client Secret: ${result.clientSecret.substring(0, 30)}...`);
    console.log(`  Amount: €50.00`);
    console.log(`  Currency: EUR`);
    console.log('\nSupported Payment Methods:');
    console.log(`  💳 Card: ${result.paymentMethods.card ? '✅' : '❌'}`);
    console.log(`  🍎 Apple Pay: ${result.paymentMethods.applePay ? '✅' : '❌'}`);
    console.log(`  🤖 Google Pay: ${result.paymentMethods.googlePay ? '✅' : '❌'}`);
    console.log(`  🔗 Stripe Link: ${result.paymentMethods.link ? '✅' : '❌'}`);
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('✅ Stripe is working correctly!');
    console.log('═══════════════════════════════════════════════\n');
    
    if (isTestMode) {
      console.log('💳 Test this payment with test cards:\n');
      console.log('   SUCCESS: 4242 4242 4242 4242');
      console.log('   DECLINE: 4000 0000 0000 9995');
      console.log('   3D AUTH: 4000 0025 0000 3155\n');
      console.log('   More cards: https://docs.stripe.com/testing\n');
    }

    console.log('🎉 You can now test payments in your app!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error creating payment intent:\n');
    console.error(`   ${error.message}\n`);
    
    if (error.message.includes('Invalid API Key')) {
      console.log('💡 Troubleshooting:');
      console.log('   1. Check your STRIPE_SECRET_KEY in backend/.env');
      console.log('   2. Make sure it starts with sk_test_ (for testing)');
      console.log('   3. Get keys from: https://dashboard.stripe.com/test/apikeys\n');
    }
    
    process.exit(1);
  }
}

testPayment();
