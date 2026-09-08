'use strict';

const db = require('../config/db');
const { logActivity } = require('../utils/activity');

/** GET /api/admin/dashboard/statistics */
exports.statistics = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM products) AS total_products,
        (SELECT COUNT(*)::int FROM products WHERE is_published) AS published_products,
        (SELECT COUNT(*)::int FROM products WHERE availability) AS available_products,
        (SELECT COUNT(*)::int FROM products WHERE featured) AS featured_products,
        (SELECT COUNT(*)::int FROM appointments WHERE status='Pending')   AS pending_appointments,
        (SELECT COUNT(*)::int FROM appointments WHERE status='Approved')  AS approved_appointments,
        (SELECT COUNT(*)::int FROM appointments WHERE status='Completed') AS completed_appointments,
        (SELECT COUNT(*)::int FROM appointments WHERE status='Rejected')  AS rejected_appointments,
        (SELECT COUNT(*)::int FROM appointments WHERE status='Cancelled') AS cancelled_appointments,
        (SELECT COUNT(*)::int FROM appointments) AS total_appointments,
        (SELECT COUNT(*)::int FROM inquiries WHERE status='New') AS new_inquiries,
        (SELECT COUNT(*)::int FROM inquiries) AS total_inquiries
    `);
    const stats = rows[0];

    // Products per category (for a simple bar chart)
    const { rows: byCat } = await db.query(
      `SELECT category, COUNT(*)::int AS count FROM products GROUP BY category ORDER BY count DESC`
    );

    // Appointments over the last 6 months (for a trend chart)
    const { rows: trend } = await db.query(`
      SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
             COUNT(*)::int AS count
        FROM appointments
       WHERE created_at >= (CURRENT_DATE - INTERVAL '6 months')
       GROUP BY 1 ORDER BY 1
    `);

    res.json({ stats, byCategory: byCat, appointmentsTrend: trend });
  } catch (err) {
    next(err);
  }
};

/** GET /api/admin/dashboard/activity */
exports.recentActivity = async (req, res, next) => {
  try {
    const [{ rows: products }, { rows: appointments }, { rows: inquiries }, { rows: actions }] = await Promise.all([
      db.query(`SELECT id, name, category, created_at FROM products ORDER BY created_at DESC LIMIT 5`),
      db.query(
        `SELECT id, booking_reference, customer_name, furniture_type, status, created_at
           FROM appointments ORDER BY created_at DESC LIMIT 5`
      ),
      db.query(`SELECT id, name, subject, status, created_at FROM inquiries ORDER BY created_at DESC LIMIT 5`),
      db.query(
        `SELECT id, admin_name, action, entity, entity_id, detail, created_at
           FROM admin_activity ORDER BY created_at DESC LIMIT 8`
      ),
    ]);
    res.json({ products, appointments, inquiries, actions });
  } catch (err) {
    next(err);
  }
};

/** GET /api/settings (public) */
exports.getPublicSettings = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT business_name, tagline, about_text, location, primary_phone, secondary_phone, email,
              telebirr_number, telebirr_name, telebirr_qr_url, telebirr_note, payment_instructions,
              map_embed_url, facebook_url, telegram_url, instagram_url, tiktok_url
         FROM settings WHERE id = 1`
    );
    res.json({ settings: rows[0] || {} });
  } catch (err) {
    next(err);
  }
};

/** GET /api/admin/settings (full row, admin only) */
exports.getAdminSettings = async (req, res, next) => {
  try {
    const { rows } = await db.query(`SELECT * FROM settings WHERE id = 1`);
    res.json({ settings: rows[0] || {} });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/admin/settings */
exports.updateSettings = async (req, res, next) => {
  try {
    const b = req.body;
    // Only overwrite the fields present in the request body, so the payments page
    // and the settings page can each save their own subset without clobbering the other.
    const has = (k) => Object.prototype.hasOwnProperty.call(b, k);
    const { rows } = await db.query(
      `UPDATE settings SET
         business_name        = COALESCE(NULLIF($1,''),  business_name),
         tagline              = COALESCE(NULLIF($2,''),  tagline),
         about_text           = COALESCE($3,  about_text),
         location             = COALESCE(NULLIF($4,''),  location),
         primary_phone        = COALESCE(NULLIF($5,''),  primary_phone),
         secondary_phone      = COALESCE(NULLIF($6,''),  secondary_phone),
         email                = COALESCE(NULLIF($7,''),  email),
         telebirr_number      = COALESCE(NULLIF($8,''),  telebirr_number),
         telebirr_name        = COALESCE($9,  telebirr_name),
         telebirr_qr_url      = CASE WHEN $10::boolean THEN $11 ELSE telebirr_qr_url END,
         telebirr_note        = COALESCE($12, telebirr_note),
         payment_instructions = COALESCE($13, payment_instructions),
         map_embed_url        = CASE WHEN $14::boolean THEN $15 ELSE map_embed_url END,
         facebook_url         = CASE WHEN $16::boolean THEN $17 ELSE facebook_url END,
         telegram_url         = CASE WHEN $18::boolean THEN $19 ELSE telegram_url END,
         instagram_url        = CASE WHEN $20::boolean THEN $21 ELSE instagram_url END,
         tiktok_url           = CASE WHEN $22::boolean THEN $23 ELSE tiktok_url END,
         updated_at           = NOW()
       WHERE id = 1
       RETURNING *`,
      [
        b.business_name, b.tagline,
        has('about_text') ? b.about_text : null,
        b.location, b.primary_phone, b.secondary_phone, b.email,
        b.telebirr_number,
        has('telebirr_name') ? b.telebirr_name : null,
        has('telebirr_qr_url'), b.telebirr_qr_url || null,
        has('telebirr_note') ? b.telebirr_note : null,
        has('payment_instructions') ? b.payment_instructions : null,
        has('map_embed_url'), b.map_embed_url || null,
        has('facebook_url'), b.facebook_url || null,
        has('telegram_url'), b.telegram_url || null,
        has('instagram_url'), b.instagram_url || null,
        has('tiktok_url'), b.tiktok_url || null,
      ]
    );
    await logActivity(req.admin, 'settings.update', { entity: 'settings', entityId: 1 });
    res.json({ message: 'Website settings saved.', settings: rows[0] });
  } catch (err) {
    next(err);
  }
};
