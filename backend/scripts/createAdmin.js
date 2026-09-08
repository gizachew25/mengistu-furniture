'use strict';

/**
 * Create (or update the password of) an administrator from the command line.
 * This is the recommended, safe way to create the first admin in production
 * instead of exposing a public registration page.
 *
 * Usage:
 *   node backend/scripts/createAdmin.js
 *     → uses SEED_ADMIN_* values from .env, role super_admin
 *
 *   node backend/scripts/createAdmin.js "Name" email@x.com "+2519..." "Password" admin
 *     → explicit values (role optional: admin | super_admin)
 */

const { hashPassword } = require('../utils/password');
const { pool } = require('../config/db');
const config = require('../config/env');
const logger = require('../utils/logger');

async function main() {
  const [, , argName, argEmail, argPhone, argPassword, argRole] = process.argv;

  const name = argName || config.seed.adminName;
  const email = (argEmail || config.seed.adminEmail).toLowerCase().trim();
  const phone = argPhone || config.seed.adminPhone;
  const password = argPassword || config.seed.adminPassword;
  const role = argRole === 'admin' ? 'admin' : 'super_admin';

  if (!password || password.length < 8) {
    logger.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const hash = await hashPassword(password);

  const { rows } = await pool.query(
    `INSERT INTO admins (name, email, phone, password_hash, role)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            role = EXCLUDED.role,
            is_active = TRUE
     RETURNING id, name, email, role`,
    [name, email, phone, hash, role]
  );

  logger.info(`Administrator ready: ${rows[0].email} (${rows[0].role})`);
  logger.info('You can now log in at /admin/login.html');
  await pool.end();
}

main().catch((err) => {
  logger.error('Failed to create admin:', err.message);
  process.exit(1);
});
