// ═══════════════════════════════════════════════
//  DELIVERY MODULE
// ═══════════════════════════════════════════════
const Delivery = {
  async init() { await this.render(); },

  async render() {
    let data, ordersData, custsData;
    try {
      [data, ordersData, custsData] = await Promise.all([
        API.deliveries.list(),
        API.orders.list({ limit: 100 }),
        API.customers.list()
      ]);
    } catch(e) { toast(e.message, 'error'); return; }

    const deliveries = data.deliveries || [];
    const pending   = deliveries.filter(d => d.status === 'pending').length;
    const transit   = deliveries.filter(d => d.status === 'in-transit').length;
    const done      = deliveries.filter(d => d.status === 'delivered').length;

    document.getElementById('page-content').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2 style="font-size:17px;font-weight:700;">Delivery Management</h2>
      <button class="btn btn-primary" onclick="Delivery.openModal()">+ New Delivery</button>
    </div>
    <div class="grid3" style="margin-bottom:18px;">
      <div class="stat-card"><div class="label">⏳ Pending</div><div class="value" style="color:var(--amber)">${pending}</div></div>
      <div class="stat-card"><div class="label">🚚 In Transit</div><div class="value" style="color:var(--blue)">${transit}</div></div>
      <div class="stat-card"><div class="label">✅ Delivered</div><div class="value" style="color:var(--green)">${done}</div></div>
    </div>
    <div class="card">
      <table>
        <thead><tr><th>Del #</th><th>Customer</th><th>Address</th><th>Order</th><th>Rider</th><th>Fee</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          ${deliveries.length ? deliveries.map(d => `
          <tr>
            <td style="font-weight:700">${d.deliveryNo}</td>
            <td>${d.customerName || '-'}</td>
            <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.address}</td>
            <td>${d.order ? '#' + (d.order.billNo || '') : '-'}</td>
            <td>${d.riderName || '<span style="color:var(--text3)">Unassigned</span>'}</td>
            <td>${fmt(d.deliveryFee)}</td>
            <td>${statusPill(d.status)}</td>
            <td>
              <div style="display:flex;gap:5px;">
                <select class="inp" style="width:120px;font-size:10px;padding:3px 6px;"
                  onchange="Delivery.updateStatus('${d._id}',this.value)">
                  ${['pending','assigned','in-transit','delivered','failed'].map(s =>
                    `<option ${d.status===s?'selected':''} value="${s}">${s}</option>`
                  ).join('')}
                </select>
                <button class="btn btn-danger btn-sm" onclick="Delivery.delete('${d._id}')">🗑</button>
              </div>
            </td>
          </tr>`).join('') : `<tr><td colspan="8"><div class="empty-state"><span class="ei">🚚</span>No deliveries yet</div></td></tr>`}
        </tbody>
      </table>
    </div>

    <!-- Delivery Modal -->
    <div class="modal-overlay" id="modal-delivery">
      <div class="modal">
        <h2>🚚 New Delivery Order</h2>
        <div class="form-row">
          <div class="form-group">
            <label>Customer *</label>
            <select class="inp" id="d-customer">
              <option value="">Select Customer</option>
              ${(custsData.customers||[]).map(c=>`<option value="${c._id}">${c.name} (${c.phone})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Linked Order</label>
            <select class="inp" id="d-order">
              <option value="">Select Order</option>
              ${(ordersData.orders||[]).map(o=>`<option value="${o._id}">#${o.billNo} — ${o.customerName} (${fmt(o.total)})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Delivery Address *</label>
          <input class="inp" id="d-address" placeholder="Full delivery address...">
        </div>
        <div class="form-row">
          <div class="form-group"><label>Rider Name</label><input class="inp" id="d-rider" placeholder="Rider name"></div>
          <div class="form-group"><label>Rider Phone</label><input class="inp" id="d-rphone" placeholder="0300-..."></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Delivery Fee (Rs)</label><input class="inp" id="d-fee" type="number" value="0"></div>
          <div class="form-group"><label>Scheduled Time</label><input class="inp" id="d-time" type="datetime-local"></div>
        </div>
        <div class="form-group"><label>Notes</label><input class="inp" id="d-notes" placeholder="Special instructions..."></div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('modal-delivery')">Cancel</button>
          <button class="btn btn-primary" onclick="Delivery.save()">Create Delivery</button>
        </div>
      </div>
    </div>`;
  },

  openModal() { openModal('modal-delivery'); },

  async save() {
    const custId  = document.getElementById('d-customer').value;
    const address = document.getElementById('d-address').value.trim();
    if (!custId || !address) { toast('Customer and address are required', 'error'); return; }
    const payload = {
      customer:    custId,
      order:       document.getElementById('d-order').value || undefined,
      address,
      riderName:   document.getElementById('d-rider').value,
      riderPhone:  document.getElementById('d-rphone').value,
      deliveryFee: parseFloat(document.getElementById('d-fee').value) || 0,
      scheduledAt: document.getElementById('d-time').value || undefined,
      notes:       document.getElementById('d-notes').value
    };
    try {
      await API.deliveries.create(payload);
      toast('Delivery created!');
      closeModal('modal-delivery');
      await this.render();
    } catch(e) { toast(e.message, 'error'); }
  },

  async updateStatus(id, status) {
    try { await API.deliveries.update(id, { status }); toast('Status updated'); this.render(); }
    catch(e) { toast(e.message, 'error'); }
  },

  async delete(id) {
    if (!confirmDelete('Delete this delivery?')) return;
    try { await API.deliveries.delete(id); toast('Deleted'); this.render(); }
    catch(e) { toast(e.message, 'error'); }
  }
};
