const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  shopName:     { type: String, default: 'DukanPro General Store' },
  address:      { type: String, default: 'Main Market, Karachi' },
  phone:        { type: String, default: '0300-0000000' },
  email:        String,
  currency:     { type: String, default: 'Rs.' },
  taxRate:      { type: Number, default: 0 },
  billFooter:   { type: String, default: 'Thank you for shopping with us!' },
  defaultLang:  { type: String, enum: ['en', 'ur', 'sd'], default: 'en' },
  logoUrl:      String,
  updatedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
