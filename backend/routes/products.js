const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, can } = require('../middleware/auth');

router.use(protect);

// GET all products (all roles for billing)
router.get('/', async (req, res) => {
  try {
    const { search, category, lowStock } = req.query;
    const filter = { active: true };
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (category) filter.category = category;
    if (lowStock === 'true') filter.$expr = { $lte: ['$stock', '$minStock'] };

    const products = await Product.find(filter).sort({ name: 1 });
    res.json({ success: true, count: products.length, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create
router.post('/', can('products'), async (req, res) => {
  try {
    const product = await Product.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH update
router.patch('/:id', can('products'), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE (soft delete)
router.delete('/:id', can('products'), async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
