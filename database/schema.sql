-- ============================================================================
--  Mengistu Furniture — PostgreSQL schema
--  Normalized, with primary/foreign keys, indexes, unique & check constraints,
--  timestamps and referential integrity. Safe to run repeatedly (idempotent-ish:
--  it drops and recreates the schema objects).
-- ============================================================================

BEGIN;

-- Clean slate (order matters because of FKs)
DROP TABLE IF EXISTS admin_activity   CASCADE;
DROP TABLE IF EXISTS product_images   CASCADE;
DROP TABLE IF EXISTS appointments      CASCADE;
DROP TABLE IF EXISTS inquiries         CASCADE;
DROP TABLE IF EXISTS products          CASCADE;
DROP TABLE IF EXISTS settings          CASCADE;
DROP TABLE IF EXISTS admins            CASCADE;

DROP TYPE IF EXISTS admin_role       CASCADE;
DROP TYPE IF EXISTS product_category CASCADE;
DROP TYPE IF EXISTS stock_status     CASCADE;
DROP TYPE IF EXISTS appointment_status CASCADE;
DROP TYPE IF EXISTS inquiry_status   CASCADE;

-- ── Enumerated types ────────────────────────────────────────────────────────
CREATE TYPE admin_role         AS ENUM ('admin', 'super_admin');
CREATE TYPE product_category   AS ENUM ('Sofas', 'Beds', 'Chairs', 'Dining Tables', 'Bufies/Cabinets', 'Custom Furniture', 'Other');
CREATE TYPE stock_status       AS ENUM ('in_stock', 'made_to_order', 'out_of_stock');
CREATE TYPE appointment_status AS ENUM ('Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled');
CREATE TYPE inquiry_status     AS ENUM ('New', 'Read', 'Responded');

-- ── Shared updated_at trigger ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── admins ──────────────────────────────────────────────────────────────────
CREATE TABLE admins (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(160)  NOT NULL,
  phone         VARCHAR(40),
  password_hash TEXT          NOT NULL,
  role          admin_role    NOT NULL DEFAULT 'admin',
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT admins_email_unique UNIQUE (email),
  CONSTRAINT admins_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);
CREATE TRIGGER trg_admins_updated BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── products ────────────────────────────────────────────────────────────────
CREATE TABLE products (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(160)      NOT NULL,
  category       product_category  NOT NULL DEFAULT 'Other',
  description    TEXT              NOT NULL DEFAULT '',
  price          NUMERIC(12,2)     NOT NULL CHECK (price >= 0),
  discount_price NUMERIC(12,2)     CHECK (discount_price IS NULL OR discount_price >= 0),
  availability   BOOLEAN           NOT NULL DEFAULT TRUE,   -- shown as Available / Unavailable
  featured       BOOLEAN           NOT NULL DEFAULT FALSE,
  stock_status   stock_status      NOT NULL DEFAULT 'in_stock',
  is_published   BOOLEAN           NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  CONSTRAINT products_discount_lt_price
    CHECK (discount_price IS NULL OR discount_price < price)
);
CREATE INDEX idx_products_category   ON products (category);
CREATE INDEX idx_products_featured   ON products (featured);
CREATE INDEX idx_products_published  ON products (is_published);
CREATE INDEX idx_products_created    ON products (created_at DESC);
-- Fast case-insensitive name/description search
CREATE INDEX idx_products_name_lower ON products (LOWER(name));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── product_images ──────────────────────────────────────────────────────────
CREATE TABLE product_images (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url   TEXT         NOT NULL,
  is_primary  BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_product_images_product ON product_images (product_id);
-- At most one primary image per product
CREATE UNIQUE INDEX uniq_primary_per_product
  ON product_images (product_id) WHERE is_primary;

-- ── appointments ────────────────────────────────────────────────────────────
CREATE TABLE appointments (
  id                SERIAL PRIMARY KEY,
  booking_reference VARCHAR(20)         NOT NULL UNIQUE,
  customer_name     VARCHAR(120)        NOT NULL,
  phone             VARCHAR(40)         NOT NULL,
  email             VARCHAR(160),
  furniture_type    VARCHAR(120)        NOT NULL,
  preferred_date    DATE                NOT NULL,
  preferred_time    VARCHAR(40),
  description       TEXT                NOT NULL DEFAULT '',
  reference_image   TEXT,
  notes             TEXT,
  status            appointment_status  NOT NULL DEFAULT 'Pending',
  admin_note        TEXT,
  handled_by        INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  CONSTRAINT appt_email_format
    CHECK (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);
CREATE INDEX idx_appointments_status  ON appointments (status);
CREATE INDEX idx_appointments_created ON appointments (created_at DESC);
CREATE INDEX idx_appointments_date    ON appointments (preferred_date);
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── inquiries ───────────────────────────────────────────────────────────────
CREATE TABLE inquiries (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120)     NOT NULL,
  phone       VARCHAR(40),
  email       VARCHAR(160),
  subject     VARCHAR(160)     NOT NULL,
  message     TEXT             NOT NULL,
  status      inquiry_status   NOT NULL DEFAULT 'New',
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  CONSTRAINT inquiry_email_format
    CHECK (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);
CREATE INDEX idx_inquiries_status  ON inquiries (status);
CREATE INDEX idx_inquiries_created ON inquiries (created_at DESC);
CREATE TRIGGER trg_inquiries_updated BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── admin_activity (audit log of recent admin actions) ──────────────────────
CREATE TABLE admin_activity (
  id          SERIAL PRIMARY KEY,
  admin_id    INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  admin_name  VARCHAR(120),
  action      VARCHAR(80)  NOT NULL,     -- e.g. 'product.create'
  entity      VARCHAR(40),               -- e.g. 'product'
  entity_id   INTEGER,
  detail      TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_activity_created ON admin_activity (created_at DESC);

-- ── settings (single-row key/value-ish website settings) ────────────────────
CREATE TABLE settings (
  id                SMALLINT PRIMARY KEY DEFAULT 1,
  business_name     VARCHAR(120) NOT NULL DEFAULT 'Mengistu Furniture',
  tagline           VARCHAR(160) NOT NULL DEFAULT 'Stylish Homes • Better Living',
  location          VARCHAR(200) NOT NULL DEFAULT 'Yeduha Town, East Gojam, Amhara Region, Ethiopia',
  primary_phone     VARCHAR(40)  NOT NULL DEFAULT '+251970801754',
  secondary_phone   VARCHAR(40)  NOT NULL DEFAULT '0921579056',
  email             VARCHAR(160) NOT NULL DEFAULT 'mengistuteshome@gmail.com',
  about_text        TEXT         NOT NULL DEFAULT 'Mengistu Furniture is a furniture workshop in Yeduha Town, East Gojam, crafting quality ready-made and custom furniture for Ethiopian homes.',
  telebirr_number   VARCHAR(40)  NOT NULL DEFAULT '+251970801754',
  telebirr_name     VARCHAR(120) NOT NULL DEFAULT '',
  telebirr_qr_url   TEXT,
  telebirr_note     TEXT         NOT NULL DEFAULT 'Pay via Telebirr, then send your payment screenshot to confirm your order.',
  payment_instructions TEXT      NOT NULL DEFAULT '',
  map_embed_url     TEXT,
  facebook_url      TEXT,
  telegram_url      TEXT,
  instagram_url     TEXT,
  tiktok_url        TEXT,
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT settings_singleton CHECK (id = 1)
);
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

COMMIT;
