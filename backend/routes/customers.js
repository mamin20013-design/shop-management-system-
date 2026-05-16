const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const { protect, can } = require('../middleware/auth');

router.use(protect);

// GET all
router.get('/', async (req, res) => {
  try {
    const { search, type } = req.query;
    const filter = { active: true };
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search } }];
    if (type) filter.type = type;
    const customers = await Customer.find(filter).sort({ name: 1 });
    res.json({ success: true, count: customers.length, customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create
router.post('/', can('customers'), async (req, res) => {
  try {
    const customer = await Customer.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH update
router.patch('/:id', can('customers'), async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!customer) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE (soft)
router.delete('/:id', can('customers'), async (req, res) => {
  try {
    await Customer.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ success: true, message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
