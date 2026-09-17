// Switched from Nodemailer/SMTP to Resend's HTTPS API.
// Render's free tier blocks outbound SMTP connections (ports 25/465/587),
// but HTTPS (port 443) is never blocked, so an HTTP-based email API works reliably.

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Generates a random 6-digit numeric OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Sends the OTP to the given email address via Resend's API
async function sendOtpEmail(toEmail, otp) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'SGX Exim Private Limited <onboarding@resend.dev>',
      to: [toEmail],
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
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend API error (${response.status}): ${errorBody}`);
  }

  return response.json();
}

module.exports = { generateOtp, sendOtpEmail };
