/* Contact form: validate, submit inquiry to the API, and apply live map/settings. */
(function () {
  'use strict';
  const { toast } = window.UI;
  const form = document.getElementById('contactForm');
  const btn = document.getElementById('contactSubmit');

  function setInvalid(field, invalid, msg) {
    const wrap = field.closest('.field');
    wrap.classList.toggle('invalid', invalid);
    if (msg) { const e = wrap.querySelector('.error'); if (e) e.textContent = msg; }
  }
  const validEmail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

  function validate() {
    let ok = true;
    if (form.name.value.trim().length < 2) { setInvalid(form.name, true); ok = false; } else setInvalid(form.name, false);
    if (form.email.value && !validEmail(form.email.value.trim())) { setInvalid(form.email, true); ok = false; } else setInvalid(form.email, false);
    if (form.subject.value.trim().length < 2) { setInvalid(form.subject, true); ok = false; } else setInvalid(form.subject, false);
    if (form.message.value.trim().length < 5) { setInvalid(form.message, true); ok = false; } else setInvalid(form.message, false);
    return ok;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) { toast('Please correct the highlighted fields.', 'error'); return; }
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      await API.submitInquiry({
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        email: form.email.value.trim(),
        subject: form.subject.value.trim(),
        message: form.message.value.trim(),
      });
      form.reset();
      toast('Your message has been sent — we will get back to you soon.', 'success', 'Message sent');
    } catch (err) {
      if (err.fields) Object.entries(err.fields).forEach(([k, v]) => { if (form[k]) setInvalid(form[k], true, v); });
      toast(err.message || 'Unable to send your message. Please try again.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send message';
    }
  });

  // Live settings → map
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const { settings } = await API.settings();
      if (settings && settings.map_embed_url) {
        const f = document.getElementById('mapFrame');
        if (f) f.innerHTML = `<iframe title="Location" src="${settings.map_embed_url}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
      }
    } catch (_) {}
  });
})();
