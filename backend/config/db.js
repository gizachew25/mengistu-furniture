'use strict';

/**
 * PostgreSQL connection pool.
 * All queries in the app go through parameterised statements ($1, $2, ...)
 * — never string concatenation — which prevents SQL injection.
 */

const { Pool } = require('pg');
const config = require('./env');
const logger = require('../utils/logger');

const poolConfig = config.db.connectionString
  ? { connectionString: config.db.connectionString, ssl: config.db.ssl }
  : {
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      ssl: config.db.ssl,
    };

const pool = new Pool({
  ...poolConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', err.message);
});

/**
 * Run a parameterised query.
 * @param {string} text  SQL with $1..$n placeholders
 * @param {Array}  params
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const ms = Date.now() - start;
  if (ms > 500) logger.warn(`Slow query (${ms}ms): ${text.split('\n')[0].slice(0, 80)}`);
  return res;
}

/** Get a dedicated client for transactions. Remember to release(). */
async function getClient() {
  return pool.connect();
}

/** Convenience transaction wrapper. */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function ping() {
  const { rows } = await pool.query('SELECT 1 AS ok');
  return rows[0].ok === 1;
}

module.exports = { pool, query, getClient, withTransaction, ping };
