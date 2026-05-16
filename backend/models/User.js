const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 100
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    sparse: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'cashier', 'delivery'],
    default: 'cashier'
  },
  active: {
    type: Boolean,
    default: true
  },
  avatar: String,
  lastLogin: Date,
  // ─── Email Verification ───────────────────────────
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    select: false
  },
  verificationTokenExpiry: Date
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Generate & verify password internally
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Email Verification Helpers ───────────────────
const TOKEN_EXPIRES = parseInt(process.env.VERIFICATION_TOKEN_EXPIRES_IN) || 25;

function generateVerificationToken() {
  // cryptographically strong random string
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => chars[b % chars.length])
    .join('');
}

userSchema.methods.generateVerificationToken = function () {
  this.verificationToken      = generateVerificationToken();
  this.verificationTokenExpiry = new Date(Date.now() + TOKEN_EXPIRES * 60 * 1000);
  return this.verificationToken;
};

userSchema.methods.clearVerificationToken = function () {
  this.verificationToken       = undefined;
  this.verificationTokenExpiry = undefined;
};

userSchema.methods.isTokenExpired = function () {
  return this.verificationTokenExpiry && new Date() > new Date(this.verificationTokenExpiry);
};

// Remove password from toJSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
