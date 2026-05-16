const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();

// ─── Middleware ────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.options('*', cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// ─── Routes ───────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/products',   require('./routes/products'));
app.use('/api/customers',  require('./routes/customers'));
app.use('/api/orders',     require('./routes/orders'));
app.use('/api/deliveries', require('./routes/deliveries'));
app.use('/api/reports',    require('./routes/reports'));
app.use('/api/settings',   require('./routes/settings'));

app.get('/', (req, res) => {
  res.json({ success: true, message: 'DukanPro API running', root: '/api' });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'DukanPro API root',
    available: ['/api/auth', '/api/users', '/api/products', '/api/customers', '/api/orders', '/api/deliveries', '/api/reports', '/api/settings', '/api/health']
  });
});

// ─── Health Check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'DukanPro API running', time: new Date() });
});

// ─── 404 Handler ──────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ─── MongoDB + Server Start ───────────────────────────────
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dukanpro')
  .then(() => {
    console.log('✅ MongoDB Connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB Error:', err.message);
    process.exit(1);
  });

module.exports = app;
