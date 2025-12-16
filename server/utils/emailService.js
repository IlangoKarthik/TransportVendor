const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendOTPEmail = async (email, otp, type) => {
  const subject = type === 'signup' ? 'Verify Your Email - Netkathir AI Tool' : 'Reset Your Password - Netkathir AI Tool';
  const message = type === 'signup'
    ? `Your OTP for email verification is: <strong>${otp}</strong><br><br>This OTP will expire in ${process.env.OTP_EXPIRY_MINUTES} minutes.`
    : `Your OTP for password reset is: <strong>${otp}</strong><br><br>This OTP will expire in ${process.env.OTP_EXPIRY_MINUTES} minutes.`;

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
    throw new Error('Failed to send OTP email');
  }
};

module.exports = { sendOTPEmail };
