'use strict';

const db = require('../config/db');
const { parsePaging } = require('../utils/helpers');
const { logActivity } = require('../utils/activity');

const STATUSES = ['New', 'Read', 'Responded'];

/** POST /api/inquiries (public) */
exports.create = async (req, res, next) => {
  try {
    const b = req.body;
    const { rows } = await db.query(
      `INSERT INTO inquiries (name, phone, email, subject, message, status)
       VALUES ($1,$2,$3,$4,$5,'New') RETURNING *`,
      [
        String(b.name).trim(),
        b.phone ? String(b.phone).trim() : null,
        b.email ? String(b.email).toLowerCase().trim() : null,
        String(b.subject).trim(),
        String(b.message).trim(),
      ]
    );
    res.status(201).json({
      message: 'Thank you. Your message has been sent — we will get back to you soon.',
      inquiry: { id: rows[0].id, created_at: rows[0].created_at },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/admin/inquiries */
exports.list = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePaging(req.query, { defLimit: 15, maxLimit: 60 });
    const where = [];
    const params = [];
    if (req.query.status && STATUSES.includes(req.query.status)) {
      params.push(req.query.status);
      where.push(`status = $${params.length}`);
    }
    if (req.query.q && String(req.query.q).trim()) {
      params.push(`%${String(req.query.q).trim().toLowerCase()}%`);
      where.push(`(LOWER(name) LIKE $${params.length} OR LOWER(subject) LIKE $${params.length})`);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const { rows: c } = await db.query(`SELECT COUNT(*)::int AS total FROM inquiries ${clause}`, params);
    const dataParams = params.slice();
    dataParams.push(limit, offset);
    const { rows } = await db.query(
      `SELECT * FROM inquiries ${clause} ORDER BY created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );
    res.json({
      inquiries: rows,
      pagination: { page, limit, total: c[0].total, pages: Math.max(1, Math.ceil(c[0].total / limit)) },
    });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/admin/inquiries/:id — update status */
exports.updateStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const status = req.body.status;
    if (!STATUSES.includes(status)) return res.status(422).json({ error: 'Invalid status value.' });
    const { rows } = await db.query('UPDATE inquiries SET status=$1 WHERE id=$2 RETURNING *', [status, id]);
    if (!rows[0]) return res.status(404).json({ error: 'Inquiry not found.' });
    await logActivity(req.admin, 'inquiry.status', { entity: 'inquiry', entityId: id, detail: status });
    res.json({ message: `Inquiry marked as ${status.toLowerCase()}.`, inquiry: rows[0] });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/admin/inquiries/:id */
exports.remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rows } = await db.query('DELETE FROM inquiries WHERE id=$1 RETURNING id', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Inquiry not found.' });
    await logActivity(req.admin, 'inquiry.delete', { entity: 'inquiry', entityId: id });
    res.json({ message: 'Inquiry deleted.', id });
  } catch (err) {
    next(err);
  }
};

exports._statuses = STATUSES;
