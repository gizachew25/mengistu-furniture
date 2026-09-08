'use strict';

const db = require('../config/db');
const logger = require('./logger');

/**
 * Record an admin action in the audit log. Best-effort: a logging failure
 * must never break the primary operation.
 */
async function logActivity(admin, action, { entity = null, entityId = null, detail = null } = {}) {
  try {
    await db.query(
      `INSERT INTO admin_activity (admin_id, admin_name, action, entity, entity_id, detail)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [admin ? admin.id : null, admin ? admin.name : null, action, entity, entityId, detail]
    );
  } catch (err) {
    logger.warn('Failed to write activity log:', err.message);
  }
}

module.exports = { logActivity };
