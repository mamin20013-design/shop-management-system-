const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  phone:   { type: String, required: true, trim: true },
  email:   { type: String, trim: true, lowercase: true },
  city:    { type: String, trim: true },
  address: { type: String, trim: true },
  type: {
    type: String,
    enum: ['Regular', 'Wholesale', 'VIP'],
    default: 'Regular'
  },
  creditLimit: { type: Number, default: 0 },
  balance:     { type: Number, default: 0 },  // positive = owes us
  totalOrders: { type: Number, default: 0 },
  totalSpent:  { type: Number, default: 0 },
  active:      { type: Boolean, default: true },
  notes:       String,
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
