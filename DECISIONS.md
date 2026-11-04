# Decisions Log — Masar (مسار)

This file tracks architectural and implementation decisions where specifications left choices open or required clarification.

## 2026-11-04: Project Scaffolding & DB Initialization
- **ESM Modules**: Used native ES modules (`"type": "module"`) in Node.js backend.
- **PostgreSQL Pool & Time Zone**: PostgreSQL pool attaches `SET TIME ZONE 'Asia/Amman'` on each new client connection to guarantee Jordan standard time (UTC+3) throughout all database transactions.
- **Transaction Helper (`tx`)**: Implemented `tx(async (client) => { ... })` in `server/src/db.js` with `BEGIN`, `COMMIT`, and `ROLLBACK` for safe multi-step atomic operations.
- **Testing Engine**: Used Node.js native test runner (`node --test`) for tests instead of vitest to bypass Windows AppLocker policy restrictions on C++ binary bindings (`rollup-win32-x64-msvc.node`), ensuring lightning-fast tests with zero external runner overhead.
- **Rollup WASM Fallback in Client**: Added `@rollup/wasm-node` fallback via `postinstall` in `client/package.json` to seamlessly bypass Windows AppLocker policy blocks on native C++ DLLs without sacrificing Vite's dev/build capabilities.
- **Reference Data Seed**: Populated `goods_categories` (11 categories) and `truck_types` (43 vehicle variations) with their bilingual labels (EN/AR) and gross weight definitions per `03-DATABASE.md`.
- **Role-Shaped Serialization (`04 §8`)**: Strict whitelist serialization in `serializers/ticket.js` guarantees that manufacturers never see commissions/driver net, and unaccepted drivers never receive precise coordinates, exact addresses, or manufacturer identities.
- **Pure Suggestion & Matching Predicates (`01 §7, §8`)**: Encapsulated `truckSuggest` and `checkDriverMatch` as pure, deterministic services with comprehensive unit test suites (27 tests running in <130ms).
- **Geo Caching & Rate Limiting (`04 §3`)**: Implemented memory caching and a 1000ms throttle for Nominatim requests along with strict fallback chains for city (`city → town → village → municipality → county → state`) and area.
