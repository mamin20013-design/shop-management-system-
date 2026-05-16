// ─── Billing Module ────────────────────────────────────────
const Billing = {
  items: [],
  selectedProduct: null,
  allProducts: [],
  allCustomers: [],
  saving: false,

  async init() {
    await this.loadData();
    this.renderPage();
  },

  async loadData() {
    try {
      const [pRes, cRes] = await Promise.all([
        API.products.list(),
        API.customers.list()
      ]);
      this.allProducts  = pRes.products || [];
      this.allCustomers = cRes.customers || [];
    } catch (err) {
      toast('Failed to load billing data: ' + err.message, 'error');
    }
  },

  renderPage() {
    const cur = App.settings?.currency || 'Rs.';
    const custOpts = `<option value="">Walk-in Customer</option>` +
      this.allCustomers.map(c => `<option value="${c._id}">${c.name} (${c.phone})</option>`).join('');

    document.getElementById('page-content').innerHTML = `
    <div class="billing-layout">
      <div class="billing-main">
        <div class="card">
          <div class="card-head">
            <h3>New Bill</h3>
            <div style="display:flex;gap:8px;">
              <select class="inp" id="bill-lang" style="width:120px;font-size:11px;padding:5px 8px;">
                <option value="en">🇬🇧 English</option>
                <option value="ur">🇵🇰 اردو</option>
              </select>
              <select class="inp" id="bill-customer" style="width:180px;font-size:11px;padding:5px 8px;">
                ${custOpts}
              </select>
            </div>
          </div>
          <div class="form-row" style="align-items:flex-end;">
            <div class="form-group" style="flex:2;margin-bottom:0;">
              <label>Search Product</label>
              <div class="sb" style="position:relative;">
                <span class="si">🔍</span>
                <input class="inp" id="product-search" placeholder="Type product name..." autocomplete="off" oninput="Billing.filterProducts(this.value)">
                <div class="product-dropdown" id="product-dropdown"></div>
              </div>
            </div>
            <div class="form-group" style="flex:0 0 auto;margin-bottom:0;">
              <label>Quantity</label>
              <div class="qty-control">
                <button class="qty-btn" onclick="Billing.adjQty(-1)">−</button>
                <input id="item-qty" type="number" value="1" min="1" style="width:42px;text-align:center;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:5px;font-size:12px;">
                <button class="qty-btn" onclick="Billing.adjQty(1)">+</button>
              </div>
            </div>
            <button class="btn btn-primary" style="margin-bottom:0;" onclick="Billing.addItem()">+ Add Item</button>
          </div>
        </div>

        <div class="card" style="flex:1;">
          <div class="card-head">
            <h3>Bill Items</h3>
            <button class="btn btn-danger btn-sm" onclick="Billing.clear()">🗑 Clear All</button>
          </div>
          <div style="overflow-x:auto;">
            <table>
              <thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Disc%</th><th>Net Total</th><th></th></tr></thead>
              <tbody id="bill-table"></tbody>
            </table>
            <div id="bill-empty" class="empty-state">
              <span class="ei">🧾</span>No items added yet. Search and add products above.
            </div>
          </div>
        </div>
      </div>

      <div class="billing-side">
        <div class="card">
          <h3 style="margin-bottom:14px;font-size:14px;">💳 Bill Summary</h3>
          <div style="display:flex;flex-direction:column;gap:7px;font-size:12px;">
            <div class="bill-summary-row"><span style="color:var(--text2)">Subtotal</span><span id="s-subtotal">${cur} 0</span></div>
            <div class="bill-summary-row"><span style="color:var(--text2)">Item Discounts</span><span id="s-itemdisc" style="color:var(--green)">-${cur} 0</span></div>
            <div class="bill-summary-row"><span style="color:var(--text2)">Extra Discount</span><span id="s-extradisc" style="color:var(--green)">-${cur} 0</span></div>
            <div class="bill-summary-row"><span style="color:var(--text2)">Tax</span><span id="s-tax">${cur} 0</span></div>
            <div class="divider"></div>
            <div class="bill-total-row"><span>Total</span><span id="s-total" style="color:var(--accent2)">${cur} 0</span></div>
          </div>
          <div class="divider"></div>
          <div class="form-group" style="margin-bottom:8px;">
            <label>Payment Method</label>
            <select class="inp" id="pay-method">
              <option>Cash</option><option>Card</option><option>JazzCash</option><option>EasyPaisa</option><option>Credit</option>
            </select>
          </div>
          ${Auth.hasPerm('discount') ? `
          <div class="form-group" style="margin-bottom:12px;">
            <label>Extra Discount (${cur})</label>
            <input class="inp" id="extra-discount" type="number" value="0" min="0" oninput="Billing.calcTotal()">
          </div>` : ''}
          <div class="form-group" style="margin-bottom:14px;">
            <label>Notes</label>
            <input class="inp" id="bill-notes" placeholder="Optional notes...">
          </div>
          <div style="display:flex;flex-direction:column;gap:7px;">
            <button class="btn btn-primary" data-finalize-bill style="justify-content:center;" onclick="Billing.finalize()">✅ Finalize & Save</button>
            <button class="btn btn-ghost btn-sm" style="justify-content:center;" onclick="Billing.printLast()">🖨 Print Last Bill</button>
            <button class="btn btn-success btn-sm" style="justify-content:center;" onclick="Delivery.openModal()">🚚 Send for Delivery</button>
          </div>
        </div>

        <div class="card">
          <h3 style="margin-bottom:10px;font-size:13px;">Recent Bills</h3>
          <div id="recent-bills"><div style="color:var(--text3);font-size:11px;text-align:center;padding:8px;">No bills yet</div></div>
        </div>
      </div>
    </div>`;

    this.renderTable();
    this.renderRecent();
  },

  filterProducts(q) {
    const dd = document.getElementById('product-dropdown');
    if (!q.trim()) { dd.style.display = 'none'; return; }
    const matches = this.allProducts.filter(p =>
      p.name.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 10);
    if (!matches.length) { dd.style.display = 'none'; return; }
    dd.style.display = 'block';
    dd.innerHTML = matches.map(p => `
      <div class="pd-item" onclick="Billing.selectProduct('${p._id}')">
        <span>${p.name} <small style="color:var(--text3)">${p.category}</small></span>
        <span style="color:var(--accent2);font-weight:600">${fmt(p.salePrice)}</span>
      </div>`).join('');
  },

  selectProduct(id) {
    this.selectedProduct = this.allProducts.find(p => p._id === id);
    document.getElementById('product-search').value = this.selectedProduct.name;
    document.getElementById('product-dropdown').style.display = 'none';
  },

  adjQty(d) {
    const el = document.getElementById('item-qty');
    el.value = Math.max(1, (parseInt(el.value) || 1) + d);
  },

  addItem() {
    if (!this.selectedProduct) { toast('Please select a product', 'error'); return; }
    const qty = parseInt(document.getElementById('item-qty').value) || 1;
    const p   = this.selectedProduct;
    if (p.stock < qty) { toast(`Only ${p.stock} ${p.unit} available!`, 'error'); return; }
    const existing = this.items.find(i => i.productId === p._id);
    if (existing) { existing.qty += qty; existing.total = existing.qty * existing.unitPrice; }
    else this.items.push({ productId: p._id, productName: p.name, qty, unitPrice: p.salePrice, total: qty * p.salePrice, disc: 0 });
    document.getElementById('product-search').value = '';
    document.getElementById('item-qty').value = 1;
    this.selectedProduct = null;
    this.renderTable();
    this.calcTotal();
  },

  removeItem(id) {
    this.items = this.items.filter(i => i.productId !== id);
    this.renderTable(); this.calcTotal();
  },

  changeQty(id, d) {
    const it = this.items.find(i => i.productId === id);
    if (!it) return;
    it.qty = Math.max(1, it.qty + d);
    it.total = it.qty * it.unitPrice;
    this.renderTable(); this.calcTotal();
  },

  setDisc(id, v) {
    const it = this.items.find(i => i.productId === id);
    if (it) { it.disc = parseFloat(v) || 0; this.calcTotal(); }
  },

  clear() { this.items = []; this.renderTable(); this.calcTotal(); },

  renderTable() {
    const tb = document.getElementById('bill-table');
    const em = document.getElementById('bill-empty');
    if (!this.items.length) { if (tb) tb.innerHTML = ''; if (em) em.style.display = 'block'; return; }
    if (em) em.style.display = 'none';
    if (!tb) return;
    tb.innerHTML = this.items.map((it, i) => `
      <tr>
        <td>${i + 1}</td>
        <td style="font-weight:500">${it.productName}</td>
        <td>
          <div class="qty-control">
            <button class="qty-btn" onclick="Billing.changeQty('${it.productId}',-1)">−</button>
            <span style="min-width:28px;text-align:center;font-size:12px">${it.qty}</span>
            <button class="qty-btn" onclick="Billing.changeQty('${it.productId}',1)">+</button>
          </div>
        </td>
        <td>${fmt(it.unitPrice)}</td>
        <td>${Auth.hasPerm('discount')
          ? `<input type="number" value="${it.disc}" min="0" max="100"
              style="width:48px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:5px;padding:3px 5px;font-size:11px;"
              onchange="Billing.setDisc('${it.productId}',this.value)">`
          : it.disc + '%'
        }</td>
        <td style="color:var(--green);font-weight:600">${fmt(Math.round(it.total * (1 - it.disc / 100)))}</td>
        <td><button class="btn btn-danger btn-sm" onclick="Billing.removeItem('${it.productId}')">✕</button></td>
      </tr>`).join('');
  },

  calcTotal() {
    const sub      = this.items.reduce((s, i) => s + i.total, 0);
    const itemDisc = this.items.reduce((s, i) => s + (i.total * i.disc / 100), 0);
    const extra    = parseFloat(document.getElementById('extra-discount')?.value || 0);
    const totalDisc = itemDisc + extra;
    const taxRate  = parseFloat(App.settings?.taxRate || 0);
    const tax      = (sub - totalDisc) * taxRate / 100;
    const total    = sub - totalDisc + tax;
    const cur      = App.settings?.currency || 'Rs.';

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('s-subtotal',  `${cur} ${sub.toFixed(0)}`);
    set('s-itemdisc',  `-${cur} ${itemDisc.toFixed(0)}`);
    set('s-extradisc', `-${cur} ${extra.toFixed(0)}`);
    set('s-tax',       `${cur} ${tax.toFixed(0)}`);
    set('s-total',     `${cur} ${total.toFixed(0)}`);
  },

  async finalize() {
    if (this.saving) return;
    if (!this.items.length) { toast('Add items first', 'error'); return; }
    this.saving = true;
    const saveBtn = document.querySelector('[data-finalize-bill]');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }
    const sub      = this.items.reduce((s, i) => s + i.total, 0);
    const itemDisc = this.items.reduce((s, i) => s + (i.total * i.disc / 100), 0);
    const extra    = parseFloat(document.getElementById('extra-discount')?.value || 0);
    const totalDisc = itemDisc + extra;
    const taxRate  = parseFloat(App.settings?.taxRate || 0);
    const tax      = (sub - totalDisc) * taxRate / 100;
    const total    = sub - totalDisc + tax;
    const custId   = document.getElementById('bill-customer')?.value || '';

    const payload = {
      customerId: custId || null,
      items: this.items.map(i => ({
        product: i.productId,
        productName: i.productName,
        qty: i.qty,
        unitPrice: i.unitPrice,
        discount: i.disc,
        total: Math.round(i.total * (1 - i.disc / 100))
      })),
      subtotal: sub, discountAmt: totalDisc, taxAmt: tax, total,
      paymentMethod: document.getElementById('pay-method')?.value || 'Cash',
      language: document.getElementById('bill-lang')?.value || 'en',
      notes: document.getElementById('bill-notes')?.value || ''
    };

    try {
      const data = await API.orders.create(payload);
      this.lastOrder = data.order;
      toast(`✅ Bill #${data.order.billNo} saved! Total: ${fmt(total)}`);
      this.clear();
      // Refresh product list (stock updated)
      await this.loadData();
      this.renderRecent();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      this.saving = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'âœ… Finalize & Save';
      }
    }
  },

  async renderRecent() {
    try {
      const data = await API.orders.list({ limit: 5 });
      const rb = document.getElementById('recent-bills');
      if (!rb) return;
      if (!data.orders?.length) { rb.innerHTML = '<div style="color:var(--text3);font-size:11px;text-align:center;padding:8px;">No bills yet</div>'; return; }
      rb.innerHTML = data.orders.map(o => `
        <div class="recent-bill-row">
          <div><strong>#${o.billNo}</strong> <span style="color:var(--text3)">${o.customerName}</span></div>
          <span style="color:var(--accent2);font-weight:600">${fmt(o.total)}</span>
        </div>`).join('');
    } catch (_) {}
  },

  printLast() {
    if (!this.lastOrder) { toast('Save a bill first to print', 'error'); return; }
    const o = this.lastOrder;
    const s = App.settings;
    const w = window.open('', '_blank', 'width=380,height=620');
    const rows = (o.items || []).map(i =>
      `<tr><td>${i.productName}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">${s.currency} ${i.total}</td></tr>`
    ).join('');
    w.document.write(`<!DOCTYPE html><html><head><title>Bill #${o.billNo}</title>
    <style>body{font-family:monospace;font-size:12px;max-width:320px;margin:0 auto;padding:14px;}
    h3{text-align:center;}table{width:100%;}td{padding:3px 0;}hr{border:1px dashed #ccc;}.total{font-weight:bold;font-size:15px;}</style>
    </head><body>
    <h3>${s.shopName || 'Shop'}</h3>
    <p style="text-align:center;font-size:10px;">${s.address || ''} | ${s.phone || ''}</p><hr>
    <p>Bill #${o.billNo} &nbsp; ${fmtDate(o.createdAt)}<br>Customer: ${o.customerName}</p><hr>
    <table><tr><th>Item</th><th>Qty</th><th>Total</th></tr>${rows}</table><hr>
    <p>Subtotal: ${s.currency} ${o.subtotal}</p>
    <p>Discount: -${s.currency} ${o.discountAmt}</p>
    <p class="total">TOTAL: ${s.currency} ${o.total}</p>
    <p>Payment: ${o.paymentMethod}</p><hr>
    <p style="text-align:center">${s.billFooter || ''}</p>
    <script>window.print();<\/script></body></html>`);
  }
};

// Close product dropdown on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('#product-search') && !e.target.closest('#product-dropdown')) {
    const dd = document.getElementById('product-dropdown');
    if (dd) dd.style.display = 'none';
  }
});
