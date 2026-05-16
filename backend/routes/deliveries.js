const express = require('express');
const router = express.Router();
const Delivery = require('../models/Delivery');
const { protect, can } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const deliveries = await Delivery.find(filter)
      .populate('order', 'billNo total')
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: deliveries.length, deliveries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', can('delivery'), async (req, res) => {
  try {
    const delivery = await Delivery.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, delivery });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id', can('delivery'), async (req, res) => {
  try {
    const update = { ...req.body };
    if (req.body.status === 'delivered') update.deliveredAt = new Date();
    const delivery = await Delivery.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!delivery) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, delivery });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', can('delivery'), async (req, res) => {
  try {
    await Delivery.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
