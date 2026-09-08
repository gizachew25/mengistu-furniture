/* Admin website settings: business info, contact details, map embed and social
   links — all surfaced on the public site. */
(function () {
  'use strict';
  const { toast } = window.AdminUI;
  const FIELDS = [
    'business_name', 'tagline', 'about_text', 'location', 'primary_phone', 'secondary_phone',
    'email', 'map_embed_url', 'facebook_url', 'telegram_url', 'instagram_url',
  ];
  let content;

  document.addEventListener('DOMContentLoaded', async () => {
    const shell = await AdminShell.init('settings', 'Website Settings');
    content = shell.content;
    content.innerHTML = `
      <form class="admin-form" id="setForm">
        <div class="panel">
          <div class="panel__head"><h3>Business information</h3></div>
          <div class="panel__body">
            <div class="form-row">
              <div class="field"><label for="business_name">Business name</label><input type="text" id="business_name"></div>
              <div class="field"><label for="tagline">Tagline</label><input type="text" id="tagline"></div>
            </div>
            <div class="field"><label for="about_text">About text</label><textarea id="about_text" style="min-height:90px"></textarea></div>
            <div class="field"><label for="location">Location</label><input type="text" id="location"></div>
          </div>
        </div>

        <div class="panel">
          <div class="panel__head"><h3>Contact details</h3></div>
          <div class="panel__body">
            <div class="form-row">
              <div class="field"><label for="primary_phone">Primary phone</label><input type="text" id="primary_phone"></div>
              <div class="field"><label for="secondary_phone">Secondary phone</label><input type="text" id="secondary_phone"></div>
            </div>
            <div class="field"><label for="email">Email</label><input type="email" id="email"></div>
            <div class="field"><label for="map_embed_url">Google Maps embed URL</label><input type="url" id="map_embed_url" placeholder="https://www.google.com/maps?q=…&output=embed"><div class="hint">Used for the map on the contact page.</div></div>
          </div>
        </div>

        <div class="panel">
          <div class="panel__head"><h3>Social links</h3></div>
          <div class="panel__body">
            <div class="form-row--3 form-row">
              <div class="field"><label for="facebook_url">Facebook URL</label><input type="url" id="facebook_url"></div>
              <div class="field"><label for="telegram_url">Telegram URL</label><input type="url" id="telegram_url"></div>
              <div class="field"><label for="instagram_url">Instagram URL</label><input type="url" id="instagram_url"></div>
            </div>
          </div>
        </div>

        <div class="util-row" style="justify-content:flex-end">
          <button type="submit" class="btn btn--primary" id="saveBtn">Save settings</button>
        </div>
      </form>`;

    await loadSettings();
    document.getElementById('setForm').addEventListener('submit', save);
  });

  async function loadSettings() {
    try {
      const { settings } = await API.get('/admin/settings');
      FIELDS.forEach((f) => { const el = document.getElementById(f); if (el) el.value = settings[f] || ''; });
    } catch (e) { toast(e.message, 'error'); }
  }

  async function save(e) {
    e.preventDefault();
    const btn = document.getElementById('saveBtn');
    btn.disabled = true; btn.textContent = 'Saving…';
    const payload = {};
    FIELDS.forEach((f) => { const el = document.getElementById(f); if (el) payload[f] = el.value.trim(); });
    try {
      await API.put('/admin/settings', payload);
      toast('Website settings saved.', 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Save settings'; }
  }
})();
