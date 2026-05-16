const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── Verify JWT Token ──────────────────────────────────────
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated. Please login.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id);

    if (!user || !user.active) {
      return res.status(401).json({ success: false, message: 'User not found or inactive.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in.',
        code:    'EMAIL_NOT_VERIFIED'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// ─── Role-Based Access Control ────────────────────────────
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }
    next();
  };
};

// ─── Permission Map ───────────────────────────────────────
const PERMISSIONS = {
  admin:    ['billing','orders','delivery','customers','products','inventory','reports','users','permissions','settings','deleteOrders','discount'],
  manager:  ['billing','orders','delivery','customers','products','inventory','reports','deleteOrders','discount'],
  cashier:  ['billing','orders','customers'],
  delivery: ['delivery']
};

exports.can = (permission) => {
  return (req, res, next) => {
    const userPerms = PERMISSIONS[req.user.role] || [];
    if (!userPerms.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Permission denied: '${permission}' required.`
      });
    }
    next();
  };
};
