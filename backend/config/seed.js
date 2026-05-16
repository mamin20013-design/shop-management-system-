require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Settings = require('../models/Settings');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dukanpro';

const users = [
  { name: 'Admin User',    username: 'admin',    email: 'admin@dukan.com',    password: 'admin123',    role: 'admin',    isVerified: true },
  { name: 'Sara Manager',  username: 'manager',  email: 'manager@dukan.com',  password: 'manager123',  role: 'manager',  isVerified: true },
  { name: 'Ahmed Cashier', username: 'cashier',  email: 'cashier@dukan.com',  password: 'cashier123',  role: 'cashier',  isVerified: true },
  { name: 'Ali Delivery',  username: 'delivery', email: 'delivery@dukan.com', password: 'delivery123', role: 'delivery', isVerified: true },
];

const products = [
  { name: 'Basmati Rice',    category: 'Grocery',       unit: 'Kg',     purchasePrice: 120, salePrice: 150, stock: 50, minStock: 10 },
  { name: 'Sunflower Oil 1L',category: 'Grocery',       unit: 'Liter',  purchasePrice: 280, salePrice: 320, stock: 30, minStock: 5  },
  { name: 'Milk 1L',         category: 'Dairy',         unit: 'Liter',  purchasePrice: 80,  salePrice: 100, stock: 20, minStock: 8  },
  { name: 'Sugar',           category: 'Grocery',       unit: 'Kg',     purchasePrice: 80,  salePrice: 95,  stock: 60, minStock: 15 },
  { name: 'Tea Pack 200g',   category: 'Beverages',     unit: 'Pack',   purchasePrice: 250, salePrice: 300, stock: 25, minStock: 5  },
  { name: 'Flour (Atta) 1Kg',category: 'Grocery',       unit: 'Kg',     purchasePrice: 60,  salePrice: 75,  stock: 80, minStock: 20 },
  { name: 'Soap Bar',        category: 'Personal Care', unit: 'Piece',  purchasePrice: 30,  salePrice: 45,  stock: 40, minStock: 10 },
  { name: 'Shampoo 200ml',   category: 'Personal Care', unit: 'Piece',  purchasePrice: 120, salePrice: 160, stock: 15, minStock: 5  },
  { name: 'Lays Chips',      category: 'Snacks',        unit: 'Pack',   purchasePrice: 20,  salePrice: 30,  stock: 100,minStock: 20 },
  { name: 'Mineral Water',   category: 'Beverages',     unit: 'Piece',  purchasePrice: 25,  salePrice: 35,  stock: 60, minStock: 15 },
  { name: 'Washing Powder',  category: 'Cleaning',      unit: 'Pack',   purchasePrice: 180, salePrice: 220, stock: 20, minStock: 5  },
  { name: 'Eggs (Dozen)',    category: 'Dairy',         unit: 'Dozen',  purchasePrice: 280, salePrice: 320, stock: 10, minStock: 3  },
];

const customers = [
  { name: 'Ahmed Ali',     phone: '0300-1234567', city: 'Karachi', address: 'Block 5, PECHS',    type: 'Regular',   creditLimit: 0 },
  { name: 'Fatima Bibi',   phone: '0321-7654321', city: 'Karachi', address: 'DHA Phase 2',       type: 'VIP',       creditLimit: 5000 },
  { name: 'Wholesale Mart',phone: '0333-1111111', city: 'Karachi', address: 'Saddar Market',     type: 'Wholesale', creditLimit: 50000 },
  { name: 'Ali Hassan',    phone: '0312-9876543', city: 'Lahore',  address: 'Gulberg, Lahore',   type: 'Regular',   creditLimit: 2000 },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Customer.deleteMany({}),
      Settings.deleteMany({})
    ]);
    console.log('🧹 Cleared existing data');

    // Insert
    for (const u of users) await User.create(u);
    console.log(`👤 Created ${users.length} users`);

    await Product.insertMany(products);
    console.log(`🏷️  Created ${products.length} products`);

    await Customer.insertMany(customers);
    console.log(`👥 Created ${customers.length} customers`);

    await Settings.create({
      shopName: 'DukanPro General Store',
      address: 'Main Market, Karachi',
      phone: '0300-0000000',
      currency: 'Rs.',
      taxRate: 0,
      billFooter: 'Shukriya! Phir tashreef layen.'
    });
    console.log('⚙️  Settings created');

    console.log('\n✅ Seed complete!');
    console.log('─────────────────────────────');
    console.log('Login credentials:');
    console.log('  admin    / admin123');
    console.log('  manager  / manager123');
    console.log('  cashier  / cashier123');
    console.log('  delivery / delivery123');
    console.log('─────────────────────────────');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
