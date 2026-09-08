/* Dashboard: statistics cards, category bar chart, appointments trend,
   and recent-activity feeds. */
(function () {
  'use strict';
  const { svg, fmtDateTime, pill, escapeHtml } = window.AdminUI;

  document.addEventListener('DOMContentLoaded', async () => {
    const { content } = await AdminShell.init('dashboard', 'Dashboard');
    content.innerHTML = `
      <div class="stat-grid" id="statGrid">
        ${Array(8).fill('<div class="stat-card"><div class="skeleton" style="width:50px;height:50px;border-radius:12px"></div><div style="flex:1"><div class="skeleton" style="height:26px;width:50%;margin-bottom:6px"></div><div class="skeleton" style="height:12px;width:70%"></div></div></div>').join('')}
      </div>
      <div class="two-col">
        <div class="panel">
          <div class="panel__head"><h3>Products by category</h3></div>
          <div class="panel__body"><div class="bars" id="catBars"></div></div>
        </div>
        <div class="panel">
          <div class="panel__head"><h3>Appointments (last 6 months)</h3></div>
          <div class="panel__body"><div class="bars" id="trendBars"></div></div>
        </div>
      </div>
      <div class="two-col">
        <div class="panel">
          <div class="panel__head"><h3>Recent appointments</h3><a href="appointments.html" class="btn btn--outline btn--sm">View all</a></div>
          <div class="panel__body panel__body--flush"><div class="table-wrap"><table class="data" id="recentAppts"></table></div></div>
        </div>
        <div class="panel">
          <div class="panel__head"><h3>Recent activity</h3></div>
          <div class="panel__body"><ul class="feed" id="activityFeed"></ul></div>
        </div>
      </div>
      <div class="two-col">
        <div class="panel">
          <div class="panel__head"><h3>Recently added products</h3><a href="products.html" class="btn btn--outline btn--sm">Manage</a></div>
          <div class="panel__body panel__body--flush"><div class="table-wrap"><table class="data" id="recentProducts"></table></div></div>
        </div>
        <div class="panel">
          <div class="panel__head"><h3>Recent inquiries</h3><a href="inquiries.html" class="btn btn--outline btn--sm">View all</a></div>
          <div class="panel__body panel__body--flush"><div class="table-wrap"><table class="data" id="recentInquiries"></table></div></div>
        </div>
      </div>`;

    try {
      const [statsRes, activityRes] = await Promise.all([
        API.get('/admin/dashboard/statistics'),
        API.get('/admin/dashboard/activity'),
      ]);
      renderStats(statsRes.stats);
      renderBars(statsRes.byCategory, statsRes.stats);
      renderTrend(statsRes.appointmentsTrend);
      renderRecentAppts(activityRes.appointments);
      renderRecentProducts(activityRes.products);
      renderRecentInquiries(activityRes.inquiries);
      renderActivity(activityRes.actions);
    } catch (e) {
      content.querySelector('#statGrid').innerHTML = `<div class="empty" style="grid-column:1/-1">Unable to load dashboard data. <button class="btn btn--outline btn--sm" onclick="location.reload()">Retry</button></div>`;
    }
  });

  function statCard(icon, cls, value, label) {
    return `<div class="stat-card"><div class="ico ${cls}">${svg(icon, 24)}</div><div><b>${value}</b><span>${label}</span></div></div>`;
  }

  function renderStats(s) {
    document.getElementById('statGrid').innerHTML =
      statCard('<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>', 'i-brown', s.total_products, 'Total products') +
      statCard('<path d="M20 6 9 17l-5-5"/>', 'i-green', s.available_products, 'Available products') +
      statCard('<path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/>', 'i-amber', s.featured_products, 'Featured products') +
      statCard('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', 'i-amber', s.pending_appointments, 'Pending appointments') +
      statCard('<path d="M20 6 9 17l-5-5"/>', 'i-green', s.approved_appointments, 'Approved appointments') +
      statCard('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>', 'i-blue', s.completed_appointments, 'Completed appointments') +
      statCard('<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>', 'i-brown', s.rejected_appointments, 'Rejected appointments') +
      statCard('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', 'i-brown', s.new_inquiries, 'New inquiries');
  }

  function renderBars(byCat, stats) {
    const el = document.getElementById('catBars');
    if (!byCat || !byCat.length) { el.innerHTML = '<p class="muted">No products yet.</p>'; return; }
    const max = Math.max(...byCat.map((c) => c.count), 1);
    el.innerHTML = byCat
      .map((c) => `<div class="bar-row"><span>${escapeHtml(c.category)}</span><div class="bar-track"><div class="bar-fill" style="width:${(c.count / max) * 100}%"></div></div><b>${c.count}</b></div>`)
      .join('');
  }

  function renderTrend(trend) {
    const el = document.getElementById('trendBars');
    if (!trend || !trend.length) { el.innerHTML = '<p class="muted">No appointment history yet.</p>'; return; }
    const max = Math.max(...trend.map((t) => t.count), 1);
    el.innerHTML = trend
      .map((t) => {
        const label = new Date(t.month + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
        return `<div class="bar-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${(t.count / max) * 100}%"></div></div><b>${t.count}</b></div>`;
      })
      .join('');
  }

  function renderRecentAppts(list) {
    const t = document.getElementById('recentAppts');
    if (!list || !list.length) { t.innerHTML = emptyRow(3, 'No appointments yet.'); return; }
    t.innerHTML =
      '<thead><tr><th>Reference</th><th>Customer</th><th>Status</th></tr></thead><tbody>' +
      list.map((a) => `<tr><td><b>${escapeHtml(a.booking_reference)}</b><br><small class="muted">${escapeHtml(a.furniture_type)}</small></td><td>${escapeHtml(a.customer_name)}</td><td>${pill(a.status)}</td></tr>`).join('') +
      '</tbody>';
  }

  function renderRecentProducts(list) {
    const t = document.getElementById('recentProducts');
    if (!list || !list.length) { t.innerHTML = emptyRow(2, 'No products yet.'); return; }
    t.innerHTML =
      '<thead><tr><th>Product</th><th>Added</th></tr></thead><tbody>' +
      list.map((p) => `<tr><td><b>${escapeHtml(p.name)}</b><br><small class="muted">${escapeHtml(p.category)}</small></td><td class="muted">${fmtDateTime(p.created_at)}</td></tr>`).join('') +
      '</tbody>';
  }

  function renderRecentInquiries(list) {
    const t = document.getElementById('recentInquiries');
    if (!list || !list.length) { t.innerHTML = emptyRow(3, 'No inquiries yet.'); return; }
    t.innerHTML =
      '<thead><tr><th>From</th><th>Subject</th><th>Status</th></tr></thead><tbody>' +
      list.map((i) => `<tr><td>${escapeHtml(i.name)}</td><td>${escapeHtml(i.subject)}</td><td>${pill(i.status)}</td></tr>`).join('') +
      '</tbody>';
  }

  function renderActivity(list) {
    const el = document.getElementById('activityFeed');
    if (!list || !list.length) { el.innerHTML = '<li><span class="muted">No recent activity.</span></li>'; return; }
    const labels = {
      'product.create': 'added a product', 'product.update': 'updated a product', 'product.delete': 'deleted a product',
      'product.publish': 'changed product visibility', 'appointment.status': 'updated an appointment',
      'inquiry.status': 'updated an inquiry', 'admin.login': 'signed in', 'settings.update': 'updated settings',
    };
    el.innerHTML = list
      .map((a) => `<li><span class="dot">${svg('<path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/>', 16)}</span><div><b>${escapeHtml(a.admin_name || 'System')}</b> ${labels[a.action] || escapeHtml(a.action)}${a.detail ? ` — <span class="muted">${escapeHtml(a.detail)}</span>` : ''}<small>${fmtDateTime(a.created_at)}</small></div></li>`)
      .join('');
  }

  function emptyRow(cols, msg) {
    return `<tbody><tr><td colspan="${cols}" class="muted" style="text-align:center;padding:24px">${msg}</td></tr></tbody>`;
  }
})();
