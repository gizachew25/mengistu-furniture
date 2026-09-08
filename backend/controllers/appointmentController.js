'use strict';

const db = require('../config/db');
const { bookingReference, parsePaging } = require('../utils/helpers');
const { logActivity } = require('../utils/activity');

const STATUSES = ['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled'];

function serialize(row) {
  return {
    id: row.id,
    booking_reference: row.booking_reference,
    customer_name: row.customer_name,
    phone: row.phone,
    email: row.email,
    furniture_type: row.furniture_type,
    preferred_date: row.preferred_date,
    preferred_time: row.preferred_time,
    description: row.description,
    reference_image: row.reference_image,
    notes: row.notes,
    status: row.status,
    admin_note: row.admin_note,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** POST /api/appointments (public) */
exports.create = async (req, res, next) => {
  try {
    const b = req.body;
    const referenceImage = req.file ? `/uploads/appointments/${req.file.filename}` : null;

    // Retry a couple times in the astronomically unlikely event of a ref collision.
    let saved = null;
    for (let attempt = 0; attempt < 3 && !saved; attempt += 1) {
      const ref = bookingReference();
      try {
        const { rows } = await db.query(
          `INSERT INTO appointments
             (booking_reference, customer_name, phone, email, furniture_type,
              preferred_date, preferred_time, description, reference_image, notes, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Pending')
           RETURNING *`,
          [
            ref,
            String(b.customer_name).trim(),
            String(b.phone).trim(),
            b.email ? String(b.email).toLowerCase().trim() : null,
            String(b.furniture_type).trim(),
            b.preferred_date,
            b.preferred_time || null,
            b.description ? String(b.description).trim() : '',
            referenceImage,
            b.notes ? String(b.notes).trim() : null,
          ]
        );
        saved = rows[0];
      } catch (err) {
        if (err.code === '23505' && attempt < 2) continue; // ref collision → retry
        throw err;
      }
    }

    res.status(201).json({
      message:
        'Your appointment request has been submitted successfully. We will contact you soon.',
      booking_reference: saved.booking_reference,
      appointment: serialize(saved),
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/appointments/track/:reference (public — status lookup only) */
exports.track = async (req, res, next) => {
  try {
    const ref = String(req.params.reference || '').toUpperCase().trim();
    const { rows } = await db.query(
      'SELECT booking_reference, customer_name, furniture_type, preferred_date, status, admin_note, created_at, updated_at FROM appointments WHERE booking_reference = $1',
      [ref]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No appointment found for that reference.' });
    res.json({ appointment: rows[0] });
  } catch (err) {
    next(err);
  }
};

/** GET /api/admin/appointments */
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
      where.push(
        `(LOWER(customer_name) LIKE $${params.length} OR LOWER(booking_reference) LIKE $${params.length} OR phone LIKE $${params.length})`
      );
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const { rows: c } = await db.query(`SELECT COUNT(*)::int AS total FROM appointments ${clause}`, params);
    const dataParams = params.slice();
    dataParams.push(limit, offset);
    const { rows } = await db.query(
      `SELECT * FROM appointments ${clause} ORDER BY created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );
    res.json({
      appointments: rows.map(serialize),
      pagination: { page, limit, total: c[0].total, pages: Math.max(1, Math.ceil(c[0].total / limit)) },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/admin/appointments/:id */
exports.get = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rows } = await db.query('SELECT * FROM appointments WHERE id=$1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Appointment not found.' });
    res.json({ appointment: serialize(rows[0]) });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/admin/appointments/:id/status */
exports.updateStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const status = req.body.status;
    if (!STATUSES.includes(status)) return res.status(422).json({ error: 'Invalid status value.' });
    const adminNote = req.body.admin_note != null ? String(req.body.admin_note).trim() : null;

    const { rows } = await db.query(
      `UPDATE appointments
          SET status = $1,
              admin_note = COALESCE($2, admin_note),
              handled_by = $3
        WHERE id = $4
        RETURNING *`,
      [status, adminNote, req.admin.id, id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Appointment not found.' });

    const messages = {
      Approved: 'Appointment approved successfully.',
      Rejected: 'Appointment rejected.',
      Completed: 'Appointment marked as completed.',
      Cancelled: 'Appointment cancelled.',
      Pending: 'Appointment set to pending.',
    };
    await logActivity(req.admin, 'appointment.status', {
      entity: 'appointment',
      entityId: id,
      detail: `${rows[0].booking_reference} → ${status}`,
    });
    res.json({ message: messages[status], appointment: serialize(rows[0]) });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/admin/appointments/:id/note */
exports.updateNote = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rows } = await db.query(
      'UPDATE appointments SET admin_note=$1, handled_by=$2 WHERE id=$3 RETURNING *',
      [String(req.body.admin_note || '').trim(), req.admin.id, id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Appointment not found.' });
    await logActivity(req.admin, 'appointment.note', { entity: 'appointment', entityId: id });
    res.json({ message: 'Note saved.', appointment: serialize(rows[0]) });
  } catch (err) {
    next(err);
  }
};

exports._statuses = STATUSES;
