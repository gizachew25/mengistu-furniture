/* Admin profile: update own name/phone and change password.
   Super admins also get an "Administrators" panel to add and enable/disable admins. */
(function () {
  'use strict';
  const { svg, pill, escapeHtml, fmtDateTime, toast, confirmModal } = window.AdminUI;
  let content, me;

  document.addEventListener('DOMContentLoaded', async () => {
    const shell = await AdminShell.init('profile', 'Admin Profile');
    content = shell.content;
    me = shell.admin;

    content.innerHTML = `
      <div class="admin-form">
        <div class="panel">
          <div class="panel__head"><h3>Your profile</h3></div>
          <div class="panel__body">
            <form id="profForm">
              <div class="form-row">
                <div class="field"><label for="p_name">Full name</label><input type="text" id="p_name" required></div>
                <div class="field"><label for="p_phone">Phone</label><input type="text" id="p_phone"></div>
              </div>
              <div class="field"><label for="p_email">Email</label><input type="email" id="p_email" disabled><div class="hint">Email is used to sign in and can’t be changed here.</div></div>
              <div class="util-row" style="justify-content:flex-end"><button type="submit" class="btn btn--primary" id="profBtn">Save profile</button></div>
            </form>
          </div>
        </div>

        <div class="panel">
          <div class="panel__head"><h3>Change password</h3></div>
          <div class="panel__body">
            <form id="pwForm">
              <div class="field"><label for="cur_pw">Current password</label><input type="password" id="cur_pw" required></div>
              <div class="form-row">
                <div class="field"><label for="new_pw">New password</label><input type="password" id="new_pw" required><div class="hint">At least 8 characters.</div></div>
                <div class="field"><label for="conf_pw">Confirm new password</label><input type="password" id="conf_pw" required><div class="error">Passwords do not match.</div></div>
              </div>
              <div class="util-row" style="justify-content:flex-end"><button type="submit" class="btn btn--choco" id="pwBtn">Update password</button></div>
            </form>
          </div>
        </div>

        <div id="adminsPanel"></div>
      </div>`;

    // Fill profile
    document.getElementById('p_name').value = me.name || '';
    document.getElementById('p_phone').value = me.phone || '';
    document.getElementById('p_email').value = me.email || '';

    document.getElementById('profForm').addEventListener('submit', saveProfile);
    document.getElementById('pwForm').addEventListener('submit', changePassword);

    if (me.role === 'super_admin') renderAdminsPanel();
  });

  async function saveProfile(e) {
    e.preventDefault();
    const btn = document.getElementById('profBtn');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      await API.put('/auth/me', { name: document.getElementById('p_name').value.trim(), phone: document.getElementById('p_phone').value.trim() });
      toast('Profile updated.', 'success');
      document.getElementById('adminName').textContent = document.getElementById('p_name').value.trim();
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Save profile'; }
  }

  async function changePassword(e) {
    e.preventDefault();
    const cur = document.getElementById('cur_pw').value;
    const nw = document.getElementById('new_pw').value;
    const cf = document.getElementById('conf_pw').value;
    const confField = document.getElementById('conf_pw').closest('.field');
    if (nw.length < 8) { toast('New password must be at least 8 characters.', 'error'); return; }
    if (nw !== cf) { confField.classList.add('invalid'); return; }
    confField.classList.remove('invalid');
    const btn = document.getElementById('pwBtn');
    btn.disabled = true; btn.textContent = 'Updating…';
    try {
      await API.put('/auth/me', { currentPassword: cur, newPassword: nw });
      toast('Password updated.', 'success');
      document.getElementById('pwForm').reset();
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Update password'; }
  }

  // ── Super-admin: manage administrators ──
  async function renderAdminsPanel() {
    const wrap = document.getElementById('adminsPanel');
    wrap.innerHTML = `
      <div class="panel">
        <div class="panel__head"><h3>Administrators</h3><button class="btn btn--primary btn--sm" id="addAdminBtn">${svg('<path d="M12 5v14M5 12h14"/>', 16)} Add admin</button></div>
        <div class="panel__body panel__body--flush"><div class="table-wrap"><table class="data" id="adminTbl"></table></div></div>
      </div>`;
    document.getElementById('addAdminBtn').onclick = openAddModal;
    loadAdmins();
  }

  async function loadAdmins() {
    const tbl = document.getElementById('adminTbl');
    try {
      const { admins } = await API.get('/auth/admins');
      tbl.innerHTML =
        `<thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>` +
        admins.map((a) => `<tr data-id="${a.id}">
          <td><b>${escapeHtml(a.name)}</b><br><small class="muted">Added ${fmtDateTime(a.created_at)}</small></td>
          <td>${escapeHtml(a.email)}</td>
          <td>${a.role === 'super_admin' ? '<span class="pill pill--feat">Super admin</span>' : '<span class="pill pill--read">Admin</span>'}</td>
          <td>${a.is_active ? '<span class="pill pill--yes">Active</span>' : '<span class="pill pill--no">Disabled</span>'}</td>
          <td>${a.id === me.id || a.role === 'super_admin' ? '<span class="muted" style="font-size:.8rem">—</span>' : `<button class="btn btn--outline btn--sm" data-act="toggle">${a.is_active ? 'Disable' : 'Enable'}</button>`}</td>
        </tr>`).join('') + '</tbody>';
      tbl.querySelectorAll('tr[data-id]').forEach((tr) => {
        const btn = tr.querySelector('[data-act=toggle]');
        if (btn) btn.onclick = () => toggleAdmin(tr.dataset.id, btn.textContent.trim() === 'Enable');
      });
    } catch (e) { tbl.innerHTML = `<tbody><tr><td colspan="5" class="empty">${escapeHtml(e.message)}</td></tr></tbody>`; }
  }

  async function toggleAdmin(id, activate) {
    const ok = await confirmModal({ title: activate ? 'Enable admin' : 'Disable admin', message: activate ? 'Allow this administrator to sign in again?' : 'Prevent this administrator from signing in?', confirmText: activate ? 'Enable' : 'Disable' });
    if (!ok) return;
    try { await API.patch(`/auth/admins/${id}/active`, { is_active: activate }); toast('Administrator updated.', 'success'); loadAdmins(); }
    catch (e) { toast(e.message, 'error'); }
  }

  function openAddModal() {
    const { openModal } = window.AdminUI;
    const { close } = openModal(`
      <div class="a-modal__head"><h3>Add administrator</h3><button class="icon-btn" id="clz">✕</button></div>
      <div class="a-modal__body">
        <div class="field"><label>Full name</label><input type="text" id="na_name"></div>
        <div class="field"><label>Email</label><input type="email" id="na_email"></div>
        <div class="field"><label>Phone (optional)</label><input type="text" id="na_phone"></div>
        <div class="field"><label>Temporary password</label><input type="text" id="na_pw"><div class="hint">At least 8 characters. Share it with the new admin to change later.</div></div>
      </div>
      <div class="a-modal__foot"><button class="btn btn--outline btn--sm" id="na_cancel">Cancel</button><button class="btn btn--primary btn--sm" id="na_save">Create admin</button></div>`, 480);
    document.getElementById('clz').onclick = close;
    document.getElementById('na_cancel').onclick = close;
    document.getElementById('na_save').onclick = async () => {
      const name = document.getElementById('na_name').value.trim();
      const email = document.getElementById('na_email').value.trim();
      const phone = document.getElementById('na_phone').value.trim();
      const password = document.getElementById('na_pw').value;
      if (name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 8) { toast('Please fill all fields correctly (password 8+ chars).', 'error'); return; }
      try { await API.post('/auth/admins', { name, email, phone, password }); toast('Administrator created.', 'success'); close(); loadAdmins(); }
      catch (e) { toast(e.message, 'error'); }
    };
  }
})();
