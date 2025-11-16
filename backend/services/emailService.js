/**
 * Email Service
 * 
 * Handles sending booking confirmation emails
 * Uses Gmail SMTP (you can change to any email provider)
 */

const nodemailer = require('nodemailer');

/**
 * Create email transporter
 * For Gmail, you need:
 * 1. Enable 2-Step Verification
 * 2. Generate App Password: https://myaccount.google.com/apppasswords
 * 3. Add to .env: EMAIL_USER and EMAIL_PASSWORD
 */
function createTransporter() {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  
  if (!emailUser || !emailPassword) {
    console.warn('⚠️  Email credentials not configured. Emails will not be sent.');
    console.warn('   Add EMAIL_USER and EMAIL_PASSWORD to your .env file');
    return null;
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  });
}

/**
 * Format date for email display
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-PT', {
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
  // timeString comes as "HH:MM:SS"
  return timeString.substring(0, 5); // "HH:MM"
}

/**
 * Generate HTML email template for booking confirmation
 * Professional template with app UI design system
 */
function generateBookingConfirmationHTML(booking) {
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reserva Confirmada - Bored Tourist</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style type="text/css">
    /* Reset styles */
    body {
      margin: 0;
      padding: 0;
      min-width: 100%;
      width: 100% !important;
      height: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    body, table, td, p, a, li, blockquote {
      -ms-text-size-adjust: 100%;
      -webkit-text-size-adjust: 100%;
    }
    
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }
    
    /* App colors - Bored Tourist Brand */
    .bg-gradient {
      background: linear-gradient(135deg, #0A0A0A 0%, #1F1F1F 100%);
    }
    
    .text-primary { color: #00FF8C; }
    .text-secondary { color: #FFE600; }
    .text-dark { color: #1a202c; }
    .text-gray { color: #A0A0A0; }
    .text-light { color: #cbd5e0; }
    
    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        margin: auto !important;
      }
      
      .fluid {
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }
      
      .stack-column,
      .stack-column-center {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        direction: ltr !important;
      }
      
      .mobile-padding {
        padding: 20px !important;
      }
      
      .mobile-hide {
        display: none !important;
      }
    }
  </style>
</head>
<body width="100%" style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: #f7fafc;">
  <center style="width: 100%; background-color: #f7fafc;">
    <!--[if mso | IE]>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f7fafc;">
    <tr>
    <td>
    <![endif]-->
    
    <!-- Email Container -->
    <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto;" class="email-container">
      
      <!-- Hero Section with Gradient -->
      <tr>
        <td style="background: linear-gradient(135deg, #0A0A0A 0%, #1F1F1F 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0; border-bottom: 3px solid #00FF8C;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="text-align: center;">
                <h1 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 32px; line-height: 40px; color: #00FF8C; font-weight: 700;">
                  🎉 Reserva Confirmada!
                </h1>
                <div style="margin-top: 16px; display: inline-block; background-color: rgba(0,255,140,0.15); padding: 10px 24px; border-radius: 24px; border: 2px solid #00FF8C;">
                  <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #00FF8C; font-weight: 600; letter-spacing: 0.5px;">
                    ✅ CONFIRMADO
                  </span>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      
      <!-- Main Content -->
      <tr>
        <td style="background-color: #ffffff; padding: 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            
            <!-- Greeting -->
            <tr>
              <td style="padding: 40px 30px 20px 30px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; color: #1a202c;">
                <p style="margin: 0 0 16px 0;">
                  Olá <strong style="color: #00FF8C;">${booking.customer_name}</strong>,
                </p>
                <p style="margin: 0; color: #4a5568;">
                  A sua reserva foi confirmada com sucesso! Estamos ansiosos para recebê-lo(a) nesta experiência incrível.
                </p>
              </td>
            </tr>
            
            <!-- Experience Card -->
            <tr>
              <td style="padding: 0 30px 30px 30px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-left: 4px solid #00FF8C;">
                  <tr>
                    <td style="padding: 24px;">
                      <h2 style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; line-height: 28px; color: #00FF8C; font-weight: 700;">
                        ${booking.experience_title}
                      </h2>
                      <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #718096;">
                        📍 ${booking.experience_location}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Booking Details -->
            <tr>
              <td style="padding: 0 30px 30px 30px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  
                  <!-- Booking Reference -->
                  <tr>
                    <td style="padding: 16px 0; border-bottom: 1px solid #e2e8f0;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td width="50%" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #718096; font-weight: 600;">
                            Referência
                          </td>
                          <td width="50%" align="right" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #1a202c; font-weight: 600;">
                            ${booking.booking_reference}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Date -->
                  <tr>
                    <td style="padding: 16px 0; border-bottom: 1px solid #e2e8f0;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td width="50%" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #718096; font-weight: 600;">
                            📅 Data
                          </td>
                          <td width="50%" align="right" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #1a202c; font-weight: 600;">
                            ${formatDate(booking.slot_date)}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Time -->
                  <tr>
                    <td style="padding: 16px 0; border-bottom: 1px solid #e2e8f0;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td width="50%" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #718096; font-weight: 600;">
                            🕐 Horário
                          </td>
                          <td width="50%" align="right" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #1a202c; font-weight: 600;">
                            ${formatTime(booking.slot_start_time)} - ${formatTime(booking.slot_end_time)}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Duration -->
                  <tr>
                    <td style="padding: 16px 0; border-bottom: 1px solid #e2e8f0;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td width="50%" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #718096; font-weight: 600;">
                            ⏱️ Duração
                          </td>
                          <td width="50%" align="right" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #1a202c; font-weight: 600;">
                            ${booking.experience_duration}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Participants -->
                  <tr>
                    <td style="padding: 16px 0; border-bottom: 1px solid #e2e8f0;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td width="50%" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #718096; font-weight: 600;">
                            👥 Participantes
                          </td>
                          <td width="50%" align="right" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #1a202c; font-weight: 600;">
                            ${booking.participants} pessoa${booking.participants > 1 ? 's' : ''}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Total Amount -->
                  <tr>
                    <td style="padding: 16px 0;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td width="50%" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; color: #00FF8C; font-weight: 700;">
                            💰 Valor Total
                          </td>
                          <td width="50%" align="right" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 20px; color: #00FF8C; font-weight: 700;">
                            ${booking.total_amount}€
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
            
            <!-- Important Info Box -->
            <tr>
              <td style="padding: 0 30px 30px 30px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef5e7; border-left: 4px solid #f59e0b; border-radius: 8px;">
                  <tr>
                    <td style="padding: 20px;">
                      <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; color: #92400e; font-weight: 700;">
                        📝 Informações Importantes
                      </p>
                      <ul style="margin: 0; padding-left: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 22px; color: #78350f;">
                        <li style="margin-bottom: 8px;">Chegue <strong>15 minutos antes</strong> do horário marcado</li>
                        <li style="margin-bottom: 8px;">Guarde esta referência: <strong>${booking.booking_reference}</strong></li>
                        <li>Em caso de dúvidas, contacte-nos através de <strong>boredtouristt@gmail.com</strong></li>
                      </ul>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
      
      <!-- Footer -->
      <tr>
        <td style="background-color: #ffffff; padding: 30px; text-align: center; border-radius: 0 0 16px 16px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; color: #1a202c; font-weight: 600;">
            Obrigado por escolher a Bored Tourist! 🎊
          </p>
          <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #718096;">
            Estamos aqui para tornar a sua experiência inesquecível
          </p>
          <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #cbd5e0;">
            © 2025 Bored Tourist. Todos os direitos reservados.
          </p>
        </td>
      </tr>
      
      <!-- Spacer -->
      <tr>
        <td style="height: 20px; background-color: #f7fafc;"></td>
      </tr>
      
    </table>
    
    <!--[if mso | IE]>
    </td>
    </tr>
    </table>
    <![endif]-->
  </center>
</body>
</html>
  `;
}

/**
 * Send booking confirmation email
 */
async function sendBookingConfirmation(booking) {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('⚠️  Email not sent - credentials not configured');
    return { success: false, message: 'Email service not configured' };
  }
  
  try {
    console.log(`📧 Sending booking confirmation to: ${booking.customer_email}`);
    
    const mailOptions = {
      from: {
        name: 'Bored Tourist',
        address: process.env.EMAIL_USER
      },
      to: booking.customer_email,
      subject: `✅ Reserva Confirmada - ${booking.experience_title}`,
      html: generateBookingConfirmationHTML(booking),
      // Plain text fallback
      text: `
Olá ${booking.customer_name},

A sua reserva foi confirmada com sucesso!

Experiência: ${booking.experience_title}
Referência: ${booking.booking_reference}
Data: ${formatDate(booking.slot_date)}
Horário: ${formatTime(booking.slot_start_time)} - ${formatTime(booking.slot_end_time)}
Participantes: ${booking.participants}
Valor Total: ${booking.total_amount}€

Chegue 15 minutos antes do horário marcado.

Obrigado por escolher a Bored Tourist!
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully! Message ID: ${info.messageId}`);
    
    return { 
      success: true, 
      message: 'Email sent successfully',
      messageId: info.messageId 
    };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { 
      success: false, 
      message: error.message 
    };
  }
}

/**
 * Send booking cancellation email
 */
async function sendBookingCancellation(booking) {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('⚠️  Email not sent - credentials not configured');
    return { success: false, message: 'Email service not configured' };
  }
  
  try {
    console.log(`📧 Sending cancellation email to: ${booking.customer_email}`);
    
    const mailOptions = {
      from: {
        name: 'Bored Tourist',
        address: process.env.EMAIL_USER
      },
      to: booking.customer_email,
      subject: `❌ Reserva Cancelada - ${booking.experience_title}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #FF3B30;
    }
    .header h1 {
      color: #FF3B30;
      margin: 0;
    }
    .status-badge {
      display: inline-block;
      background-color: #FF3B30;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 14px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Reserva Cancelada</h1>
      <div class="status-badge">❌ CANCELADO</div>
    </div>
    <p>Olá <strong>${booking.customer_name}</strong>,</p>
    <p>A sua reserva foi cancelada conforme solicitado.</p>
    <p><strong>Referência:</strong> ${booking.booking_reference}</p>
    <p><strong>Experiência:</strong> ${booking.experience_title}</p>
    <p><strong>Data:</strong> ${formatDate(booking.slot_date)}</p>
    <p>Se tiver alguma dúvida, não hesite em contactar-nos.</p>
    <p>Esperamos vê-lo(a) em breve!</p>
    <p style="margin-top: 30px; color: #999; font-size: 12px;">Bored Tourist Team</p>
  </div>
</body>
</html>
      `,
      text: `
Olá ${booking.customer_name},

A sua reserva foi cancelada.

Referência: ${booking.booking_reference}
Experiência: ${booking.experience_title}
Data: ${formatDate(booking.slot_date)}

Esperamos vê-lo(a) em breve!

Bored Tourist Team
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Cancellation email sent! Message ID: ${info.messageId}`);
    
    return { 
      success: true, 
      message: 'Email sent successfully',
      messageId: info.messageId 
    };
  } catch (error) {
    console.error('❌ Error sending cancellation email:', error);
    return { 
      success: false, 
      message: error.message 
    };
  }
}

module.exports = {
  sendBookingConfirmation,
  sendBookingCancellation
};
