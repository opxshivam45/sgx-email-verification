const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Generates a random 6-digit numeric OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Sends the OTP to the given email address
async function sendOtpEmail(toEmail, otp) {
  const mailOptions = {
    from: `"SGX Exim Private Limited" <${process.env.EMAIL}>`,
    to: toEmail,
    subject: 'Your Email Verification Code - SGX Exim',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #eee; padding: 24px;">
        <h2 style="color: #C89B3C; margin-top: 0;">SGX Exim Private Limited</h2>
        <p>Use the code below to verify your email address:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; background: #F3F4F6; padding: 14px 0; text-align: center; margin: 16px 0;">
          ${otp}
        </div>
        <p style="font-size: 0.85rem; color: #666;">This code expires in 5 minutes. If you did not request this, you can safely ignore this email.</p>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
}

module.exports = { generateOtp, sendOtpEmail };
