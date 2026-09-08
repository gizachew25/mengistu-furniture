/* Login + first-run setup. If already authenticated, redirect to dashboard.
   If no admin exists yet, show the setup form instead of login. */
(function () {
  'use strict';
  const { toast } = window.UI;

  // Password show/hide
  document.querySelectorAll('.pw-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  function setInvalid(field, invalid) {
    field.closest('.field').classList.toggle('invalid', invalid);
  }
  const validEmail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

  async function boot() {
    // Already logged in?
    try {
      await API.me();
      location.href = 'dashboard.html';
      return;
    } catch (_) { /* not logged in */ }

    // Setup needed?
    try {
      const { canSetup } = await API.setupStatus();
      if (canSetup) {
        document.getElementById('loginView').style.display = 'none';
        document.getElementById('setupView').style.display = 'block';
      }
    } catch (_) {}
  }
  boot();

  // ── Login ──
  const loginForm = document.getElementById('loginForm');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.email;
    const password = loginForm.password;
    let ok = true;
    if (!validEmail(email.value.trim())) { setInvalid(email, true); ok = false; } else setInvalid(email, false);
    if (!password.value) { setInvalid(password, true); ok = false; } else setInvalid(password, false);
    if (!ok) return;

    const btn = document.getElementById('loginBtn');
    btn.disabled = true; btn.textContent = 'Signing in…';
    try {
      await API.login({ email: email.value.trim(), password: password.value });
      toast('Signed in.', 'success');
      location.href = 'dashboard.html';
    } catch (err) {
      toast(err.message || 'Login failed.', 'error');
      btn.disabled = false; btn.textContent = 'Sign in';
    }
  });

  // ── Setup ──
  const setupForm = document.getElementById('setupForm');
  setupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = setupForm;
    let ok = true;
    if (f.name.value.trim().length < 2) { setInvalid(f.name, true); ok = false; } else setInvalid(f.name, false);
    if (!validEmail(f.email.value.trim())) { setInvalid(f.email, true); ok = false; } else setInvalid(f.email, false);
    if (f.password.value.length < 8) { setInvalid(f.password, true); ok = false; } else setInvalid(f.password, false);
    if (!ok) return;

    const btn = document.getElementById('setupBtn');
    btn.disabled = true; btn.textContent = 'Creating…';
    try {
      await API.setup({
        name: f.name.value.trim(),
        email: f.email.value.trim(),
        phone: f.phone.value.trim(),
        password: f.password.value,
      });
      toast('Administrator account created.', 'success');
      location.href = 'dashboard.html';
    } catch (err) {
      toast(err.message || 'Setup failed.', 'error');
      btn.disabled = false; btn.textContent = 'Create account & sign in';
    }
  });
})();
