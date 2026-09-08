'use strict';

/**
 * Applies database/schema.sql to the configured PostgreSQL database.
 * Usage: npm run db:schema
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');
const logger = require('../utils/logger');

async function main() {
  const file = path.join(__dirname, '../../database/schema.sql');
  const sql = fs.readFileSync(file, 'utf8');
  logger.info('Applying database schema...');
  await pool.query(sql);
  logger.info('Schema applied successfully.');
  await pool.end();
}

main().catch((err) => {
  logger.error('Failed to apply schema:', err.message);
  process.exit(1);
});
