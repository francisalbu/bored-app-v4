/**
 * Email Service
 * 
 * Handles sending booking confirmation emails using Resend
 * https://resend.com
 * 
 * From: bookings@boredtourist.com
 * 
 * FALLBACK SYSTEM:
 * 1. Try Resend (primary)
 * 2. If fails, save to pending_emails table for manual retry
 * 3. Also send WhatsApp notification to admin
 */

const { Resend } = require('resend');
const { from } = require('../config/database');

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Fixed contact info for all experiences (Bored Tourist central support)
const CONTACT = {
  whatsapp: '+351967407859',
  whatsappLink: 'https://wa.me/351967407859',
  email: 'bookings@boredtourist.com',
  fromEmail: 'Bored Tourist <bookings@boredtourist.com>',
  adminEmail: 'bookings@boredtourist.com', // Admin email for failure notifications
};

/**
 * Save failed email to database for retry
 */
async function saveFailedEmail(booking, errorMessage) {
  try {
    await from('pending_emails').insert({
      booking_id: booking.id,
      customer_email: booking.customer_email,
      customer_name: booking.customer_name,
      booking_reference: booking.booking_reference,
      experience_title: booking.experience_title,
      error_message: errorMessage,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
    console.log('📝 Saved to pending_emails for retry');
    return true;
  } catch (err) {
    console.error('❌ Failed to save pending email:', err.message);
    return false;
  }
}

/**
 * Format date for email display
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format time for email display
 */
function formatTime(timeString) {
  if (!timeString) return 'To be confirmed';
  return timeString.substring(0, 5); // "HH:MM"
}

/**
 * Generate HTML email template for booking confirmation
 * Design matches Bored Tourist app branding:
 * - Dark theme (#0A0A0A background)
 * - Primary green (#00FF8C)
 * - Secondary yellow (#FFE600)
 * 
 * OUTLOOK/GMAIL COMPATIBLE:
 * - Uses tables instead of divs
 * - No position:relative/absolute
 * - No CSS gradients (uses solid colors)
 * - Explicit cellpadding/cellspacing
 * - mso- conditional comments for Outlook
 */
function generateBookingConfirmationHTML(booking) {
  const ticketDate = formatDate(booking.slot_date || booking.booking_date);
  const ticketTime = formatTime(booking.slot_start_time || booking.booking_time);
  
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Booking Confirmed - Bored Tourist</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
    .fallback-font {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0A; -webkit-font-smoothing: antialiased;">
  <!-- Wrapper table for full width background -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0A0A0A;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main content table - fixed width for consistency -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
          
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 0 0 30px 0; font-family: Arial, Helvetica, sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size: 28px; color: #FFFFFF; font-weight: bold; text-align: center;">
                    🎫 Bored Tourist
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #A0A0A0; text-align: center; padding-top: 8px;">
                    Your adventure awaits!
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Success Badge -->
          <tr>
            <td align="center" style="padding: 0 0 30px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #00FF8C; color: #000000; padding: 12px 24px; font-size: 16px; font-weight: bold; font-family: Arial, Helvetica, sans-serif; text-align: center;">
                    ✓ Booking Confirmed!
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Ticket Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1A1A1A; border: 1px solid #333333;">
                
                <!-- Experience Image -->
                ${booking.experience_image ? `
                <tr>
                  <td style="padding: 0; line-height: 0;">
                    <img src="${booking.experience_image}" alt="${booking.experience_title}" width="598" style="width: 100%; max-width: 598px; height: auto; display: block; border: 0;" />
                  </td>
                </tr>
                ` : ''}
                
                <!-- Ticket Content -->
                <tr>
                  <td style="padding: 30px; font-family: Arial, Helvetica, sans-serif;">
                    
                    <!-- Experience Title -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size: 24px; color: #FFFFFF; font-weight: bold; padding: 0 0 8px 0;">
                          ${booking.experience_title}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #A0A0A0; padding: 0 0 20px 0;">
                          📍 ${booking.experience_location || 'Lisbon, Portugal'}
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Divider -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="border-top: 2px dashed #444444; padding: 0; height: 1px; line-height: 1px; font-size: 1px;">&nbsp;</td>
                      </tr>
                    </table>
                    
                    <!-- Booking Details Grid - 2x2 -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px;">
                      <!-- Row 1: Date & Time -->
                      <tr>
                        <td width="50%" valign="top" style="padding: 12px 10px 12px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size: 11px; color: #A0A0A0; text-transform: uppercase; letter-spacing: 1px; padding: 0 0 4px 0;">DATE</td>
                            </tr>
                            <tr>
                              <td style="font-size: 15px; color: #FFFFFF; font-weight: bold;">📅 ${ticketDate}</td>
                            </tr>
                          </table>
                        </td>
                        <td width="50%" valign="top" style="padding: 12px 0 12px 10px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size: 11px; color: #A0A0A0; text-transform: uppercase; letter-spacing: 1px; padding: 0 0 4px 0;">TIME</td>
                            </tr>
                            <tr>
                              <td style="font-size: 15px; color: #FFFFFF; font-weight: bold;">🕐 ${ticketTime}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <!-- Row 2: People & Total -->
                      <tr>
                        <td width="50%" valign="top" style="padding: 12px 10px 12px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size: 11px; color: #A0A0A0; text-transform: uppercase; letter-spacing: 1px; padding: 0 0 4px 0;">PEOPLE</td>
                            </tr>
                            <tr>
                              <td style="font-size: 15px; color: #FFFFFF; font-weight: bold;">👥 ${booking.participants} ${booking.participants === 1 ? 'person' : 'people'}</td>
                            </tr>
                          </table>
                        </td>
                        <td width="50%" valign="top" style="padding: 12px 0 12px 10px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size: 11px; color: #A0A0A0; text-transform: uppercase; letter-spacing: 1px; padding: 0 0 4px 0;">TOTAL PAID</td>
                            </tr>
                            <tr>
                              <td style="font-size: 15px; color: #00FF8C; font-weight: bold;">${booking.currency || '€'}${booking.total_amount}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Booking Reference Box -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
                      <tr>
                        <td style="background-color: #0A0A0A; padding: 20px; text-align: center;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size: 11px; color: #A0A0A0; text-transform: uppercase; letter-spacing: 1px; padding: 0 0 8px 0; text-align: center;">BOOKING REFERENCE</td>
                            </tr>
                            <tr>
                              <td style="font-size: 24px; color: #FFE600; font-weight: bold; font-family: 'Courier New', Courier, monospace; letter-spacing: 3px; text-align: center;">
                                ${booking.booking_reference}
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size: 12px; color: #666666; padding-top: 8px; text-align: center;">
                                Show this code when you arrive
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Contact Information -->
          <tr>
            <td style="padding-top: 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1A1A1A; border: 1px solid #333333;">
                <tr>
                  <td style="padding: 24px; font-family: Arial, Helvetica, sans-serif;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size: 16px; color: #FFFFFF; font-weight: bold; padding: 0 0 16px 0;">👤 Contact Information</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #A0A0A0; padding: 6px 0;">
                          Name: <span style="color: #FFFFFF; font-weight: 500;">${booking.customer_name}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #A0A0A0; padding: 6px 0;">
                          Email: <span style="color: #FFFFFF; font-weight: 500;">${booking.customer_email}</span>
                        </td>
                      </tr>
                      ${booking.customer_phone ? `
                      <tr>
                        <td style="font-size: 14px; color: #A0A0A0; padding: 6px 0;">
                          Phone: <span style="color: #FFFFFF; font-weight: 500;">${booking.customer_phone}</span>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Need Help Section -->
          <tr>
            <td style="padding-top: 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1A1A1A; border: 1px solid #333333;">
                <tr>
                  <td style="padding: 24px; font-family: Arial, Helvetica, sans-serif;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size: 16px; color: #FFFFFF; font-weight: bold; padding: 0 0 16px 0;">🆘 Need Help?</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #A0A0A0; padding: 0 0 16px 0;">
                          Questions about your booking? We're here to help!
                        </td>
                      </tr>
                      <!-- WhatsApp -->
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size: 14px; color: #A0A0A0; padding-right: 8px;">📱 WhatsApp:</td>
                              <td style="font-size: 14px;"><a href="${CONTACT.whatsappLink}" style="color: #00FF8C; font-weight: bold; text-decoration: none;">${CONTACT.whatsapp}</a></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <!-- Email -->
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size: 14px; color: #A0A0A0; padding-right: 8px;">✉️ Email:</td>
                              <td style="font-size: 14px;"><a href="mailto:${CONTACT.email}" style="color: #00FF8C; font-weight: bold; text-decoration: none;">${CONTACT.email}</a></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <!-- Meeting Point -->
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size: 14px; color: #A0A0A0; padding-right: 8px;">📍 Meeting Point:</td>
                              <td style="font-size: 14px;"><a href="https://maps.google.com/?q=${encodeURIComponent(booking.experience_location || 'Lisbon, Portugal')}" style="color: #00FF8C; font-weight: bold; text-decoration: none;">View on Maps</a></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Important Info -->
          <tr>
            <td style="padding-top: 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1A1A1A; border: 2px solid #FFE600;">
                <tr>
                  <td style="padding: 20px; font-family: Arial, Helvetica, sans-serif;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size: 14px; color: #FFE600; font-weight: bold; padding: 0 0 12px 0;">⚡ Important Information</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #A0A0A0; padding: 4px 0;">• Please arrive <strong style="color: #FFFFFF;">15 minutes before</strong> your scheduled time</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #A0A0A0; padding: 4px 0;">• Bring a valid <strong style="color: #FFFFFF;">ID document</strong></td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #A0A0A0; padding: 4px 0;">• Show your <strong style="color: #FFE600;">booking reference</strong> when you arrive</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #A0A0A0; padding: 4px 0;">• Check the weather and dress appropriately</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 40px; font-family: Arial, Helvetica, sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size: 14px; color: #FFFFFF; font-weight: bold; text-align: center; padding: 0 0 8px 0;">
                    Thank you for booking with Bored Tourist! 🎉
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #A0A0A0; text-align: center; padding: 0 0 24px 0;">
                    We hope you have an amazing experience!
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 11px; color: #666666; text-align: center;">
                    © ${new Date().getFullYear()} Bored Tourist. All rights reserved.
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 11px; color: #444444; text-align: center; padding-top: 8px;">
                    Lisbon, Portugal 🇵🇹
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Generate plain text version of booking confirmation
 */
function generateBookingConfirmationText(booking) {
  const ticketDate = formatDate(booking.slot_date || booking.booking_date);
  const ticketTime = formatTime(booking.slot_start_time || booking.booking_time);
  
  return `
🎫 BOOKING CONFIRMED - BORED TOURIST
=====================================

Hello ${booking.customer_name}!

Your booking has been confirmed. Here are the details:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 EXPERIENCE
${booking.experience_title}
📍 ${booking.experience_location || 'Lisbon, Portugal'}

📅 DATE & TIME
${ticketDate} at ${ticketTime}

👥 GUESTS
${booking.participants} ${booking.participants === 1 ? 'person' : 'people'}

💰 TOTAL PAID
${booking.currency || '€'}${booking.total_amount}

🎟️ BOOKING REFERENCE
${booking.booking_reference}
(Show this code when you arrive)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 GUEST INFORMATION
Name: ${booking.customer_name}
Email: ${booking.customer_email}
${booking.customer_phone ? `Phone: ${booking.customer_phone}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🆘 NEED HELP?
📱 WhatsApp: ${CONTACT.whatsapp}
✉️ Email: ${CONTACT.email}
📍 Meeting Point: ${booking.experience_location || 'Check app for details'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ IMPORTANT INFORMATION
• Please arrive 15 minutes before your scheduled time
• Bring a valid ID document
• Show your booking reference when you arrive
• Check the weather and dress appropriately

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for booking with Bored Tourist! 🎉
We hope you have an amazing experience!

© ${new Date().getFullYear()} Bored Tourist
Lisbon, Portugal 🇵🇹
  `.trim();
}

/**
 * Send booking confirmation email with retry logic
 * Will retry up to 3 times with exponential backoff
 */
async function sendBookingConfirmation(booking, maxRetries = 3) {
  if (!process.env.RESEND_API_KEY) {
    console.error('🚨 CRITICAL: RESEND_API_KEY not configured! Email NOT sent to:', booking.customer_email);
    console.error('🚨 Please set RESEND_API_KEY environment variable on Render.com');
    return { success: false, message: 'Email service not configured - RESEND_API_KEY missing' };
  }

  if (!booking.customer_email) {
    console.error('🚨 CRITICAL: No customer email provided for booking:', booking.booking_reference);
    return { success: false, message: 'No customer email provided' };
  }

  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 [Attempt ${attempt}/${maxRetries}] Sending booking confirmation to ${booking.customer_email}...`);
      console.log(`📧 Booking reference: ${booking.booking_reference}`);
      console.log(`📧 Experience: ${booking.experience_title}`);
      console.log(`📧 CC: ${CONTACT.adminEmail}`);
      
      const { data, error } = await resend.emails.send({
        from: CONTACT.fromEmail,
        to: booking.customer_email,
        cc: CONTACT.adminEmail, // Always CC the admin to track all bookings
        subject: `✅ Booking Confirmed: ${booking.experience_title} - ${booking.booking_reference}`,
        html: generateBookingConfirmationHTML(booking),
        text: generateBookingConfirmationText(booking),
      });

      if (error) {
        console.error(`❌ [Attempt ${attempt}/${maxRetries}] Resend error:`, error);
        lastError = error;
        
        // If not last attempt, wait before retrying (exponential backoff: 1s, 2s, 4s)
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt - 1) * 1000;
          console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      } else {
        console.log(`✅ Booking confirmation email sent successfully!`);
        console.log(`✅ Email ID: ${data.id}`);
        console.log(`✅ To: ${booking.customer_email}`);
        console.log(`✅ Reference: ${booking.booking_reference}`);
        return { success: true, message: 'Email sent successfully', emailId: data.id };
      }
      
    } catch (error) {
      console.error(`❌ [Attempt ${attempt}/${maxRetries}] Error sending booking confirmation:`, error);
      lastError = error;
      
      // If not last attempt, wait before retrying
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // All retries failed - FALLBACK: Save to database and notify admin
  console.error(`🚨 CRITICAL: Failed to send confirmation email after ${maxRetries} attempts!`);
  console.error(`🚨 Customer: ${booking.customer_email}`);
  console.error(`🚨 Booking: ${booking.booking_reference}`);
  console.error(`🚨 Last error:`, lastError);
  
  // FALLBACK 1: Save to pending_emails table
  await saveFailedEmail(booking, lastError?.message || 'Unknown error');
  
  // FALLBACK 2: Try to send a simple notification to admin
  try {
    console.log('📧 Sending fallback notification to admin...');
    await resend.emails.send({
      from: CONTACT.fromEmail,
      to: CONTACT.adminEmail,
      subject: `🚨 URGENT: Email failed for booking ${booking.booking_reference}`,
      html: `
        <h2>⚠️ Email Delivery Failed</h2>
        <p><strong>Customer:</strong> ${booking.customer_name} (${booking.customer_email})</p>
        <p><strong>Booking:</strong> ${booking.booking_reference}</p>
        <p><strong>Experience:</strong> ${booking.experience_title}</p>
        <p><strong>Error:</strong> ${lastError?.message || 'Unknown'}</p>
        <p>Please contact the customer manually!</p>
      `,
    });
    console.log('✅ Admin notification sent');
  } catch (adminErr) {
    console.error('❌ Even admin notification failed:', adminErr.message);
  }
  
  return { success: false, message: lastError?.message || 'Failed after all retries', savedForRetry: true };
}

/**
 * Generate HTML for cancellation email
 */
function generateCancellationHTML(booking) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Cancelled - Bored Tourist</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0A0A0A;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0A0A0A; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <h1 style="color: #FFFFFF; font-size: 28px; margin: 0; font-weight: 700;">
                🎫 Bored Tourist
              </h1>
            </td>
          </tr>
          
          <!-- Cancellation Badge -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <div style="display: inline-block; background: #FF3B30; color: #FFFFFF; padding: 12px 24px; border-radius: 50px; font-weight: 700; font-size: 16px;">
                ❌ Booking Cancelled
              </div>
            </td>
          </tr>
          
          <!-- Content Card -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1A1A1A; border-radius: 20px; border: 1px solid #333333;">
                <tr>
                  <td style="padding: 30px;">
                    <p style="color: #FFFFFF; font-size: 16px; margin: 0 0 20px 0;">
                      Hello <strong>${booking.customer_name}</strong>,
                    </p>
                    
                    <p style="color: #A0A0A0; font-size: 14px; margin: 0 0 24px 0;">
                      Your booking has been cancelled as requested.
                    </p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0A0A0A; border-radius: 12px;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="color: #A0A0A0; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase;">REFERENCE</p>
                          <p style="color: #FF3B30; font-size: 18px; margin: 0 0 16px 0; font-weight: 600; font-family: monospace;">${booking.booking_reference}</p>
                          
                          <p style="color: #A0A0A0; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase;">EXPERIENCE</p>
                          <p style="color: #FFFFFF; font-size: 16px; margin: 0 0 16px 0;">${booking.experience_title}</p>
                          
                          <p style="color: #A0A0A0; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase;">DATE</p>
                          <p style="color: #FFFFFF; font-size: 16px; margin: 0;">${formatDate(booking.slot_date || booking.booking_date)}</p>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #A0A0A0; font-size: 14px; margin: 24px 0 0 0;">
                      If you have any questions about your refund, please contact us.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Help Section -->
          <tr>
            <td style="padding-top: 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1A1A1A; border-radius: 16px; border: 1px solid #333333;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="color: #FFFFFF; font-size: 16px; margin: 0 0 16px 0; font-weight: 600;">🆘 Need Help?</h3>
                    <p style="color: #A0A0A0; font-size: 14px; margin: 0;">
                      📱 <a href="${CONTACT.whatsappLink}" style="color: #00FF8C; text-decoration: none;">WhatsApp: ${CONTACT.whatsapp}</a>
                    </p>
                    <p style="color: #A0A0A0; font-size: 14px; margin: 8px 0 0 0;">
                      ✉️ <a href="mailto:${CONTACT.email}" style="color: #00FF8C; text-decoration: none;">${CONTACT.email}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 40px; text-align: center;">
              <p style="color: #A0A0A0; font-size: 13px; margin: 0 0 8px 0;">
                We hope to see you again soon!
              </p>
              <p style="color: #666666; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} Bored Tourist. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Send booking cancellation email
 */
async function sendBookingCancellation(booking) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️  RESEND_API_KEY not configured. Email not sent.');
    return { success: false, message: 'Email service not configured' };
  }

  try {
    console.log(`📧 Sending cancellation email to ${booking.customer_email}...`);
    
    const { data, error } = await resend.emails.send({
      from: CONTACT.fromEmail,
      to: booking.customer_email,
      subject: `❌ Booking Cancelled: ${booking.experience_title} - ${booking.booking_reference}`,
      html: generateCancellationHTML(booking),
      text: `
Hello ${booking.customer_name},

Your booking has been cancelled.

Reference: ${booking.booking_reference}
Experience: ${booking.experience_title}
Date: ${formatDate(booking.slot_date || booking.booking_date)}

If you have any questions about your refund, please contact us:
📱 WhatsApp: ${CONTACT.whatsapp}
✉️ Email: ${CONTACT.email}

We hope to see you again soon!

Bored Tourist Team
      `.trim(),
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return { success: false, message: error.message };
    }

    console.log(`✅ Cancellation email sent! ID: ${data.id}`);
    return { success: true, message: 'Email sent successfully', emailId: data.id };
    
  } catch (error) {
    console.error('❌ Error sending cancellation email:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  sendBookingConfirmation,
  sendBookingCancellation
};
