'use strict';

/**
 * Password hashing helpers.
 * Uses bcrypt (via bcryptjs — pure JS, no native build) with a strong cost
 * factor. Centralised here so the algorithm can be changed in one place.
 */

const bcrypt = require('bcryptjs');

const COST = 12;

async function hashPassword(plain) {
  return bcrypt.hash(String(plain), COST);
}

async function verifyPassword(plain, hash) {
  if (!hash) return false;
  try {
    return await bcrypt.compare(String(plain), hash);
  } catch (_) {
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };
