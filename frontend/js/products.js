/* Product card rendering + shared detail modal.
   Used by index.html and products.html. */
(function (global) {
  'use strict';

  const { escapeHtml, formatETB, stockLabel } = global.UI;

  function imgUrl(url) {
    if (!url) return 'assets/logo.png';
    return url; // uploaded images are served from /uploads/... (absolute path)
  }

  function card(p) {
    const stock = stockLabel(p.stock_status, p.availability);
    const hasDiscount = p.discount_price != null && p.discount_price < p.price;
    const shown = hasDiscount ? p.discount_price : p.price;
    const badges = [];
    if (p.featured) badges.push('<span class="badge badge--featured">Featured</span>');
    if (hasDiscount) badges.push('<span class="badge badge--sale">Sale</span>');
    if (!p.availability || p.stock_status === 'out_of_stock') badges.push('<span class="badge badge--soldout">Sold out</span>');

    return `
      <article class="product-card" data-id="${p.id}">
        <div class="product-card__media">
          ${badges.length ? `<div class="product-card__badges">${badges.join('')}</div>` : ''}
          <img src="${imgUrl(p.primary_image)}" alt="${escapeHtml(p.name)}" loading="lazy" width="400" height="300"
               onerror="this.src='assets/logo.png';this.style.objectFit='contain';this.style.padding='24px'">
        </div>
        <div class="product-card__body">
          <span class="product-card__cat">${escapeHtml(p.category)}</span>
          <h3 class="product-card__name">${escapeHtml(p.name)}</h3>
          <p class="product-card__desc">${escapeHtml(p.description || '')}</p>
          <div class="product-card__foot">
            <div class="price">
              ${hasDiscount ? `<span class="old">${formatETB(p.price)}</span>` : ''}
              ${formatETB(shown)} <span class="etb">ETB</span>
            </div>
            <span class="avail ${stock.cls}">${stock.text}</span>
          </div>
          <button class="btn btn--outline btn--sm btn--block js-view" style="margin-top:14px" data-id="${p.id}" data-i18n="btn.viewDetails">View Details</button>
        </div>
      </article>`;
  }

  function wireCards(container) {
    container.querySelectorAll('.js-view').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDetail(btn.dataset.id);
      });
    });
    container.querySelectorAll('.product-card__media').forEach((m) => {
      m.addEventListener('click', () => {
        const id = m.closest('.product-card').dataset.id;
        openDetail(id);
      });
    });
  }

  async function openDetail(id) {
    const overlay = document.getElementById('productModal');
    const body = document.getElementById('modalBody');
    if (!overlay || !body) return;
    body.innerHTML = `<div style="grid-column:1/-1;padding:60px"><div class="spinner"></div></div>`;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    try {
      const { product: p } = await API.product(id);
      const images = (p.images && p.images.length ? p.images : [{ url: p.primary_image }]).filter((i) => i.url);
      const main = images[0] ? images[0].url : 'assets/logo.png';
      const stock = stockLabel(p.stock_status, p.availability);
      const hasDiscount = p.discount_price != null && p.discount_price < p.price;
      const shown = hasDiscount ? p.discount_price : p.price;
      const tel = global.BIZ.phone1.replace(/[^+\d]/g, '');

      body.innerHTML = `
        <div class="pd-gallery">
          <div class="pd-gallery__main">
            <img id="pdMain" src="${main}" alt="${escapeHtml(p.name)}"
                 onerror="this.src='assets/logo.png';this.style.objectFit='contain';this.style.padding='30px'">
          </div>
          ${images.length > 1 ? `<div class="pd-gallery__thumbs">${images
            .map((im, i) => `<img src="${im.url}" class="${i === 0 ? 'active' : ''}" data-src="${im.url}" alt="View ${i + 1}">`)
            .join('')}</div>` : ''}
        </div>
        <div class="pd-info">
          <span class="product-card__cat">${escapeHtml(p.category)}</span>
          <h2>${escapeHtml(p.name)}</h2>
          <div class="price" style="font-size:1.8rem;margin:6px 0 4px">
            ${hasDiscount ? `<span class="old">${formatETB(p.price)}</span>` : ''}
            ${formatETB(shown)} <span class="etb">ETB</span>
          </div>
          <p class="avail ${stock.cls}" style="margin-bottom:16px">${stock.text}</p>
          <p class="muted" style="white-space:pre-line">${escapeHtml(p.description || 'No description provided.')}</p>
          <div class="util-row" style="margin-top:24px">
            <a href="tel:${tel}" class="btn btn--primary">Call to order</a>
            <a href="appointment.html?type=${encodeURIComponent(p.category)}" class="btn btn--outline">Request customization</a>
          </div>
          <p class="muted" style="font-size:.84rem;margin-top:16px">Contact us at <a href="tel:${tel}">${global.BIZ.phone1}</a> or <a href="mailto:${global.BIZ.email}">${global.BIZ.email}</a> to place your order.</p>
        </div>`;

      // Thumbnail switching
      body.querySelectorAll('.pd-gallery__thumbs img').forEach((th) => {
        th.addEventListener('click', () => {
          document.getElementById('pdMain').src = th.dataset.src;
          body.querySelectorAll('.pd-gallery__thumbs img').forEach((x) => x.classList.remove('active'));
          th.classList.add('active');
        });
      });
    } catch (e) {
      body.innerHTML = `<div style="grid-column:1/-1;padding:50px" class="state"><p>This product could not be loaded. Please try again.</p></div>`;
    }
  }

  function closeModal() {
    const overlay = document.getElementById('productModal');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('productModal');
    const closeBtn = document.getElementById('modalClose');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  });

  global.ProductUI = { card, wireCards, openDetail, closeModal };
})(window);
