const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  deliveryNo: { type: String, unique: true },
  order:      { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  customer:   { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: String,
  address:    { type: String, required: true },
  riderName:  String,
  riderPhone: String,
  deliveryFee: { type: Number, default: 0 },
  scheduledAt: Date,
  deliveredAt: Date,
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in-transit', 'delivered', 'failed'],
    default: 'pending'
  },
  notes:     String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Auto delivery number
deliverySchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments();
    this.deliveryNo = `DEL-${String(count + 1001).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Delivery', deliverySchema);
