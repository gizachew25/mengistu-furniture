'use strict';

const { hashPassword, verifyPassword } = require('../utils/password');
const db = require('../config/db');
const config = require('../config/env');
const { signAdminToken } = require('../utils/token');
const { logActivity } = require('../utils/activity');

function setSessionCookie(res, token) {
  res.cookie(config.auth.cookieName, token, {
    httpOnly: true,
    secure: config.auth.cookieSecure,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8, // 8h ceiling; JWT itself expires sooner
    path: '/',
  });
}

/** Whether any admin exists — used to gate open setup. */
async function adminCountExists() {
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM admins');
  return rows[0].n > 0;
}

/** GET /api/auth/setup-status — is first-run setup still available? */
exports.setupStatus = async (req, res, next) => {
  try {
    const exists = await adminCountExists();
    res.json({ setupComplete: exists, canSetup: !exists });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/setup — create the FIRST (super) admin only.
 * Disabled automatically once any admin exists (returns 403).
 */
exports.setup = async (req, res, next) => {
  try {
    if (await adminCountExists()) {
      return res.status(403).json({ error: 'Setup is already complete. Please log in.' });
    }
    const { name, email, phone, password } = req.body;
    const hash = await hashPassword(password);
    const { rows } = await db.query(
      `INSERT INTO admins (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, 'super_admin')
       RETURNING id, name, email, phone, role, created_at`,
      [name.trim(), email.toLowerCase().trim(), phone || null, hash]
    );
    const admin = rows[0];
    const token = signAdminToken(admin);
    setSessionCookie(res, token);
    await logActivity(admin, 'admin.setup', { entity: 'admin', entityId: admin.id, detail: 'Initial super admin created' });
    return res.status(201).json({ message: 'Administrator account created.', admin, token });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/auth/login */
exports.login = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const password = String(req.body.password || '');

    const { rows } = await db.query(
      'SELECT id, name, email, phone, role, password_hash, is_active FROM admins WHERE email = $1',
      [email]
    );
    const admin = rows[0];

    // Always run a verify (even for unknown users) to reduce timing-based enumeration.
    const hash = admin ? admin.password_hash : '$2a$12$C6UzMDM.H6dfI/f/IKcEeO0000000000000000000000000000000000';
    const ok = await verifyPassword(password, hash);

    if (!admin || !ok) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (!admin.is_active) {
      return res.status(403).json({ error: 'This account has been disabled.' });
    }

    await db.query('UPDATE admins SET last_login_at = NOW() WHERE id = $1', [admin.id]);

    const safe = { id: admin.id, name: admin.name, email: admin.email, phone: admin.phone, role: admin.role };
    const token = signAdminToken(safe);
    setSessionCookie(res, token);
    await logActivity(safe, 'admin.login', { entity: 'admin', entityId: admin.id });
    return res.json({ message: 'Signed in.', admin: safe, token });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/auth/logout */
exports.logout = async (req, res) => {
  res.clearCookie(config.auth.cookieName, { path: '/' });
  res.json({ message: 'Signed out.' });
};

/** GET /api/auth/me */
exports.me = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, email, phone, role, last_login_at, created_at FROM admins WHERE id = $1',
      [req.admin.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Account not found.' });
    res.json({ admin: rows[0] });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/auth/me — update own profile / password */
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, currentPassword, newPassword } = req.body;

    if (newPassword) {
      const { rows } = await db.query('SELECT password_hash FROM admins WHERE id = $1', [req.admin.id]);
      const ok = rows[0] && (await verifyPassword(String(currentPassword || ''), rows[0].password_hash));
      if (!ok) return res.status(400).json({ error: 'Your current password is incorrect.' });
      const hash = await hashPassword(newPassword);
      await db.query('UPDATE admins SET name = COALESCE($1, name), phone = $2, password_hash = $3 WHERE id = $4', [
        name ? name.trim() : null,
        phone || null,
        hash,
        req.admin.id,
      ]);
    } else {
      await db.query('UPDATE admins SET name = COALESCE($1, name), phone = $2 WHERE id = $3', [
        name ? name.trim() : null,
        phone || null,
        req.admin.id,
      ]);
    }

    const { rows } = await db.query(
      'SELECT id, name, email, phone, role FROM admins WHERE id = $1',
      [req.admin.id]
    );
    await logActivity(req.admin, 'admin.profile_update', { entity: 'admin', entityId: req.admin.id });
    res.json({ message: 'Profile updated.', admin: rows[0] });
  } catch (err) {
    next(err);
  }
};

/** GET /api/auth/admins — list admins (super_admin only) */
exports.listAdmins = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, email, phone, role, is_active, last_login_at, created_at FROM admins ORDER BY created_at ASC'
    );
    res.json({ admins: rows });
  } catch (err) {
    next(err);
  }
};

/** POST /api/auth/admins — invite/create another admin (super_admin only) */
exports.createAdmin = async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;
    const safeRole = role === 'super_admin' ? 'super_admin' : 'admin';
    const hash = await hashPassword(password);
    const { rows } = await db.query(
      `INSERT INTO admins (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, phone, role, is_active, created_at`,
      [name.trim(), email.toLowerCase().trim(), phone || null, hash, safeRole]
    );
    await logActivity(req.admin, 'admin.create', { entity: 'admin', entityId: rows[0].id, detail: rows[0].email });
    res.status(201).json({ message: 'Administrator created.', admin: rows[0] });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/auth/admins/:id/active — enable/disable an admin (super_admin only) */
exports.setAdminActive = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (id === req.admin.id) return res.status(400).json({ error: 'You cannot change your own status.' });
    const isActive = Boolean(req.body.is_active);
    const { rows } = await db.query(
      'UPDATE admins SET is_active = $1 WHERE id = $2 RETURNING id, name, email, role, is_active',
      [isActive, id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Administrator not found.' });
    await logActivity(req.admin, 'admin.set_active', { entity: 'admin', entityId: id, detail: String(isActive) });
    res.json({ message: isActive ? 'Administrator enabled.' : 'Administrator disabled.', admin: rows[0] });
  } catch (err) {
    next(err);
  }
};
