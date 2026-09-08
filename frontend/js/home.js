/* Homepage: featured products, catalogue stat, live Telebirr number. */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', async () => {
    // Category pills
    const cats = ['Sofas', 'Beds', 'Chairs', 'Dining Tables', 'Bufies/Cabinets', 'Custom Furniture'];
    const wrap = document.getElementById('homeCats');
    if (wrap) {
      wrap.innerHTML = cats
        .map((c) => `<a class="cat-pill" href="products.html?category=${encodeURIComponent(c)}">${c}</a>`)
        .join('');
    }

    // Featured products (fall back to newest if none flagged featured)
    const grid = document.getElementById('featuredGrid');
    try {
      let { products } = await API.products('featured=true&limit=6');
      if (!products.length) {
        products = (await API.products('limit=6')).products;
      }
      grid.innerHTML = products.map(ProductUI.card).join('');
      ProductUI.wireCards(grid);
      if (window.i18n) window.i18n.apply();
    } catch (e) {
      grid.innerHTML = `<div class="state" style="grid-column:1/-1"><p>Furniture is loading slowly. Please refresh in a moment.</p></div>`;
    }

    // Catalogue count stat
    try {
      const all = await API.products('limit=1');
      const el = document.getElementById('statProducts');
      if (el) el.textContent = all.pagination.total + '+';
    } catch (_) {}

    // Live Telebirr number
    try {
      const { settings } = await API.settings();
      if (settings && settings.telebirr_number) {
        const el = document.getElementById('telebirrNumber');
        if (el) el.textContent = settings.telebirr_number;
      }
    } catch (_) {}
  });
})();
