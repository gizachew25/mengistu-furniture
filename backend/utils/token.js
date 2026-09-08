'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Sign a JWT for an authenticated admin.
 * Only non-sensitive identity claims are embedded — never the password hash.
 */
function signAdminToken(admin) {
  const payload = {
    sub: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };
  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
    issuer: 'mengistu-furniture',
  });
}

function verifyToken(token) {
  return jwt.verify(token, config.auth.jwtSecret, { issuer: 'mengistu-furniture' });
}

module.exports = { signAdminToken, verifyToken };
