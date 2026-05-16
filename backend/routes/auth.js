const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendVerificationEmail, isSmtpConfigured } = require('../utils/emailService');

// ─── Generate JWT ──────────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id:             user._id,
      name:           user.name,
      username:       user.username,
      email:          user.email,
      role:           user.role,
      active:         user.active,
      isVerified:     user.isVerified
    }
  });
};

// ─── POST /api/auth/register ───────────────────────────────
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('username').trim().isLength({ min: 3 }).withMessage('Username min 3 chars'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  body('role').optional().isIn(['admin', 'manager', 'cashier', 'delivery'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, username, email, password, role = 'cashier', shopPassword } = req.body;
    const normalizedUsername = username.toLowerCase();
    const normalizedEmail = email ? email.toLowerCase() : undefined;

    // Check username/email taken
    const exists = await User.findOne({
      $or: [
        { username: normalizedUsername },
        ...(normalizedEmail ? [{ email: normalizedEmail }] : [])
      ]
    });
    if (exists) {
      const field = exists.username === normalizedUsername ? 'Username' : 'Email';
      return res.status(400).json({ success: false, message: `${field} already taken` });
    }

    // Admin requires shop password
    if (role === 'admin') {
      const correctShopPass = process.env.SHOP_ADMIN_PASSWORD || 'shop@admin123';
      if (shopPassword !== correctShopPass) {
        return res.status(403).json({ success: false, message: 'Wrong shop password for Admin role' });
      }
    }

    // Create user with unverified status
    const user = await User.create({
      name,
      username: normalizedUsername,
      email: normalizedEmail,
      password,
      role
    });

    const canSendEmail = isSmtpConfigured();
    let verificationUrl;

    if (canSendEmail) {
      // Attach verification token
      user.generateVerificationToken();
      await user.save({ validateBeforeSave: false });

      verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/#verify-email?token=${user.verificationToken}`;

      // Send verification email (non-blocking — user still gets token regardless)
      sendVerificationEmail({
        toEmail:  user.email,
        userName: user.name,
        verifyUrl: verificationUrl
      }).catch(err => console.error('Email send error:', err.message));
    } else if (process.env.NODE_ENV !== 'production') {
      user.isVerified = true;
      user.active = true;
      user.clearVerificationToken();
      await user.save({ validateBeforeSave: false });
      console.warn(`SMTP not configured - auto-verified ${user.email} for local development.`);
    } else {
      user.generateVerificationToken();
      await user.save({ validateBeforeSave: false });
      verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/#verify-email?token=${user.verificationToken}`;
      console.error(`SMTP not configured in production. Verification email was not sent for ${user.email}.`);
    }

    const token = signToken(user._id);
    const body = {
      success: true,
      token,
      user: {
        id:             user._id,
        name:           user.name,
        username:       user.username,
        email:          user.email,
        role:           user.role,
        active:         user.active,
        isVerified:     user.isVerified
      }
    };

    if (verificationUrl && !canSendEmail) {
      body.verificationUrl = verificationUrl;
      body.message = 'SMTP is not configured. Open this verificationUrl to verify the account locally.';
    } else if (!canSendEmail) {
      body.message = 'SMTP is not configured. Account auto-verified for local development.';
    }

    res.status(201).json(body);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/auth/login ──────────────────────────────────
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username or email required'),
  body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { username, password } = req.body;

    const loginId = username.toLowerCase();
    const user = await User.findOne({
      $or: [{ username: loginId }, { email: loginId }],
      active: true
    }).sort({ createdAt: -1 }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'No active account found with that username or email.' });
    }

    if (!(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    // ── Block unverified users ───────────────────────
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
        verificationToken: user.verificationToken // frontend uses this to build a resend link
      });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    sendToken(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/auth/me ──────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// ─── POST /api/auth/verify-email ──────────────────────────
// Verifies the token from the email link and activates the account
router.post('/verify-email', [
  body('token').notEmpty().withMessage('Verification token is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  try {
    const { token } = req.body;

    const user = await User.findOne({ verificationToken: token }).select('+verificationToken +verificationTokenExpiry');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification link. Please request a new one.',
        code: 'INVALID_TOKEN'
      });
    }

    if (user.isVerified) {
      return res.status(200).json({
        success: true,
        message: 'Email already verified. You may now log in.',
        code: 'ALREADY_VERIFIED'
      });
    }

    if (user.isTokenExpired()) {
      // Regenerate token so the user can try again without losing quiz info
      user.generateVerificationToken();
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({
        success: false,
        message: 'Verification link has expired. We have sent a new one to your email.',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Activate — success path
    user.isVerified     = true;
    user.active         = true;
    user.clearVerificationToken();
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You may now log in.',
      code:    'VERIFIED'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/auth/verify-status/:token ───────────────────
// Used by the frontend to show the correct page (pending / success / expired)
router.get('/verify-status/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    const user = await User.findOne({ verificationToken: token }).select('+verificationToken +verificationTokenExpiry');

    if (!user) {
      return res.status(200).json({ status: 'invalid', message: 'Verification link is invalid.' });
    }

    if (user.isVerified) {
      return res.status(200).json({ status: 'already_verified', message: 'Email already verified.' });
    }

    if (user.isTokenExpired()) {
      return res.status(200).json({ status: 'expired', message: 'Verification link has expired.' });
    }

    res.status(200).json({ status: 'pending', message: 'Token is valid.', user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/auth/resend-verification ───────────────────
// Resend verification email — rate-limited to 60 sec between calls
const RESEND_COOLDOWN_MS = 60_000;
const TOKEN_EXPIRES = parseInt(process.env.VERIFICATION_TOKEN_EXPIRES_IN) || 25;

router.post('/resend-verification', [
  body('email').trim().isEmail().withMessage('Valid email is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    // Return generic message even when user does not exist to prevent email enumeration
    if (!user || user.isVerified) {
      return res.status(200).json({
        success: true,
        message: 'If an unverified account exists for this email, a new verification email has been sent.'
      });
    }

    // Cooldown check
    if (user.verificationTokenExpiry && Date.now() < new Date(user.verificationTokenExpiry).getTime() - (TOKEN_EXPIRES * 60 * 1000 - RESEND_COOLDOWN_MS)) {
      const secondsLeft = Math.ceil((new Date(user.verificationTokenExpiry).getTime() - (TOKEN_EXPIRES * 60 * 1000 + RESEND_COOLDOWN_MS) - Date.now()) / 1000);
      if (secondsLeft > 0) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${secondsLeft}s before requesting another email.`,
          code: 'RATE_LIMITED'
        });
      }
    }

    // Issue a fresh token
    user.generateVerificationToken();
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    await sendVerificationEmail({
      toEmail:  user.email,
      userName: user.name,
      verifyUrl: `${frontendUrl}/#verify-email?token=${user.verificationToken}`
    });

    res.status(200).json({
      success: true,
      message: 'Verification email sent. Please check your inbox (and spam folder).'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH /api/auth/change-password ──────────────────────
router.patch('/change-password', protect, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both passwords required' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(oldPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is wrong' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
