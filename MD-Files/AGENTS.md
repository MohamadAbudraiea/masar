# AGENTS.md — Masar (مسار)

You are building **Masar**, a demo-grade MVP for managing shipments from manufacturers to destinations. Read this file first, then the docs in order. The docs are the source of truth. If two docs conflict, the lower number wins, except `01-WORKFLOW-AND-MONEY.md`, which always wins on business rules.

## Read order
1. `00-OVERVIEW.md` — scope, roles, terminology, non-goals
2. `01-WORKFLOW-AND-MONEY.md` — statuses, matching, commissions, visibility (business rules)
3. `02-TECH-AND-STRUCTURE.md` — stack, repo layout, env, conventions
4. `03-DATABASE.md` — schema and reference data
5. `04-API.md` — endpoints and role-shaped payloads
6. `05-UI-UX-GUIDE.md` — design system and shared components
7. `06-SCREENS.md` — every screen, per role
8. `07-NOTIFICATIONS-AND-EMAILS.md`
9. `08-BUILD-PLAN.md` — the order you build in
10. `09-DEMO-DATA-AND-SCRIPT.md` — seed data and the demo walkthrough

## Non-negotiable rules
- **UX/UI quality is the priority.** This is a demo. It must look like a finished, professional product. The backend only has to work.
- **Terminology:** the UI says **Shipment**, never "order" or "ticket". Code and DB say `ticket`. In the **driver app** the driver is addressed as **Mr.** (AR: السيد). Other dashboards say "Driver".
- **Money visibility is a hard rule.** Manufacturers see the **price only**. Drivers see **their earnings only** (`price − escrow fee − Masar fee`). Never send commission fields to those roles, not even hidden in JSON. Use the serializers in `04-API.md`.
- **Backend:** no rate limits, no input hardening, no CSRF, no CORS restrictions. Still enforce business-state rules (status preconditions, one active shipment per driver, role-shaped responses), because those are product logic, not security.
- **Passwords are always hashed (bcrypt).** Never store plain text.
- **Timestamps:** stored in Asia/Amman (+03:00). Displayed in the user's chosen time zone (default Asia/Amman). See `02`.
- **Languages:** UI in English and Arabic (RTL). Emails are English only.
- Do not build the non-goals listed in `00-OVERVIEW.md` (cancellations, disputes, suspension, forgot-password, real payments, GPS).

## How to work
- Follow `08-BUILD-PLAN.md`. Build a **vertical slice first** (full shipment lifecycle working end to end), then dashboards, then polish.
- Do not ask the user questions that the docs already answer. If something is truly unspecified, choose the simplest option, note it in `DECISIONS.md` at the repo root, and move on.
- Every screen needs loading, empty, and error states (`05`). No screen may look broken during a demo.
- Prefer small, boring, readable code. JavaScript (ESM), no TypeScript.
- After each build-plan phase, run the app and verify the phase's acceptance checks before continuing.
- Keep secrets in `.env` files only. Never commit them.

## Done means
The walkthrough in `09-DEMO-DATA-AND-SCRIPT.md` runs end to end across four logged-in devices without errors, in both English and Arabic, and every dashboard in `06-SCREENS.md` exists and is populated from the seed data.
