'use strict';

const multer = require('multer');
const logger = require('../utils/logger');
const config = require('../config/env');

/** 404 for unmatched API routes. */
function notFound(req, res) {
  res.status(404).json({ error: 'The requested resource was not found.' });
}

/**
 * Central error handler. Returns safe messages to the client and never leaks
 * stack traces, SQL, or secrets. Logs full detail server-side only.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Multer-specific (file too large / too many files)
  if (err instanceof multer.MulterError) {
    let msg = 'Image upload failed.';
    if (err.code === 'LIMIT_FILE_SIZE') {
      msg = `Each image must be smaller than ${Math.round(config.uploads.maxBytes / (1024 * 1024))} MB.`;
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      msg = 'Too many images uploaded at once.';
    }
    return res.status(413).json({ error: msg });
  }

  const status = err.status || err.statusCode || 500;

  // PostgreSQL unique violation → friendly message
  if (err.code === '23505') {
    return res.status(409).json({ error: 'That record already exists.' });
  }
  // FK violation
  if (err.code === '23503') {
    return res.status(409).json({ error: 'Related record not found.' });
  }

  if (status >= 500) {
    logger.error('Unhandled error:', err.message);
    if (!config.isProd && err.stack) logger.debug(err.stack);
    return res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
  }

  return res.status(status).json({ error: err.message || 'Request could not be completed.' });
}

module.exports = { notFound, errorHandler };
