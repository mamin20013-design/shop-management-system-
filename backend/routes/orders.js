const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const mongoose = require('mongoose');
const { protect, can } = require('../middleware/auth');

router.use(protect);

const requestError = (status, message) => Object.assign(new Error(message), { status });

// GET all orders
router.get('/', async (req, res) => {
  try {
    const { status, search, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (search) filter.$or = [
      { customerName: { $regex: search, $options: 'i' } },
      { billNo: isNaN(search) ? undefined : Number(search) }
    ].filter(Boolean);

    const orders = await Order.find(filter)
      .populate('customer', 'name phone')
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Order.countDocuments(filter);
    res.json({ success: true, count: orders.length, total, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single order
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('customer createdBy');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create order (finalize bill)
router.post('/', can('billing'), async (req, res) => {
  const deductedStock = [];
  try {
    const {
      customerId, items, subtotal, discountAmt, taxAmt, total,
      paymentMethod, language, notes
    } = req.body;

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ success: false, message: 'Order must include at least one item.' });
    }

    if (customerId && !mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ success: false, message: 'Invalid customer selected.' });
    }

    for (const item of items) {
      if (!mongoose.Types.ObjectId.isValid(item.product)) {
        return res.status(400).json({ success: false, message: `Invalid product: ${item.productName || item.product}` });
      }
      if (!Number.isFinite(Number(item.qty)) || Number(item.qty) < 1) {
        return res.status(400).json({ success: false, message: `Invalid quantity for: ${item.productName || item.product}` });
      }
    }

    // Validate & deduct stock
    for (const item of items) {
      const product = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.qty }, active: true },
        { $inc: { stock: -item.qty } },
        { new: true }
      );
      if (!product) {
        const existing = await Product.findById(item.product);
        if (!existing || !existing.active) {
          throw requestError(404, `Product not found: ${item.productName}`);
        }
        throw requestError(400, `Insufficient stock for: ${existing.name}`);
      }
      deductedStock.push({ productId: product._id, qty: item.qty });
    }

    // Get customer name
    let customerName = 'Walk-in';
    if (customerId) {
      const cust = await Customer.findById(customerId);
      if (cust) {
        customerName = cust.name;
        cust.totalOrders += 1;
        cust.totalSpent += total;
        if (paymentMethod === 'Credit') cust.balance += total;
        await cust.save();
      }
    }

    const order = await Order.create({
      customer: customerId || undefined,
      customerName,
      items,
      subtotal,
      discountAmt,
      taxAmt,
      total,
      paymentMethod,
      language,
      notes,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    await Promise.all(deductedStock.map(({ productId, qty }) =>
      Product.findByIdAndUpdate(productId, { $inc: { stock: qty } })
    ));

    if (err.code === 11000 && err.keyPattern?.billNo) {
      return res.status(409).json({ success: false, message: 'Bill number conflict. Please try saving the bill again.' });
    }

    res.status(err.status || 500).json({ success: false, message: err.message });
  }
});

// PATCH update status
router.patch('/:id/status', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE
router.delete('/:id', can('deleteOrders'), async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
