/* Admin payments: configure the Telebirr number shown across the site and an
   optional QR image URL / instructions. Saved via the settings endpoint. */
(function () {
  'use strict';
  const { svg, toast, escapeHtml } = window.AdminUI;
  let content;

  document.addEventListener('DOMContentLoaded', async () => {
    const shell = await AdminShell.init('payments', 'Payments');
    content = shell.content;
    content.innerHTML = `
      <div class="admin-form">
        <div class="panel">
          <div class="panel__head"><h3>Telebirr payment settings</h3></div>
          <div class="panel__body">
            <p class="muted" style="margin-top:0">This number and instructions appear in the “Pay with Telebirr” section on your website.</p>
            <form id="payForm">
              <div class="field">
                <label for="telebirr_number">Telebirr number <span class="req">*</span></label>
                <input type="text" id="telebirr_number" name="telebirr_number" placeholder="+2519…">
              </div>
              <div class="field">
                <label for="telebirr_name">Account name <span class="muted" style="font-weight:400">(optional)</span></label>
                <input type="text" id="telebirr_name" name="telebirr_name" placeholder="Mengistu Teshome">
              </div>
              <div class="field">
                <label for="telebirr_qr_url">QR code image URL <span class="muted" style="font-weight:400">(optional)</span></label>
                <input type="url" id="telebirr_qr_url" name="telebirr_qr_url" placeholder="https://…/qr.png">
                <div class="hint">Paste a link to your Telebirr QR image to display it on the site.</div>
              </div>
              <div class="field">
                <label for="payment_instructions">Payment instructions <span class="muted" style="font-weight:400">(optional)</span></label>
                <textarea id="payment_instructions" name="payment_instructions" style="min-height:90px" placeholder="e.g. After paying, send your transaction confirmation to us via the contact form."></textarea>
              </div>
              <div class="util-row" style="justify-content:flex-end">
                <button type="submit" class="btn btn--primary" id="saveBtn">Save payment settings</button>
              </div>
            </form>
          </div>
        </div>

        <div class="panel">
          <div class="panel__head"><h3>Live preview</h3></div>
          <div class="panel__body">
            <div class="telebirr" style="box-shadow:none;border:1px dashed var(--sand)">
              <div>
                <span class="telebirr__badge">${svg('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>', 18)} Telebirr Payment</span>
                <p class="telebirr__num" id="prevNum">—</p>
                <p class="muted" id="prevName"></p>
                <p class="muted" id="prevInstr" style="font-size:.9rem"></p>
              </div>
              <div class="telebirr__qr"><div class="qr-frame" id="prevQr"><span class="muted" style="font-size:.78rem">QR preview</span></div></div>
            </div>
          </div>
        </div>
      </div>`;

    await loadSettings();
    document.getElementById('payForm').addEventListener('submit', save);
    ['telebirr_number', 'telebirr_name', 'payment_instructions', 'telebirr_qr_url'].forEach((id) =>
      document.getElementById(id).addEventListener('input', updatePreview));
  });

  async function loadSettings() {
    try {
      const { settings } = await API.get('/admin/settings');
      document.getElementById('telebirr_number').value = settings.telebirr_number || '';
      document.getElementById('telebirr_name').value = settings.telebirr_name || '';
      document.getElementById('telebirr_qr_url').value = settings.telebirr_qr_url || '';
      document.getElementById('payment_instructions').value = settings.payment_instructions || '';
      updatePreview();
    } catch (e) { toast(e.message, 'error'); }
  }

  function updatePreview() {
    document.getElementById('prevNum').textContent = document.getElementById('telebirr_number').value || '—';
    const name = document.getElementById('telebirr_name').value;
    document.getElementById('prevName').textContent = name ? 'Account: ' + name : '';
    document.getElementById('prevInstr').textContent = document.getElementById('payment_instructions').value;
    const qr = document.getElementById('telebirr_qr_url').value;
    document.getElementById('prevQr').innerHTML = qr ? `<img src="${escapeHtml(qr)}" alt="QR" onerror="this.parentNode.innerHTML='<span class=muted style=font-size:.78rem>Invalid image URL</span>'">` : '<span class="muted" style="font-size:.78rem">QR preview</span>';
  }

  async function save(e) {
    e.preventDefault();
    const btn = document.getElementById('saveBtn');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      await API.put('/admin/settings', {
        telebirr_number: document.getElementById('telebirr_number').value.trim(),
        telebirr_name: document.getElementById('telebirr_name').value.trim(),
        telebirr_qr_url: document.getElementById('telebirr_qr_url').value.trim(),
        payment_instructions: document.getElementById('payment_instructions').value.trim(),
      });
      toast('Payment settings saved.', 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Save payment settings'; }
  }
})();
