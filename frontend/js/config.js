// ─── API Configuration ─────────────────────────────────────
const CONFIG = {
  API_BASE: 'http://localhost:7000/api',
  TOKEN_KEY: 'dukanpro_token',
  USER_KEY:  'dukanpro_user',

  // Permission map per role
  PERMISSIONS: {
    admin:    ['billing','orders','delivery','customers','products','inventory','reports','users','permissions','settings','deleteOrders','discount'],
    manager:  ['billing','orders','delivery','customers','products','inventory','reports','deleteOrders','discount'],
    cashier:  ['billing','orders','customers'],
    delivery: ['delivery']
  },

  ROLE_LABELS: {
    admin:    { label: 'Admin',    cls: 'rb-admin',    icon: '👑' },
    manager:  { label: 'Manager',  cls: 'rb-manager',  icon: '💼' },
    cashier:  { label: 'Cashier',  cls: 'rb-cashier',  icon: '💰' },
    delivery: { label: 'Delivery', cls: 'rb-delivery', icon: '🚚' }
  },

  PAGE_TITLES: {
    billing:     '🧾 Billing',
    orders:      '📦 Orders',
    delivery:    '🚚 Delivery',
    customers:   '👥 Customers',
    products:    '🏷️ Products',
    inventory:   '📊 Inventory',
    reports:     '📈 Reports',
    users:       '👤 System Users',
    permissions: '🔐 Permissions',
    settings:    '⚙️ Settings'
  }
};
