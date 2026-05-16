const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product:    { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: String,   // snapshot at time of sale
  qty:         { type: Number, required: true, min: 1 },
  unitPrice:   { type: Number, required: true },
  discount:    { type: Number, default: 0 },  // %
  total:       { type: Number, required: true }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  billNo: { type: Number, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, default: 'Walk-in' },
  items:        [orderItemSchema],
  subtotal:     { type: Number, required: true },
  discountAmt:  { type: Number, default: 0 },
  taxAmt:       { type: Number, default: 0 },
  total:        { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'JazzCash', 'EasyPaisa', 'Credit'],
    default: 'Cash'
  },
  status: {
    type: String,
    enum: ['paid', 'pending', 'delivered', 'cancelled'],
    default: 'paid'
  },
  language:  { type: String, enum: ['en', 'ur', 'sd'], default: 'en' },
  notes:     String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Auto-increment billNo before save
orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const last = await this.constructor.findOne().sort({ billNo: -1 });
    this.billNo = last ? last.billNo + 1 : 1001;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
