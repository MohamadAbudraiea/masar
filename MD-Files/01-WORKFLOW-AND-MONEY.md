# 01 — Workflow and Money (business rules)

This file wins over every other doc on business behaviour.

## 1. Statuses
`requested → pending → waiting_load → in_delivery → delivered → audited`

| Key | Manufacturer / Admin label | Driver-app label (plain words) | Meaning |
|---|---|---|---|
| `requested` | Awaiting payment | — (not visible) | Created, not paid. Hidden from drivers. Editable and deletable |
| `pending` | Open for drivers | Available | Paid into escrow. Visible to qualified drivers |
| `waiting_load` | Waiting for loading | Go to pickup | A driver accepted. Goods not loaded yet |
| `in_delivery` | In delivery | On the way | Manufacturer confirmed goods loaded |
| `delivered` | Delivered, awaiting confirmation | Delivered, awaiting confirmation | Driver says it arrived |
| `audited` | Delivered & confirmed | Completed and paid | Manufacturer confirmed. Escrow released the money |

Arabic labels live in the i18n files (see `05`).

**Money position per status:** nothing is paid out to Masar or the driver until `audited`. Funds are *held* in escrow from `pending` through `delivered`.

## 2. Transitions
Every transition runs inside one DB transaction, appends to `status_history` with an exact timestamp, writes notifications and an `activity_log` row.

| # | Action | Actor | From → To | Preconditions | Side effects |
|---|---|---|---|---|---|
| 1 | Create | Manufacturer | → `requested` | Fields per §6 | Compute split (§4), allocate ticket number, compute route distance |
| 2 | Edit / Delete | Manufacturer | `requested` only | Status is `requested` | Edit recomputes the split. Never allowed after payment |
| 3 | Pay | Manufacturer | `requested → pending` | Simulated payment | Ledger `deposit` of the full price. Notify qualified free drivers |
| 4 | Accept | Driver | `pending → waiting_load` | See §3 | Sets `driver_id`. Atomic, first driver wins |
| 5 | Arrived at pickup | Driver | stays `waiting_load` | Status is `waiting_load` | Appends event `arrived_at_pickup` (not a status) |
| 6 | Goods loaded | Manufacturer | `waiting_load → in_delivery` | Status is `waiting_load` | |
| 7 | Delivered | Driver | `in_delivery → delivered` | Status is `in_delivery` | Driver becomes free for a new shipment |
| 8 | Confirm delivery | Manufacturer | `delivered → audited` | Status is `delivered` | Release the money (§5), notify, unlock ratings |
| 9 | Rate | Manufacturer or Driver | `audited` only | One rating per side per shipment | Does not affect status or money |

Invalid transitions return HTTP 409 with a `code` (see `04`).

## 3. Driver availability and accepting
- A driver is **busy** when he has a shipment in `waiting_load` or `in_delivery`. He becomes **free** at `delivered`, not at `audited`.
- A busy driver **still sees** every shipment he qualifies for. The **Accept** button is disabled with the text "Finish your active shipment first".
- Two drivers accepting at once: the first wins; the second gets code `ALREADY_TAKEN` ("Shipment already taken").
- Enforce at DB level with the partial unique index in `03` (`one_active_ticket_per_driver`) plus the conditional UPDATE in the accept service.

## 4. Commission rules (all amounts in JD with 3 decimals)
- **Masar commission:** always **4%** of the full price.
- **Escrow commission:** a rate that depends on the price and applies to the **whole amount**:
  - price below 2,000 JD → **2%**
  - each additional full 1,000 JD adds **1%** (2,000–2,999.999 → 3%, 3,000–3,999.999 → 4%)
  - **cap: 5%**
- **Driver net** = price − escrow commission − Masar commission.
- **Minimum price: 500 JD.** The manufacturer sets the price.
- Compute once, **when the shipment is created or edited**, and store `escrow_fee`, `masar_fee`, `driver_net` on the ticket. Every screen shows the stored numbers.
- Use **integer fils** (1 JD = 1000 fils) to avoid float errors.

```js
// server/src/services/money.js
export function computeSplit(priceJd) {
  const fils = Math.round(Number(priceJd) * 1000);
  const wholeThousands = Math.floor(fils / 1_000_000);
  const escrowPct = Math.min(5, 2 + Math.max(0, wholeThousands - 1)); // 2..5
  const escrowFils = Math.round((fils * escrowPct) / 100);
  const masarFils = Math.round((fils * 4) / 100);
  const driverFils = fils - escrowFils - masarFils;
  const jd = (f) => (f / 1000).toFixed(3);
  return { price: jd(fils), escrowPct, escrowFee: jd(escrowFils), masarFee: jd(masarFils), driverNet: jd(driverFils) };
}
```

| Price | Escrow | Masar | Driver |
|---|---|---|---|
| 500 | 2% = 10.000 | 20.000 | 470.000 |
| 800 | 2% = 16.000 | 32.000 | 752.000 |
| 1,000 | 2% = 20.000 | 40.000 | 940.000 |
| 2,500 | 3% = 75.000 | 100.000 | 2,325.000 |
| 6,000 | 5% = 300.000 | 240.000 | 5,460.000 |

Write unit tests for `computeSplit` with these rows.

## 5. Payout on `audited`
Inside the confirm transaction insert three `ledger_entries`: `payout_driver` (driver_net), `commission_masar` (masar_fee), `commission_escrow` (escrow_fee). Snapshot the driver's IBAN and CliQ alias into the driver entry's `details`. The payout is a **notification only**:
> "752.000 JD transferred successfully to your account JO94CBJO0010000000000131000302." (driver, in-app and email)

## 6. Shipment fields
**Pickup and destination**
- `pickup_at` (date + time, one timestamp), pickup location (from saved locations or a new one), `needs_loading` (bool), `needs_unloading` (bool).
- Destination location, `dest_name`, `dest_phone` (**entered with country code, no prefilled code**).
- Locations store the **real coordinates and full address**, plus `city` and `area` derived by reverse geocoding.

**Cargo**
- `goods_category` (only categories the manufacturer registered for), `goods_description`, `quantity` + `unit` (`ton`, `liter`, or `m3`, following the required truck), `trip_type` (`local` | `international`, plus `destination_country` when international), `notes`.
- **Price** (min 500 JD).

**Required truck** = `required_category` (light, medium, heavy, tanker) + `required_body` (+ `required_cooling` for refrigerated). The system suggests it (§7); the manufacturer confirms or changes it. Gross weight is **not** asked here.

**Conditional fields**
| When | Extra fields |
|---|---|
| Goods `chilled` / `frozen` | `temp_min`, `temp_max` (°C) |
| Goods `hazardous` | `adr_class` (1–9), safety certificate (PDF). Sets `is_hazardous` |
| Goods `liquid` (tanker) | `liquid_type`, quantity in liters (gas in tons) |
| Required category `heavy`, or goods `machinery` / `vehicles` | `dimensions` L × W × H (m) |
| `trip_type = international` (toggle locked on) **or** manufacturer toggles "Customs clearance involved" on a local trip | `customs_declaration_number` (required), `customs_permit_type` (import / export / transit / other), `customs_permit_details`, optional customs documents (PDF) |

## 7. Truck suggestion
Input: goods category, quantity, optional `liquid_type`. Output: ordered list of `{category, body, cooling?}`; the first is preselected.

Candidate bodies per goods category (priority order):
| Goods | Bodies |
|---|---|
| dry | `closed_box`, `curtain`, `open`, `pickup` |
| chilled | `refrigerated` (cooling `chilled`) |
| frozen | `refrigerated` (cooling `frozen`) |
| liquid | by `liquid_type`: `water_tanker`, `sewage_tanker`, `fuel_tanker`, `chemical_tanker`, `food_liquid_tanker`, `gas_tanker`; then the generic medium `tank` body as a fallback for small quantities |
| bulk | `bulk_tanker`, `tipper` |
| machinery | `flatbed`, `open`, `lowbed` |
| hazardous | `chemical_tanker` (if liquid), else `closed_box` |
| livestock | `livestock` |
| vehicles | `car_carrier`, `tow` |
| furniture | `closed_box`, `curtain` |
| other | none; manufacturer picks manually |

Algorithm: for each body in priority order, for each category in `light, medium, heavy, tanker`, find the first `truck_types` row with that body whose `payload_max ≥ quantity`. Return the first hit plus any other body/category combinations that fit. Units must agree (tons vs liters vs m³).

## 8. Matching: which drivers see a pending shipment
A shipment is visible to a driver when **all** are true:
1. Driver `status = 'approved'`.
2. `truck_type.category = required_category` and `truck_type.body_code = required_body`.
3. Cooling: ticket `chilled` → truck cooling `chilled` or `frozen`; ticket `frozen` → truck cooling `frozen`.
4. `truck_type.unit = ticket.unit` and `truck_type.payload_max ≥ ticket.quantity`.
5. Scope: `local` → any driver; `international` → drivers with `scope = 'external'`.
6. Hazardous → `trucks.adr_certified = true`.
7. Visibility window: `pickup_at ≤ now + DRIVER_VISIBILITY_WINDOW_HOURS` (default 48, set to 0 to disable). **Parked for the CEO.** External drivers may take local shipments.

The same predicate decides who gets the "new shipment matches your truck" notification, with one addition: only **free** drivers are notified.

## 9. Timeline events
- Statuses are stored in `status_history`: `{ "requested": "2026-11-04T16:20:00+03:00", ... }`.
- `arrived_at_pickup` is stored in `events`: `[{ "type": "arrived_at_pickup", "at": "...", "by": "<driver_id>" }]`.
- **Early/late** = `arrived_at − pickup_at`, shown within ±15 minutes as "On time", otherwise "X min early" / "X min late". The tolerance is a constant (`ON_TIME_TOLERANCE_MIN = 15`).

## 10. Ratings
- After `audited`, the manufacturer can rate the driver and the driver can rate the manufacturer: 1–5 stars plus optional text.
- One rating per side per shipment. Ratings never change status or money.
- Averages and counts are computed from the `ratings` table. Notify the rated user in-app only (no email).

## 11. Visibility matrix

### Money
| Role | Sees |
|---|---|
| Admin | price, escrow fee, Masar fee, driver net |
| Escrow | price, escrow fee, Masar fee, driver net |
| Manufacturer | **price only** |
| Driver | **earnings only** (= driver net, labelled "Your earnings") |

### Shipments
| Role | Sees |
|---|---|
| Admin | All |
| Escrow | All, in a financial view (money, status, parties, timeline) |
| Manufacturer | Own only |
| Driver | Matching `pending` shipments (limited view, §12), then his own |

### Profiles and documents
| | Admin | Escrow | Manufacturer | Driver |
|---|---|---|---|---|
| Manufacturer profile | Everything incl. documents | Financial stats, contact, tickets | Own | Name, rating, reviews, location, phone, only for manufacturers of his accepted shipments |
| Driver profile | Everything incl. documents | Financial stats, **IBAN and CliQ**, tickets | Drivers on own shipments: name, phone, rating, truck, plate, photos, completed shipments | Own |
| Documents (PDF) | All | None | Own only | Own only |
| Ratings | All | None | Ratings of his drivers | Ratings of his manufacturers |

### Driver profile as seen by a manufacturer
The completed-shipments list shows: route (city → city), date, rating received, and the other manufacturer's **name as plain text, not a link**. It must **not** show ticket numbers (except for the viewer's own shipments), per-manufacturer counts, or any grouping by manufacturer. The driver's total completed count is shown.

## 12. Driver's limited view of a `pending` shipment
Shown: pickup **city and area**, destination **city and area**, distance, pickup time, required truck, needs loading / needs unloading badges, a "Customs shipment" badge (no number yet), hazardous badge, goods category, quantity, and **Your earnings**.
Hidden until accepted: exact addresses and coordinates, destination name and phone, manufacturer identity and phone, notes, customs numbers and documents.
After accepting: everything about the shipment except price and commissions.
Both locations are Google Maps links (`https://www.google.com/maps/search/?api=1&query=LAT,LNG`). All phones are `tel:` links.

## 13. Settings and approval
- Users can edit everything except documents. A driver **cannot** change his truck (admin can).
- The email on/off toggle appears only after approval. Account emails (signup received, approved, rejected, account created) are always sent.
- Admin-created accounts are auto-approved. The admin can edit any user, replace a driver's truck, and reset a password (new password emailed once; only the hash is stored).
