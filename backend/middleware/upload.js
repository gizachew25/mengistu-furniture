'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config/env');

/**
 * Secure image upload configuration.
 *  - Random, non-guessable filenames (prevents overwrite + path traversal).
 *  - Whitelisted extensions AND mime types.
 *  - Size limit enforced by multer.
 *  - Files land in a dedicated, non-executable uploads directory.
 */

function makeStorage(subdir) {
  const dest = path.join(config.rootDir, config.uploads.dir, subdir);
  fs.mkdirSync(dest, { recursive: true });

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeExt = config.uploads.allowedExt.includes(ext) ? ext : '.jpg';
      const rand = crypto.randomBytes(16).toString('hex');
      cb(null, `${Date.now()}-${rand}${safeExt}`);
    },
  });
}

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = config.uploads.allowedMime.includes(file.mimetype);
  const extOk = config.uploads.allowedExt.includes(ext);
  if (mimeOk && extOk) return cb(null, true);
  const err = new Error('Only JPG, PNG or WebP image files are allowed.');
  err.status = 415;
  return cb(err);
}

function build(subdir) {
  return multer({
    storage: makeStorage(subdir),
    fileFilter,
    limits: {
      fileSize: config.uploads.maxBytes,
      files: 8,
    },
  });
}

const productUpload = build('products');
const appointmentUpload = build('appointments');

module.exports = { productUpload, appointmentUpload };
