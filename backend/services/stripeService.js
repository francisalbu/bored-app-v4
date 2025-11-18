/**
 * Stripe Payment Service
 * Handles all Stripe-related operations for booking payments
 */

// Initialize Stripe lazily to ensure env vars are loaded
let stripe = null;
function getStripe() {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not configured in .env file');
    }
    console.log('🔑 Initializing Stripe with key:', process.env.STRIPE_SECRET_KEY.substring(0, 12) + '...');
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

/**
 * Create a payment intent for a booking with support for multiple payment methods
 * Supports: Apple Pay, Google Pay, Cards, Revolut, and more
 * @param {number} amount - Amount in dollars (e.g., 50.00 = $50.00)
 * @param {string} currency - Currency code (e.g., 'eur', 'usd')
 * @param {object} metadata - Additional metadata (booking_id, user_id, etc.)
 * @param {object} options - Additional options (customer_email, description, etc.)
 * @returns {Promise<object>} Payment intent object with client_secret
 */
async function createPaymentIntent(amount, currency = 'eur', metadata = {}, options = {}) {
  try {
    const paymentIntentData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata,
      
      // Enable ALL automatic payment methods (cards, Apple Pay, Google Pay, etc.)
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'always', // Enables bank transfers, Revolut, etc.
      },
      
      // Optional: Add customer email for receipt
      ...(options.customer_email && { receipt_email: options.customer_email }),
      
      // Optional: Add description
      ...(options.description && { description: options.description }),
      
      // Setup for future payments (optional)
      ...(options.setup_future_usage && { setup_future_usage: options.setup_future_usage }),
    };

    const paymentIntent = await getStripe().paymentIntents.create(paymentIntentData);

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      // Return available payment methods
      paymentMethods: {
        card: true,
        applePay: true,
        googlePay: true,
        link: true, // Stripe Link (one-click payments)
      },
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new Error(`Failed to create payment intent: ${error.message}`);
  }
}

/**
 * Retrieve a payment intent by ID
 * @param {string} paymentIntentId - The Stripe payment intent ID
 * @returns {Promise<object>} Payment intent details
 */
async function getPaymentIntent(paymentIntentId) {
  try {
    const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
    return {
      success: true,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
    };
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    throw new Error(`Failed to retrieve payment intent: ${error.message}`);
  }
}

/**
 * Cancel a payment intent
 * @param {string} paymentIntentId - The Stripe payment intent ID
 * @returns {Promise<object>} Cancellation result
 */
async function cancelPaymentIntent(paymentIntentId) {
  try {
    const paymentIntent = await getStripe().paymentIntents.cancel(paymentIntentId);
    return {
      success: true,
      status: paymentIntent.status,
    };
  } catch (error) {
    console.error('Error canceling payment intent:', error);
    throw new Error(`Failed to cancel payment intent: ${error.message}`);
  }
}

/**
 * Create a refund for a successful payment
 * @param {string} paymentIntentId - The Stripe payment intent ID
 * @param {number} amount - Optional: amount to refund in dollars (defaults to full refund)
 * @returns {Promise<object>} Refund result
 */
async function createRefund(paymentIntentId, amount = null) {
  try {
    const refundData = { payment_intent: paymentIntentId };
    
    if (amount !== null) {
      refundData.amount = Math.round(amount * 100); // Convert to cents
    }

    const refund = await getStripe().refunds.create(refundData);
    
    return {
      success: true,
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount / 100,
    };
  } catch (error) {
    console.error('Error creating refund:', error);
    throw new Error(`Failed to create refund: ${error.message}`);
  }
}

/**
 * Verify webhook signature from Stripe
 * @param {string} payload - Raw request body
 * @param {string} signature - Stripe signature header
 * @returns {object} Verified event object
 */
function verifyWebhookSignature(payload, signature) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    const event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    return event;
  } catch (error) {
    console.error('Error verifying webhook:', error);
    throw new Error(`Webhook verification failed: ${error.message}`);
  }
}

module.exports = {
  createPaymentIntent,
  getPaymentIntent,
  cancelPaymentIntent,
  createRefund,
  verifyWebhookSignature,
};
