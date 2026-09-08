# Mengistu Furniture

**Stylish Homes • Better Living**

A complete, production-ready web application for **Mengistu Furniture**, a furniture
business in Yeduha Town, East Gojam, Amhara Region, Ethiopia. It combines a public
marketing/catalogue website with a secure admin management system, backed by a real
REST API and a PostgreSQL database.

- **Public site** — hero, furniture catalogue with search/filter/sort, product detail
  gallery, custom-furniture booking with a trackable reference, contact form, Telebirr
  payment section, English / አማርኛ language toggle, fully responsive.
- **Admin dashboard** — statistics and charts, product management with image uploads,
  appointment approval workflow, inquiry management, Telebirr/payment configuration,
  website settings, and administrator management (super-admin).

---

## Tech stack

| Layer     | Technology                                                            |
| --------- | --------------------------------------------------------------------- |
| Frontend  | HTML5, CSS3, **vanilla JavaScript** (no framework)                    |
| Backend   | Node.js, **Express**                                                   |
| Database  | **PostgreSQL**                                                         |
| Auth      | bcrypt password hashing + **JWT** in an HTTP-only cookie              |
| Uploads   | Multer (validated image uploads)                                      |
| Security  | Helmet (CSP), CORS, rate limiting, express-validator, parameterised SQL |
| Container | Docker + Docker Compose                                               |

The backend serves the frontend as static files, so the whole thing runs as a single
service.

---

## Project structure

```
mengistu-furniture/
├── backend/
│   ├── config/         # env validation, PostgreSQL pool
│   ├── controllers/    # auth, products, appointments, inquiries, dashboard
│   ├── middleware/     # auth guard, validation, rate limiters, uploads, errors
│   ├── routes/         # REST route definitions
│   ├── scripts/        # runSchema, seed, createAdmin
│   ├── utils/          # token, password, logger, helpers, activity log
│   └── server.js       # app entry point
├── database/
│   └── schema.sql      # full schema (tables, enums, indexes, triggers)
├── frontend/
│   ├── assets/         # logo, favicon, seed product images
│   ├── css/            # public styles
│   ├── js/             # public site scripts
│   ├── admin/          # admin dashboard (its own css/ and js/)
│   └── *.html          # public pages
├── uploads/            # runtime-uploaded images (git-ignored)
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Quick start with Docker (recommended)

**Prerequisites:** Docker and Docker Compose.

```bash
# 1. Configure environment
cp .env.example .env
#    Edit .env — set a strong JWT_SECRET and change the DB/admin passwords.
#    IMPORTANT: if a value contains '#', wrap it in quotes, e.g.
#      SEED_ADMIN_PASSWORD="ChangeMe#2026"

# 2. Build and start (app + PostgreSQL)
docker compose up --build

# 3. In a second terminal, create the schema and seed data (first run only)
docker compose exec app npm run db:reset
```

Then open:

- Public site: <http://localhost:4000>
- Admin panel: <http://localhost:4000/admin>

Sign in with the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from your `.env`
(defaults: `mengistuteshome@gmail.com` / `ChangeMe#2026`). **Change the password after
first login** from *Admin Profile*.

---

## Local development (without Docker)

**Prerequisites:** Node.js 18+ and a running PostgreSQL 14+ instance.

```bash
# 1. Install dependencies
npm install

# 2. Create a database and user in PostgreSQL, e.g.
#    CREATE USER mengistu WITH PASSWORD 'dev_password';
#    CREATE DATABASE mengistu_furniture OWNER mengistu;

# 3. Configure environment
cp .env.example .env
#    Set DATABASE_URL (or PG* vars) to point at your database,
#    and set a JWT_SECRET. Remember to quote passwords containing '#'.

# 4. Apply schema + seed sample data
npm run db:reset

# 5. Start the server
npm run dev        # with auto-reload (nodemon)
# or
npm start
```

Visit <http://localhost:4000>.

---

## Environment variables

See `.env.example` for the full list. Key ones:

| Variable                | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string (or use the `PG*` vars)           |
| `JWT_SECRET`            | **Required.** Long random string used to sign session tokens   |
| `COOKIE_SECURE`         | `true` in production behind HTTPS                              |
| `CORS_ORIGINS`          | Comma-separated allowed origins                               |
| `MAX_UPLOAD_MB`         | Max image upload size (default 5)                             |
| `SEED_ADMIN_EMAIL`      | Email of the first (super) admin created by the seed          |
| `SEED_ADMIN_PASSWORD`   | Password for that admin — **quote it if it contains `#`**      |
| `BUSINESS_TELEBIRR_NUMBER` | Default Telebirr number shown on the site                  |

> **Note on `#` in `.env`:** dotenv treats an unquoted `#` as the start of a comment.
> Always wrap values containing `#` in double quotes, e.g. `SEED_ADMIN_PASSWORD="ChangeMe#2026"`.

---

## Available scripts

| Command                | Description                                                      |
| ---------------------- | --------------------------------------------------------------- |
| `npm start`            | Start the production server                                     |
| `npm run dev`          | Start with nodemon (auto-reload)                                |
| `npm run db:schema`    | Apply `database/schema.sql` (drops & recreates tables)          |
| `npm run db:seed`      | Insert the super admin + sample products/appointments/inquiries |
| `npm run db:reset`     | Schema + seed in one step                                       |
| `npm run create:admin` | Create/update an admin from the CLI                             |

Create an admin manually:

```bash
npm run create:admin -- --name "Name" --email "a@b.com" --password "StrongPass1" --role super_admin
```

---

## REST API overview

All API routes are under `/api`. Public routes need no auth; admin routes require a
valid session cookie (obtained via login).

**Public**

| Method | Path                                | Description                    |
| ------ | ----------------------------------- | ----------------------------- |
| GET    | `/api/health`                       | Health check                  |
| GET    | `/api/products`                     | List published products       |
| GET    | `/api/products/:id`                  | Product detail                |
| GET    | `/api/settings`                     | Public business settings      |
| POST   | `/api/appointments`                 | Submit an appointment request |
| GET    | `/api/appointments/track/:ref`      | Track by booking reference    |
| POST   | `/api/inquiries`                    | Submit a contact inquiry      |

**Auth**

| Method | Path                    | Description                        |
| ------ | ----------------------- | ---------------------------------- |
| GET    | `/api/auth/setup-status`| Whether first-admin setup is open  |
| POST   | `/api/auth/setup`       | Create the first admin             |
| POST   | `/api/auth/login`       | Log in (sets HTTP-only cookie)     |
| POST   | `/api/auth/logout`      | Log out                            |
| GET    | `/api/auth/me`          | Current admin                      |
| PUT    | `/api/auth/me`          | Update profile / change password   |

**Admin (auth required)**

| Method | Path                                          | Description                 |
| ------ | --------------------------------------------- | --------------------------- |
| GET    | `/api/admin/dashboard/statistics`             | Dashboard stats + charts    |
| GET    | `/api/admin/dashboard/activity`               | Recent activity             |
| GET/POST/PUT/DELETE | `/api/admin/products…`           | Product CRUD + images       |
| PATCH  | `/api/admin/products/:id/publish`             | Toggle published            |
| GET/PUT| `/api/admin/appointments…`                    | List / update appointments  |
| GET/PUT/DELETE | `/api/admin/inquiries…`               | Manage inquiries            |
| GET/PUT| `/api/admin/settings`                         | Website + payment settings  |
| GET/POST | `/api/auth/admins` *(super admin)*          | List / create admins        |

---

## Security notes

- Passwords are hashed with **bcrypt** (cost 12). Plaintext passwords are never stored.
- Sessions use a **JWT in an HTTP-only cookie** (not readable by JavaScript).
- All database access uses **parameterised queries** (no string concatenation).
- **Helmet** sets a strict Content-Security-Policy; the frontend uses external JS files
  only (no inline scripts).
- **Rate limiting** protects the API, login, and public form endpoints.
- Uploaded files are validated by MIME type and extension, size-limited, and stored with
  randomised filenames.
- The production check refuses to start with a weak/placeholder `JWT_SECRET`.

Before going live:

1. Set a strong, unique `JWT_SECRET`.
2. Set `COOKIE_SECURE=true` and serve over HTTPS.
3. Change the seeded admin password (or create your own admin and remove the seed one).
4. Restrict `CORS_ORIGINS` to your real domain.
5. Consider removing the `db` port mapping in `docker-compose.yml`.

---

## Testing checklist

The following have been verified end-to-end against a live PostgreSQL database:

- Frontend loads and is responsive (desktop + mobile).
- Backend starts and connects to the database; seed populates 14 products with images.
- Admin login works; unauthorised access to admin routes is blocked (401).
- Product create / update / delete; new products appear on the public site immediately.
- Image upload, add, set-primary and delete.
- Appointment submission returns a booking reference; tracking works; admin can
  approve / reject / complete / cancel with a note.
- Inquiry submission; admin can read, mark responded and delete.
- Dashboard statistics and charts reflect live data.
- Form validation returns clear field errors (422).
- Settings changes (business info, socials, Telebirr) surface on the public site.

---

© Mengistu Furniture. Built with Node.js, Express and PostgreSQL.
