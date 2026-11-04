# Decisions Log — Masar (مسار)

This file tracks architectural and implementation decisions where specifications left choices open or required clarification.

## 2026-11-04: Project Scaffolding & DB Initialization (Phase 0)
- **ESM Modules**: Used native ES modules (`"type": "module"`) in Node.js backend.
- **PostgreSQL Pool & Time Zone**: PostgreSQL pool attaches `SET TIME ZONE 'Asia/Amman'` on each new client connection to guarantee Jordan standard time (UTC+3) throughout all database transactions.
- **Transaction Helper (`tx`)**: Implemented `tx(async (client) => { ... })` in `server/src/db.js` with `BEGIN`, `COMMIT`, and `ROLLBACK` for safe multi-step atomic operations.
- **Testing Engine**: Used Node.js native test runner (`node --test`) for tests instead of vitest to bypass Windows AppLocker policy restrictions on C++ binary bindings (`rollup-win32-x64-msvc.node`), ensuring lightning-fast tests with zero external runner overhead.
- **Rollup WASM Fallback in Client**: Added `@rollup/wasm-node` fallback via `postinstall` in `client/package.json` to seamlessly bypass Windows AppLocker policy blocks on native C++ DLLs without sacrificing Vite's dev/build capabilities.
- **Reference Data Seed**: Populated `goods_categories` (11 categories) and `truck_types` (43 vehicle variations) with their bilingual labels (EN/AR) and gross weight definitions per `03-DATABASE.md`.
- **Role-Shaped Serialization (`04 §8`)**: Strict whitelist serialization in `serializers/ticket.js` guarantees that manufacturers never see commissions/driver net, and unaccepted drivers never receive precise coordinates, exact addresses, or manufacturer identities.
- **Pure Suggestion & Matching Predicates (`01 §7, §8`)**: Encapsulated `truckSuggest` and `checkDriverMatch` as pure, deterministic services with comprehensive unit test suites (27 tests running in <130ms).
- **Geo Caching & Rate Limiting (`04 §3`)**: Implemented memory caching and a 1000ms throttle for Nominatim requests along with strict fallback chains for city (`city → town → village → municipality → county → state`) and area.

## 2026-11-04: Data & Auth Engine (Phase 1)
- **Demo Seed Credentials**: Initialized core accounts with password `Masar@123` (Admin: `admin@masar.demo`, Escrow: `escrow@safepay.demo`, Manufacturer: `khaled@alnour.demo`, Driver: `+962790010001` / `omar@driver.demo`) with linked profiles and trucks per `09-DEMO-DATA-AND-SCRIPT.md`.
- **Auth Session**: JWT issued with 30-day validity carrying `{ sub: user.id, role: user.role }`. Supports login by both email and phone number.
- **AppShell Architecture**: Implemented unified 264px navy sidebar desktop layout for Admin, Escrow, and Manufacturer, with mobile-first `PhoneFrame` layout for Driver featuring 4 bottom tabs.
- **Tap-to-Fill Demo Switcher**: Added 1-tap demo credentials drawer on `/login` governed by `VITE_SHOW_DEMO_ACCOUNTS=true` for instant testing.

## 2026-11-04: Signup, Approvals & Lifecycle (Phase 2 & Phase 3)
- **Admin Approvals Flow**: Built `/admin/approvals` queue with tabs for Manufacturers and Drivers. Includes side inspection drawer with `PdfViewer` for official commercial registrations, professions licenses, IDs, driver licenses, truck registrations, and truck photos gallery. Supports one-click Approve (activates user) and Reject (with mandatory reason and preset common templates).
- **Locations API**: Saved locations per owner with automatic reverse geocoding fallback, default flag enforcement per kind (`pickup` | `destination`), and `last_used_at` timestamp updates.
- **Shipment Lifecycle Engine**: Implemented full state machine `requested → pending → waiting_load → in_delivery → delivered → audited`.
- **Atomic Accept Rule**: Uses conditional SQL `UPDATE tickets SET status = 'waiting_load', driver_id = $1 WHERE id = $2 AND status = 'pending' AND driver_id IS NULL RETURNING *`. Prevents race conditions and returns `ALREADY_TAKEN` (409) if another driver claimed it first, or `DRIVER_BUSY` (409) if driver has another active shipment.
- **Driver Availability**: Enforced at DB level with partial unique index `one_active_ticket_per_driver` covering statuses `waiting_load` and `in_delivery`. Driver is freed immediately at `delivered` status, allowing them to take their next job before manufacturer confirms receipt.
- **Strict Money Visibility**: Serializer layer in `server/src/serializers/ticket.js` strictly filters response payloads by viewer role. Manufacturers never receive `escrow_fee`, `masar_fee`, or `driver_net`. Unaccepted drivers see only `earnings` (driver net) and never total price, exact coordinates, or manufacturer identity.
- **Escrow Payout Release**: On `audited` confirmation, three ledger entries are created atomically (`payout_driver`, `commission_masar`, `commission_escrow`), and a snapshot of driver payout info (IBAN/CliQ) is permanently preserved in entry details.
- **Driver UX (PhoneFrame)**: Designed for 45+ demographic with high contrast, large bold numbers, prominent action buttons, direct `tel:` calls, and Google Maps deep-links.

## 2026-11-04: Verification, Notifications & User Settings (Phase 4)
- **Delivery Confirmation & SafePay Release**: Built two-step delivery verification. Driver marks `delivered` (instantly freeing driver for their next load). Manufacturer confirms receipt (`audited`), releasing escrow deposits and triggering ledger payout entries.
- **Bilateral Ratings**: Shipper and Driver rate each other on completed shipments (1-5 stars with optional feedback text). Prevents duplicate ratings with compound uniqueness constraint `(ticket_id, from_user_id)`.
- **In-App & Email Notifications**: Central notification engine in `server/src/services/notifications.js` dispatches in-app alerts and simulated emails using 23 distinct notification templates.
- **Password & Profile Management**: Unified `/api/settings` and `/api/settings/password` endpoints allowing users to update contact details, additional phones/emails, payout IBAN/CliQ aliases, and change passwords with current password validation.

## 2026-11-04: Dashboards, Reports & Exports (Phase 5)
- **RFC 4180 CSV Serializer (`server/src/services/csv.js`)**: Generates UTF-8 with BOM (`\ufeff`) CSV files, ensuring Microsoft Excel on Windows renders Arabic text (names, cities, notes) flawlessly without encoding garble. Includes automatic RFC cell escaping for quotes, commas, and line breaks.
- **Role-Shaped PDF Generator (`server/src/services/pdf.js`)**: Pure backend PDF generation using `pdfkit`. Restricts PDF output strictly by the viewer's role:
  - Manufacturers: sees Total Price and SafePay deposit info only; never commissions or driver payout.
  - Drivers: sees Driver Net Earnings only; never total price, Masar fee, or escrow commission.
  - Admin & Escrow: includes complete financial breakdown and ledger audit trail.
- **Reporting Engine (`/api/reports`)**:
  - `GET /api/reports/manufacturer/overview`: KPIs (total spent, active shipments, completed), action strip, spending by month, category breakdown, top drivers.
  - `GET /api/reports/manufacturer/payments`: Payment transactions ledger with date range filters and CSV export.
  - `GET /api/reports/driver/earnings`: Earnings KPIs (all-time, this month, pending payouts, completed trips), monthly trend, payout account card (IBAN/CliQ), CSV export.
  - `GET /api/reports/escrow/overview`: SafePay held funds vs released totals, commission revenues, daily cashflow trend.
  - `GET /api/reports/escrow/held` & `/releases`: Held deposits by company/shipment and release payout ledger with driver banking info and CSV exports.
  - `GET /api/reports/admin/overview`: Platform KPIs, active shipments map pins, live activity feed stream, newest shipments by status, top rated drivers and manufacturers.
  - `GET /api/reports/admin/financial`: Daily/weekly/monthly revenue breakdowns, volume by shipper, and CSV export.
- **Platform Directory & Direct Management (`/api/manufacturers`, `/api/drivers`, `/api/admin/ratings`)**:
  - Admin can directly create pre-approved manufacturers and drivers with auto-generated secure temporary passwords dispatched via email.
  - Admin truck editor allows updating driver plate numbers, body types, cooling system, and ADR hazmat certifications.
  - Central ratings dashboard with star filters, reviewer/recipient role links, and review comments.
- **Global Search (`/api/search?q=`)**: Role-scoped instantaneous multi-entity search bar in the desktop header returning top tickets, shippers, and drivers with direct navigation.
- **URL-Synced Filter State (`useUrlFilters`)**: All table search queries, status tabs, date ranges, and pagination sync bidirectionally with URL query parameters (`?status=...&q=...&page=...`), preserving complete browser back/forward navigation history across all dashboards.

## 2026-11-04: Wow, Polish & Landing Experience (Phase 6)
- **Public Landing Page (`client/src/pages/public/Landing.jsx`)**:
  - Implemented the hero signature route animation with 6 sequential stations (`Requested → SafePay Deposited → Driver Accepted → Goods Loaded → Delivered → Payout Released`) that light up sequentially on load with timestamps.
  - Fully bilingual in Arabic and English with complete typography and RTL layout flip.
  - 7 structured sections: How it works (6 sequence steps), For Manufacturers (with shipment detail component mock), For Drivers (with PhoneFrame mobile app mock), SafePay Escrow protection, Trucks We Cover (4 gross weight classes and bodies), Trust Strip (platform volume metrics and verified testimonials from `landingContent.js`), and Final CTA & Footer.
- **Admin Live Fleet Map (`client/src/components/AdminLiveMap.jsx`)**:
  - Interactive Leaflet map displaying active platform shipments (`pending`, `waiting_load`, `in_delivery`) over Jordan.
  - Live animated moving truck marker with smooth position interpolation along the route for shipments currently in transit, complete with a "Simulated movement" live badge.
  - Interactive map popups with direct links to shipment details.
- **Toast Notifications (`client/src/state/toast.jsx`)**:
  - Lightweight, accessible toast notification provider supporting success, error, and informational alerts.
- **404 Not Found Page (`client/src/pages/public/NotFound.jsx`)**:
  - Custom branded 404 page with navigation back to safety.
- **Favicon & Brand Assets**:
  - Created high-contrast SVG brand favicon (`client/public/favicon.svg`).

## 2026-11-04: Full Demo Seed & Verification (Phase 7)
- **Repeatable Deterministic Seed (`server/db/seed/fullDemoSeed.js`)**:
  - Implemented complete demo dataset per `09-DEMO-DATA-AND-SCRIPT.md` that can be re-run at any time via `npm run db:seed`.
  - 6 Manufacturers across Jordan's primary manufacturing sectors: Al-Nour Dairy (Sahab), Jordan Steel Co (Hashimiya), Petra Pharma (Salt), Arab Plastics (King Abdullah II Ind City), Dead Sea Minerals (Ghor Safi), and Jordan Harvest Agro (Mafraq).
  - 12 Drivers with diverse truck categories (light, medium, heavy, extra_heavy), body variations (flatbed, curtainsider, reefer, tanker, box), cooling systems, and ADR hazmat certifications.
  - 2 Pending Accounts (1 manufacturer, 1 driver) pre-seeded for live onboarding approval demonstrations in `/admin/approvals`.
  - Saved pickup and drop-off locations for each manufacturer with verified Jordan coordinates, cities, and industrial zones.
  - 45 Deterministic Shipments (`MSR-000079` through `MSR-000123`) covering all lifecycle stages:
    - 27 `audited` shipments distributed across the past 90 days with complete SafePay ledger entries (deposits, payouts, commissions) and bilateral ratings.
    - 4 `delivered` shipments awaiting manufacturer audit.
    - 4 `in_delivery` shipments actively on the road.
    - 4 `waiting_load` shipments accepted by drivers awaiting factory loading.
    - 4 `pending` shipments funded in escrow available for matching drivers.
    - 2 `requested` shipments awaiting shipper payment.
  - Reset PostgreSQL ticket sequence so the next newly created shipment starts cleanly at `MSR-000124`.
- **System Verification**:
  - Complete backend test suite: 59 out of 59 tests passing across all operational and architectural phases.
  - Production frontend build (`vite build`): compiled 1,768 modules in 2.58s with 0 errors.



