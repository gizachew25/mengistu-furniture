/* Admin products: searchable, filterable, sortable, paginated table with
   publish/unpublish, edit, view and delete (with confirmation). */
(function () {
  'use strict';
  const { svg, pill, escapeHtml, formatETB, confirmModal, openModal, toast, fmtDateTime } = window.AdminUI;
  const CATS = ['Sofas', 'Beds', 'Chairs', 'Dining Tables', 'Bufies/Cabinets', 'Custom Furniture', 'Other'];

  const state = { q: '', category: '', sort: 'newest', published: '', page: 1, limit: 10 };
  let content;

  document.addEventListener('DOMContentLoaded', async () => {
    const shell = await AdminShell.init('products', 'Products');
    content = shell.content;
    content.innerHTML = `
      <div class="admin-toolbar">
        <div class="search">
          ${svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>')}
          <input type="search" id="q" placeholder="Search products…">
        </div>
        <select id="category"><option value="">All categories</option>${CATS.map((c) => `<option>${c}</option>`).join('')}</select>
        <select id="published"><option value="">All</option><option value="true">Published</option><option value="false">Unpublished</option></select>
        <select id="sort">
          <option value="newest">Newest</option>
          <option value="price_high">Price ↓</option>
          <option value="price_low">Price ↑</option>
          <option value="name_az">Name A–Z</option>
        </select>
        <a href="product-form.html" class="btn btn--primary btn--sm">${svg('<path d="M12 5v14M5 12h14"/>', 16)} Add product</a>
      </div>
      <div class="panel">
        <div class="panel__body panel__body--flush">
          <div class="table-wrap"><table class="data" id="tbl"></table></div>
        </div>
      </div>
      <div class="pagination" id="pagination"></div>`;

    document.getElementById('q').addEventListener('input', debounce((e) => { state.q = e.target.value.trim(); state.page = 1; load(); }, 350));
    document.getElementById('category').addEventListener('change', (e) => { state.category = e.target.value; state.page = 1; load(); });
    document.getElementById('published').addEventListener('change', (e) => { state.published = e.target.value; state.page = 1; load(); });
    document.getElementById('sort').addEventListener('change', (e) => { state.sort = e.target.value; state.page = 1; load(); });
    load();
  });

  function query() {
    const p = new URLSearchParams({ page: state.page, limit: state.limit, sort: state.sort });
    if (state.q) p.set('q', state.q);
    if (state.category) p.set('category', state.category);
    if (state.published) p.set('published', state.published);
    return p.toString();
  }

  async function load() {
    const tbl = document.getElementById('tbl');
    tbl.innerHTML = '<tbody>' + Array(5).fill('<tr><td colspan="6"><div class="skeleton skeleton-row"></div></td></tr>').join('') + '</tbody>';
    try {
      const { products, pagination } = await API.get('/admin/products?' + query());
      if (!products.length) {
        tbl.innerHTML = `<tbody><tr><td colspan="6"><div class="empty"><div class="ico">${svg('<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>', 48)}</div><h3>No products found</h3><p>Try changing filters or <a href="product-form.html">add a new product</a>.</p></div></td></tr></tbody>`;
        document.getElementById('pagination').innerHTML = '';
        return;
      }
      tbl.innerHTML =
        `<thead><tr><th>Product</th><th>Category</th><th>Price (ETB)</th><th>Status</th><th>Visibility</th><th></th></tr></thead><tbody>` +
        products.map(rowHtml).join('') +
        '</tbody>';
      wireRows();
      renderPagination(pagination);
    } catch (e) {
      tbl.innerHTML = `<tbody><tr><td colspan="6"><div class="empty">Unable to load products. ${escapeHtml(e.message)}</div></td></tr></tbody>`;
    }
  }

  function rowHtml(p) {
    const img = p.primary_image || '../assets/logo.png';
    const price = p.discount_price
      ? `<b>${formatETB(p.discount_price)}</b> <small class="muted" style="text-decoration:line-through">${formatETB(p.price)}</small>`
      : `<b>${formatETB(p.price)}</b>`;
    const stock = !p.availability ? '<span class="pill pill--no">Unavailable</span>'
      : p.stock_status === 'out_of_stock' ? '<span class="pill pill--no">Out of stock</span>'
      : p.stock_status === 'made_to_order' ? '<span class="pill pill--pending">Made to order</span>'
      : '<span class="pill pill--yes">Available</span>';
    const feat = p.featured ? ' <span class="pill pill--feat">★</span>' : '';
    return `<tr data-id="${p.id}">
      <td><div class="cell-media"><img src="${img}" alt="" onerror="this.src='../assets/logo.png'"><div><b>${escapeHtml(p.name)}</b>${feat}<br><small class="muted">Added ${fmtDateTime(p.created_at)}</small></div></div></td>
      <td>${escapeHtml(p.category)}</td>
      <td>${price}</td>
      <td>${stock}</td>
      <td><span class="pill ${p.is_published ? 'pill--pub' : 'pill--draft'}">${p.is_published ? 'Published' : 'Draft'}</span></td>
      <td><div class="row-actions">
        <button class="icon-btn" data-act="view" title="View">${svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>', 16)}</button>
        <button class="icon-btn" data-act="publish" title="${p.is_published ? 'Unpublish' : 'Publish'}">${svg(p.is_published ? '<path d="M17.94 17.94A10 10 0 0 1 12 20c-7 0-10-8-10-8a18 18 0 0 1 5.06-5.94M9.9 4.24A9 9 0 0 1 12 4c7 0 10 8 10 8a18 18 0 0 1-2.16 3.19M1 1l22 22"/>' : '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>', 16)}</button>
        <a class="icon-btn" href="product-form.html?id=${p.id}" title="Edit">${svg('<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>', 16)}</a>
        <button class="icon-btn icon-btn--danger" data-act="delete" title="Delete">${svg('<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>', 16)}</button>
      </div></td>
    </tr>`;
  }

  function wireRows() {
    content.querySelectorAll('tr[data-id]').forEach((tr) => {
      const id = tr.dataset.id;
      tr.querySelector('[data-act=view]').onclick = () => viewProduct(id);
      tr.querySelector('[data-act=publish]').onclick = () => togglePublish(id);
      tr.querySelector('[data-act=delete]').onclick = () => deleteProduct(id, tr);
    });
  }

  async function togglePublish(id) {
    try {
      const res = await API.patch(`/admin/products/${id}/publish`, {});
      toast(res.message, 'success');
      load();
      AdminShell.updateBadges();
    } catch (e) { toast(e.message, 'error'); }
  }

  async function deleteProduct(id, tr) {
    const name = tr.querySelector('.cell-media b').textContent;
    const ok = await confirmModal({ title: 'Delete product', message: `Delete “${name}”? This also removes its images and cannot be undone.`, confirmText: 'Delete' });
    if (!ok) return;
    try {
      await API.del(`/admin/products/${id}`);
      toast('Product deleted.', 'success');
      load();
    } catch (e) { toast(e.message, 'error'); }
  }

  async function viewProduct(id) {
    try {
      const { product: p } = await API.get(`/admin/products/${id}`);
      const imgs = (p.images || []).map((im) => `<img src="${im.url}" style="width:70px;height:70px;object-fit:cover;border-radius:8px" alt="">`).join('') || '<span class="muted">No images</span>';
      openModal(`
        <div class="a-modal__head"><h3>${escapeHtml(p.name)}</h3><button class="icon-btn" onclick="this.closest('.a-modal-overlay').remove()">✕</button></div>
        <div class="a-modal__body">
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">${imgs}</div>
          <div class="detail-row"><span class="k">Category</span><span class="v">${escapeHtml(p.category)}</span></div>
          <div class="detail-row"><span class="k">Price</span><span class="v">${formatETB(p.price)} ETB${p.discount_price ? ` (sale ${formatETB(p.discount_price)})` : ''}</span></div>
          <div class="detail-row"><span class="k">Availability</span><span class="v">${p.availability ? 'Available' : 'Unavailable'} · ${escapeHtml(p.stock_status)}</span></div>
          <div class="detail-row"><span class="k">Featured</span><span class="v">${p.featured ? 'Yes' : 'No'}</span></div>
          <div class="detail-row"><span class="k">Published</span><span class="v">${p.is_published ? 'Yes' : 'No'}</span></div>
          <div class="detail-row"><span class="k">Description</span><span class="v">${escapeHtml(p.description || '—')}</span></div>
        </div>
        <div class="a-modal__foot">
          <a href="product-form.html?id=${p.id}" class="btn btn--primary btn--sm">Edit product</a>
        </div>`);
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
