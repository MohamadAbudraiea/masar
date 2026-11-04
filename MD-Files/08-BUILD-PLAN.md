# 08 — Build Plan

Goal: ship the demo as fast as possible, with a working vertical slice early and polish last. After each phase, run the app and check the acceptance list before moving on. Commit after each phase.

## Principles
- **Vertical slice first.** Get one shipment through the whole lifecycle with plain UI before building dashboards.
- Build shared components (`05` §4) as you need them; do not build screens twice.
- Backend serializers and role-shaped responses are built **with** each endpoint, not added later.
- Keep `DECISIONS.md` for anything you had to decide.

## Phase 0 — Scaffolding (½ day)
- Monorepo (`client`, `server`, `docs`), Vite + Tailwind + i18n + Router + Query, Express with `.env`, `.env.example` files.
- `db.js` pool (timezone set), `npm run db:init`, connection test against Supabase.
- R2 upload + presigned read test; Resend test email.
- Design tokens (`05` §2) in Tailwind config, fonts loaded, EN/AR switch with RTL working on an empty page.
**Accept:** `/api/health` ok, a PDF uploaded and opened, a test email delivered, page flips RTL.

## Phase 1 — Data and auth
- `schema.sql`, reference seed (`03` §3–4), `computeSplit` + tests.
- Login, JWT, `GET /me`, role guards, minimal seed with 1 admin, 1 escrow, 1 manufacturer, 1 driver.
- App shells: sidebars/topbar for three desktop roles, `PhoneFrame` + bottom tabs for the driver, login page, pending-approval screen.
**Accept:** each seeded role logs in and lands in its own empty shell. Money test table (`01` §4) passes.

## Phase 2 — Signup, uploads, approvals
- `FileUpload`, `LocationPicker` (search, pin, paste-link, reverse geocode, auto-save), `TruckSelector` cascade.
- Manufacturer and driver signup (multi-step), admin approvals queue with PDF viewer, approve/reject with reason, admin manual-create for both.
- Account emails (templates 1–5) and in-app admin notification.
**Accept:** sign up a manufacturer and a driver with real PDFs and photos; admin approves; both log in; rejection shows the reason.

## Phase 3 — The core lifecycle (vertical slice)
- Truck suggestion, `suggest-truck` endpoint, shipment create/edit/delete with conditional and customs fields, route distance.
- Pay (fake payment sheet) → pending; matching and `/driver/available`; accept (atomic, one active per driver); arrived; loaded; delivered; confirm with ledger and payout; ratings.
- `Timeline` component and `StatusChip`.
- Minimal shipment detail pages for manufacturer and driver with the action buttons.
**Accept:** run the full story in `09` §3 steps 1–9 with two browsers. The partial unique index blocks a second active shipment. Manufacturer responses never contain fee fields; driver responses never contain price (check the JSON).

## Phase 4 — Notifications, emails, settings
- `notifications` service, bell, notification pages, activity log.
- All 15 email templates, deep links, `/open` resolver, `/dev/emails` preview, test-mode redirect.
- Settings pages: profile edit (no documents), password, language, time zone with frontend conversion, email toggle (after approval).
**Accept:** every event in `07` §2 produces the right in-app items and emails; toggle off stops non-account emails; time zone switch changes displayed times only.

## Phase 5 — Dashboards and reports
In this order (each with the shared `FilterBar` and URL state):
1. **Manufacturer:** overview, shipments list, payments, my drivers, locations, profile.
2. **Driver:** shipments cards, detail, active, earnings, me, history, manufacturer profile.
3. **Escrow:** overview, held funds, releases, companies, drivers, shipments.
4. **Admin:** overview, approvals polish, users lists and profiles, shipments, financial, ratings.
- Interlinked profiles and back-button restoration, global search, CSV export, shipment summary PDF (3 versions).
**Accept:** every route in `06` exists and is populated from the seed; clicking through ticket → manufacturer → ticket → driver → back, back, back returns to the exact previous views.

## Phase 6 — Wow and polish
- Admin live map with simulated truck movement, activity feed.
- Landing page with the hero route animation, all sections, EN/AR copy.
- Loading/empty/error states everywhere, `TruckLoader`, toasts.
- RTL pass on every screen, mobile pass on desktop dashboards, driver-app large-type pass on a real phone.
- Favicon, page titles, 404.
**Accept:** no screen shows a raw error, blank area, or untranslated string in either language.

## Phase 7 — Seed data and rehearsal
- Full demo seed (`09`), `npm run db:seed` is repeatable.
- Dry-run the demo script on four devices; fix everything that stutters.
- Final check of environment variables and sample `.env.example`.
**Accept:** demo script completes without intervention in EN and AR.

## Definition of done (global)
- No console errors on any route.
- Every list has loading, empty, and error states.
- Every entity name is a link where the rules allow.
- All strings exist in `en.json` and `ar.json`.
- Money and phone formatting follow `05` §10b.
- No commission data reachable by manufacturer or driver tokens.
