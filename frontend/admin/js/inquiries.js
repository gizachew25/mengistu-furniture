/* Admin inquiries: list customer messages, filter by status, read full message,
   mark Read / Responded, and delete. */
(function () {
  'use strict';
  const { svg, pill, escapeHtml, fmtDateTime, toast, openModal, confirmModal } = window.AdminUI;
  const STATUSES = ['New', 'Read', 'Responded'];

  const state = { status: '', q: '', page: 1, limit: 10 };
  let content;

  document.addEventListener('DOMContentLoaded', async () => {
    const shell = await AdminShell.init('inquiries', 'Inquiries');
    content = shell.content;
    content.innerHTML = `
      <div class="admin-toolbar">
        <div class="search">${svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>')}<input type="search" id="q" placeholder="Search messages…"></div>
        <select id="status"><option value="">All statuses</option>${STATUSES.map((s) => `<option>${s}</option>`).join('')}</select>
      </div>
      <div class="panel"><div class="panel__body panel__body--flush"><div class="table-wrap"><table class="data" id="tbl"></table></div></div></div>
      <div class="pagination" id="pagination"></div>`;

    document.getElementById('q').addEventListener('input', debounce((e) => { state.q = e.target.value.trim(); state.page = 1; load(); }, 350));
    document.getElementById('status').addEventListener('change', (e) => { state.status = e.target.value; state.page = 1; load(); });
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
    tbl.innerHTML = '<tbody>' + Array(5).fill('<tr><td colspan="5"><div class="skeleton skeleton-row"></div></td></tr>').join('') + '</tbody>';
    try {
      const { inquiries, pagination } = await API.get('/admin/inquiries?' + q());
      if (!inquiries.length) {
        tbl.innerHTML = `<tbody><tr><td colspan="5"><div class="empty"><div class="ico">${svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', 48)}</div><h3>No inquiries</h3><p>Messages from your contact form appear here.</p></div></td></tr></tbody>`;
        document.getElementById('pagination').innerHTML = ''; return;
      }
      tbl.innerHTML =
        `<thead><tr><th>From</th><th>Subject</th><th>Received</th><th>Status</th><th></th></tr></thead><tbody>` +
        inquiries.map(rowHtml).join('') + '</tbody>';
      content.querySelectorAll('tr[data-id]').forEach((tr) => {
        tr.querySelector('[data-act=open]').onclick = () => openDetail(tr.dataset.id);
        tr.querySelector('[data-act=del]').onclick = () => del(tr.dataset.id);
      });
      renderPagination(pagination);
    } catch (e) {
      tbl.innerHTML = `<tbody><tr><td colspan="5"><div class="empty">Unable to load inquiries. ${escapeHtml(e.message)}</div></td></tr></tbody>`;
    }
  }

  function rowHtml(i) {
    const strong = i.status === 'New' ? 'style="font-weight:600"' : '';
    return `<tr data-id="${i.id}" ${strong}>
      <td><b>${escapeHtml(i.name)}</b><br><small class="muted">${escapeHtml(i.email || i.phone || '')}</small></td>
      <td>${escapeHtml(i.subject)}</td>
      <td class="muted">${fmtDateTime(i.created_at)}</td>
      <td>${pill(i.status)}</td>
      <td><div class="row-actions">
        <button class="btn btn--outline btn--sm" data-act="open">Read</button>
        <button class="icon-btn icon-btn--danger" data-act="del" title="Delete">${svg('<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>', 16)}</button>
      </div></td>
    </tr>`;
  }

  async function openDetail(id) {
    try {
      // Opening marks it read (if New)
      const { inquiry: i } = await API.get(`/admin/inquiries/${id}`);
      if (i.status === 'New') { try { await API.put(`/admin/inquiries/${id}`, { status: 'Read' }); AdminShell.updateBadges(); } catch (_) {} }
      const { close } = openModal(`
        <div class="a-modal__head"><h3>${escapeHtml(i.subject)}</h3><button class="icon-btn" id="clz">✕</button></div>
        <div class="a-modal__body">
          <div class="detail-row"><span class="k">From</span><span class="v">${escapeHtml(i.name)}</span></div>
          ${i.email ? `<div class="detail-row"><span class="k">Email</span><span class="v"><a href="mailto:${escapeHtml(i.email)}">${escapeHtml(i.email)}</a></span></div>` : ''}
          ${i.phone ? `<div class="detail-row"><span class="k">Phone</span><span class="v"><a href="tel:${escapeHtml(i.phone)}">${escapeHtml(i.phone)}</a></span></div>` : ''}
          <div class="detail-row"><span class="k">Received</span><span class="v">${fmtDateTime(i.created_at)}</span></div>
          <div style="margin-top:14px;background:var(--cream);border-radius:10px;padding:14px;white-space:pre-line">${escapeHtml(i.message)}</div>
        </div>
        <div class="a-modal__foot">
          ${i.email ? `<a href="mailto:${escapeHtml(i.email)}?subject=Re: ${encodeURIComponent(i.subject)}" class="btn btn--outline btn--sm">Reply by email</a>` : ''}
          <button class="btn btn--primary btn--sm" id="respBtn">Mark responded</button>
        </div>`, 560);
      document.getElementById('clz').onclick = () => { close(); load(); };
      document.getElementById('respBtn').onclick = async () => {
        try { await API.put(`/admin/inquiries/${id}`, { status: 'Responded' }); toast('Marked as responded.', 'success'); close(); load(); AdminShell.updateBadges(); }
        catch (e) { toast(e.message, 'error'); }
      };
    } catch (e) { toast(e.message, 'error'); }
  }

  async function del(id) {
    const ok = await confirmModal({ title: 'Delete inquiry', message: 'Delete this message permanently?', confirmText: 'Delete' });
    if (!ok) return;
    try { await API.del(`/admin/inquiries/${id}`); toast('Inquiry deleted.', 'success'); load(); AdminShell.updateBadges(); }
    catch (e) { toast(e.message, 'error'); }
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
