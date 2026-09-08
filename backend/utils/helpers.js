'use strict';

const crypto = require('crypto');

/** Generate a booking reference like MF-7QF3K9 (unambiguous charset). */
function bookingReference() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1
  let s = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i += 1) s += alphabet[bytes[i] % alphabet.length];
  return `MF-${s}`;
}

/** Build an absolute URL for an uploaded file path stored as "/uploads/...". */
function absoluteUrl(appUrl, relPath) {
  if (!relPath) return null;
  if (/^https?:\/\//i.test(relPath)) return relPath;
  return `${appUrl}${relPath.startsWith('/') ? '' : '/'}${relPath}`;
}

/** Clamp/parse pagination params safely. */
function parsePaging(query, { defLimit = 12, maxLimit = 60 } = {}) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = defLimit;
  if (limit > maxLimit) limit = maxLimit;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

module.exports = { bookingReference, absoluteUrl, parsePaging };
