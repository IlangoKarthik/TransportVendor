const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTPEmail } = require('../utils/emailService');
const auth = require('../middleware/auth');

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// @route   POST /api/auth/signup
// @desc    Register new user and send OTP
// @access  Public
router.post('/signup', async (req, res) => {
  try {
    const { email, userId, password, confirmPassword } = req.body;

    // Validation
    if (!email || !userId || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { userId }] });
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      if (existingUser.userId === userId) {
        return res.status(400).json({ error: 'User ID already taken' });
      }
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + parseInt(process.env.OTP_EXPIRY_MINUTES) * 60 * 1000);

    // Save OTP to database
    await OTP.create({
      email,
      otp,
      type: 'signup',
      expiresAt
    });

    // Send OTP email
    await sendOTPEmail(email, otp, 'signup');

    // Store user data temporarily in session (we'll create the user after OTP verification)
    res.status(200).json({
      success: true,
      message: 'OTP sent to your email. Please verify to complete registration.',
      email,
      userId
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// @route   POST /api/auth/verify-signup-otp
// @desc    Verify OTP and create user account
// @access  Public
router.post('/verify-signup-otp', async (req, res) => {
  try {
    const { email, userId, password, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({
      email,
      otp,
      type: 'signup',
      verified: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Create user data folder
    const dataFolder = path.join(process.env.DATA_PATH, userId);
    await fs.mkdir(dataFolder, { recursive: true });
    await fs.mkdir(path.join(dataFolder, 'documents'), { recursive: true });
    await fs.mkdir(path.join(dataFolder, 'embeddings'), { recursive: true });

    // Create user
    const user = await User.create({
      email,
      userId,
      password,
      dataFolder,
      isVerified: true
    });

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        userId: user.userId,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Server error during verification' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { emailOrUserId, password } = req.body;

    if (!emailOrUserId || !password) {
      return res.status(400).json({ error: 'Please provide email/user ID and password' });
    }

    // Find user by email or userId
    const user = await User.findOne({
      $or: [{ email: emailOrUserId.toLowerCase() }, { userId: emailOrUserId.toLowerCase() }]
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        userId: user.userId,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset OTP
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists for security
      return res.status(200).json({
        success: true,
        message: 'If the email exists, an OTP has been sent'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + parseInt(process.env.OTP_EXPIRY_MINUTES) * 60 * 1000);

    // Save OTP
    await OTP.create({
      email: user.email,
      otp,
      type: 'reset-password',
      expiresAt
    });

    // Send OTP email
    await sendOTPEmail(user.email, otp, 'reset-password');

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with OTP
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Verify OTP
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      otp,
      type: 'reset-password',
      verified: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Find user and update password
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful. Please login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        userId: req.user.userId,
        email: req.user.email,
        name: req.user.name,
        lastLogin: req.user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
