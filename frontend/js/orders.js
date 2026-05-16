// ═══════════════════════════════════════════════
//  ORDERS MODULE
// ═══════════════════════════════════════════════
const Orders = {
  filter: 'all',

  async init() {
    await this.render();
  },

  async render() {
    const params = {};
    if (this.filter !== 'all') params.status = this.filter;
    const q = document.getElementById('order-search')?.value || '';
    if (q) params.search = q;

    let data;
    try { data = await API.orders.list(params); } catch(e) { toast(e.message,'error'); return; }

    const orders = data.orders || [];
    document.getElementById('page-content').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2 style="font-size:17px;font-weight:700;">All Orders</h2>
      <div class="sb" style="width:220px;"><span class="si">🔍</span>
        <input class="inp" id="order-search" placeholder="Search bill, customer..." oninput="Orders.render()">
      </div>
    </div>
    <div class="tabs" id="order-tabs">
      ${['all','paid','pending','delivered','cancelled'].map(s=>`
        <button class="tab ${this.filter===s?'active':''}" onclick="Orders.setFilter('${s}',this)">${s}</button>`).join('')}
    </div>
    <div class="card">
      <table>
        <thead><tr><th>Bill #</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Action</th></tr></thead>
        <tbody id="orders-tbody">
          ${orders.length ? orders.map(o => `
          <tr>
            <td style="font-weight:700">#${o.billNo}</td>
            <td>${o.customerName}</td>
            <td>${fmtDate(o.createdAt)}</td>
            <td>${o.items.length} items</td>
            <td style="font-weight:600;color:var(--accent2)">${fmt(o.total)}</td>
            <td><span class="pill pill-purple">${o.paymentMethod}</span></td>
            <td>${statusPill(o.status)}</td>
            <td>
              <div style="display:flex;gap:5px;">
                <select class="inp" style="width:105px;font-size:10px;padding:3px 6px;" onchange="Orders.updateStatus('${o._id}',this.value)">
                  ${['paid','pending','delivered','cancelled'].map(s=>`<option ${o.status===s?'selected':''} value="${s}">${s}</option>`).join('')}
                </select>
                ${Auth.hasPerm('deleteOrders') ? `<button class="btn btn-danger btn-sm" onclick="Orders.delete('${o._id}')">🗑</button>` : ''}
              </div>
            </td>
          </tr>`).join('') : `<tr><td colspan="8"><div class="empty-state"><span class="ei">📦</span>No orders found</div></td></tr>`}
        </tbody>
      </table>
    </div>`;
  },

  setFilter(f) { this.filter = f; this.render(); },

  async updateStatus(id, status) {
    try { await API.orders.updateStatus(id, status); toast('Status updated'); this.render(); }
    catch(e) { toast(e.message,'error'); }
  },

  async delete(id) {
    if (!confirmDelete()) return;
    try { await API.orders.delete(id); toast('Order deleted'); this.render(); }
    catch(e) { toast(e.message,'error'); }
  }
};

// ═══════════════════════════════════════════════
//  CUSTOMERS MODULE
// ═══════════════════════════════════════════════
const Customers = {
  editing: null,

  async init() { await this.render(); },

  async render() {
    const q = document.getElementById('cust-search')?.value || '';
    let data;
    try { data = await API.customers.list(q ? { search: q } : {}); }
    catch(e) { toast(e.message,'error'); return; }
    const list = data.customers || [];

    document.getElementById('page-content').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2 style="font-size:17px;font-weight:700;">Customers</h2>
      <div style="display:flex;gap:8px;">
        <div class="sb" style="width:200px;"><span class="si">🔍</span><input class="inp" id="cust-search" placeholder="Search..." oninput="Customers.render()"></div>
        <button class="btn btn-primary" onclick="Customers.openModal()">+ Add Customer</button>
      </div>
    </div>
    <div class="card">
      <table>
        <thead><tr><th>Customer</th><th>Phone</th><th>City</th><th>Orders</th><th>Spent</th><th>Type</th><th>Actions</th></tr></thead>
        <tbody>${list.length ? list.map(c => `
          <tr>
            <td><div style="display:flex;align-items:center;gap:8px;">
              <div class="avatar" style="background:rgba(108,99,255,.15);color:var(--accent2)">${initials(c.name)}</div>
              <div><div style="font-weight:600">${c.name}</div><div style="font-size:10px;color:var(--text3)">${c.email||''}</div></div>
            </div></td>
            <td>${c.phone}</td><td>${c.city||'-'}</td>
            <td>${c.totalOrders||0}</td><td>${fmt(c.totalSpent||0)}</td>
            <td><span class="pill ${c.type==='VIP'?'pill-purple':c.type==='Wholesale'?'pill-amber':'pill-blue'}">${c.type}</span></td>
            <td><div style="display:flex;gap:5px;">
              <button class="btn btn-ghost btn-sm" onclick="Customers.openModal('${c._id}')">✏️</button>
              <button class="btn btn-danger btn-sm" onclick="Customers.delete('${c._id}')">🗑</button>
            </div></td>
          </tr>`).join('') : `<tr><td colspan="7"><div class="empty-state"><span class="ei">👥</span>No customers yet</div></td></tr>`}
        </tbody>
      </table>
    </div>
    ${this._modal()}`;
  },

  _modal(c = {}) {
    return `
    <div class="modal-overlay ${this.editing||c._id?'':''}${this.modalOpen?'open':''}" id="modal-customer">
      <div class="modal">
        <h2>${c._id?'Edit':'Add'} Customer</h2>
        <div class="form-row">
          <div class="form-group"><label>Full Name *</label><input class="inp" id="c-name" value="${c.name||''}"></div>
          <div class="form-group"><label>Phone *</label><input class="inp" id="c-phone" value="${c.phone||''}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Email</label><input class="inp" id="c-email" type="email" value="${c.email||''}"></div>
          <div class="form-group"><label>City</label><input class="inp" id="c-city" value="${c.city||''}"></div>
        </div>
        <div class="form-group"><label>Address</label><input class="inp" id="c-address" value="${c.address||''}"></div>
        <div class="form-row">
          <div class="form-group"><label>Type</label><select class="inp" id="c-type">
            ${['Regular','Wholesale','VIP'].map(t=>`<option ${c.type===t?'selected':''}>${t}</option>`).join('')}
          </select></div>
          <div class="form-group"><label>Credit Limit (Rs)</label><input class="inp" id="c-credit" type="number" value="${c.creditLimit||0}"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('modal-customer')">Cancel</button>
          <button class="btn btn-primary" onclick="Customers.save()">Save Customer</button>
        </div>
      </div>
    </div>`;
  },

  async openModal(id) {
    this.editing = id || null;
    this.modalOpen = true;
    if (id) {
      try {
        const data = await API.customers.get(id);
        document.getElementById('page-content').insertAdjacentHTML('beforeend', this._modal(data.customer));
      } catch(e) { toast(e.message,'error'); return; }
    } else {
      document.getElementById('page-content').insertAdjacentHTML('beforeend', this._modal());
    }
    openModal('modal-customer');
  },

  async save() {
    const payload = {
      name:   document.getElementById('c-name').value.trim(),
      phone:  document.getElementById('c-phone').value.trim(),
      email:  document.getElementById('c-email').value,
      city:   document.getElementById('c-city').value,
      address: document.getElementById('c-address').value,
      type:   document.getElementById('c-type').value,
      creditLimit: parseFloat(document.getElementById('c-credit').value) || 0
    };
    if (!payload.name || !payload.phone) { toast('Name and phone required','error'); return; }
    try {
      if (this.editing) await API.customers.update(this.editing, payload);
      else              await API.customers.create(payload);
      toast(this.editing ? 'Customer updated' : 'Customer added');
      this.editing = null; this.modalOpen = false;
      closeModal('modal-customer');
      await this.render();
    } catch(e) { toast(e.message,'error'); }
  },

  async delete(id) {
    if (!confirmDelete('Delete this customer?')) return;
    try { await API.customers.delete(id); toast('Customer deleted'); this.render(); }
    catch(e) { toast(e.message,'error'); }
  }
};

// ═══════════════════════════════════════════════
//  PRODUCTS MODULE
// ═══════════════════════════════════════════════
const Products = {
  editing: null,

  async init() { await this.render(); },

  async render() {
    const q = document.getElementById('prod-search')?.value || '';
    let data;
    try { data = await API.products.list(q ? { search: q } : {}); }
    catch(e) { toast(e.message,'error'); return; }
    const list = data.products || [];

    document.getElementById('page-content').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2 style="font-size:17px;font-weight:700;">Products</h2>
      <div style="display:flex;gap:8px;">
        <div class="sb" style="width:200px;"><span class="si">🔍</span><input class="inp" id="prod-search" placeholder="Search..." oninput="Products.render()"></div>
        ${Auth.hasPerm('products')?`<button class="btn btn-primary" onclick="Products.openModal()">+ Add Product</button>`:''}
      </div>
    </div>
    <div class="card">
      <table>
        <thead><tr><th>Product</th><th>Category</th><th>Purchase</th><th>Sale</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${list.map(p => {
          const low = p.stock <= p.minStock && p.stock > 0;
          const out = p.stock <= 0;
          const prf = p.purchasePrice ? Math.round(((p.salePrice-p.purchasePrice)/p.purchasePrice)*100) : 0;
          return `<tr>
            <td style="font-weight:500">${p.name}</td>
            <td><span class="pill pill-blue">${p.category}</span></td>
            <td>${fmt(p.purchasePrice)}</td>
            <td>${fmt(p.salePrice)} <small style="color:var(--green);font-size:9px">+${prf}%</small></td>
            <td><span style="color:${out?'var(--red)':low?'var(--amber)':'var(--text)'}">${p.stock} ${p.unit}</span>
              ${out?'<span class="pill pill-red" style="font-size:9px;margin-left:4px">Out</span>':low?'<span class="pill pill-amber" style="font-size:9px;margin-left:4px">Low</span>':''}
            </td>
            <td><span class="pill ${out?'pill-red':low?'pill-amber':'pill-green'}">${out?'Out of Stock':low?'Low Stock':'In Stock'}</span></td>
            <td>${Auth.hasPerm('products')?`
              <div style="display:flex;gap:5px;">
                <button class="btn btn-ghost btn-sm" onclick="Products.openModal('${p._id}')">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="Products.delete('${p._id}')">🗑</button>
              </div>`:'-'}</td>
          </tr>`;
        }).join('')}
        </tbody>
      </table>
    </div>`;
  },

  async openModal(id) {
    this.editing = id || null;
    let p = {};
    if (id) { try { const d = await API.products.get(id); p = d.product; } catch(e) { toast(e.message,'error'); return; } }
    const cats = ['Grocery','Dairy','Beverages','Snacks','Cleaning','Personal Care','Vegetables','Other'];
    const units = ['Kg','Gram','Liter','Piece','Pack','Dozen'];
    const html = `
    <div class="modal-overlay open" id="modal-product">
      <div class="modal">
        <h2>${id?'Edit':'Add'} Product</h2>
        <div class="form-row">
          <div class="form-group"><label>Name *</label><input class="inp" id="p-name" value="${p.name||''}"></div>
          <div class="form-group"><label>Category</label><select class="inp" id="p-cat">${cats.map(c=>`<option ${p.category===c?'selected':''}>${c}</option>`).join('')}</select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Unit</label><select class="inp" id="p-unit">${units.map(u=>`<option ${p.unit===u?'selected':''}>${u}</option>`).join('')}</select></div>
          <div class="form-group"><label>Barcode</label><input class="inp" id="p-barcode" value="${p.barcode||''}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Purchase Price *</label><input class="inp" id="p-purchase" type="number" value="${p.purchasePrice||''}"></div>
          <div class="form-group"><label>Sale Price *</label><input class="inp" id="p-sale" type="number" value="${p.salePrice||''}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Stock</label><input class="inp" id="p-stock" type="number" value="${p.stock||0}"></div>
          <div class="form-group"><label>Min Stock Alert</label><input class="inp" id="p-minstock" type="number" value="${p.minStock||5}"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('modal-product')">Cancel</button>
          <button class="btn btn-primary" onclick="Products.save()">Save Product</button>
        </div>
      </div>
    </div>`;
    document.getElementById('page-content').insertAdjacentHTML('beforeend', html);
  },

  async save() {
    const name = document.getElementById('p-name').value.trim();
    if (!name) { toast('Product name required','error'); return; }
    const payload = {
      name, category: document.getElementById('p-cat').value,
      unit: document.getElementById('p-unit').value,
      barcode: document.getElementById('p-barcode').value,
      purchasePrice: parseFloat(document.getElementById('p-purchase').value)||0,
      salePrice: parseFloat(document.getElementById('p-sale').value)||0,
      stock: parseFloat(document.getElementById('p-stock').value)||0,
      minStock: parseFloat(document.getElementById('p-minstock').value)||5
    };
    try {
      if (this.editing) await API.products.update(this.editing, payload);
      else              await API.products.create(payload);
      toast(this.editing?'Updated':'Product added');
      this.editing = null;
      closeModal('modal-product');
      await this.render();
    } catch(e) { toast(e.message,'error'); }
  },

  async delete(id) {
    if (!confirmDelete('Delete this product?')) return;
    try { await API.products.delete(id); toast('Product deleted'); this.render(); }
    catch(e) { toast(e.message,'error'); }
  }
};

// ═══════════════════════════════════════════════
//  INVENTORY MODULE
// ═══════════════════════════════════════════════
const Inventory = {
  async init() {
    let data;
    try { data = await API.products.list(); } catch(e) { toast(e.message,'error'); return; }
    const prods = data.products || [];
    const value = prods.reduce((s,p) => s + p.stock * p.purchasePrice, 0);
    const low   = prods.filter(p => p.stock <= p.minStock && p.stock > 0).length;
    const out   = prods.filter(p => p.stock <= 0).length;

    document.getElementById('page-content').innerHTML = `
    <h2 style="font-size:17px;font-weight:700;margin-bottom:16px;">Inventory Status</h2>
    <div class="grid4" style="margin-bottom:18px;">
      <div class="stat-card"><div class="label">Total Products</div><div class="value">${prods.length}</div></div>
      <div class="stat-card"><div class="label">Low Stock</div><div class="value" style="color:var(--amber)">${low}</div></div>
      <div class="stat-card"><div class="label">Out of Stock</div><div class="value" style="color:var(--red)">${out}</div></div>
      <div class="stat-card"><div class="label">Inventory Value</div><div class="value" style="font-size:17px">${fmt(value)}</div></div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Stock Levels</h3></div>
      ${prods.map(p => {
        const pct = p.minStock > 0 ? Math.min(100, (p.stock/p.minStock)*50) : 50;
        const col = p.stock<=0?'var(--red)':p.stock<=p.minStock?'var(--amber)':'var(--green)';
        return `<div class="inv-row">
          <div style="flex:2;font-weight:500;font-size:12px">${p.name}</div>
          <div style="flex:1;text-align:right;color:${col};font-weight:600;font-size:12px">${p.stock} ${p.unit}</div>
          <div style="flex:3"><div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${col}"></div></div></div>
          <div style="flex:1;text-align:right;color:var(--text3);font-size:10px">Min: ${p.minStock}</div>
        </div>`;
      }).join('')}
    </div>`;
  }
};
