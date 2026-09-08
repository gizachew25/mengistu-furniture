/* Catalogue page: category filter, search (debounced), sort, availability,
   pagination — all driven by the backend API and reflected in the URL. */
(function () {
  'use strict';

  const CATS = ['Sofas', 'Beds', 'Chairs', 'Dining Tables', 'Bufies/Cabinets', 'Custom Furniture', 'Other'];
  const state = { category: '', q: '', sort: 'newest', availability: '', page: 1, limit: 12 };

  const grid = document.getElementById('grid');
  const meta = document.getElementById('resultMeta');
  const pag = document.getElementById('pagination');

  function readUrl() {
    const u = new URLSearchParams(location.search);
    state.category = u.get('category') || '';
    state.q = u.get('q') || '';
    state.sort = u.get('sort') || 'newest';
    state.page = parseInt(u.get('page'), 10) || 1;
  }
  function writeUrl() {
    const u = new URLSearchParams();
    if (state.category) u.set('category', state.category);
    if (state.q) u.set('q', state.q);
    if (state.sort !== 'newest') u.set('sort', state.sort);
    if (state.page > 1) u.set('page', state.page);
    history.replaceState(null, '', location.pathname + (u.toString() ? '?' + u : ''));
  }

  function renderPills() {
    const wrap = document.getElementById('catPills');
    const all = [{ label: 'All', value: '' }, ...CATS.map((c) => ({ label: c, value: c }))];
    wrap.innerHTML = all
      .map((c) => `<button class="cat-pill ${state.category === c.value ? 'active' : ''}" data-cat="${c.value}">${c.label}</button>`)
      .join('');
    wrap.querySelectorAll('.cat-pill').forEach((b) =>
      b.addEventListener('click', () => {
        state.category = b.dataset.cat;
        state.page = 1;
        renderPills();
        load();
      })
    );
  }

  function buildQuery() {
    const p = new URLSearchParams();
    p.set('page', state.page);
    p.set('limit', state.limit);
    p.set('sort', state.sort);
    if (state.category) p.set('category', state.category);
    if (state.q) p.set('q', state.q);
    if (state.availability) p.set('availability', state.availability);
    return p.toString();
  }

  async function load() {
    writeUrl();
    grid.innerHTML = Array(4).fill('<div class="skeleton sk-card"></div>').join('');
    pag.innerHTML = '';
    try {
      const { products, pagination } = await API.products(buildQuery());
      if (!products.length) {
        grid.innerHTML = `
          <div class="state" style="grid-column:1/-1">
            <div class="ico"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M20 7 12 3 4 7v10l8 4 8-4V7Z"/><path d="m4 7 8 4 8-4M12 21V11"/></svg></div>
            <h3>No furniture found</h3>
            <p>Try a different category or search term.</p>
          </div>`;
        meta.textContent = 'No results';
        return;
      }
      grid.innerHTML = products.map(ProductUI.card).join('');
      ProductUI.wireCards(grid);
      if (window.i18n) window.i18n.apply();
      const from = (pagination.page - 1) * pagination.limit + 1;
      const to = Math.min(pagination.total, from + products.length - 1);
      meta.textContent = `Showing ${from}–${to} of ${pagination.total} pieces`;
      renderPagination(pagination);
    } catch (e) {
      grid.innerHTML = `<div class="state" style="grid-column:1/-1"><h3>Unable to load furniture</h3><p>${e.message}</p><button class="btn btn--outline btn--sm" onclick="location.reload()">Retry</button></div>`;
      meta.textContent = '';
    }
  }

  function renderPagination(p) {
    if (p.pages <= 1) return;
    let html = `<button ${p.page === 1 ? 'disabled' : ''} data-page="${p.page - 1}">‹</button>`;
    for (let i = 1; i <= p.pages; i += 1) {
      if (i === 1 || i === p.pages || Math.abs(i - p.page) <= 1) {
        html += `<button class="${i === p.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
      } else if (Math.abs(i - p.page) === 2) {
        html += `<button disabled>…</button>`;
      }
    }
    html += `<button ${p.page === p.pages ? 'disabled' : ''} data-page="${p.page + 1}">›</button>`;
    pag.innerHTML = html;
    pag.querySelectorAll('button[data-page]').forEach((b) =>
      b.addEventListener('click', () => {
        state.page = parseInt(b.dataset.page, 10);
        load();
        window.scrollTo({ top: 200, behavior: 'smooth' });
      })
    );
  }

  let debounce;
  document.addEventListener('DOMContentLoaded', () => {
    readUrl();
    renderPills();
    document.getElementById('searchInput').value = state.q;
    document.getElementById('sortSelect').value = state.sort;

    document.getElementById('searchInput').addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        state.q = e.target.value.trim();
        state.page = 1;
        load();
      }, 350);
    });
    document.getElementById('sortSelect').addEventListener('change', (e) => {
      state.sort = e.target.value;
      state.page = 1;
      load();
    });
    document.getElementById('availSelect').addEventListener('change', (e) => {
      state.availability = e.target.value;
      state.page = 1;
      load();
    });
    load();
  });
})();
