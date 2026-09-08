'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const config = require('./config/env');
const db = require('./config/db');
const logger = require('./utils/logger');
const apiRouter = require('./routes');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // correct client IPs behind a reverse proxy (for rate limiting)

// ── Security headers (Helmet) with a CSP tuned for this app ──────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        frameSrc: ["'self'", 'https://www.google.com', 'https://maps.google.com'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: config.isProd ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = new Set([config.appUrl, ...config.corsOrigins]);
app.use(
  cors({
    origin(origin, cb) {
      // Same-origin / server-to-server requests have no Origin header.
      if (!origin) return cb(null, true);
      if (allowedOrigins.has(origin)) return cb(null, true);
      if (!config.isProd) return cb(null, true); // permissive in dev
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// ── Core middleware ──────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ── Static: uploaded images (served read-only, never executed) ───────────────
app.use(
  '/uploads',
  express.static(path.join(config.rootDir, config.uploads.dir), {
    index: false,
    dotfiles: 'deny',
    maxAge: '7d',
    setHeaders(res) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', 'inline');
    },
  })
);

// ── API ──────────────────────────────────────────────────────────────────────
app.use('/api', apiLimiter, apiRouter);
app.use('/api', notFound); // JSON 404 for unknown API routes

// ── Static: frontend (public site + admin) ───────────────────────────────────
const FRONTEND = path.join(config.rootDir, 'frontend');
app.use(
  express.static(FRONTEND, {
    extensions: ['html'],
    maxAge: config.isProd ? '1h' : 0,
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    },
  })
);

// Friendly root + admin entry
app.get('/', (req, res) => res.sendFile(path.join(FRONTEND, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(FRONTEND, 'admin', 'dashboard.html')));

// Final fallback for non-API GET routes → serve index (keeps deep links working)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  return res.sendFile(path.join(FRONTEND, 'index.html'));
});

// ── Errors ───────────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Boot ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await db.ping();
    logger.info('Connected to PostgreSQL.');
  } catch (err) {
    logger.error('Could not connect to PostgreSQL:', err.message);
    logger.error('Check your .env database settings and that PostgreSQL is running.');
    process.exit(1);
  }

  app.listen(config.port, () => {
    logger.info(`Mengistu Furniture server running at ${config.appUrl} (env: ${config.env})`);
    logger.info(`Public site:  ${config.appUrl}/`);
    logger.info(`Admin panel:  ${config.appUrl}/admin`);
  });
}

if (require.main === module) start();

module.exports = app;
