// ═══════════════════════════════════════════════
//  USERS MODULE  (Admin only)
// ═══════════════════════════════════════════════
const Users = {
  async init() { await this.render(); },

  async render() {
    let data;
    try { data = await API.users.list(); } catch(e) { toast(e.message, 'error'); return; }
    const users = data.users || [];

    document.getElementById('page-content').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2 style="font-size:17px;font-weight:700;">System Users</h2>
      <button class="btn btn-primary" onclick="Users.openAddModal()">+ Add User</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;">
      ${users.map(u => {
        const r = CONFIG.ROLE_LABELS[u.role] || CONFIG.ROLE_LABELS.cashier;
        const isSelf = u._id === Auth.currentUser?.id;
        const pillCls = u.role==='admin'?'pill-purple':u.role==='manager'?'pill-blue':u.role==='cashier'?'pill-green':'pill-amber';
        return `
        <div class="user-card">
          <div class="uc-av">${initials(u.name)}</div>
          <div class="uc-info">
            <h4>${u.name} ${isSelf?'<span style="font-size:9px;color:var(--accent2)">(you)</span>':''}</h4>
            <p>@${u.username}</p>
            <p>${u.email || 'No email'}</p>
            <div style="margin-top:5px;">
              <span class="pill ${pillCls}" style="font-size:9px">${r.label}</span>
              ${!u.active?'<span class="pill pill-red" style="font-size:9px;margin-left:4px">Inactive</span>':''}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;">
            ${!isSelf ? `
            <button class="btn btn-ghost btn-sm" onclick="Users.toggleActive('${u._id}',${!u.active})">${u.active?'🔒':'🔓'}</button>
            <button class="btn btn-danger btn-sm" onclick="Users.delete('${u._id}')">🗑</button>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- Add User Modal -->
    <div class="modal-overlay" id="modal-adduser">
      <div class="modal">
        <h2>Add New User</h2>
        <div class="form-row">
          <div class="form-group"><label>Full Name *</label><input class="inp" id="au-name" placeholder="Ahmed Ali"></div>
          <div class="form-group"><label>Username *</label><input class="inp" id="au-user" placeholder="ahmed01"></div>
        </div>
        <div class="form-group"><label>Email</label><input class="inp" id="au-email" type="email" placeholder="email@example.com"></div>
        <div class="form-row">
          <div class="form-group"><label>Password *</label><input class="inp" id="au-pass" type="password" placeholder="Min 6 chars"></div>
          <div class="form-group"><label>Role</label>
            <select class="inp" id="au-role">
              <option value="cashier">Cashier</option>
              <option value="manager">Manager</option>
              <option value="delivery">Delivery</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('modal-adduser')">Cancel</button>
          <button class="btn btn-primary" onclick="Users.save()">Create User</button>
        </div>
      </div>
    </div>`;
  },

  openAddModal() { openModal('modal-adduser'); },

  async save() {
    const name  = document.getElementById('au-name').value.trim();
    const uname = document.getElementById('au-user').value.trim();
    const pass  = document.getElementById('au-pass').value;
    if (!name || !uname || !pass) { toast('Name, username and password required', 'error'); return; }
    try {
      await API.users.create({
        name, username: uname,
        email: document.getElementById('au-email').value,
        password: pass,
        role: document.getElementById('au-role').value
      });
      toast('User created!');
      closeModal('modal-adduser');
      await this.render();
    } catch(e) { toast(e.message, 'error'); }
  },

  async toggleActive(id, active) {
    try { await API.users.update(id, { active }); toast(active ? 'User activated' : 'User deactivated'); this.render(); }
    catch(e) { toast(e.message, 'error'); }
  },

  async delete(id) {
    if (!confirmDelete('Delete this user? This cannot be undone.')) return;
    try { await API.users.delete(id); toast('User deleted'); this.render(); }
    catch(e) { toast(e.message, 'error'); }
  }
};

// ═══════════════════════════════════════════════
//  PERMISSIONS MODULE
// ═══════════════════════════════════════════════
const Permissions = {
  init() {
    const perms = [
      'billing','orders','delivery','customers','products',
      'inventory','reports','users','permissions','settings','deleteOrders','discount'
    ];
    const roles = ['admin','manager','cashier','delivery'];

    document.getElementById('page-content').innerHTML = `
    <h2 style="font-size:17px;font-weight:700;margin-bottom:16px;">Permissions Matrix</h2>
    <div class="card">
      <table class="perm-table">
        <thead>
          <tr>
            <th>Permission</th>
            ${roles.map(r => {
              const rl = CONFIG.ROLE_LABELS[r];
              return `<th style="text-align:center">${rl.icon} ${rl.label}</th>`;
            }).join('')}
          </tr>
        </thead>
        <tbody>
          ${perms.map(p => `
          <tr>
            <td style="color:var(--text2);font-size:12px;padding:7px 10px;">${p}</td>
            ${roles.map(r => {
              const has = (CONFIG.PERMISSIONS[r]||[]).includes(p);
              return `<td class="${has?'perm-check':'perm-cross'}">${has?'✓':'✗'}</td>`;
            }).join('')}
          </tr>`).join('')}
        </tbody>
      </table>
      <div style="margin-top:16px;padding:12px;background:var(--bg3);border-radius:var(--r);font-size:11px;color:var(--text3);">
        ℹ️ Permissions are role-based. To change a user's permissions, update their role from the Users page.
      </div>
    </div>`;
  }
};

// ═══════════════════════════════════════════════
//  SETTINGS MODULE
// ═══════════════════════════════════════════════
const Settings = {
  async init() {
    let data;
    try { data = await API.settings.get(); } catch(e) { toast(e.message, 'error'); return; }
    const s = data.settings || {};

    document.getElementById('page-content').innerHTML = `
    <h2 style="font-size:17px;font-weight:700;margin-bottom:16px;">System Settings</h2>
    <div class="grid2">
      <div class="card">
        <h3 style="margin-bottom:16px;">🏪 Shop Information</h3>
        <div class="form-group"><label>Shop Name</label><input class="inp" id="s-name" value="${s.shopName||''}"></div>
        <div class="form-group"><label>Address</label><input class="inp" id="s-addr" value="${s.address||''}"></div>
        <div class="form-group"><label>Phone</label><input class="inp" id="s-phone" value="${s.phone||''}"></div>
        <div class="form-group"><label>Email</label><input class="inp" id="s-email" type="email" value="${s.email||''}"></div>
        <div class="form-row">
          <div class="form-group"><label>Currency Symbol</label><input class="inp" id="s-curr" value="${s.currency||'Rs.'}"></div>
          <div class="form-group"><label>Tax Rate (%)</label><input class="inp" id="s-tax" type="number" value="${s.taxRate||0}" min="0" max="100"></div>
        </div>
        <div class="form-group"><label>Bill Footer Note</label><input class="inp" id="s-footer" value="${s.billFooter||''}"></div>
        <button class="btn btn-primary" onclick="Settings.save()">💾 Save Settings</button>
      </div>

      <div class="card">
        <h3 style="margin-bottom:16px;">🔑 Change Password</h3>
        <div class="form-group"><label>Current Password</label><input class="inp" id="cp-old" type="password" placeholder="Your current password"></div>
        <div class="form-group"><label>New Password</label><input class="inp" id="cp-new" type="password" placeholder="New password (min 6)"></div>
        <div class="form-group" style="margin-bottom:14px;"><label>Confirm New</label><input class="inp" id="cp-new2" type="password" placeholder="Repeat new password"></div>
        <button class="btn btn-primary" onclick="Settings.changePassword()">🔑 Update Password</button>

        <div class="divider"></div>
        <h3 style="margin-bottom:12px;">📋 Current User</h3>
        <div style="background:var(--bg3);border-radius:var(--r);padding:12px;font-size:12px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:var(--text2)">Name</span><span style="font-weight:600">${Auth.currentUser?.name}</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:var(--text2)">Username</span><span>@${Auth.currentUser?.username}</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--text2)">Role</span>
            <span class="pill ${Auth.currentUser?.role==='admin'?'pill-purple':Auth.currentUser?.role==='manager'?'pill-blue':Auth.currentUser?.role==='cashier'?'pill-green':'pill-amber'}">${CONFIG.ROLE_LABELS[Auth.currentUser?.role]?.label||''}</span>
          </div>
        </div>

        <div class="divider"></div>
        <h3 style="margin-bottom:12px;">⚠️ Danger Zone</h3>
        <button class="btn btn-ghost btn-sm" onclick="Settings.exportData()" style="margin-right:6px;">📤 Export All Data</button>
      </div>
    </div>`;
  },

  async save() {
    const payload = {
      shopName:   document.getElementById('s-name').value,
      address:    document.getElementById('s-addr').value,
      phone:      document.getElementById('s-phone').value,
      email:      document.getElementById('s-email').value,
      currency:   document.getElementById('s-curr').value,
      taxRate:    parseFloat(document.getElementById('s-tax').value) || 0,
      billFooter: document.getElementById('s-footer').value
    };
    try {
      await API.settings.update(payload);
      // Update local settings cache
      Object.assign(App.settings, payload);
      toast('Settings saved!');
    } catch(e) { toast(e.message, 'error'); }
  },

  async changePassword() {
    const oldPassword = document.getElementById('cp-old').value;
    const newPassword = document.getElementById('cp-new').value;
    const confirm     = document.getElementById('cp-new2').value;
    if (!oldPassword || !newPassword) { toast('All fields required', 'error'); return; }
    if (newPassword !== confirm) { toast('New passwords do not match', 'error'); return; }
    if (newPassword.length < 6)  { toast('Password must be 6+ characters', 'error'); return; }
    try {
      await API.auth.changePassword({ oldPassword, newPassword });
      toast('Password changed successfully!');
      document.getElementById('cp-old').value = '';
      document.getElementById('cp-new').value = '';
      document.getElementById('cp-new2').value = '';
    } catch(e) { toast(e.message, 'error'); }
  },

  async exportData() {
    try {
      const [orders, products, customers] = await Promise.all([
        API.orders.list({ limit: 10000 }),
        API.products.list(),
        API.customers.list()
      ]);
      const blob = new Blob([JSON.stringify({
        orders: orders.orders, products: products.products,
        customers: customers.customers, exported: new Date().toISOString()
      }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `dukanpro_backup_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      toast('Data exported!');
    } catch(e) { toast(e.message, 'error'); }
  }
};
