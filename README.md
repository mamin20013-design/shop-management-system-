# 🛒 DukanPro — Professional Shop Management System

A full-stack billing & shop management system with Login/Register, MongoDB, REST API, Role-based permissions, Delivery tracking, and beautiful dark UI.

---

## 📁 Folder Structure

```
dukanpro/
├── backend/                  # Node.js + Express + MongoDB API
│   ├── config/
│   │   └── seed.js           # Database seed (demo data)
│   ├── middleware/
│   │   └── auth.js           # JWT auth + role permissions
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Customer.js
│   │   ├── Order.js
│   │   ├── Delivery.js
│   │   └── Settings.js
│   ├── routes/
│   │   ├── auth.js           # Login, Register, Change Password
│   │   ├── users.js          # User management (Admin)
│   │   ├── products.js
│   │   ├── customers.js
│   │   ├── orders.js
│   │   ├── deliveries.js
│   │   ├── reports.js
│   │   └── settings.js
│   ├── public/uploads/       # Uploaded files
│   ├── .env.example          # Environment config template
│   ├── package.json
│   └── server.js             # Main Express server
│
└── frontend/                 # Vanilla HTML/CSS/JS
    ├── css/
    │   ├── main.css          # Core styles
    │   ├── auth.css          # Login/Register styles
    │   └── dashboard.css     # App-specific styles
    ├── js/
    │   ├── config.js         # API URL, constants, permissions map
    │   ├── api.js            # All API fetch calls
    │   ├── auth.js           # Login, Register, Logout
    │   ├── utils.js          # Toast, modal, format helpers
    │   ├── billing.js        # Billing/POS module
    │   ├── orders.js         # Orders + Customers + Products + Inventory
    │   ├── delivery.js       # Delivery management
    │   ├── reports.js        # Reports & analytics
    │   ├── users.js          # Users + Permissions + Settings
    │   └── app.js            # Router & app bootstrap
    └── index.html            # Single-page entry point
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 2. Backend Setup

```bash
cd backend
npm install

# Copy env file and configure
cp .env.example .env
# Edit .env → set MONGO_URI and JWT_SECRET

# Seed demo data
npm run seed

# Start server
npm run dev        # development (with nodemon)
npm start          # production
```

Server runs at: **http://localhost:5000**

### 3. Frontend Setup

No build step needed! Just open `frontend/index.html` in a browser.

For development with live reload:
```bash
# Install live-server globally
npm install -g live-server

cd frontend
live-server
```

Or serve with VS Code Live Server extension.

---

## 🔑 Default Login Credentials

| Role     | Username   | Password      | Access |
|----------|------------|---------------|--------|
| Admin    | `admin`    | `admin123`    | Full access |
| Manager  | `manager`  | `manager123`  | No settings/users |
| Cashier  | `cashier`  | `cashier123`  | Billing & orders only |
| Delivery | `delivery` | `delivery123` | Delivery only |

> Admin role shop password: `shop@admin123`

---

## 🌟 Features

| Feature | Description |
|---------|-------------|
| 🔐 Auth | JWT Login, Register, Change Password |
| 👑 Roles | Admin, Manager, Cashier, Delivery |
| 🧾 Billing | POS with product search, qty, discount, print |
| 📦 Orders | Full order history, status tracking |
| 🚚 Delivery | Rider assignment, delivery tracking |
| 👥 Customers | Add/edit/delete, credit limits, history |
| 🏷️ Products | Inventory, low-stock alerts, profit % |
| 📊 Inventory | Stock levels with visual progress bars |
| 📈 Reports | Revenue, charts, top products, CSV export |
| 👤 Users | Admin can add/remove users, toggle active |
| 🔐 Permissions | Role-based access matrix |
| ⚙️ Settings | Shop info, tax, currency, bill footer |
| 🖨️ Print | Thermal-style bill printing |
| 📤 Export | JSON backup & CSV orders export |

---

## 🌐 API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
PATCH  /api/auth/change-password

GET    /api/users
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id

GET/POST/PATCH/DELETE  /api/products
GET/POST/PATCH/DELETE  /api/customers
GET/POST/PATCH/DELETE  /api/orders
GET/POST/PATCH/DELETE  /api/deliveries

GET    /api/reports/summary
GET    /api/reports/daily

GET    /api/settings
PATCH  /api/settings
```

---

## 🛠️ Tech Stack

**Backend:** Node.js, Express.js, MongoDB, Mongoose, JWT, bcryptjs

**Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+), Fetch API

---

## 📦 Production Deployment

```bash
# Backend: set NODE_ENV=production in .env
# Use MongoDB Atlas for database
# Deploy to: Render, Railway, Heroku, VPS

# Frontend: serve static files from any web host
# Or use Express to serve frontend from backend:
# app.use(express.static('../frontend'))
```
