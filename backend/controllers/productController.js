'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const config = require('../config/env');
const { parsePaging } = require('../utils/helpers');
const { logActivity } = require('../utils/activity');

const CATEGORIES = ['Sofas', 'Beds', 'Chairs', 'Dining Tables', 'Bufies/Cabinets', 'Custom Furniture', 'Other'];
const STOCK = ['in_stock', 'made_to_order', 'out_of_stock'];
const SORTS = {
  newest: 'p.created_at DESC',
  oldest: 'p.created_at ASC',
  price_low: 'COALESCE(p.discount_price, p.price) ASC',
  price_high: 'COALESCE(p.discount_price, p.price) DESC',
  name_az: 'LOWER(p.name) ASC',
};

/** Attach images array to a product row. */
async function withImages(products) {
  if (products.length === 0) return [];
  const ids = products.map((p) => p.id);
  const { rows: imgs } = await db.query(
    `SELECT id, product_id, image_url, is_primary, sort_order
       FROM product_images
      WHERE product_id = ANY($1::int[])
      ORDER BY is_primary DESC, sort_order ASC, id ASC`,
    [ids]
  );
  const byProduct = new Map();
  for (const img of imgs) {
    if (!byProduct.has(img.product_id)) byProduct.set(img.product_id, []);
    byProduct.get(img.product_id).push({
      id: img.id,
      url: img.image_url,
      is_primary: img.is_primary,
    });
  }
  return products.map((p) => {
    const images = byProduct.get(p.id) || [];
    const primary = images.find((i) => i.is_primary) || images[0] || null;
    return {
      ...p,
      price: Number(p.price),
      discount_price: p.discount_price != null ? Number(p.discount_price) : null,
      images,
      primary_image: primary ? primary.url : null,
    };
  });
}

/** Build WHERE clause + params from query filters. */
function buildFilters(query, { onlyPublished }) {
  const where = [];
  const params = [];
  if (onlyPublished) {
    where.push('p.is_published = TRUE');
  } else if (query.published === 'true' || query.published === 'false') {
    params.push(query.published === 'true');
    where.push(`p.is_published = $${params.length}`);
  }
  if (query.category && CATEGORIES.includes(query.category)) {
    params.push(query.category);
    where.push(`p.category = $${params.length}`);
  }
  if (query.featured === 'true') where.push('p.featured = TRUE');
  if (query.availability === 'true' || query.availability === 'false') {
    params.push(query.availability === 'true');
    where.push(`p.availability = $${params.length}`);
  }
  if (query.q && String(query.q).trim()) {
    params.push(`%${String(query.q).trim().toLowerCase()}%`);
    where.push(`(LOWER(p.name) LIKE $${params.length} OR LOWER(p.description) LIKE $${params.length})`);
  }
  if (query.minPrice) {
    params.push(Number(query.minPrice));
    where.push(`COALESCE(p.discount_price, p.price) >= $${params.length}`);
  }
  if (query.maxPrice) {
    params.push(Number(query.maxPrice));
    where.push(`COALESCE(p.discount_price, p.price) <= $${params.length}`);
  }
  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

async function listProducts(req, res, next, { onlyPublished }) {
  try {
    const { page, limit, offset } = parsePaging(req.query, { defLimit: 12, maxLimit: 48 });
    const { clause, params } = buildFilters(req.query, { onlyPublished });
    const orderBy = SORTS[req.query.sort] || SORTS.newest;

    const countSql = `SELECT COUNT(*)::int AS total FROM products p ${clause}`;
    const { rows: cRows } = await db.query(countSql, params);
    const total = cRows[0].total;

    const dataParams = params.slice();
    dataParams.push(limit, offset);
    const dataSql = `
      SELECT p.id, p.name, p.category, p.description, p.price, p.discount_price,
             p.availability, p.featured, p.stock_status, p.is_published,
             p.created_at, p.updated_at
        FROM products p
        ${clause}
       ORDER BY p.featured DESC, ${orderBy}
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`;
    const { rows } = await db.query(dataSql, dataParams);
    const products = await withImages(rows);

    res.json({
      products,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/products (public) */
exports.listPublic = (req, res, next) => listProducts(req, res, next, { onlyPublished: true });

/** GET /api/admin/products (admin) */
exports.listAdmin = (req, res, next) => listProducts(req, res, next, { onlyPublished: false });

/** GET /api/products/:id (public — published only) */
exports.getPublic = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rows } = await db.query(
      `SELECT id, name, category, description, price, discount_price, availability,
              featured, stock_status, is_published, created_at, updated_at
         FROM products WHERE id = $1 AND is_published = TRUE`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found.' });
    const [product] = await withImages(rows);
    res.json({ product });
  } catch (err) {
    next(err);
  }
};

/** GET /api/admin/products/:id (admin — any) */
exports.getAdmin = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rows } = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Product not found.' });
    const [product] = await withImages(rows);
    res.json({ product });
  } catch (err) {
    next(err);
  }
};

function normaliseProductBody(body) {
  const category = CATEGORIES.includes(body.category) ? body.category : 'Other';
  const stock_status = STOCK.includes(body.stock_status) ? body.stock_status : 'in_stock';
  const price = Number(body.price);
  const discount = body.discount_price === '' || body.discount_price == null ? null : Number(body.discount_price);
  const toBool = (v) => v === true || v === 'true' || v === '1' || v === 'on';
  return {
    name: String(body.name || '').trim(),
    category,
    description: String(body.description || '').trim(),
    price,
    discount_price: discount,
    availability: toBool(body.availability),
    featured: toBool(body.featured),
    stock_status,
    is_published: body.is_published === undefined ? true : toBool(body.is_published),
  };
}

/** POST /api/admin/products */
exports.create = async (req, res, next) => {
  try {
    const b = normaliseProductBody(req.body);
    const product = await db.withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO products (name, category, description, price, discount_price, availability, featured, stock_status, is_published)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [b.name, b.category, b.description, b.price, b.discount_price, b.availability, b.featured, b.stock_status, b.is_published]
      );
      const p = rows[0];

      const files = req.files || [];
      for (let i = 0; i < files.length; i += 1) {
        const url = `/uploads/products/${files[i].filename}`;
        await client.query(
          `INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [p.id, url, i === 0, i]
        );
      }
      return p;
    });

    await logActivity(req.admin, 'product.create', { entity: 'product', entityId: product.id, detail: product.name });
    const { rows } = await db.query('SELECT * FROM products WHERE id = $1', [product.id]);
    const [full] = await withImages(rows);
    res.status(201).json({ message: 'Product added successfully.', product: full });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/admin/products/:id */
exports.update = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const b = normaliseProductBody(req.body);
    const { rows } = await db.query(
      `UPDATE products SET name=$1, category=$2, description=$3, price=$4, discount_price=$5,
              availability=$6, featured=$7, stock_status=$8, is_published=$9
       WHERE id=$10 RETURNING *`,
      [b.name, b.category, b.description, b.price, b.discount_price, b.availability, b.featured, b.stock_status, b.is_published, id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found.' });

    // Any newly uploaded images are appended
    const files = req.files || [];
    if (files.length) {
      const { rows: cnt } = await db.query('SELECT COUNT(*)::int AS n FROM product_images WHERE product_id=$1', [id]);
      let order = cnt[0].n;
      for (const f of files) {
        const url = `/uploads/products/${f.filename}`;
        await db.query(
          `INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
           VALUES ($1,$2,$3,$4)`,
          [id, url, order === 0, order]
        );
        order += 1;
      }
    }

    await logActivity(req.admin, 'product.update', { entity: 'product', entityId: id, detail: b.name });
    const { rows: full } = await db.query('SELECT * FROM products WHERE id=$1', [id]);
    const [product] = await withImages(full);
    res.json({ message: 'Product updated successfully.', product });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/admin/products/:id/publish */
exports.togglePublish = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const publish = req.body.is_published === undefined ? null : Boolean(req.body.is_published);
    const { rows } = await db.query(
      `UPDATE products
          SET is_published = CASE WHEN $2::boolean IS NULL THEN NOT is_published ELSE $2 END
        WHERE id = $1 RETURNING id, name, is_published`,
      [id, publish]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found.' });
    await logActivity(req.admin, 'product.publish', { entity: 'product', entityId: id, detail: String(rows[0].is_published) });
    res.json({
      message: rows[0].is_published ? 'Product published.' : 'Product unpublished.',
      product: rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/admin/products/:id */
exports.remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rows: imgs } = await db.query('SELECT image_url FROM product_images WHERE product_id=$1', [id]);
    const { rows } = await db.query('DELETE FROM products WHERE id=$1 RETURNING id, name', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Product not found.' });
    // Remove image files from disk (best-effort)
    for (const im of imgs) removeUploadedFile(im.image_url);
    await logActivity(req.admin, 'product.delete', { entity: 'product', entityId: id, detail: rows[0].name });
    res.json({ message: 'Product deleted.', id });
  } catch (err) {
    next(err);
  }
};

/** POST /api/admin/products/:id/images */
exports.addImages = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rows: exists } = await db.query('SELECT id FROM products WHERE id=$1', [id]);
    if (!exists[0]) return res.status(404).json({ error: 'Product not found.' });
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'No images were uploaded.' });

    const { rows: cnt } = await db.query('SELECT COUNT(*)::int AS n FROM product_images WHERE product_id=$1', [id]);
    let order = cnt[0].n;
    const created = [];
    for (const f of files) {
      const url = `/uploads/products/${f.filename}`;
      const { rows } = await db.query(
        `INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
         VALUES ($1,$2,$3,$4) RETURNING id, image_url, is_primary`,
        [id, url, order === 0, order]
      );
      created.push({ id: rows[0].id, url: rows[0].image_url, is_primary: rows[0].is_primary });
      order += 1;
    }
    await logActivity(req.admin, 'product.image_add', { entity: 'product', entityId: id, detail: `${created.length} image(s)` });
    res.status(201).json({ message: 'Images uploaded.', images: created });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/admin/products/:id/images/:imageId/primary */
exports.setPrimaryImage = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const imageId = parseInt(req.params.imageId, 10);
    await db.withTransaction(async (client) => {
      await client.query('UPDATE product_images SET is_primary = FALSE WHERE product_id=$1', [id]);
      const { rowCount } = await client.query(
        'UPDATE product_images SET is_primary = TRUE WHERE id=$1 AND product_id=$2',
        [imageId, id]
      );
      if (!rowCount) {
        const e = new Error('Image not found.');
        e.status = 404;
        throw e;
      }
    });
    await logActivity(req.admin, 'product.image_primary', { entity: 'product', entityId: id, detail: String(imageId) });
    res.json({ message: 'Primary image updated.' });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/admin/products/:id/images/:imageId */
exports.removeImage = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const imageId = parseInt(req.params.imageId, 10);
    const { rows } = await db.query(
      'DELETE FROM product_images WHERE id=$1 AND product_id=$2 RETURNING image_url, is_primary',
      [imageId, id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Image not found.' });
    removeUploadedFile(rows[0].image_url);
    // If we removed the primary, promote the next image.
    if (rows[0].is_primary) {
      await db.query(
        `UPDATE product_images SET is_primary = TRUE
          WHERE id = (SELECT id FROM product_images WHERE product_id=$1 ORDER BY sort_order ASC, id ASC LIMIT 1)`,
        [id]
      );
    }
    await logActivity(req.admin, 'product.image_delete', { entity: 'product', entityId: id, detail: String(imageId) });
    res.json({ message: 'Image removed.', id: imageId });
  } catch (err) {
    next(err);
  }
};

/** GET /api/meta/categories */
exports.categories = (req, res) => res.json({ categories: CATEGORIES, stock: STOCK });

function removeUploadedFile(url) {
  try {
    if (!url || /^https?:\/\//i.test(url)) return;
    const rel = url.replace(/^\/+/, '');
    const abs = path.join(config.rootDir, rel);
    const uploadsRoot = path.join(config.rootDir, config.uploads.dir);
    // Guard against path traversal — only delete inside uploads dir.
    if (abs.startsWith(uploadsRoot) && fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (_) {
    /* best effort */
  }
}

exports._categories = CATEGORIES;
