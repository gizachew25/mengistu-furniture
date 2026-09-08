/* Bilingual (English | አማርኛ) support.
   Any element with data-i18n="key" gets its text swapped on language change.
   Structured so more Amharic strings can be added over time. */
(function (global) {
  'use strict';

  const DICT = {
    en: {
      'brand.name': 'Mengistu Furniture',
      'brand.tagline': 'Stylish Homes • Better Living',
      'nav.home': 'Home',
      'nav.furniture': 'Furniture',
      'nav.custom': 'Custom Furniture',
      'nav.appointments': 'Appointments',
      'nav.about': 'About',
      'nav.contact': 'Contact',
      'nav.admin': 'Admin Login',
      'btn.book': 'Book Now',
      'btn.explore': 'Explore Furniture',
      'btn.bookCustom': 'Book Custom Furniture',
      'btn.call': 'Call Us',
      'btn.viewDetails': 'View Details',
      'hero.lead':
        'Quality ready-made and custom furniture, handcrafted in Yeduha Town. From sofas and beds to bespoke pieces built to your exact design.',
      'section.featured': 'Featured Furniture',
      'section.featuredSub': 'A selection of our most-loved pieces, ready for your home.',
      'section.custom': 'Made by Appointment',
      'section.contact': 'Get in Touch',
      'footer.rights': 'All Rights Reserved.',
    },
    am: {
      'brand.name': 'መንግስቱ የቤት እቃ',
      'brand.tagline': 'ውብ ቤቶች • የተሻለ ኑሮ',
      'nav.home': 'መነሻ',
      'nav.furniture': 'የቤት እቃዎች',
      'nav.custom': 'በትዕዛዝ የሚሰራ',
      'nav.appointments': 'ቀጠሮ',
      'nav.about': 'ስለ እኛ',
      'nav.contact': 'አግኙን',
      'nav.admin': 'የአስተዳዳሪ መግቢያ',
      'btn.book': 'አሁን ይያዙ',
      'btn.explore': 'የቤት እቃዎችን ይመልከቱ',
      'btn.bookCustom': 'በትዕዛዝ ያዙ',
      'btn.call': 'ይደውሉልን',
      'btn.viewDetails': 'ዝርዝር ይመልከቱ',
      'hero.lead':
        'ጥራት ያለው ዝግጁ እና በትዕዛዝ የሚሰራ የቤት እቃ፣ በይዱሃ ከተማ በእጅ የተሰራ። ከሶፋና አልጋ እስከ በእርስዎ ንድፍ የሚሰሩ ልዩ እቃዎች።',
      'section.featured': 'ተመራጭ የቤት እቃዎች',
      'section.featuredSub': 'ለቤትዎ ዝግጁ የሆኑ በጣም ተወዳጅ እቃዎቻችን።',
      'section.custom': 'በቀጠሮ የሚሰራ',
      'section.contact': 'ያግኙን',
      'footer.rights': 'መብቱ በህግ የተጠበቀ ነው።',
    },
  };

  const KEY = 'mf_lang';
  let current = localStorage.getItem(KEY) || 'en';

  function t(key) {
    return (DICT[current] && DICT[current][key]) || (DICT.en[key] != null ? DICT.en[key] : key);
  }

  function apply() {
    document.documentElement.setAttribute('lang', current === 'am' ? 'am' : 'en');
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (val != null) el.textContent = val;
    });
    document.querySelectorAll('.lang-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.lang === current);
    });
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: current } }));
  }

  function set(lang) {
    current = lang === 'am' ? 'am' : 'en';
    localStorage.setItem(KEY, current);
    apply();
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.lang-btn');
    if (btn) set(btn.dataset.lang);
  });

  document.addEventListener('DOMContentLoaded', apply);

  global.i18n = { t, set, get: () => current, apply };
})(window);
