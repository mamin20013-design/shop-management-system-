const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  category: {
    type: String,
    enum: ['Grocery', 'Dairy', 'Beverages', 'Snacks', 'Cleaning', 'Personal Care', 'Vegetables', 'Other'],
    default: 'Other'
  },
  barcode: { type: String, trim: true },
  unit: {
    type: String,
    enum: ['Kg', 'Gram', 'Liter', 'Piece', 'Pack', 'Dozen'],
    default: 'Piece'
  },
  purchasePrice: { type: Number, required: true, min: 0 },
  salePrice:     { type: Number, required: true, min: 0 },
  stock:         { type: Number, default: 0, min: 0 },
  minStock:      { type: Number, default: 5, min: 0 },
  image:         String,
  active:        { type: Boolean, default: true },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Virtual: profit margin %
productSchema.virtual('profitMargin').get(function () {
  if (!this.purchasePrice) return 0;
  return Math.round(((this.salePrice - this.purchasePrice) / this.purchasePrice) * 100);
});

// Virtual: stock status
productSchema.virtual('stockStatus').get(function () {
  if (this.stock <= 0) return 'out';
  if (this.stock <= this.minStock) return 'low';
  return 'ok';
});

productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
