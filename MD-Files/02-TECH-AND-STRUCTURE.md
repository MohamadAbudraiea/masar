# 02 — Tech Stack and Structure

## 1. Stack
| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite, **JavaScript**, React Router v6, TanStack Query v5, Tailwind CSS, Radix UI primitives, lucide-react icons, Recharts, react-leaflet + Leaflet (OpenStreetMap tiles), react-i18next |
| Backend | Node 20, Express 4, `pg`, `bcryptjs`, `jsonwebtoken`, `multer` (memory storage), `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (Cloudflare R2), `resend` + `@react-email/components` + `@react-email/render`, `pdfkit`, `luxon`, `dotenv`, `cors`, `morgan` |
| Dev tooling | `tsx` (runs `.jsx` email templates on Node), `nodemon` or `tsx watch`, Vitest for a few unit tests |
| Database | PostgreSQL on **Supabase**. The app only needs a connection string |
| Files | **Cloudflare R2** (private bucket, S3 API, presigned read URLs) |
| Email | **Resend** (English only) |
| Maps | Leaflet + OSM tiles; Nominatim (geocoding); OSRM public server (routes) |
| Hosting (not your job now) | Frontend on Vercel, backend on the owner's VPS behind HTTPS, DB Supabase, files R2 |

## 2. Repo layout
```
masar/
├─ AGENTS.md  DECISIONS.md  README.md
├─ docs/                      # the numbered md files
├─ server/
│  ├─ package.json  .env.example
│  ├─ db/
│  │  ├─ schema.sql           # from 03-DATABASE.md
│  │  └─ seed/                # reference data + demo data (09)
│  └─ src/
│     ├─ index.js  config.js  db.js
│     ├─ middleware/          # auth.js, error.js
│     ├─ routes/              # auth, me, reference, geo, locations, tickets, driver,
│     │                       # manufacturers, drivers, reports, admin, notifications,
│     │                       # search, uploads, ratings
│     ├─ services/            # money, matching, truckSuggest, tickets, ledger,
│     │                       # notifications, activity, email, storage, geo, pdf, reports, time
│     ├─ serializers/         # ticket.js, user.js  (role-shaped output, see 04)
│     └─ emails/              # *.jsx react-email templates + layout.jsx + render.js
└─ client/
   ├─ package.json  .env.example  index.html  tailwind.config.js
   └─ src/
      ├─ main.jsx  App.jsx  routes.jsx
      ├─ api/                 # client.js (fetch wrapper), hooks per resource
      ├─ i18n/                # en.json, ar.json, index.js
      ├─ lib/                 # format.js (money, dates, phone), links.js, time.js, status.js
      ├─ state/               # auth store, settings
      ├─ components/          # shared UI (list in 05)
      ├─ layouts/             # AdminLayout, EscrowLayout, ManufacturerLayout, DriverLayout (phone frame)
      └─ pages/
         ├─ public/           # Landing, Login, Signup*, OpenLink, PendingApproval
         ├─ manufacturer/  driver/  escrow/  admin/  shared/  # shared = TicketDetail, profiles
```

## 3. Environment variables
**server/.env**
```
PORT=4000
TZ=Asia/Amman
DATABASE_URL=postgresql://...        # Supabase: use the DIRECT or SESSION-pooler string (port 5432), not the transaction pooler
JWT_SECRET=change-me
FRONTEND_URL=https://app.example.com
DRIVER_VISIBILITY_WINDOW_HOURS=48    # 0 disables
ON_TIME_TOLERANCE_MIN=15

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=masar
# endpoint is https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com

RESEND_API_KEY=
EMAIL_FROM="Masar <no-reply@yourdomain.com>"
EMAIL_REDIRECT_TO=                   # test mode: if set, ALL emails go to this address
SUPPORT_EMAIL=support@yourdomain.com

NOMINATIM_URL=https://nominatim.openstreetmap.org
NOMINATIM_USER_AGENT=masar-demo/1.0 (contact: you@yourdomain.com)
OSRM_URL=https://router.project-osrm.org

DEMO_ADMIN_EMAIL=                    # real inbox for the demo
DEMO_ESCROW_EMAIL=                   # real inbox for the demo
```
**client/.env**
```
VITE_API_URL=http://localhost:4000/api
VITE_SHOW_DEMO_ACCOUNTS=true
```
Provide `.env.example` files with every key and no values.

## 4. Scripts
Server: `dev`, `start`, `db:init` (runs `schema.sql`), `db:seed` (wipes and reseeds everything, including truck types and demo data), `test`.
Client: `dev`, `build`, `preview`.
There is **no UI reset button**. Re-seeding is a command: `npm run db:seed`.

## 5. Backend conventions
- Layered: `routes` (parse request, call service, serialize) → `services` (business logic, SQL) → `db.js` (pool).
- **Raw SQL with parameters**, no ORM. One helper `tx(fn)` for transactions.
- **Serializers are the only way to send ticket or user data to clients.** Never `res.json(row)` directly for tickets, users, or profiles. Role-shaped output is how the money-visibility rule is enforced (see `01` and `04`).
- Auth: `POST /auth/login` returns a JWT `{ sub, role }` valid for 30 days. Middleware `auth` loads the user into `req.user`; `requireRole(...roles)` guards routes. No refresh tokens.
- Validation: none beyond what is needed to avoid crashes. Business-state checks are required (see `01` §2).
- Errors: `{ "error": { "code": "ALREADY_TAKEN", "message": "Shipment already taken" } }` with an HTTP status. Central error middleware.
- List endpoints: `?page=1&page_size=20&sort=-created_at` and return `{ items, total, page, page_size }`.
- CSV export: any report/list endpoint accepts `format=csv`.
- Every state change writes `activity_log` and `notifications`; emails are fired after commit and **never block or fail the request** (log failures only).
- CORS: allow all origins. `app.set('trust proxy', true)`.

## 6. Time zones
- The server process runs with `TZ=Asia/Amman`. On every new pool connection run `SET TIME ZONE 'Asia/Amman'`. (Jordan is on permanent UTC+3.)
- Columns are `timestamptz`. JSONB timestamps (`status_history`, `events`) are ISO strings **with offset**, generated by `nowAmman()` in `services/time.js` using luxon: `DateTime.now().setZone('Asia/Amman').toISO()`.
- API returns ISO strings with offset. The **frontend** converts for display using `Intl.DateTimeFormat` with the user's `timezone` setting (default `Asia/Amman`). The DB value never changes with the user's preference.
- Time zone options in settings: Asia/Amman, UTC (GMT), Europe/London, Europe/Berlin, Europe/Paris, Europe/Madrid, Europe/Rome, Asia/Dubai, Asia/Riyadh, America/New_York. Emails always use Asia/Amman and print the zone label.

## 7. Files (Cloudflare R2)
- Upload flow: client calls `POST /api/uploads?kind=<kind>` (multipart, field `file`) → server stores in R2 under `uploads/<kind>/<uuid>-<original-name>` → returns `{ key, name, size }`. Forms then send the **keys** in JSON.
- Uploads work **without login** (signup needs them).
- Reading: `GET /api/files/url?key=...` returns `{ url }`, a presigned GET valid for 1 hour. The frontend opens PDFs in an inline viewer (iframe or `<object>`) with a download button, and shows images in a gallery.
- Frontend `accept` rules: documents are **PDF only**; truck photos are **images only** (max 3). The server does not validate.

## 8. i18n and RTL
- `react-i18next`, two languages (`en`, `ar`). On language change set `<html lang dir>`.
- Use Tailwind **logical utilities** (`ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `start-0`) and `rtl:` variants. Mirror directional icons (arrows, chevrons) in RTL. Leaflet maps stay LTR.
- Arabic font: IBM Plex Sans Arabic. Numbers, phones, IBANs, and money use Western digits in both languages. Phones, IBANs, ticket numbers render in an LTR span (`dir="ltr"`) inside Arabic text.
- User-entered text (names, notes, descriptions) is stored in one language and not translated.

## 9. Frontend conventions
- Server state via TanStack Query (staleTime 10 s, refetch on window focus). The notification bell polls every 15 s. No websockets.
- Filters, search text, sort, page, and tabs live in the **URL query string** (`useUrlFilters` hook), so the browser back button restores the exact view. Restore the scroll position of the main scroll container when navigating back.
- All entity names are links (shipment number, manufacturer, driver) using helpers in `lib/links.js` that build the correct path for the viewer's role.
- Never hard-code strings: all UI text comes from `i18n`.
- Components are small and presentational; pages own data fetching.

## 10. Testing
Minimum: Vitest unit tests for `computeSplit`, `matching`, and `truckSuggest`. Manual end-to-end check with the demo script in `09`.
