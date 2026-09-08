/* Admin core: session guard, app-shell (sidebar + topbar), and shared helpers.
   Every admin page calls AdminShell.init('pageKey', 'Page Title'). */
(function (global) {
  'use strict';

  const NAV = [
    { key: 'dashboard', label: 'Dashboard', href: 'dashboard.html', icon: '<path d="M3 13h8V3H3zM13 21h8V3h-8zM3 21h8v-6H3z"/>' },
    { key: 'products', label: 'Products', href: 'products.html', icon: '<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>' },
    { key: 'product-form', label: 'Add Product', href: 'product-form.html', icon: '<circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>' },
    { key: 'appointments', label: 'Appointments', href: 'appointments.html', icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', countKey: 'pending_appointments' },
    { key: 'inquiries', label: 'Inquiries', href: 'inquiries.html', icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', countKey: 'new_inquiries' },
    { key: 'payments', label: 'Payments', href: 'payments.html', icon: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>' },
    { key: 'settings', label: 'Website Settings', href: 'settings.html', icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>' },
    { key: 'profile', label: 'Admin Profile', href: 'profile.html', icon: '<circle cx="12" cy="8" r="4"/><path d="M6 21v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1"/>' },
  ];

  let currentAdmin = null;

  function svg(inner, size = 19) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  }

  function initials(name) {
    return (name || 'A').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  }

  async function guard() {
    try {
      const { admin } = await API.me();
      currentAdmin = admin;
      return admin;
    } catch (e) {
      location.href = 'login.html';
      throw e;
    }
  }

  function renderShell(activeKey, title) {
    const links = NAV.map(
      (n) => `<a class="side-link ${n.key === activeKey ? 'active' : ''}" href="${n.href}" data-count="${n.countKey || ''}">
        ${svg(n.icon)}<span>${n.label}</span>${n.countKey ? '<span class="count" style="display:none">0</span>' : ''}
      </a>`
    ).join('');

    const shell = `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar__brand">
          <img src="../assets/logo.png" alt="Mengistu Furniture">
          <div><b>Mengistu</b><br><small>ADMIN PANEL</small></div>
        </div>
        <div class="sidebar__section">Manage</div>
        ${links}
        <div class="sidebar__foot">
          <a class="side-link" id="logoutLink">${svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>')}<span>Logout</span></a>
        </div>
      </aside>
      <div class="sidebar-overlay" id="sidebarOverlay"></div>
      <div class="main">
        <div class="topbar-admin">
          <div style="display:flex;align-items:center;gap:12px">
            <button class="mobile-menu-btn" id="menuBtn">${svg('<path d="M3 12h18M3 6h18M3 18h18"/>', 22)}</button>
            <h1>${title}</h1>
          </div>
          <div class="topbar-admin__right">
            <a href="../index.html" target="_blank" class="btn btn--outline btn--sm">View site</a>
            <div class="admin-chip">
              <div class="avatar" id="adminAvatar">A</div>
              <div><b id="adminName">…</b><small id="adminRole"></small></div>
            </div>
          </div>
        </div>
        <div class="content" id="adminContent"></div>
      </div>`;

    const app = document.getElementById('app');
    app.className = 'app';
    app.innerHTML = shell;

    // Fill admin identity
    document.getElementById('adminName').textContent = currentAdmin.name;
    document.getElementById('adminRole').textContent = currentAdmin.role === 'super_admin' ? 'Super Admin' : 'Admin';
    document.getElementById('adminAvatar').textContent = initials(currentAdmin.name);

    // Hide super-admin-only nav for regular admins? Settings & profile allowed for all.
    // Wire logout
    document.getElementById('logoutLink').addEventListener('click', async () => {
      try { await API.logout(); } catch (_) {}
      location.href = 'login.html';
    });

    // Mobile sidebar
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebarOverlay');
    document.getElementById('menuBtn').addEventListener('click', () => { sb.classList.toggle('open'); ov.classList.toggle('open'); });
    ov.addEventListener('click', () => { sb.classList.remove('open'); ov.classList.remove('open'); });

    updateBadges();
  }

  async function updateBadges() {
    try {
      const { stats } = await API.get('/admin/dashboard/statistics');
      document.querySelectorAll('.side-link[data-count]').forEach((el) => {
        const key = el.dataset.count;
        if (!key) return;
        const badge = el.querySelector('.count');
        if (!badge) return;
        const val = stats[key] || 0;
        if (val > 0) { badge.textContent = val; badge.style.display = ''; }
        else badge.style.display = 'none';
      });
    } catch (_) {}
  }

  async function init(activeKey, title) {
    await guard();
    renderShell(activeKey, title);
    return { admin: currentAdmin, content: document.getElementById('adminContent') };
  }

  // ── Shared helpers ────────────────────────────────────────────────────────
  function pill(status) {
    const map = {
      Pending: 'pending', Approved: 'approved', Rejected: 'rejected', Completed: 'completed', Cancelled: 'cancelled',
      New: 'new', Read: 'read', Responded: 'responded',
    };
    return `<span class="pill pill--${map[status] || 'draft'}">${status}</span>`;
  }
  function fmtDate(s) { return s ? new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
  function fmtDateTime(s) { return s ? new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; }

  function confirmModal({ title = 'Are you sure?', message = '', confirmText = 'Confirm', danger = true }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'a-modal-overlay open';
      overlay.innerHTML = `
        <div class="a-modal" style="max-width:420px">
          <div class="a-modal__head"><h3>${title}</h3></div>
          <div class="a-modal__body"><p style="margin:0;color:var(--muted)">${message}</p></div>
          <div class="a-modal__foot">
            <button class="btn btn--outline btn--sm" data-act="cancel">Cancel</button>
            <button class="btn ${danger ? 'btn--primary' : 'btn--choco'} btn--sm" data-act="ok">${confirmText}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const close = (v) => { overlay.remove(); resolve(v); };
      overlay.querySelector('[data-act=cancel]').onclick = () => close(false);
      overlay.querySelector('[data-act=ok]').onclick = () => close(true);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
    });
  }

  function openModal(html, maxWidth = 560) {
    const overlay = document.createElement('div');
    overlay.className = 'a-modal-overlay open';
    overlay.innerHTML = `<div class="a-modal" style="max-width:${maxWidth}px">${html}</div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    return { overlay, close: () => overlay.remove() };
  }

  global.AdminShell = { init, updateBadges, NAV };
  global.AdminUI = {
    pill, fmtDate, fmtDateTime, confirmModal, openModal,
    toast: (m, t, title) => window.UI.toast(m, t, title),
    escapeHtml: (s) => window.UI.escapeHtml(s),
    formatETB: (n) => window.UI.formatETB(n),
    svg,
  };
})(window);
