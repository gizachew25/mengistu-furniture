/* Custom furniture page: load recent custom pieces into the gallery. */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('customGallery');
    if (!grid) return;
    try {
      const { products } = await API.products('category=Custom%20Furniture&limit=6');
      if (products.length) {
        grid.innerHTML = products.map(ProductUI.card).join('');
        ProductUI.wireCards(grid);
        if (window.i18n) window.i18n.apply();
      } else {
        grid.innerHTML =
          '<p class="muted text-center" style="grid-column:1/-1">Custom pieces coming soon. <a href="appointment.html">Book yours →</a></p>';
      }
    } catch (_) {
      grid.innerHTML = '<p class="muted text-center" style="grid-column:1/-1">Unable to load gallery right now.</p>';
    }
  });
})();
