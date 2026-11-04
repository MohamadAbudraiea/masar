# 04 — API (Express)

Base path `/api`. JSON in and out. Auth header: `Authorization: Bearer <jwt>`.
"Role" column: `any` = any logged-in user, `public` = no login.

## 1. Conventions
- **Errors:** `{ "error": { "code": "ALREADY_TAKEN", "message": "Shipment already taken" } }`.
  Codes: `INVALID_STATUS` (409), `ALREADY_TAKEN` (409), `DRIVER_BUSY` (409), `NOT_FOUND` (404), `FORBIDDEN` (403), `BAD_CREDENTIALS` (401), `NOT_APPROVED` (403).
- **Lists:** `?page&page_size&sort` → `{ items, total, page, page_size }`.
- **Dates:** ISO 8601 strings with `+03:00`.
- **Money:** JSON strings with 3 decimals (`"752.000"`).
- **CSV:** add `format=csv` to any list or report endpoint.
- **Filter params** (shared by every ticket list): `q` (ticket number, partial), `status` (comma list), `from`, `to` (ISO dates), `date_field` (`created_at` default | `pickup_at` | `paid_at` | `delivered_at` | `audited_at`), `date` (exact day, overrides from/to), `manufacturer_id`, `driver_id`, `city`, `goods_category_id`, `trip_type`.
- **Serializers are mandatory** (`server/src/serializers/ticket.js`): one function per viewer type, built from explicit allow-lists. Never spread a DB row into a response.

## 2. Auth and account
| Method | Path | Role | Body / notes |
|---|---|---|---|
| POST | `/auth/login` | public | `{ identifier, password }` (email or full phone) → `{ token, user }`. Works for pending/rejected users too; `user.status` tells the client what to show |
| POST | `/auth/signup/manufacturer` | public | `{ name, contact_person?, phones[], emails[], password, location:{label,address,lat,lng,city,area}, goods_category_ids[], commercial_registration_key, professions_license_key, language }`. Creates user `pending`, a default pickup location, notifies admins |
| POST | `/auth/signup/driver` | public | `{ name, phone, email?, password, scope, license_class, iban, cliq_alias?, id_doc_key, license_doc_key, passport_doc_key?, truck:{ truck_type_id, plate_number, cooling?, adr_certified, gross_weight_code, license_doc_key, photo_keys[≤3] }, language }` |
| GET | `/me` | any | Own user + role profile (+ truck for drivers) |
| PATCH | `/me` | any | Editable fields: name, phones/emails, contact_person, goods categories (manufacturer, instant), iban/cliq_alias/scope/license_class (driver), language, timezone, email_notifications. **Not** documents, **not** the truck |
| POST | `/me/password` | any | `{ current_password, new_password }` |
| POST | `/uploads?kind=` | public | multipart `file` → `{ key, name, size }` |
| GET | `/files/url?key=` | any | → `{ url }` presigned 1 h |

## 3. Reference data and helpers
| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/reference/goods-categories` | public | List |
| GET | `/reference/truck-types` | public | Full catalog rows plus gross-weight options |
| POST | `/reference/suggest-truck` | manufacturer | `{ goods_category_id, quantity, liquid_type? }` → `{ suggestions:[{category, body, cooling?, unit, payload_max}], unit }` (see `01` §7) |
| GET | `/geo/search?q=` | any | Nominatim search → `[{ label, lat, lng, city, area }]` |
| GET | `/geo/reverse?lat=&lng=` | any | → `{ address, city, area }`. City fallback chain: `city → town → village → municipality → county → state`. Area fallback: `suburb → neighbourhood → quarter → city_district → hamlet` |
| POST | `/geo/resolve-link` | any | `{ url }` → `{ lat, lng }`. Follow redirects (short Google links), then parse `@lat,lng`, `!3dLAT!4dLNG`, `q=lat,lng`, or `ll=` |
| GET | `/geo/route?from=lat,lng&to=lat,lng` | any | OSRM → `{ distance_km, geometry }`. On failure return straight-line (haversine) distance and a 2-point geometry |

Nominatim: send the `User-Agent` from env; cache results in memory; never exceed 1 request/second.

## 4. Locations (manufacturer)
| Method | Path | Notes |
|---|---|---|
| GET | `/locations?kind=pickup\|destination` | Sorted: default first, then `last_used_at DESC` |
| POST | `/locations` | `{ kind, label, address, lat, lng, city?, area?, contact_name?, contact_phone? }`. Server fills missing city/area via reverse geocoding |
| PATCH | `/locations/:id` | Edit, set default |
| DELETE | `/locations/:id` | Tickets keep their snapshot |

## 5. Shipments (tickets)
| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/tickets` | manufacturer, escrow, admin | Role-scoped list with shared filters. Manufacturer sees own only |
| POST | `/tickets` | manufacturer | Create (fields in `01` §6). Server computes split, route distance, ticket number. Optional `pay_now: true` runs Pay immediately |
| GET | `/tickets/:id` | any (scoped) | Role-shaped detail (§8) |
| PATCH | `/tickets/:id` | manufacturer | Only while `requested`. Recomputes split |
| DELETE | `/tickets/:id` | manufacturer | Only while `requested` |
| POST | `/tickets/:id/pay` | manufacturer | `requested → pending` |
| POST | `/tickets/:id/accept` | driver | `pending → waiting_load` |
| POST | `/tickets/:id/arrived` | driver | Adds `arrived_at_pickup` event (idempotent) |
| POST | `/tickets/:id/loaded` | manufacturer | `waiting_load → in_delivery` |
| POST | `/tickets/:id/delivered` | driver | `in_delivery → delivered` |
| POST | `/tickets/:id/confirm` | manufacturer | `delivered → audited`, ledger, payout notifications |
| POST | `/tickets/:id/rating` | manufacturer, driver | `{ stars, comment? }` only when `audited` |
| GET | `/tickets/:id/pdf` | manufacturer, driver, admin | Role-specific summary PDF (§9). Only for `audited` shipments |

## 6. Driver endpoints
| Method | Path | Notes |
|---|---|---|
| GET | `/driver/available` | Pending shipments matching the driver (`01` §8), limited view (`01` §12). Each item has `can_accept` and `blocked_reason` (`DRIVER_BUSY`). Filters: `city`, `from`, `to`, sort by `pickup_at` or `earnings` |
| GET | `/driver/active` | His shipment in `waiting_load` / `in_delivery`, or `null` |
| GET | `/driver/history` | His shipments in `delivered` / `audited` with shared filters |

## 7. Profiles and relationships
| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/manufacturers` | admin, escrow | List with filters, sort by rating/ticket count |
| GET | `/manufacturers/:id` | admin, escrow, driver (own accepted), manufacturer (self) | Profile, shaped per viewer. Admin adds documents (signed URLs), escrow adds financial stats |
| GET | `/manufacturers/:id/tickets` | admin, escrow | Shared filters |
| GET | `/manufacturers/:id/ratings` | same as profile | Ratings received |
| GET | `/drivers` | admin, escrow | List |
| GET | `/drivers/:id` | admin, escrow, manufacturer (drivers on own tickets), driver (self) | Shaped per viewer (`01` §11). Escrow adds IBAN/CliQ and payout stats; admin adds documents |
| GET | `/drivers/:id/tickets` | admin, escrow | Shared filters |
| GET | `/drivers/:id/completed` | manufacturer | The privacy-limited completed list (`01` §11) |
| GET | `/me/drivers` | manufacturer | "My drivers": drivers on his shipments with ratings and how many times each worked with him |

## 8. Role-shaped ticket payloads
All variants include: `id, ticket_number, status, status_history, events, pickup_at, needs_loading, needs_unloading, goods{category_id, category_name, description, quantity, unit}, trip_type, destination_country, required_truck{category, body, cooling}, is_hazardous, temp_min, temp_max, adr_class, liquid_type, dimensions, customs_enabled, distance_km, created_at, arrival{arrived_at, delta_minutes, label}`, and `rating{ mine, theirs }` when `audited`.

| Variant | Extra fields | Never included |
|---|---|---|
| **manufacturer** (own) | `price`, full pickup and destination (address, lat, lng, city, area, dest_name, dest_phone), `notes`, customs fields and signed document URLs, `route_geometry`, `driver` card (when assigned: id, name, phone, rating, ratings_count, completed_count, truck{type, body, plate, photos}) | `escrow_fee`, `masar_fee`, `escrow_pct`, `driver_net` |
| **driver, not yet accepted** | `earnings` (= driver_net), `pickup{city, area}`, `dest{city, area}`, `is_customs` (bool), `can_accept`, `blocked_reason` | price, fees, manufacturer identity, addresses, coordinates, dest name/phone, notes, customs numbers/documents |
| **driver, assigned** | `earnings`, full pickup and destination, dest_name, dest_phone, `notes`, customs fields and documents, `route_geometry`, `manufacturer` card (id, name, phone, rating, ratings_count, pickup location label) | price, fees |
| **escrow** | `price`, `escrow_pct`, `escrow_fee`, `masar_fee`, `driver_net`, manufacturer and driver cards (driver card includes `iban`, `cliq_alias`), ledger entries, locations (city and area; full addresses too) | documents |
| **admin** | everything the escrow variant has, plus documents, notes, full addresses | — |

Cards link targets: `manufacturer.id` and `driver.id` are used by the client to build profile links (`05` §6).

## 9. Summary PDF (`pdfkit`)
Header with the Masar wordmark. Body: shipment number, route (cities), dates and the status timeline with timestamps (Asia/Amman), goods, truck, parties. Money section differs:
- **Manufacturer:** total price only.
- **Driver:** "Your earnings" only.
- **Admin:** price, escrow fee, Masar fee, driver net.
The `role` is taken from the token; an `?as=` parameter is not supported.

## 10. Reports
All accept `from`, `to` (and filters where relevant) and `format=csv`.
| Path | Role | Returns |
|---|---|---|
| `GET /reports/manufacturer/overview` | manufacturer | `kpis{total, active, total_paid, held, released, awaiting_payment}`, `needs_action{unpaid, to_mark_loaded, to_confirm}`, `spending_series[{date, amount}]`, `by_status[]`, `by_category[]`, `top_drivers[{driver_id, name, count}]`, `recent[]`. Prices only |
| `GET /reports/manufacturer/payments` | manufacturer | KPIs + paginated rows `{ticket_id, ticket_number, price, status, paid_at, released_at, driver}` |
| `GET /reports/driver/earnings` | driver | `kpis{pending_release, paid_out, this_month, completed_count}`, rows with `earnings`, `payout_account{iban, cliq_alias}` |
| `GET /reports/escrow/overview` | escrow | `kpis{held, released_in_period, commission_earned, awaiting_release_count}`, `held_vs_released_series`, `commission_series` |
| `GET /reports/escrow/held` | escrow | Rows per company and ticket: `{manufacturer, ticket, amount, held_since, status}` |
| `GET /reports/escrow/releases` | escrow | Ledger rows with the full breakdown and the driver's IBAN/CliQ |
| `GET /reports/admin/overview` | admin | `kpis{users, active_shipments, pending_approvals, masar_revenue, volume}`, `newest{requested[5], pending[5], audited[5]}`, `top_rated{manufacturers[], drivers[]}`, `top_by_count{manufacturers[], drivers[]}`, `status_distribution[]`, `cancel_rate: null` |
| `GET /reports/admin/financial?group=day\|week\|month` | admin | `kpis{masar_income, escrow_commissions, volume, held, released}`, `income_series`, `by_manufacturer[]`, `by_driver[]` |
| `GET /reports/admin/map` | admin | Active shipments for pins: `{ticket_id, ticket_number, status, pickup{lat,lng,city}, dest{lat,lng,city}, route_geometry, distance_km, in_delivery_at, driver_name}` for `pending`, `waiting_load`, `in_delivery` |
| `GET /reports/admin/activity?limit=30&before=` | admin | Latest `activity_log` rows with actor and ticket |
| `GET /admin/ratings` | admin | All ratings with filters |

## 11. Admin
| Method | Path | Notes |
|---|---|---|
| GET | `/admin/approvals?type=manufacturer\|driver` | Pending signups with document URLs |
| POST | `/admin/users/:id/approve` | Sets `approved`, notifies |
| POST | `/admin/users/:id/reject` | `{ reason }` |
| POST | `/admin/manufacturers` | Same fields as manufacturer signup, auto-approved, `created_by_admin = true`; emails a generated temporary password (store only the hash) |
| POST | `/admin/drivers` | Same as driver signup, auto-approved |
| PATCH | `/admin/users/:id` | Edit any user, including a driver's truck |
| POST | `/admin/users/:id/reset-password` | Generates a password, emails it once |

## 12. Notifications and search
| Method | Path | Notes |
|---|---|---|
| GET | `/notifications?unread=1&page=` | Own list plus `unread_count` |
| POST | `/notifications/:id/read` | |
| POST | `/notifications/read-all` | |
| GET | `/search?q=` | Role-scoped: tickets (by number), manufacturers and drivers (by name/phone) the viewer may see → `{ tickets[], manufacturers[], drivers[] }`, max 5 each |
