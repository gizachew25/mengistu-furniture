/* Shared UI for the public site: injects the header + footer, wires the mobile
   nav and language switch, and exposes toast + formatting helpers. */
(function (global) {
  'use strict';

  const BIZ = {
    name: 'Mengistu Furniture',
    tagline: 'Stylish Homes • Better Living',
    location: 'Yeduha Town, East Gojam, Amhara Region, Ethiopia',
    phone1: '+251970801754',
    phone2: '0921579056',
    email: 'mengistuteshome@gmail.com',
  };
  global.BIZ = BIZ;

  const tel = (n) => n.replace(/[^+\d]/g, '');

  // ── SVG icon set (inline, no external requests) ──────────────────────────
  const I = {
    phone: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    mail: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>',
    pin: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    fb: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6v1.9h2.8L15.7 15h-2.3v7A10 10 0 0 0 22 12Z"/></svg>',
    tg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.3 18.7 19c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.4 13 1.7 11.5c-1-.3-1-1 .2-1.5l18.7-7.2c.9-.3 1.6.2 1.3 1.5Z"/></svg>',
    ig: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
  };
  global.ICONS = I;

  const PAGES = [
    { href: 'index.html', key: 'nav.home' },
    { href: 'products.html', key: 'nav.furniture' },
    { href: 'custom.html', key: 'nav.custom' },
    { href: 'appointment.html', key: 'nav.appointments' },
    { href: 'about.html', key: 'nav.about' },
    { href: 'contact.html', key: 'nav.contact' },
  ];

  function currentFile() {
    const p = location.pathname.split('/').pop();
    return p === '' ? 'index.html' : p;
  }

  function renderHeader() {
    const here = currentFile();
    const navLinks = PAGES.map(
      (p) => `<a href="${p.href}" data-i18n="${p.key}" class="${here === p.href ? 'active' : ''}">${p.key}</a>`
    ).join('');

    return `
    <div class="topbar">
      <div class="container">
        <div class="topbar__contact">
          <span>${I.phone}<a href="tel:${tel(BIZ.phone1)}">${BIZ.phone1}</a></span>
          <span>${I.phone}<a href="tel:${tel(BIZ.phone2)}">${BIZ.phone2}</a></span>
          <span>${I.mail}<a href="mailto:${BIZ.email}">${BIZ.email}</a></span>
        </div>
        <div class="topbar__lang">
          <button class="lang-btn" data-lang="en">EN</button>
          <button class="lang-btn" data-lang="am">አማ</button>
        </div>
      </div>
    </div>
    <header class="site-header">
      <div class="container">
        <a href="index.html" class="brand">
          <img src="assets/logo.png" alt="Mengistu Furniture logo" width="52" height="52">
          <span>
            <span class="brand__name" data-i18n="brand.name">Mengistu Furniture</span><br>
            <span class="brand__tag" data-i18n="brand.tagline">Stylish Homes • Better Living</span>
          </span>
        </a>
        <nav class="nav" id="mainNav">
          ${navLinks}
          <a href="admin/login.html" class="btn btn--primary btn--sm nav__admin" data-i18n="nav.admin">Admin Login</a>
        </nav>
        <button class="hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>
    <div class="nav-overlay" id="navOverlay"></div>`;
  }

  function renderFooter() {
    const here = currentFile();
    const links = PAGES.map((p) => `<li><a href="${p.href}" data-i18n="${p.key}">${p.key}</a></li>`).join('');
    const year = new Date().getFullYear();
    return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <div class="footer-brand">
              <img src="${here.includes('admin') ? '../' : ''}assets/logo.png" alt="Mengistu Furniture logo" width="56" height="56">
              <span class="brand__name" data-i18n="brand.name">Mengistu Furniture</span>
            </div>
            <p style="color:#c9b4a3;font-size:.92rem;max-width:280px" data-i18n="brand.tagline">Stylish Homes • Better Living</p>
            <div class="social-row" id="socialRow">
              <a href="#" aria-label="Facebook">${I.fb}</a>
              <a href="#" aria-label="Telegram">${I.tg}</a>
              <a href="#" aria-label="Instagram">${I.ig}</a>
            </div>
          </div>
          <div>
            <h4 data-i18n="nav.furniture">Explore</h4>
            <ul>${links}</ul>
          </div>
          <div>
            <h4>Services</h4>
            <ul>
              <li><a href="products.html?category=Sofas">Sofas</a></li>
              <li><a href="products.html?category=Beds">Beds</a></li>
              <li><a href="products.html?category=Dining%20Tables">Dining Tables</a></li>
              <li><a href="products.html?category=Bufies%2FCabinets">Bufies / Cabinets</a></li>
              <li><a href="custom.html">Custom Furniture</a></li>
            </ul>
          </div>
          <div>
            <h4 data-i18n="nav.contact">Contact</h4>
            <ul class="footer-contact">
              <li>${I.pin}<span>${BIZ.location}</span></li>
              <li>${I.phone}<a href="tel:${tel(BIZ.phone1)}">${BIZ.phone1}</a></li>
              <li>${I.phone}<a href="tel:${tel(BIZ.phone2)}">${BIZ.phone2}</a></li>
              <li>${I.mail}<a href="mailto:${BIZ.email}">${BIZ.email}</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          © ${year} Mengistu Furniture. <span data-i18n="footer.rights">All Rights Reserved.</span>
        </div>
      </div>
    </footer>`;
  }

  function wireNav() {
    const burger = document.getElementById('hamburger');
    const nav = document.getElementById('mainNav');
    const overlay = document.getElementById('navOverlay');
    if (!burger || !nav) return;
    const close = () => {
      nav.classList.remove('open');
      overlay.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    };
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      overlay.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
    });
    overlay.addEventListener('click', close);
    nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  }

  // ── Toasts ────────────────────────────────────────────────────────────────
  function ensureToastWrap() {
    let w = document.querySelector('.toast-wrap');
    if (!w) {
      w = document.createElement('div');
      w.className = 'toast-wrap';
      document.body.appendChild(w);
    }
    return w;
  }
  function toast(message, type = 'info', title) {
    const wrap = ensureToastWrap();
    const el = document.createElement('div');
    el.className = 'toast toast--' + type;
    const heading = title || (type === 'success' ? 'Success' : type === 'error' ? 'Something went wrong' : 'Notice');
    el.innerHTML = `<div><b>${heading}</b><p>${message}</p></div>`;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(30px)';
      el.style.transition = 'all .3s';
      setTimeout(() => el.remove(), 320);
    }, 4200);
  }

  // ── Formatting ──────────────────────────────────────────────────────────
  function formatETB(n) {
    if (n == null) return '';
    return new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(Number(n));
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function stockLabel(status, availability) {
    if (!availability) return { cls: 'avail--out', text: 'Unavailable' };
    if (status === 'out_of_stock') return { cls: 'avail--out', text: 'Out of stock' };
    if (status === 'made_to_order') return { cls: 'avail--order', text: 'Made to order' };
    return { cls: 'avail--in', text: 'Available' };
  }

  function mountChrome() {
    const h = document.getElementById('site-header-mount');
    const f = document.getElementById('site-footer-mount');
    if (h) h.innerHTML = renderHeader();
    if (f) f.innerHTML = renderFooter();
    wireNav();
    if (global.i18n) global.i18n.apply();
    applySettings();
  }

  // Pull live settings (phones/socials) so footer reflects admin changes.
  async function applySettings() {
    try {
      const { settings } = await global.API.settings();
      if (!settings) return;
      const row = document.getElementById('socialRow');
      if (row) {
        const map = [
          ['facebook_url', I.fb, 'Facebook'],
          ['telegram_url', I.tg, 'Telegram'],
          ['instagram_url', I.ig, 'Instagram'],
        ];
        const html = map
          .filter(([k]) => settings[k])
          .map(([k, ico, label]) => `<a href="${escapeHtml(settings[k])}" target="_blank" rel="noopener" aria-label="${label}">${ico}</a>`)
          .join('');
        if (html) row.innerHTML = html;
      }
    } catch (_) { /* non-critical */ }
  }

  document.addEventListener('DOMContentLoaded', mountChrome);

  global.UI = { toast, formatETB, escapeHtml, stockLabel, tel };
})(window);
