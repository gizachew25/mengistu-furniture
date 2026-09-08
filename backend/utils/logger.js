'use strict';

/**
 * Minimal structured logger.
 * Deliberately avoids logging request bodies, headers, passwords, tokens,
 * or database credentials — only high-level operational messages.
 */

function ts() {
  return new Date().toISOString();
}

function fmt(level, args) {
  return [`[${ts()}]`, `[${level}]`, ...args];
}

const logger = {
  info: (...a) => console.log(...fmt('INFO', a)),
  warn: (...a) => console.warn(...fmt('WARN', a)),
  error: (...a) => console.error(...fmt('ERROR', a)),
  debug: (...a) => {
    if (process.env.NODE_ENV !== 'production') console.log(...fmt('DEBUG', a));
  },
};

module.exports = logger;
