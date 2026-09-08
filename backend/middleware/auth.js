'use strict';

const { verifyToken } = require('../utils/token');
const config = require('../config/env');

/**
 * Require a valid admin session.
 * The token is read from the HTTP-only cookie first, then falls back to a
 * Bearer Authorization header (useful for API tooling / tests).
 */
function requireAuth(req, res, next) {
  let token = null;

  if (req.cookies && req.cookies[config.auth.cookieName]) {
    token = req.cookies[config.auth.cookieName];
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = verifyToken(token);
    req.admin = { id: decoded.sub, name: decoded.name, email: decoded.email, role: decoded.role };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}

/**
 * Restrict a route to specific roles.
 * Usage: requireRole('super_admin')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
