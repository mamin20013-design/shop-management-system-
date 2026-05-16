// ═══════════════════════════════════════════════
//  APP MAIN — Router & Bootstrap
// ═══════════════════════════════════════════════
const App = {
  settings: {},
  currentPage: 'billing',

  async startApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-app').style.display   = 'flex';

    const u = Auth.currentUser;
    const r = CONFIG.ROLE_LABELS[u.role] || CONFIG.ROLE_LABELS.cashier;

    // Set sidebar user info
    document.getElementById('su-av').textContent   = initials(u.name);
    document.getElementById('su-name').textContent = u.name;
    document.getElementById('su-role').textContent = r.label;

    // Set topbar role badge
    const rb = document.getElementById('topbar-role-badge');
    rb.textContent = r.label;
    rb.className   = `role-badge ${r.cls}`;

    // Hide nav items user has no permission for
    const navPerms = {
      'nav-delivery':    'delivery',
      'nav-customers':   'customers',
      'nav-products':    'products',
      'nav-inventory':   'inventory',
      'nav-reports':     'reports',
      'nav-users':       'users',
      'nav-permissions': 'permissions',
      'nav-settings':    'settings'
    };
    Object.entries(navPerms).forEach(([navId, perm]) => {
      const el = document.getElementById(navId);
      if (el) el.style.display = Auth.hasPerm(perm) ? 'flex' : 'none';
    });

    // Hide admin section if no admin perms
    const adminItems = ['nav-users','nav-permissions','nav-settings'];
    const hasAny = adminItems.some(id => {
      const el = document.getElementById(id);
      return el && el.style.display !== 'none';
    });
    document.querySelectorAll('.admin-sect').forEach(el => {
      el.style.display = hasAny ? 'block' : 'none';
    });

    // Load settings
    try {
      const data = await API.settings.get();
      this.settings = data.settings || {};
    } catch(_) {}

    updateClock();

    // Navigate to default page for role
    const defaults = { delivery: 'delivery', cashier: 'billing', manager: 'billing', admin: 'billing' };
    showPage(defaults[u.role] || 'billing');
  }
};

// ─── Page Router ───────────────────────────────────────────
async function showPage(id) {
  // Permission check
  const permMap = {
    billing:'billing', orders:'orders', delivery:'delivery',
    customers:'customers', products:'products', inventory:'inventory',
    reports:'reports', users:'users', permissions:'permissions', settings:'settings'
  };
  if (permMap[id] && !Auth.hasPerm(permMap[id])) {
    toast('Access denied: You do not have permission for this page', 'error');
    return;
  }

  App.currentPage = id;

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.getElementById(`nav-${id}`);
  if (navEl) navEl.classList.add('active');

  // Update topbar title
  document.getElementById('page-title-bar').textContent = CONFIG.PAGE_TITLES[id] || id;

  // Show loading
  document.getElementById('page-content').innerHTML =
    `<div class="page-loading"><div class="spinner"></div></div>`;

  // Route to module
  try {
    switch(id) {
      case 'billing':     await Billing.init();     break;
      case 'orders':      await Orders.init();      break;
      case 'delivery':    await Delivery.init();    break;
      case 'customers':   await Customers.init();   break;
      case 'products':    await Products.init();    break;
      case 'inventory':   await Inventory.init();   break;
      case 'reports':     await Reports.init();     break;
      case 'users':       await Users.init();       break;
      case 'permissions':      Permissions.init();  break;
      case 'settings':    await Settings.init();    break;
      default:
        document.getElementById('page-content').innerHTML =
          `<div class="empty-state"><span class="ei">🚧</span>Page not found</div>`;
    }
  } catch(err) {
    console.error(err);
    document.getElementById('page-content').innerHTML =
      `<div class="empty-state"><span class="ei">⚠️</span>Error loading page: ${err.message}</div>`;
  }
}

// ─── Bootstrap ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();

  // Close sidebar / overlay on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSidebar();
  });
});

// ─── Sidebar Toggle (mobile / tablet) ───────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const ham     = document.getElementById('hamburger');
  const isOpen   = sidebar.classList.contains('open');

  sidebar.classList.toggle('open',  !isOpen);
  overlay.classList.toggle('open',  !isOpen);
  if (ham) ham.classList.toggle('active', !isOpen);
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('open');
  document.getElementById('hamburger')?.classList.remove('active');
}
