'use strict';

/**
 * Centralised, validated environment configuration.
 * Loads .env once and exposes a typed config object.
 * Fails fast in production if a critical secret is missing.
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ROOT = path.resolve(__dirname, '../../');

function bool(v, def = false) {
  if (v === undefined || v === null || v === '') return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

function num(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

const config = {
  env: NODE_ENV,
  isProd,
  rootDir: ROOT,
  port: num(process.env.PORT, 4000),
  appUrl: (process.env.APP_URL || 'http://localhost:4000').replace(/\/+$/, ''),
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  db: {
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.PGHOST || 'localhost',
    port: num(process.env.PGPORT, 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'mengistu_furniture',
    ssl: bool(process.env.PGSSL, false) ? { rejectUnauthorized: false } : false,
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || (isProd ? '' : 'dev_insecure_secret_change_me'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
    cookieName: process.env.COOKIE_NAME || 'mf_session',
    cookieSecure: bool(process.env.COOKIE_SECURE, isProd),
  },

  uploads: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxBytes: num(process.env.MAX_UPLOAD_MB, 5) * 1024 * 1024,
    allowedMime: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    allowedExt: ['.jpg', '.jpeg', '.png', '.webp'],
  },

  seed: {
    adminName: process.env.SEED_ADMIN_NAME || 'Mengistu Teshome',
    adminEmail: (process.env.SEED_ADMIN_EMAIL || 'mengistuteshome@gmail.com').toLowerCase(),
    adminPhone: process.env.SEED_ADMIN_PHONE || '+251970801754',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe#2026',
  },

  business: {
    name: 'Mengistu Furniture',
    tagline: 'Stylish Homes • Better Living',
    location: 'Yeduha Town, East Gojam, Amhara Region, Ethiopia',
    primaryPhone: '+251970801754',
    secondaryPhone: '0921579056',
    email: 'mengistuteshome@gmail.com',
    telebirrNumber: process.env.BUSINESS_TELEBIRR_NUMBER || '+251970801754',
  },
};

if (isProd && (!config.auth.jwtSecret || config.auth.jwtSecret.length < 32)) {
  // Never boot a production server with a weak/missing secret.
  // eslint-disable-next-line no-console
  console.error('FATAL: JWT_SECRET is missing or too short in production. Aborting.');
  process.exit(1);
}

module.exports = config;
