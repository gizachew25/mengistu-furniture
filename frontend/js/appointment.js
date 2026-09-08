/* Appointment form: client validation, image preview, submit with FormData,
   success panel with booking reference, and reference tracker. */
(function () {
  'use strict';
  const { toast, escapeHtml } = window.UI;

  const form = document.getElementById('apptForm');
  const submitBtn = document.getElementById('submitBtn');
  const fileInput = document.getElementById('reference_image');
  const dropZone = document.getElementById('dropZone');
  const preview = document.getElementById('refPreview');

  // Prefill furniture type from ?type=
  const params = new URLSearchParams(location.search);
  const typeParam = params.get('type');
  if (typeParam) {
    const map = { 'Sofas': 'Sofa Set', 'Beds': 'Bed', 'Dining Tables': 'Dining Table', 'Chairs': 'Chairs', 'Bufies/Cabinets': 'Bufie / Cabinet', 'Custom Furniture': 'Other Custom Piece' };
    const sel = document.getElementById('furniture_type');
    const val = map[typeParam] || 'Other Custom Piece';
    if ([...sel.options].some((o) => o.value === val)) sel.value = val;
  }

  // Minimum date = today
  const dateInput = document.getElementById('preferred_date');
  dateInput.min = new Date().toISOString().split('T')[0];

  // ── Image preview ──────────────────────────────────────────
  dropZone.addEventListener('click', () => fileInput.click());
  ['dragover', 'dragenter'].forEach((ev) =>
    dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add('drag'); })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.remove('drag'); })
  );
  dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length) { fileInput.files = e.dataTransfer.files; showPreview(); }
  });
  fileInput.addEventListener('change', showPreview);

  function showPreview() {
    preview.innerHTML = '';
    const file = fileInput.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast('That image is larger than 5 MB. Please choose a smaller file.', 'error');
      fileInput.value = '';
      return;
    }
    const url = URL.createObjectURL(file);
    preview.innerHTML = `<div class="preview-item"><img src="${url}" alt="Reference preview"><button type="button" aria-label="Remove">×</button></div>`;
    preview.querySelector('button').addEventListener('click', () => { fileInput.value = ''; preview.innerHTML = ''; });
  }

  // ── Validation ─────────────────────────────────────────────
  function setInvalid(field, invalid, msg) {
    const wrap = field.closest('.field');
    wrap.classList.toggle('invalid', invalid);
    if (msg) { const e = wrap.querySelector('.error'); if (e) e.textContent = msg; }
  }
  function validEmail(v) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v); }

  function validate() {
    let ok = true;
    const name = form.customer_name;
    const phone = form.phone;
    const email = form.email;
    const type = form.furniture_type;
    const date = form.preferred_date;
    const desc = form.description;

    if (name.value.trim().length < 2) { setInvalid(name, true); ok = false; } else setInvalid(name, false);
    if (phone.value.trim().length < 7) { setInvalid(phone, true); ok = false; } else setInvalid(phone, false);
    if (email.value && !validEmail(email.value.trim())) { setInvalid(email, true); ok = false; } else setInvalid(email, false);
    if (!type.value) { setInvalid(type, true); ok = false; } else setInvalid(type, false);
    if (!date.value) { setInvalid(date, true); ok = false; } else setInvalid(date, false);
    if (desc.value.trim().length < 3) { setInvalid(desc, true); ok = false; } else setInvalid(desc, false);
    return ok;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) { toast('Please correct the highlighted fields.', 'error'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';
    try {
      const fd = new FormData(form);
      const res = await API.submitAppointment(fd);
      form.style.display = 'none';
      document.getElementById('successRef').textContent = res.booking_reference;
      document.getElementById('successPanel').style.display = 'block';
      toast('Your booking has been submitted successfully.', 'success', 'Booking received');
    } catch (err) {
      if (err.fields) {
        Object.entries(err.fields).forEach(([k, v]) => { if (form[k]) setInvalid(form[k], true, v); });
      }
      toast(err.message || 'Unable to complete the request. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit appointment request';
    }
  });

  // ── Tracker ────────────────────────────────────────────────
  const trackBtn = document.getElementById('trackBtn');
  const trackRef = document.getElementById('trackRef');
  const trackResult = document.getElementById('trackResult');
  const STATUS_STYLE = {
    Pending: ['#fbf0d9', '#b7791f'], Approved: ['#e4f4ea', '#1f8a52'],
    Rejected: ['#fbe7e4', '#c0392b'], Completed: ['#e5eefb', '#2b6cb0'], Cancelled: ['#eee', '#666'],
  };
  async function track() {
    const ref = trackRef.value.trim().toUpperCase();
    if (!ref) return;
    trackResult.innerHTML = '<div class="spinner" style="width:26px;height:26px"></div>';
    try {
      const { appointment: a } = await API.trackAppointment(ref);
      const [bg, fg] = STATUS_STYLE[a.status] || ['#eee', '#333'];
      trackResult.innerHTML = `
        <div style="background:var(--cream-2);border-radius:12px;padding:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
            <b>${escapeHtml(a.booking_reference)}</b>
            <span style="background:${bg};color:${fg};padding:4px 12px;border-radius:999px;font-size:.8rem;font-weight:600">${a.status}</span>
          </div>
          <p class="muted" style="margin:8px 0 0;font-size:.88rem">${escapeHtml(a.furniture_type)} · requested ${new Date(a.created_at).toLocaleDateString()}</p>
          ${a.admin_note ? `<p style="margin:8px 0 0;font-size:.86rem"><b>Note from us:</b> ${escapeHtml(a.admin_note)}</p>` : ''}
        </div>`;
    } catch (err) {
      trackResult.innerHTML = `<p style="color:var(--red);font-size:.88rem">${escapeHtml(err.message)}</p>`;
    }
  }
  trackBtn.addEventListener('click', track);
  trackRef.addEventListener('keydown', (e) => { if (e.key === 'Enter') track(); });
})();
