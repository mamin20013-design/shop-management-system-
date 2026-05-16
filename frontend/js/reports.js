// ═══════════════════════════════════════════════
//  REPORTS MODULE
// ═══════════════════════════════════════════════
const Reports = {
  async init() { await this.render(); },

  async render() {
    let summary, daily;
    try {
      [summary, daily] = await Promise.all([
        API.reports.summary(),
        API.reports.daily()
      ]);
    } catch(e) { toast(e.message, 'error'); return; }

    const s = summary.summary || {};
    const topProds = summary.topProducts || [];
    const payBreak = summary.paymentBreakdown || {};
    const days     = daily.daily || [];

    // Simple bar chart using divs
    const maxRev = Math.max(...days.map(d => d.revenue), 1);
    const barChart = days.map(d => {
      const h = Math.round((d.revenue / maxRev) * 80);
      return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;">
        <div style="font-size:9px;color:var(--text3)">${fmt(d.revenue)}</div>
        <div style="height:${h}px;min-height:4px;background:var(--accent);border-radius:4px 4px 0 0;width:100%;transition:.3s;"></div>
        <div style="font-size:9px;color:var(--text3);text-align:center">${d.date}</div>
        <div style="font-size:9px;color:var(--text2)">${d.orders} orders</div>
      </div>`;
    }).join('');

    document.getElementById('page-content').innerHTML = `
    <h2 style="font-size:17px;font-weight:700;margin-bottom:16px;">Reports & Analytics</h2>

    <div class="grid4" style="margin-bottom:18px;">
      <div class="stat-card">
        <div class="label">Total Revenue</div>
        <div class="value" style="font-size:18px;color:var(--accent2)">${fmt(s.totalRevenue||0)}</div>
      </div>
      <div class="stat-card">
        <div class="label">Total Orders</div>
        <div class="value">${s.totalOrders||0}</div>
      </div>
      <div class="stat-card">
        <div class="label">Avg Bill Value</div>
        <div class="value" style="font-size:18px">${fmt(s.avgBill||0)}</div>
      </div>
      <div class="stat-card">
        <div class="label">Est. Profit</div>
        <div class="value" style="font-size:18px;color:var(--green)">${fmt(s.inventoryValue||0)}</div>
        <div class="sub">Inventory value</div>
      </div>
    </div>

    <!-- Weekly Chart -->
    <div class="card" style="margin-bottom:18px;">
      <div class="card-head"><h3>📊 Last 7 Days Revenue</h3></div>
      <div style="display:flex;align-items:flex-end;gap:8px;height:120px;padding:0 8px;">
        ${barChart}
      </div>
    </div>

    <div class="grid2" style="margin-bottom:18px;">
      <div class="card">
        <div class="card-head"><h3>🏆 Top Selling Products</h3></div>
        ${topProds.length ? topProds.map((p,i) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="width:20px;height:20px;background:var(--bg3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700">${i+1}</span>
              ${p.name}
            </div>
            <div style="text-align:right">
              <div style="font-weight:600;color:var(--accent2)">${p.qty} sold</div>
              <div style="font-size:10px;color:var(--text3)">${fmt(p.revenue)}</div>
            </div>
          </div>`).join('') : '<div class="empty-state" style="padding:20px;"><span class="ei">📊</span>No sales data yet</div>'}
      </div>

      <div class="card">
        <div class="card-head"><h3>💳 Payment Methods</h3></div>
        ${Object.entries(payBreak).length ? Object.entries(payBreak).map(([method, count]) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px;">
            <span>${method}</span>
            <span class="pill pill-purple">${count} bills</span>
          </div>`).join('') : '<div class="empty-state" style="padding:20px;"><span class="ei">💳</span>No payment data yet</div>'}

        <div class="divider"></div>
        <div style="font-size:11px;color:var(--text3);">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Low Stock Items</span><span style="color:var(--amber);font-weight:600">${s.lowStock||0}</span></div>
          <div style="display:flex;justify-content:space-between;"><span>Total Customers</span><span style="color:var(--blue);font-weight:600">${s.customers||0}</span></div>
        </div>
      </div>
    </div>

    <!-- Export Button -->
    <div style="display:flex;justify-content:flex-end;gap:8px;">
      <button class="btn btn-ghost" onclick="Reports.exportCSV()">📤 Export CSV</button>
    </div>`;
  },

  async exportCSV() {
    try {
      const data = await API.orders.list({ limit: 1000 });
      const orders = data.orders || [];
      const rows = [
        ['Bill#','Customer','Date','Items','Subtotal','Discount','Tax','Total','Payment','Status'],
        ...orders.map(o => [
          o.billNo, o.customerName,
          new Date(o.createdAt).toLocaleDateString(),
          o.items.length, o.subtotal, o.discountAmt, o.taxAmt, o.total,
          o.paymentMethod, o.status
        ])
      ];
      const csv = rows.map(r => r.join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `dukanpro_orders_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      toast('Orders exported as CSV!');
    } catch(e) { toast(e.message, 'error'); }
  }
};
