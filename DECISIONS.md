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
