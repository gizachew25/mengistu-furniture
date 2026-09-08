/* Admin appointments: filter by status, view full detail (with reference image),
   and change status (Approve / Reject / Complete / Cancel) with an admin note. */
(function () {
  'use strict';
  const { svg, pill, escapeHtml, fmtDate, fmtDateTime, toast, openModal } = window.AdminUI;
  const STATUSES = ['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled'];

  const state = { status: '', q: '', page: 1, limit: 10 };
  let content;

  document.addEventListener('DOMContentLoaded', async () => {
    const shell = await AdminShell.init('appointments', 'Appointments');
    content = shell.content;
    content.innerHTML = `
      <div class="admin-toolbar">
        <div class="search">${svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>')}<input type="search" id="q" placeholder="Search by name, phone or reference…"></div>
        <select id="status"><option value="">All statuses</option>${STATUSES.map((s) => `<option>${s}</option>`).join('')}</select>
      </div>
      <div class="chips" id="statusChips" style="margin-bottom:16px"></div>
      <div class="panel"><div class="panel__body panel__body--flush"><div class="table-wrap"><table class="data" id="tbl"></table></div></div></div>
      <div class="pagination" id="pagination"></div>`;

    // Quick status chips
    const chips = document.getElementById('statusChips');
    chips.innerHTML = [['', 'All'], ...STATUSES.map((s) => [s, s])]
      .map(([v, l]) => `<button class="cat-pill ${state.status === v ? 'active' : ''}" data-s="${v}">${l}</button>`).join('');
    chips.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      state.status = b.dataset.s; state.page = 1;
      document.getElementById('status').value = b.dataset.s;
      chips.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
      load();
    }));

    document.getElementById('q').addEventListener('input', debounce((e) => { state.q = e.target.value.trim(); state.page = 1; load(); }, 350));
    document.getElementById('status').addEventListener('change', (e) => {
      state.status = e.target.value; state.page = 1;
      chips.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x.dataset.s === e.target.value));
      load();
    });
    load();
  });

  function q() {
    const p = new URLSearchParams({ page: state.page, limit: state.limit });
    if (state.status) p.set('status', state.status);
    if (state.q) p.set('q', state.q);
    return p.toString();
  }

  async function load() {
    const tbl = document.getElementById('tbl');
    tbl.innerHTML = '<tbody>' + Array(5).fill('<tr><td colspan="6"><div class="skeleton skeleton-row"></div></td></tr>').join('') + '</tbody>';
    try {
      const { appointments, pagination } = await API.get('/admin/appointments?' + q());
      if (!appointments.length) {
        tbl.innerHTML = `<tbody><tr><td colspan="6"><div class="empty"><div class="ico">${svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', 48)}</div><h3>No appointments</h3><p>No requests match your filters.</p></div></td></tr></tbody>`;
        document.getElementById('pagination').innerHTML = ''; return;
      }
      tbl.innerHTML =
        `<thead><tr><th>Reference</th><th>Customer</th><th>Furniture</th><th>Preferred date</th><th>Status</th><th></th></tr></thead><tbody>` +
        appointments.map(rowHtml).join('') + '</tbody>';
      content.querySelectorAll('tr[data-id]').forEach((tr) => { tr.querySelector('[data-act=open]').onclick = () => openDetail(tr.dataset.id); });
      renderPagination(pagination);
    } catch (e) {
      tbl.innerHTML = `<tbody><tr><td colspan="6"><div class="empty">Unable to load appointments. ${escapeHtml(e.message)}</div></td></tr></tbody>`;
    }
  }

  function rowHtml(a) {
    return `<tr data-id="${a.id}">
      <td><b>${escapeHtml(a.booking_reference)}</b></td>
      <td>${escapeHtml(a.customer_name)}<br><small class="muted">${escapeHtml(a.phone)}</small></td>
      <td>${escapeHtml(a.furniture_type)}</td>
      <td>${fmtDate(a.preferred_date)}${a.preferred_time ? `<br><small class="muted">${escapeHtml(a.preferred_time)}</small>` : ''}</td>
      <td>${pill(a.status)}</td>
      <td><button class="btn btn--outline btn--sm" data-act="open">Manage</button></td>
    </tr>`;
  }

  async function openDetail(id) {
    try {
      const { appointment: a } = await API.get(`/admin/appointments/${id}`);
      const img = a.reference_image ? `<img src="${a.reference_image}" alt="Reference" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;margin-bottom:14px">` : '';
      const { close } = openModal(`
        <div class="a-modal__head"><h3>${escapeHtml(a.booking_reference)} · ${pill(a.status)}</h3><button class="icon-btn" id="clz">✕</button></div>
        <div class="a-modal__body">
          ${img}
          <div class="detail-row"><span class="k">Customer</span><span class="v">${escapeHtml(a.customer_name)}</span></div>
          <div class="detail-row"><span class="k">Phone</span><span class="v"><a href="tel:${escapeHtml(a.phone)}">${escapeHtml(a.phone)}</a></span></div>
          ${a.email ? `<div class="detail-row"><span class="k">Email</span><span class="v"><a href="mailto:${escapeHtml(a.email)}">${escapeHtml(a.email)}</a></span></div>` : ''}
          <div class="detail-row"><span class="k">Furniture</span><span class="v">${escapeHtml(a.furniture_type)}</span></div>
          <div class="detail-row"><span class="k">Preferred</span><span class="v">${fmtDate(a.preferred_date)} ${escapeHtml(a.preferred_time || '')}</span></div>
          <div class="detail-row"><span class="k">Description</span><span class="v" style="white-space:pre-line">${escapeHtml(a.description || '—')}</span></div>
          ${a.notes ? `<div class="detail-row"><span class="k">Customer notes</span><span class="v">${escapeHtml(a.notes)}</span></div>` : ''}
          <div class="detail-row"><span class="k">Submitted</span><span class="v">${fmtDateTime(a.created_at)}</span></div>
          <div class="field" style="margin-top:16px">
            <label for="adminNote">Note to customer / internal note</label>
            <textarea id="adminNote" style="min-height:70px">${escapeHtml(a.admin_note || '')}</textarea>
          </div>
        </div>
        <div class="a-modal__foot" style="flex-wrap:wrap">
          <button class="btn btn--outline btn--sm" data-s="Rejected">Reject</button>
          <button class="btn btn--outline btn--sm" data-s="Cancelled">Cancel</button>
          <button class="btn btn--choco btn--sm" data-s="Completed">Mark completed</button>
          <button class="btn btn--primary btn--sm" data-s="Approved">Approve</button>
        </div>`, 600);

      document.getElementById('clz').onclick = close;
      document.querySelectorAll('.a-modal__foot [data-s]').forEach((btn) => {
        btn.onclick = async () => {
          const status = btn.dataset.s;
          const admin_note = document.getElementById('adminNote').value.trim();
          btn.disabled = true;
          try {
            await API.put(`/admin/appointments/${id}/status`, { status, admin_note });
            toast(`Appointment marked ${status}.`, 'success');
            close(); load(); AdminShell.updateBadges();
          } catch (e) { toast(e.message, 'error'); btn.disabled = false; }
        };
      });
    } catch (e) { toast(e.message, 'error'); }
  }

  function renderPagination(p) {
    const el = document.getElementById('pagination');
    if (p.pages <= 1) { el.innerHTML = ''; return; }
    let html = `<button ${p.page === 1 ? 'disabled' : ''} data-p="${p.page - 1}">‹</button>`;
    for (let i = 1; i <= p.pages; i += 1) html += `<button class="${i === p.page ? 'active' : ''}" data-p="${i}">${i}</button>`;
    html += `<button ${p.page === p.pages ? 'disabled' : ''} data-p="${p.page + 1}">›</button>`;
    el.innerHTML = html;
    el.querySelectorAll('button[data-p]').forEach((b) => b.addEventListener('click', () => { state.page = +b.dataset.p; load(); }));
  }
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
})();
