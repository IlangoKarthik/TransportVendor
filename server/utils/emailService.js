const nodemailer = require('nodemailer');

// Check if SMTP is configured
const isEmailConfigured = () => {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
};

// Create transporter based on configuration
const createTransporter = () => {
  // For SendGrid API (recommended for Render)
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
  }
  
  // For standard SMTP (Gmail, etc.)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
};

const transporter = createTransporter();

const sendOTPEmail = async (email, otp, type) => {
  // Check if email is configured
  if (!isEmailConfigured()) {
    console.warn('⚠️  SMTP not configured. Skipping email send. OTP:', otp);
    // In development/testing, we'll return success but log the OTP
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📧 [DEV MODE] OTP for ${email}: ${otp}`);
      return true;
    }
    throw new Error('Email service not configured. Please contact administrator.');
  }

  const subject = type === 'signup' ? 'Verify Your Email - Netkathir AI Tool' : 'Reset Your Password - Netkathir AI Tool';
  const message = type === 'signup'
    ? `Your OTP for email verification is: <strong>${otp}</strong><br><br>This OTP will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.`
    : `Your OTP for password reset is: <strong>${otp}</strong><br><br>This OTP will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; padding: 20px; background: white; border-radius: 10px; margin: 20px 0; letter-spacing: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Netkathir AI Tool</h1>
          </div>
          <div class="content">
            <p>${message}</p>
            <div class="otp">${otp}</div>
            <p><strong>Important:</strong> Do not share this OTP with anyone. Our team will never ask for your OTP.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Netkathir AI Tool. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✓ OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`✗ Email sending error: ${error.message}`);
    console.error('Full error:', error);
    
    // Provide more specific error messages
    if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      throw new Error('Cannot connect to email server. Please try again later.');
    } else if (error.responseCode === 535) {
      throw new Error('Email authentication failed. Please contact administrator.');
    } else {
      throw new Error('Failed to send OTP email. Please try again or contact support.');
    }
  }
};

module.exports = { sendOTPEmail, isEmailConfigured };
