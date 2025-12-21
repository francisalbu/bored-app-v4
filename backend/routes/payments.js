/**
 * Payment Routes
 * Handles Stripe payment intents for booking payments
 */

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { from } = require('../config/database');
const stripeService = require('../services/stripeService');
const emailService = require('../services/emailService');

/**
 * POST /api/payments/create-intent
 * Create a payment intent for a booking
 */
router.post('/create-intent', async (req, res) => {
  try {
    const { amount } = req.body;

    console.log('💰 [PAYMENT] Creating payment intent for amount:', amount);

    // Validate Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ [PAYMENT] STRIPE_SECRET_KEY not configured!');
      return res.status(500).json({
        success: false,
        error: 'Stripe is not configured on the server'
      });
    }

    // Validate amount
    if (!amount || amount <= 0) {
      console.error('❌ [PAYMENT] Invalid amount:', amount);
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    console.log('🔵 [PAYMENT] Stripe key present:', process.env.STRIPE_SECRET_KEY?.substring(0, 10) + '...');

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
    console.error('❌ [PAYMENT] Error stack:', error.stack);
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

    console.log('🔵 [CONFIRM] Received confirmation request:', { paymentIntentId, bookingId });

    if (!paymentIntentId || !bookingId) {
      return res.status(400).json({
        success: false,
        message: 'paymentIntentId and bookingId are required',
      });
    }

    // Verify payment intent status with Stripe
    console.log('🔵 [CONFIRM] Verifying payment with Stripe...');
    const paymentStatus = await stripeService.getPaymentIntent(paymentIntentId);
    console.log('🔵 [CONFIRM] Stripe payment status:', paymentStatus.status);

    if (paymentStatus.status === 'succeeded') {
      // Update booking as paid using Supabase (search by bookingId only, not payment_intent_id)
      console.log('🔵 [CONFIRM] Updating booking', bookingId, 'to paid...');
      const { data: updatedBooking, error: updateError } = await from('bookings')
        .update({
          payment_status: 'paid',
          status: 'confirmed',
          payment_intent_id: paymentIntentId, // Save the payment intent ID now
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ [CONFIRM] Error updating booking:', updateError);
        console.error('❌ Error updating booking:', updateError);
      } else {
        console.log('✅ Booking status updated to confirmed/paid');
      }

      // Fetch complete booking data for email
      console.log('📧 Fetching booking data for email...');
      const { data: booking, error: fetchError } = await from('bookings')
        .select(`
          *,
          experiences(title, location, duration, image_url),
          availability_slots(date, start_time, end_time)
        `)
        .eq('id', bookingId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching booking for email:', fetchError);
      } else {
        console.log('✅ Booking data fetched successfully');
        console.log('📧 Customer email:', booking?.customer_email);
        console.log('📧 Booking reference:', booking?.booking_reference);
      }

      // Transform for email service
      const bookingForEmail = booking ? {
        ...booking,
        experience_title: booking.experiences?.title,
        experience_location: booking.experiences?.location,
        experience_duration: booking.experiences?.duration,
        experience_image: booking.experiences?.image_url,
        slot_date: booking.availability_slots?.date,
        slot_start_time: booking.availability_slots?.start_time,
        slot_end_time: booking.availability_slots?.end_time,
      } : null;

      // Send confirmation email - THIS IS CRITICAL
      let emailSent = false;
      if (bookingForEmail && bookingForEmail.customer_email) {
        console.log('📧 ====== SENDING CONFIRMATION EMAIL ======');
        console.log('📧 To:', bookingForEmail.customer_email);
        console.log('📧 Experience:', bookingForEmail.experience_title);
        console.log('📧 Reference:', bookingForEmail.booking_reference);
        
        const emailResult = await emailService.sendBookingConfirmation(bookingForEmail);
        emailSent = emailResult.success;
        
        if (emailResult.success) {
          console.log('✅ ====== EMAIL SENT SUCCESSFULLY ======');
        } else {
          console.error('❌ ====== EMAIL FAILED ======');
          console.error('❌ Reason:', emailResult.message);
        }
      } else {
        console.error('❌ Cannot send email - missing booking data or customer email');
        console.error('❌ bookingForEmail:', JSON.stringify(bookingForEmail, null, 2));
      }

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        paymentStatus: paymentStatus.status,
        emailSent: emailSent,
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
          // Update booking using Supabase
          await from('bookings')
            .update({
              payment_status: 'paid',
              status: 'confirmed',
              updated_at: new Date().toISOString()
            })
            .eq('id', bookingId)
            .eq('payment_intent_id', paymentIntent.id);
          
          console.log(`✅ Payment succeeded for booking ${bookingId}`);

          // Send confirmation email
          try {
            const { data: booking } = await from('bookings')
              .select(`
                *,
                experiences(title, location, duration, image_url),
                availability_slots(date, start_time, end_time)
              `)
              .eq('id', bookingId)
              .single();
            
            if (booking && booking.customer_email) {
              const bookingForEmail = {
                ...booking,
                experience_title: booking.experiences?.title,
                experience_location: booking.experiences?.location,
                experience_duration: booking.experiences?.duration,
                experience_image: booking.experiences?.image_url,
                slot_date: booking.availability_slots?.date,
                slot_start_time: booking.availability_slots?.start_time,
                slot_end_time: booking.availability_slots?.end_time,
              };
              await emailService.sendBookingConfirmation(bookingForEmail);
              console.log(`📧 Confirmation email sent for booking ${bookingId}`);
            }
          } catch (emailError) {
            console.error('⚠️ Failed to send confirmation email:', emailError.message);
          }
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        const failedBookingId = failedPayment.metadata.booking_id;
        
        if (failedBookingId) {
          // Update booking using Supabase
          await from('bookings')
            .update({
              payment_status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', failedBookingId)
            .eq('payment_intent_id', failedPayment.id);
          
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
