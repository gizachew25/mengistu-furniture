'use strict';

const rateLimit = require('express-rate-limit');

const jsonMessage = (msg) => ({
  handler: (req, res) => res.status(429).json({ error: msg }),
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limiter — generous, protects against abuse/scraping.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  ...jsonMessage('Too many requests. Please slow down and try again shortly.'),
});

// Strict limiter for authentication (brute-force protection).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  ...jsonMessage('Too many login attempts. Please wait a few minutes and try again.'),
});

// Limiter for public form submissions (appointments / inquiries).
const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  ...jsonMessage('You have submitted several requests. Please try again later.'),
});

module.exports = { apiLimiter, authLimiter, formLimiter };
