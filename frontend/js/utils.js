// ─── Toast Notifications ───────────────────────────────────
function toast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast-item ${type}`;
  el.innerHTML = `${icons[type] || '✅'} ${message}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ─── Modal Helpers ─────────────────────────────────────────
function openModal(id)  { 
  const el = document.getElementById(id);
  if (el) el.classList.add('open'); 
}
function closeModal(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.remove('open'); 
}

// Close modal on backdrop click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ─── Format Currency ───────────────────────────────────────
function fmt(amount) {
  const s = App?.settings?.currency || 'Rs.';
  return `${s} ${Number(amount || 0).toLocaleString('en-PK')}`;
}

// ─── Format Date ───────────────────────────────────────────
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}
function fmtDateTime(iso) {
  return new Date(iso).toLocaleString('en-PK', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

// ─── Generate Initials ─────────────────────────────────────
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Status Pill ───────────────────────────────────────────
function statusPill(status) {
  const map = {
    paid:       'pill-green',
    delivered:  'pill-blue',
    pending:    'pill-amber',
    cancelled:  'pill-red',
    'in-transit':'pill-blue',
    assigned:   'pill-purple',
    failed:     'pill-red',
    ok:         'pill-green',
    low:        'pill-amber',
    out:        'pill-red'
  };
  return `<span class="pill ${map[status] || 'pill-amber'}">${status}</span>`;
}

// ─── Clock ─────────────────────────────────────────────────
function updateClock() {
  const el = document.getElementById('clock-badge');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
    + '  ' + now.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}
setInterval(updateClock, 30000);

// ─── Confirm Delete ────────────────────────────────────────
function confirmDelete(msg = 'Are you sure you want to delete this?') {
  return confirm(msg);
}
