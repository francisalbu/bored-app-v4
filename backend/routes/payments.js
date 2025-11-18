/**
 * Payment Routes
 * Handles Stripe payment intents for booking payments
 */

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * POST /api/payments/create-intent
 * Create a payment intent for a booking
 */
router.post('/create-intent', async (req, res) => {
  try {
    const { amount } = req.body;

    console.log('💰 [PAYMENT] Creating payment intent for amount:', amount);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'eur',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('✅ [PAYMENT] Payment intent created:', paymentIntent.id);

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('❌ [PAYMENT] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/payments/confirm
 * Confirm a payment was successful
 * Body: { paymentIntentId, bookingId }
 * NOTE: Temporarily without auth for testing - ADD AUTH BACK IN PRODUCTION!
 */
router.post('/confirm', async (req, res) => {
  try {
    const { paymentIntentId, bookingId } = req.body;

    if (!paymentIntentId || !bookingId) {
      return res.status(400).json({
        success: false,
        message: 'paymentIntentId and bookingId are required',
      });
    }

    // Verify payment intent status with Stripe
    const paymentStatus = await stripeService.getPaymentIntent(paymentIntentId);

    if (paymentStatus.status === 'succeeded') {
      // Update booking as paid
      await db.run(
        `UPDATE bookings 
         SET payment_status = 'paid',
             status = 'confirmed',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND payment_intent_id = ?`,
        [bookingId, paymentIntentId]
      );

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        paymentStatus: paymentStatus.status,
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment not completed',
        paymentStatus: paymentStatus.status,
      });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: error.message,
    });
  }
});

// REFUND ROUTE - REMOVED FOR NOW (needs authentication middleware)

/**
 * POST /api/payments/webhook
 * Stripe webhook endpoint
 * Handles events from Stripe (payment succeeded, failed, etc.)
 * Note: This route needs raw body, so it should be registered before express.json() middleware
 */
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const event = stripeService.verifyWebhookSignature(req.body, signature);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const bookingId = paymentIntent.metadata.booking_id;
        
        if (bookingId) {
          await db.run(
            `UPDATE bookings 
             SET payment_status = 'paid',
                 status = 'confirmed',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND payment_intent_id = ?`,
            [bookingId, paymentIntent.id]
          );
          console.log(`✅ Payment succeeded for booking ${bookingId}`);
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        const failedBookingId = failedPayment.metadata.booking_id;
        
        if (failedBookingId) {
          await db.run(
            `UPDATE bookings 
             SET payment_status = 'failed',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND payment_intent_id = ?`,
            [failedBookingId, failedPayment.id]
          );
          console.log(`❌ Payment failed for booking ${failedBookingId}`);
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({
      success: false,
      message: 'Webhook processing failed',
      error: error.message,
    });
  }
});

// STATUS ROUTE - REMOVED FOR NOW (needs authentication middleware)

module.exports = router;
