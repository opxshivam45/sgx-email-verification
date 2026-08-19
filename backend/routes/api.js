const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Otp = require('../models/Otp');
const { generateOtp, sendOtpEmail } = require('../utils/sendMail');

// ------------------------------------------------------------------
// POST /api/send-otp
// Sends a 6-digit OTP to the given email so we can confirm the person
// submitting the form actually owns that inbox. This does NOT block
// repeat/returning clients - a real client may submit multiple
// consultation requests over time, so we only use this to verify
// ownership of the email, not to gatekeep account uniqueness.
// ------------------------------------------------------------------
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // If this email has already been verified before (submitted at least once
    // previously), skip the OTP step entirely and auto-verify them.
    const priorSubmission = await User.findOne({ email: normalizedEmail });
    if (priorSubmission) {
      return res.status(200).json({
        success: true,
        skipOtp: true,
        returningClient: true,
        message: 'Welcome back! Your email is already verified.'
      });
    }

    // Remove any previous unused OTP for this email before creating a new one
    await Otp.deleteMany({ email: normalizedEmail });

    const otp = generateOtp();
    await Otp.create({ email: normalizedEmail, otp });

    await sendOtpEmail(normalizedEmail, otp);

    res.status(200).json({
      success: true,
      skipOtp: false,
      returningClient: false,
      message: 'OTP sent to your email address.'
    });
  } catch (err) {
    console.error('Error sending OTP:', err.message);
    res.status(500).json({ success: false, error: 'Failed to send OTP. Please try again.' });
  }
});

// ------------------------------------------------------------------
// POST /api/verify-otp
// Checks the submitted OTP against the one stored for that email.
// ------------------------------------------------------------------
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and OTP are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const record = await Otp.findOne({ email: normalizedEmail, otp: otp.trim() });

    if (!record) {
      // Either wrong OTP, or it expired and was auto-deleted by MongoDB's TTL index
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP. Please request a new one.' });
    }

    // OTP is correct - clean it up so it can't be reused
    await Otp.deleteMany({ email: normalizedEmail });

    res.status(200).json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    console.error('Error verifying OTP:', err.message);
    res.status(500).json({ success: false, error: 'Verification failed. Please try again.' });
  }
});

// ------------------------------------------------------------------
// POST /api/register
// Final form submission - only meant to be called after verify-otp
// has succeeded on the frontend. Saves the inquiry. The same email
// CAN submit more than once (e.g. a returning client with a new
// requirement) - each submission is stored as its own record.
// ------------------------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    const { fullName, companyName, email, phone, interest, message } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ success: false, error: 'Full name and email are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = new User({
      fullName,
      companyName,
      email: normalizedEmail,
      phone,
      interest,
      message,
      isVerified: true
    });

    await user.save();

    res.status(201).json({ success: true, message: 'Registration successful.' });
  } catch (err) {
    console.error('Error registering user:', err.message);
    res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

// ------------------------------------------------------------------
// GET /api/users
// Returns all registered users, most recent first.
// Used by the simple admin view page.
// ------------------------------------------------------------------
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, users });
  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch users.' });
  }
});

module.exports = router;