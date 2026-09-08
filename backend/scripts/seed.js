'use strict';

/**
 * Seeds the database with:
 *   • the initial super-admin (from .env SEED_ADMIN_*)
 *   • a catalogue of real Mengistu Furniture products, using the workshop
 *     photos bundled in frontend/assets/seed. Each photo is copied into the
 *     live uploads/products directory with a randomised, secure filename, so
 *     the seeded products behave exactly like admin-uploaded ones.
 *   • a few demo appointments and inquiries so the dashboard is testable.
 *
 * Idempotent: clears products/images/appointments/inquiries first, then
 * repopulates. The admin is upserted (never duplicated).
 *
 * Usage: npm run db:seed
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashPassword } = require('../utils/password');
const { pool } = require('../config/db');
const config = require('../config/env');
const logger = require('../utils/logger');

const SEED_DIR = path.join(config.rootDir, 'frontend/assets/seed');
const UPLOAD_DIR = path.join(config.rootDir, config.uploads.dir, 'products');

/** Copy a bundled seed photo into uploads/products with a secure name. */
function publishImage(fileName) {
  const src = path.join(SEED_DIR, fileName);
  if (!fs.existsSync(src)) {
    logger.warn(`Seed image missing, skipping: ${fileName}`);
    return null;
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(fileName).toLowerCase() || '.jpg';
  const dest = `seed-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  fs.copyFileSync(src, path.join(UPLOAD_DIR, dest));
  return `/uploads/products/${dest}`;
}

// Catalogue — realistic Ethiopian furniture with prices in ETB.
const PRODUCTS = [
  {
    name: 'Modern Fabric Sofa Set',
    category: 'Sofas',
    price: 48000,
    discount_price: 42500,
    featured: true,
    availability: true,
    stock_status: 'in_stock',
    description:
      'A generous seven-seater living-room sofa set upholstered in soft, hard-wearing fabric. Deep cushions and a solid hardwood frame make it the centrepiece of a comfortable family sitting room. Delivered assembled and ready to enjoy.',
    images: ['sofa.jpg', 'sofa2.jpg', 'sofa4.jpg'],
  },
  {
    name: 'L-Shaped Corner Sofa',
    category: 'Sofas',
    price: 56000,
    featured: true,
    availability: true,
    stock_status: 'in_stock',
    description:
      'Spacious L-shaped corner sofa with a matching centre table. Ideal for larger living rooms, it offers relaxed seating for the whole family while making the most of your corner space.',
    images: ['sofa11.jpg', 'sofa12.jpg'],
  },
  {
    name: 'Classic Leather Sofa Set',
    category: 'Sofas',
    price: 62000,
    availability: true,
    stock_status: 'in_stock',
    description:
      'Elegant leather-finish sofa set with timber armrests and firm supportive seating. A refined choice for a formal sitting room or reception area.',
    images: ['leather-sofa.jpg', 'sofa7.jpg'],
  },
  {
    name: 'Sofa-Bed Convertible',
    category: 'Sofas',
    price: 34000,
    availability: true,
    stock_status: 'made_to_order',
    description:
      'A practical sofa that converts into a comfortable bed — perfect for guest rooms and compact homes. Built to order in your preferred fabric and colour.',
    images: ['sofa+bed.jpg', 'sofa13.jpg'],
  },
  {
    name: 'Modern King Bed',
    category: 'Beds',
    price: 38000,
    discount_price: 33900,
    featured: true,
    availability: true,
    stock_status: 'in_stock',
    description:
      'Contemporary king-size bed with a padded headboard and a sturdy hardwood frame. Clean lines and a warm finish bring a calm, modern feel to the bedroom. Mattress sold separately.',
    images: ['bed.jpg', 'bed9.jpg'],
  },
  {
    name: 'Storage Bed with Side Cabinets',
    category: 'Beds',
    price: 42000,
    availability: true,
    stock_status: 'in_stock',
    description:
      'King-size bed with integrated side cabinets and built-in storage — a tidy, space-saving solution for the modern bedroom. Finished by hand in our Yeduha workshop.',
    images: ['bed+control.jpg', 'bed10.jpg'],
  },
  {
    name: 'Single Wooden Bed',
    category: 'Beds',
    price: 16500,
    availability: true,
    stock_status: 'in_stock',
    description:
      'A neat, solid single bed suited to children’s rooms, students and guest rooms. Strong, simple and built to last.',
    images: ['single-bed.jpg'],
  },
  {
    name: 'Hand-Carved Designer Bed',
    category: 'Beds',
    price: 52000,
    featured: true,
    availability: true,
    stock_status: 'made_to_order',
    description:
      'A statement bed with detailed hand-carved work on the headboard, made to order to your chosen design and finish. A signature Mengistu Furniture piece.',
    images: ['best-hand-design.jpg', 'des.jpg', 'design2.jpg'],
  },
  {
    name: 'Eight-Seater Dining Table Set',
    category: 'Dining Tables',
    price: 45000,
    discount_price: 39900,
    featured: true,
    availability: true,
    stock_status: 'in_stock',
    description:
      'A full dining set with a large hardwood table and eight cushioned chairs. Built for family gatherings and entertaining, with a durable, easy-to-clean top.',
    images: ['dining-table.jpg', '4.jpg'],
  },
  {
    name: 'Wooden Bufie / Display Cabinet',
    category: 'Bufies/Cabinets',
    price: 47000,
    featured: true,
    availability: true,
    stock_status: 'in_stock',
    description:
      'A grand traditional bufie with glass display doors and generous storage. Beautifully finished, it showcases your best crockery while keeping everything organised.',
    images: ['Bufe.jpg', 'Bufe4.jpg', 'Bufe2.jpg'],
  },
  {
    name: 'Glass Display Cabinet',
    category: 'Bufies/Cabinets',
    price: 32000,
    availability: true,
    stock_status: 'in_stock',
    description:
      'An elegant lit display cabinet with framed glass panels — ideal for a dining room or living room. Custom sizes available on request.',
    images: ['Control22.jpg', 'control.jpg', 'control223.jpg'],
  },
  {
    name: 'Modern TV Stand & Wall Unit',
    category: 'Bufies/Cabinets',
    price: 28000,
    discount_price: 24500,
    availability: true,
    stock_status: 'in_stock',
    description:
      'A sleek TV stand with a matching wall unit and open shelving. A tidy, modern focal point for your living room with plenty of room for media and décor.',
    images: ['tv-stand2.jpg', 'shelf.jpg'],
  },
  {
    name: 'Custom Wardrobe',
    category: 'Custom Furniture',
    price: 55000,
    availability: true,
    stock_status: 'made_to_order',
    description:
      'A made-to-measure wardrobe built to fit your room and your storage needs. Choose the size, layout, finish and door style — we design and build it for you.',
    images: ['8Main.jpg', '6.jpg', '7.jpg'],
  },
  {
    name: 'Custom Interior Door',
    category: 'Custom Furniture',
    price: 12000,
    availability: true,
    stock_status: 'made_to_order',
    description:
      'Solid, handcrafted interior doors made to your preferred design and dimensions. Strong, elegant and finished to match your home.',
    images: ['door.jpg', '5.jpg'],
  },
];

const APPOINTMENTS = [
  {
    booking_reference: 'MF-4KQ7HX',
    customer_name: 'Abebe Kebede',
    phone: '+251911223344',
    email: 'abebe.k@example.com',
    furniture_type: 'Custom Wardrobe',
    preferred_date: '2026-09-20',
    preferred_time: 'Morning (9:00–12:00)',
    description: 'Need a 3-door wardrobe for the master bedroom, dark brown finish, about 2.4m wide.',
    status: 'Pending',
  },
  {
    booking_reference: 'MF-9TX2MP',
    customer_name: 'Marta Tesfaye',
    phone: '0921778899',
    email: 'marta.t@example.com',
    furniture_type: 'Dining Table',
    preferred_date: '2026-09-15',
    preferred_time: 'Afternoon (2:00–5:00)',
    description: 'Looking for a 6-seater dining set in a light wood finish.',
    status: 'Approved',
    admin_note: 'Confirmed. Customer will visit the workshop on the 15th.',
  },
  {
    booking_reference: 'MF-3RB8ND',
    customer_name: 'Yohannes Alemu',
    phone: '+251912004455',
    email: null,
    furniture_type: 'Sofa Set',
    preferred_date: '2026-08-30',
    preferred_time: 'Morning (9:00–12:00)',
    description: 'L-shaped sofa for a new apartment, grey fabric.',
    status: 'Completed',
    admin_note: 'Delivered and installed successfully.',
  },
];

const INQUIRIES = [
  {
    name: 'Selam Girma',
    phone: '+251913556677',
    email: 'selam.g@example.com',
    subject: 'Delivery to Debre Markos',
    message: 'Do you deliver furniture to Debre Markos, and what is the delivery cost for a sofa set?',
    status: 'New',
  },
  {
    name: 'Daniel Bekele',
    phone: '0921112233',
    email: 'daniel.b@example.com',
    subject: 'Bulk order for a guesthouse',
    message: 'We are furnishing a 10-room guesthouse and would like a quote for beds and cabinets.',
    status: 'Read',
  },
];

async function clearData(client) {
  await client.query('TRUNCATE product_images, products RESTART IDENTITY CASCADE');
  await client.query('TRUNCATE appointments RESTART IDENTITY CASCADE');
  await client.query('TRUNCATE inquiries RESTART IDENTITY CASCADE');
  await client.query('TRUNCATE admin_activity RESTART IDENTITY CASCADE');
  // Remove previously-seeded image files (keep admin uploads that aren't seed-*)
  try {
    for (const f of fs.readdirSync(UPLOAD_DIR)) {
      if (f.startsWith('seed-')) fs.unlinkSync(path.join(UPLOAD_DIR, f));
    }
  } catch (_) {
    /* dir may not exist yet */
  }
}

async function seedAdmin(client) {
  const hash = await hashPassword(config.seed.adminPassword);
  const { rows } = await client.query(
    `INSERT INTO admins (name, email, phone, password_hash, role)
     VALUES ($1,$2,$3,$4,'super_admin')
     ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, phone=EXCLUDED.phone
     RETURNING id, email, role`,
    [config.seed.adminName, config.seed.adminEmail, config.seed.adminPhone, hash]
  );
  logger.info(`Super admin ready: ${rows[0].email}`);
}

async function seedProducts(client) {
  let count = 0;
  let imgCount = 0;
  for (const p of PRODUCTS) {
    const { rows } = await client.query(
      `INSERT INTO products (name, category, description, price, discount_price, availability, featured, stock_status, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, TRUE) RETURNING id`,
      [
        p.name,
        p.category,
        p.description,
        p.price,
        p.discount_price ?? null,
        p.availability !== false,
        !!p.featured,
        p.stock_status || 'in_stock',
      ]
    );
    const productId = rows[0].id;
    let order = 0;
    for (const img of p.images) {
      const url = publishImage(img);
      if (!url) continue;
      await client.query(
        `INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
         VALUES ($1,$2,$3,$4)`,
        [productId, url, order === 0, order]
      );
      order += 1;
      imgCount += 1;
    }
    count += 1;
  }
  logger.info(`Inserted ${count} products with ${imgCount} images.`);
}

async function seedAppointments(client) {
  for (const a of APPOINTMENTS) {
    await client.query(
      `INSERT INTO appointments
        (booking_reference, customer_name, phone, email, furniture_type, preferred_date, preferred_time, description, status, admin_note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        a.booking_reference, a.customer_name, a.phone, a.email, a.furniture_type,
        a.preferred_date, a.preferred_time, a.description, a.status, a.admin_note || null,
      ]
    );
  }
  logger.info(`Inserted ${APPOINTMENTS.length} demo appointments.`);
}

async function seedInquiries(client) {
  for (const i of INQUIRIES) {
    await client.query(
      `INSERT INTO inquiries (name, phone, email, subject, message, status)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [i.name, i.phone, i.email, i.subject, i.message, i.status]
    );
  }
  logger.info(`Inserted ${INQUIRIES.length} demo inquiries.`);
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await clearData(client);
    await seedAdmin(client);
    await seedProducts(client);
    await seedAppointments(client);
    await seedInquiries(client);
    await client.query('COMMIT');
    logger.info('Seed completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
