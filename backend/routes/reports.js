const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { protect, can } = require('../middleware/auth');

router.use(protect, can('reports'));

// GET /api/reports/summary
router.get('/summary', async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    const orderFilter = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

    const orders = await Order.find(orderFilter);
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const totalOrders = orders.length;
    const avgBill = totalOrders ? totalRevenue / totalOrders : 0;

    const products = await Product.find({ active: true });
    const inventoryValue = products.reduce((s, p) => s + p.stock * p.purchasePrice, 0);
    const lowStock = products.filter(p => p.stock <= p.minStock).length;

    const customers = await Customer.countDocuments({ active: true });

    // Payment breakdown
    const paymentBreakdown = {};
    orders.forEach(o => {
      paymentBreakdown[o.paymentMethod] = (paymentBreakdown[o.paymentMethod] || 0) + 1;
    });

    // Top products
    const productSales = {};
    orders.forEach(o => o.items.forEach(it => {
      const key = it.productName;
      if (!productSales[key]) productSales[key] = { qty: 0, revenue: 0 };
      productSales[key].qty += it.qty;
      productSales[key].revenue += it.total;
    }));
    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 10)
      .map(([name, data]) => ({ name, ...data }));

    res.json({
      success: true,
      summary: { totalRevenue, totalOrders, avgBill, inventoryValue, lowStock, customers },
      paymentBreakdown,
      topProducts
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/daily (last 7 days)
router.get('/daily', async (req, res) => {
  try {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      const orders = await Order.find({ createdAt: { $gte: start, $lte: end } });
      days.push({
        date: start.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric' }),
        orders: orders.length,
        revenue: orders.reduce((s, o) => s + o.total, 0)
      });
    }
    res.json({ success: true, daily: days });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
