# 03 — Database (PostgreSQL on Supabase)

Save §2 as `server/db/schema.sql`. `npm run db:init` runs it. Reference data (§3, §4) is loaded by `db:seed` before the demo data in `09`.

## 1. Notes
- Money columns are `numeric(12,3)` (JD with fils).
- All timestamps are `timestamptz`. The connection sets `TIME ZONE 'Asia/Amman'` (see `02` §6). JSONB timestamps are ISO strings with `+03:00`.
- Files are stored in R2. Columns named `*_key` hold the R2 object key.
- Phones are stored exactly as entered **with country code** (e.g. `+962791234567`), whitespace stripped.
- Passwords are bcrypt hashes in `password_hash`.

## 2. Schema
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Optional, needs privileges. The app also sets the zone per connection.
-- ALTER DATABASE postgres SET timezone TO 'Asia/Amman';

-- ───────── Reference data ─────────
CREATE TABLE goods_categories (
  id        smallint PRIMARY KEY,
  code      text UNIQUE NOT NULL,
  name_en   text NOT NULL,
  name_ar   text NOT NULL,
  sort      smallint NOT NULL
);

CREATE TABLE truck_types (
  id                  serial PRIMARY KEY,
  category            text NOT NULL CHECK (category IN ('light','medium','heavy','tanker')),
  type_code           text NOT NULL,
  type_name_en        text NOT NULL,
  type_name_ar        text NOT NULL,
  body_code           text NOT NULL,
  body_name_en        text NOT NULL,
  body_name_ar        text NOT NULL,
  unit                text NOT NULL CHECK (unit IN ('ton','liter','m3')),
  payload_min         numeric(10,2) NOT NULL,
  payload_max         numeric(10,2) NOT NULL,
  license_class       smallint NOT NULL CHECK (license_class IN (4,5,6)),
  is_refrigerated     boolean NOT NULL DEFAULT false,
  is_service_vehicle  boolean NOT NULL DEFAULT false,
  gross_weight_mode   text NOT NULL CHECK (gross_weight_mode IN ('fixed','choice')),
  gross_weight_options jsonb NOT NULL,   -- [{code,label_en,label_ar,value?,min?,max?}]
  UNIQUE (type_code, body_code)
);

-- ───────── Users ─────────
CREATE TABLE users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role                text NOT NULL CHECK (role IN ('admin','escrow','manufacturer','driver')),
  name                text NOT NULL,                 -- company name for manufacturers/escrow (single language)
  email               text UNIQUE,                   -- primary email (optional for drivers)
  phone               text UNIQUE,                   -- primary phone with country code
  password_hash       text NOT NULL,
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason    text,
  created_by_admin    boolean NOT NULL DEFAULT false,
  language            text NOT NULL DEFAULT 'en' CHECK (language IN ('en','ar')),
  timezone            text NOT NULL DEFAULT 'Asia/Amman',
  email_notifications boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  approved_at         timestamptz
);

CREATE TABLE manufacturer_profiles (
  user_id                     uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  contact_person              text,
  phones                      text[] NOT NULL,       -- 1+, first = primary
  emails                      text[] NOT NULL,       -- 1+, first = primary
  commercial_registration_key text NOT NULL,         -- PDF
  professions_license_key     text NOT NULL          -- PDF
);

CREATE TABLE manufacturer_goods_categories (
  manufacturer_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goods_category_id smallint NOT NULL REFERENCES goods_categories(id),
  PRIMARY KEY (manufacturer_id, goods_category_id)
);

CREATE TABLE driver_profiles (
  user_id          uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  scope            text NOT NULL CHECK (scope IN ('internal','external')),
  license_class    smallint NOT NULL CHECK (license_class IN (4,5,6)),
  iban             text NOT NULL,
  cliq_alias       text,
  id_doc_key       text NOT NULL,          -- PDF
  license_doc_key  text NOT NULL,          -- PDF
  passport_doc_key text                    -- PDF, required when scope = 'external'
);

CREATE TABLE trucks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id         uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,  -- one truck per driver
  truck_type_id     integer NOT NULL REFERENCES truck_types(id),
  plate_number      text NOT NULL,
  cooling           text CHECK (cooling IN ('chilled','frozen')),   -- only for refrigerated bodies
  adr_certified     boolean NOT NULL DEFAULT false,
  gross_weight_code text,                                           -- code from truck_types.gross_weight_options
  license_doc_key   text NOT NULL,                                  -- PDF
  photo_keys        text[] NOT NULL DEFAULT '{}'                    -- images, max 3
);

-- ───────── Locations ─────────
CREATE TABLE locations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('pickup','destination')),
  label         text NOT NULL,
  address       text NOT NULL,
  lat           double precision NOT NULL,
  lng           double precision NOT NULL,
  city          text,
  area          text,
  contact_name  text,               -- destinations: remembered receiver name
  contact_phone text,               -- destinations: remembered receiver phone (with country code)
  is_default    boolean NOT NULL DEFAULT false,
  last_used_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_locations_owner ON locations(owner_id, kind, last_used_at DESC);

-- ───────── Tickets (shown as "Shipments") ─────────
CREATE SEQUENCE ticket_seq START 1;

CREATE TABLE tickets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number   text UNIQUE NOT NULL
                  DEFAULT ('MSR-' || lpad(nextval('ticket_seq')::text, 6, '0')),
  manufacturer_id uuid NOT NULL REFERENCES users(id),
  driver_id       uuid REFERENCES users(id),
  status          text NOT NULL DEFAULT 'requested'
                  CHECK (status IN ('requested','pending','waiting_load','in_delivery','delivered','audited')),
  status_history  jsonb NOT NULL DEFAULT '{}',   -- {"requested":"2026-11-04T16:20:00+03:00", ...}
  events          jsonb NOT NULL DEFAULT '[]',   -- [{"type":"arrived_at_pickup","at":"...","by":"<driver uuid>"}]

  -- pickup (snapshot of the chosen location)
  pickup_at           timestamptz NOT NULL,
  pickup_location_id  uuid REFERENCES locations(id) ON DELETE SET NULL,
  pickup_label        text,
  pickup_address      text NOT NULL,
  pickup_lat          double precision NOT NULL,
  pickup_lng          double precision NOT NULL,
  pickup_city         text,
  pickup_area         text,
  needs_loading       boolean NOT NULL DEFAULT false,
  needs_unloading     boolean NOT NULL DEFAULT false,

  -- destination (snapshot)
  dest_location_id    uuid REFERENCES locations(id) ON DELETE SET NULL,
  dest_address        text NOT NULL,
  dest_lat            double precision NOT NULL,
  dest_lng            double precision NOT NULL,
  dest_city           text,
  dest_area           text,
  dest_name           text NOT NULL,
  dest_phone          text NOT NULL,

  -- cargo
  goods_category_id   smallint NOT NULL REFERENCES goods_categories(id),
  goods_description   text,
  quantity            numeric(12,3) NOT NULL,
  unit                text NOT NULL CHECK (unit IN ('ton','liter','m3')),
  trip_type           text NOT NULL DEFAULT 'local' CHECK (trip_type IN ('local','international')),
  destination_country text,
  notes               text,

  -- required truck
  required_category   text NOT NULL CHECK (required_category IN ('light','medium','heavy','tanker')),
  required_body       text NOT NULL,
  required_cooling    text CHECK (required_cooling IN ('chilled','frozen')),

  -- conditional fields
  is_hazardous        boolean NOT NULL DEFAULT false,
  temp_min            numeric(5,1),
  temp_max            numeric(5,1),
  adr_class           text,
  safety_certificate_key text,                    -- PDF
  liquid_type         text,
  dimensions          jsonb,                       -- {"length":..,"width":..,"height":..} metres
  customs_enabled     boolean NOT NULL DEFAULT false,
  customs_declaration_number text,
  customs_permit_type text CHECK (customs_permit_type IN ('import','export','transit','other')),
  customs_permit_details text,
  customs_docs_key    text,                        -- PDF

  -- money (computed once on create/edit, see 01 §4)
  price       numeric(12,3) NOT NULL,
  escrow_pct  smallint NOT NULL,
  escrow_fee  numeric(12,3) NOT NULL,
  masar_fee   numeric(12,3) NOT NULL,
  driver_net  numeric(12,3) NOT NULL,

  -- route
  distance_km    numeric(8,1),
  route_geometry jsonb,                            -- GeoJSON LineString or [[lat,lng],...]

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tickets_status       ON tickets(status);
CREATE INDEX idx_tickets_manufacturer ON tickets(manufacturer_id, created_at DESC);
CREATE INDEX idx_tickets_driver       ON tickets(driver_id, created_at DESC);
CREATE INDEX idx_tickets_created      ON tickets(created_at DESC);
CREATE INDEX idx_tickets_pickup_at    ON tickets(pickup_at);
-- One active shipment per driver, enforced by the database
CREATE UNIQUE INDEX one_active_ticket_per_driver
  ON tickets(driver_id) WHERE status IN ('waiting_load','in_delivery');

-- ───────── Money ledger ─────────
CREATE TABLE ledger_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     uuid NOT NULL REFERENCES tickets(id),
  entry_type    text NOT NULL CHECK (entry_type IN ('deposit','payout_driver','commission_masar','commission_escrow')),
  amount        numeric(12,3) NOT NULL,
  party_user_id uuid REFERENCES users(id),         -- manufacturer for deposit, driver for payout
  details       jsonb,                              -- payout: {"iban":"...","cliq_alias":"..."} snapshot
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_ticket  ON ledger_entries(ticket_id);
CREATE INDEX idx_ledger_created ON ledger_entries(created_at);

-- ───────── Ratings ─────────
CREATE TABLE ratings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES users(id),
  to_user_id   uuid NOT NULL REFERENCES users(id),
  stars        smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, from_user_id)
);
CREATE INDEX idx_ratings_to ON ratings(to_user_id);

CREATE VIEW user_rating_stats AS
  SELECT to_user_id AS user_id, ROUND(AVG(stars)::numeric, 2) AS avg_stars, COUNT(*) AS ratings_count
  FROM ratings GROUP BY to_user_id;

-- ───────── Notifications and activity ─────────
CREATE TABLE notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       text NOT NULL,              -- key from 07-NOTIFICATIONS-AND-EMAILS.md
  params     jsonb NOT NULL DEFAULT '{}',-- values the client uses to render localized text
  link       text,                       -- in-app path for the recipient's role
  ticket_id  uuid REFERENCES tickets(id) ON DELETE CASCADE,
  is_read    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user ON notifications(user_id, is_read, created_at DESC);

CREATE TABLE activity_log (
  id         bigserial PRIMARY KEY,
  type       text NOT NULL,              -- e.g. ticket_created, payment_received, driver_accepted ...
  ticket_id  uuid REFERENCES tickets(id) ON DELETE CASCADE,
  actor_id   uuid REFERENCES users(id),
  params     jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);
```

## 3. Goods categories (`server/db/seed/goodsCategories.js`)
```js
export const goodsCategories = [
  { id: 1,  code: 'dry',        name_en: 'Dry',                  name_ar: 'جافة' },
  { id: 2,  code: 'chilled',    name_en: 'Chilled',              name_ar: 'مبرّدة' },
  { id: 3,  code: 'frozen',     name_en: 'Frozen',               name_ar: 'مجمّدة' },
  { id: 4,  code: 'liquid',     name_en: 'Liquid',               name_ar: 'سائلة' },
  { id: 5,  code: 'bulk',       name_en: 'Bulk',                 name_ar: 'سائبة' },
  { id: 6,  code: 'machinery',  name_en: 'Machinery & Equipment',name_ar: 'آلات ومعدات' },
  { id: 7,  code: 'hazardous',  name_en: 'Hazardous Materials',  name_ar: 'مواد خطرة' },
  { id: 8,  code: 'livestock',  name_en: 'Livestock',            name_ar: 'مواشي' },
  { id: 9,  code: 'vehicles',   name_en: 'Vehicles',             name_ar: 'سيارات' },
  { id: 10, code: 'furniture',  name_en: 'Furniture',            name_ar: 'أثاث' },
  { id: 11, code: 'other',      name_en: 'Other',                name_ar: 'أخرى' },
]; // sort = id
```

## 4. Truck catalog (`server/db/seed/truckTypes.js`)
This replaces any earlier truck tables. It encodes the owner's vehicle tree: **Category → Type → Body → Gross weight → Cooling**.

**Cascade rules for the truck form** (signup and shipment form):
1. Category: always shown.
2. Type: shown after the category; list depends on it.
3. Body: shown **only** if the chosen type has more than one body row (pickup and every tanker type have exactly one, so the step is skipped).
4. Gross weight: ready options, never free input (see `gross` below). Single-option categories are **auto-filled and read-only**. The payload range of the chosen row is shown beside it as guidance.
5. Cooling: shown only when the body is `refrigerated`: chilled or frozen.

On the **shipment form** only category + body (+ cooling) are needed; gross weight is not asked.

### 4.1 Name dictionaries
```js
export const categoryNames = {
  light:  { en: 'Light transport (up to 2.5 t gross)',            ar: 'نقل خفيف (حتى 2.5 طن إجمالي)' },
  medium: { en: 'Medium transport (2.5 – 7.5 t gross)',           ar: 'نقل متوسط (أكثر من 2.5 حتى 7.5 طن)' },
  heavy:  { en: 'Heavy transport (over 7.5 t gross)',             ar: 'نقل ثقيل (أكثر من 7.5 طن)' },
  tanker: { en: 'Tankers',                                        ar: 'صهاريج' },
};
export const typeNames = {
  pickup:           { en: 'Pickup (single / extended / double cab)', ar: 'بيك أب (كبينة مفردة / كبينة وربع / دبل كبين)' },
  van:              { en: 'Van / Mini van',                         ar: 'فان / ميني فان' },
  small_truck:      { en: 'Small truck (Porter and similar)',       ar: 'شاحنة صغيرة (بورتر وما شابه)' },
  short_chassis:    { en: 'Short chassis',                          ar: 'شاصي قصير' },
  long_chassis:     { en: 'Long chassis',                           ar: 'شاصي طويل' },
  special_body:     { en: 'Medium truck with special body',         ar: 'شاحنة متوسطة بجسم خاص' },
  rigid:            { en: 'Rigid truck (single chassis)',           ar: 'شاحنة صلبة (سنجل شاصي)' },
  tractor_trailer:  { en: 'Tractor head + trailer / semi-trailer',  ar: 'رأس قاطر + مقطورة / نصف مقطورة' },
  heavy_service:    { en: 'Heavy service vehicles',                 ar: 'مركبات خدمية ثقيلة' },
  water_tanker:     { en: 'Water',                                  ar: 'مياه (تنك مياه)' },
  sewage_tanker:    { en: 'Sewage',                                 ar: 'نضح (مياه صرف / مجاري)' },
  fuel_tanker:      { en: 'Fuel and petroleum products',            ar: 'وقود ومشتقات نفطية' },
  chemical_tanker:  { en: 'Chemicals',                              ar: 'كيماويات' },
  food_liquid_tanker:{ en: 'Liquid food (milk, oils)',              ar: 'سوائل غذائية (حليب، زيوت)' },
  gas_tanker:       { en: 'Gas',                                    ar: 'غاز' },
  bulk_tanker:      { en: 'Bulk materials (cement, grain)',         ar: 'مواد سائبة (إسمنت، حبوب)' },
};
export const bodyNames = {
  pickup:        { en: 'Pickup bed',              ar: 'بيك أب' },
  closed_box:    { en: 'Closed box',              ar: 'صندوق مغلق' },
  refrigerated:  { en: 'Refrigerated',            ar: 'براد' },
  open:          { en: 'Open bed',                ar: 'مكشوفة' },
  curtain:       { en: 'Curtain-side',            ar: 'ستارة' },
  tank:          { en: 'Tank',                    ar: 'تنك' },
  tipper:        { en: 'Tipper',                  ar: 'قلّاب' },
  tow:           { en: 'Tow / rescue (flatbed)',  ar: 'ونش سحب / إنقاذ (سطحة)' },
  flatbed:       { en: 'Flatbed',                 ar: 'سطح' },
  containers:    { en: 'Containers',              ar: 'حاويات' },
  lowbed:        { en: 'Lowbed (special permit)', ar: 'لوبد (تصريح خاص)' },
  car_carrier:   { en: 'Car carrier',             ar: 'ناقل سيارات' },
  livestock:     { en: 'Livestock carrier',       ar: 'ناقل مواشي' },
  crane:         { en: 'Crane',                   ar: 'ونش رافعة (كرين)' },
  concrete_mixer:{ en: 'Concrete mixer',          ar: 'خلاطة باطون (إسمنت)' },
  waste_compactor:{ en: 'Waste compactor',        ar: 'ضاغطة نفايات' },
  // tanker types double as bodies (type = body for tankers)
  water_tanker: { en: 'Water tanker', ar: 'تنك مياه' }, sewage_tanker: { en: 'Sewage tanker', ar: 'نضح' },
  fuel_tanker: { en: 'Fuel tanker', ar: 'صهريج وقود' }, chemical_tanker: { en: 'Chemical tanker (ADR)', ar: 'صهريج كيماويات' },
  food_liquid_tanker: { en: 'Liquid-food tanker', ar: 'صهريج سوائل غذائية' }, gas_tanker: { en: 'Gas tanker', ar: 'صهريج غاز' },
  bulk_tanker: { en: 'Bulk tanker', ar: 'صهريج مواد سائبة' },
};
```

### 4.2 Gross weight options
```js
export const gross = {
  light:  { mode: 'fixed',  options: [{ code: 'light_up_to_2_5', label_en: 'Up to 2.5 t', label_ar: 'حتى 2.5 طن' }] },
  medium: { mode: 'fixed',  options: [{ code: 'medium_2_5_7_5',  label_en: '2.5 – 7.5 t', label_ar: '2.5 – 7.5 طن' }] },
  rigid:  { mode: 'choice', options: [
    { code: 'rigid_2_axles', label_en: '2 axles — 21 t', label_ar: 'محورين — 21 طن', value: 21 },
    { code: 'rigid_3_axles', label_en: '3 axles — 27 t', label_ar: '3 محاور — 27 طن', value: 27 },
    { code: 'rigid_4_axles', label_en: '4 axles — 35 t', label_ar: '4 محاور — 35 طن', value: 35 },
    { code: 'rigid_5_axles', label_en: '5 axles — 36 t', label_ar: '5 محاور — 36 طن', value: 36 } ] },
  tractor_trailer: { mode: 'choice', options: [
    { code: 'tt_33_40', label_en: '33 – 40 t', label_ar: '33 – 40 طن', min: 33, max: 40 },
    { code: 'tt_40_50', label_en: '40 – 50 t', label_ar: '40 – 50 طن', min: 40, max: 50 },
    { code: 'tt_50_60', label_en: '50 – 60 t', label_ar: '50 – 60 طن', min: 50, max: 60 } ] },
  by_vehicle: { mode: 'fixed', options: [{ code: 'by_vehicle_weight', label_en: 'By vehicle weight', label_ar: 'حسب وزن المركبة' }] },
};
```
Use `gross.light` for light types, `gross.medium` for medium types, `gross.rigid` for `rigid`, `gross.tractor_trailer` for `tractor_trailer`, and `gross.by_vehicle` for `heavy_service` and all tankers. (The 33–40/40–50/50–60 bands are a proposal; adjust if the owner supplies exact bands.)

### 4.3 Catalog rows
`[category, type_code, body_code, payload_min, payload_max, unit, license_class]`
```js
export const truckRows = [
  // LIGHT (license 4)
  ['light','pickup','pickup',          0.5, 1.2,'ton',4],
  ['light','van','closed_box',         0.5, 1.0,'ton',4],
  ['light','van','refrigerated',       0.4, 0.9,'ton',4],
  ['light','small_truck','closed_box', 0.8, 1.5,'ton',4],
  ['light','small_truck','refrigerated',0.8,1.2,'ton',4],
  ['light','small_truck','open',       1.0, 1.5,'ton',4],
  // MEDIUM (license 4)
  ['medium','short_chassis','closed_box',   2.0, 3.5,'ton',4],
  ['medium','short_chassis','refrigerated', 1.5, 3.0,'ton',4],
  ['medium','short_chassis','open',         2.0, 4.0,'ton',4],
  ['medium','short_chassis','curtain',      2.0, 4.0,'ton',4],
  ['medium','short_chassis','tank',      3000,5000,'liter',4],
  ['medium','long_chassis','closed_box',    3.0, 5.0,'ton',4],
  ['medium','long_chassis','refrigerated',  2.5, 4.0,'ton',4],
  ['medium','long_chassis','open',          3.0, 5.0,'ton',4],
  ['medium','long_chassis','curtain',       3.0, 5.0,'ton',4],
  ['medium','long_chassis','tank',       4000,6000,'liter',4],
  ['medium','special_body','tipper',        3.0, 5.0,'ton',4],
  ['medium','special_body','tow',           2.0, 4.0,'ton',4],
  // HEAVY rigid (license 5)
  ['heavy','rigid','closed_box',  10,18,'ton',5],
  ['heavy','rigid','refrigerated', 8,15,'ton',5],
  ['heavy','rigid','open',        10,20,'ton',5],
  ['heavy','rigid','curtain',     12,20,'ton',5],
  ['heavy','rigid','tipper',      12,25,'ton',5],
  ['heavy','rigid','livestock',    8,14,'ton',5],
  // HEAVY tractor + trailer (license 6)
  ['heavy','tractor_trailer','flatbed',     25,32,'ton',6],
  ['heavy','tractor_trailer','curtain',     24,28,'ton',6],
  ['heavy','tractor_trailer','closed_box',  24,28,'ton',6],
  ['heavy','tractor_trailer','refrigerated',22,26,'ton',6],
  ['heavy','tractor_trailer','tipper',      28,35,'ton',6],
  ['heavy','tractor_trailer','containers',  24,30,'ton',6],
  ['heavy','tractor_trailer','lowbed',      30,60,'ton',6],
  ['heavy','tractor_trailer','car_carrier',  1,20,'ton',6],
  ['heavy','tractor_trailer','livestock',   18,25,'ton',6],
  // HEAVY service vehicles (license 5) — is_service_vehicle = true
  ['heavy','heavy_service','tow',            10,40,'ton',5],
  ['heavy','heavy_service','crane',          10,60,'ton',5],
  ['heavy','heavy_service','concrete_mixer',  6, 9,'m3',5],
  ['heavy','heavy_service','waste_compactor', 8,20,'m3',5],
  // TANKERS (license 5)
  ['tanker','water_tanker','water_tanker',        4000,30000,'liter',5],
  ['tanker','sewage_tanker','sewage_tanker',      4000,12000,'liter',5],
  ['tanker','fuel_tanker','fuel_tanker',         10000,40000,'liter',5],
  ['tanker','chemical_tanker','chemical_tanker', 10000,30000,'liter',5],
  ['tanker','food_liquid_tanker','food_liquid_tanker',5000,25000,'liter',5],
  ['tanker','gas_tanker','gas_tanker',              10,   20,'ton',5],
  ['tanker','bulk_tanker','bulk_tanker',            25,   35,'ton',5],
];
```
Seed rules: `is_refrigerated = (body_code === 'refrigerated')`; `is_service_vehicle = (type_code === 'heavy_service')`; `type_name_*` from `typeNames`, `body_name_*` from `bodyNames`; gross options per §4.2.

**Matching helper:** the payload used for matching is the row's `payload_max`. The driver never types a capacity.

## 5. Queries the agent will need (hints)
- **Free driver:** `NOT EXISTS (SELECT 1 FROM tickets t WHERE t.driver_id = d.id AND t.status IN ('waiting_load','in_delivery'))`.
- **Accept (atomic):**
  `UPDATE tickets SET driver_id=$1, status='waiting_load', status_history = status_history || jsonb_build_object('waiting_load', $3::text), updated_at=now() WHERE id=$2 AND status='pending' AND driver_id IS NULL RETURNING *;` If zero rows → `ALREADY_TAKEN`. If the unique index fires → `DRIVER_BUSY`.
- **Held funds:** `SUM(price)` where `status IN ('pending','waiting_load','in_delivery','delivered')`.
- **Masar revenue:** `SUM(masar_fee)` where `status = 'audited'`.
- **Appending an event:** `events = events || $1::jsonb` with `[{"type":"arrived_at_pickup",...}]`.
