CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Optional, needs privileges. The app also sets the zone per connection.
-- ALTER DATABASE postgres SET timezone TO 'Asia/Amman';

-- ───────── Reference data ─────────
CREATE TABLE IF NOT EXISTS goods_categories (
  id        smallint PRIMARY KEY,
  code      text UNIQUE NOT NULL,
  name_en   text NOT NULL,
  name_ar   text NOT NULL,
  sort      smallint NOT NULL
);

CREATE TABLE IF NOT EXISTS truck_types (
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
CREATE TABLE IF NOT EXISTS users (
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

CREATE TABLE IF NOT EXISTS manufacturer_profiles (
  user_id                     uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  contact_person              text,
  phones                      text[] NOT NULL,       -- 1+, first = primary
  emails                      text[] NOT NULL,       -- 1+, first = primary
  commercial_registration_key text NOT NULL,         -- PDF
  professions_license_key     text NOT NULL          -- PDF
);

CREATE TABLE IF NOT EXISTS manufacturer_goods_categories (
  manufacturer_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goods_category_id smallint NOT NULL REFERENCES goods_categories(id),
  PRIMARY KEY (manufacturer_id, goods_category_id)
);

CREATE TABLE IF NOT EXISTS driver_profiles (
  user_id          uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  scope            text NOT NULL CHECK (scope IN ('internal','external')),
  license_class    smallint NOT NULL CHECK (license_class IN (4,5,6)),
  iban             text NOT NULL,
  cliq_alias       text,
  id_doc_key       text NOT NULL,          -- PDF
  license_doc_key  text NOT NULL,          -- PDF
  passport_doc_key text                    -- PDF, required when scope = 'external'
);

CREATE TABLE IF NOT EXISTS trucks (
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
CREATE TABLE IF NOT EXISTS locations (
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
CREATE INDEX IF NOT EXISTS idx_locations_owner ON locations(owner_id, kind, last_used_at DESC);

-- ───────── Tickets (shown as "Shipments") ─────────
CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1;

CREATE TABLE IF NOT EXISTS tickets (
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
CREATE INDEX IF NOT EXISTS idx_tickets_status       ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_manufacturer ON tickets(manufacturer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_driver       ON tickets(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_created      ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_pickup_at    ON tickets(pickup_at);

-- One active shipment per driver, enforced by the database
CREATE UNIQUE INDEX IF NOT EXISTS one_active_ticket_per_driver
  ON tickets(driver_id) WHERE status IN ('waiting_load','in_delivery');

-- ───────── Money ledger ─────────
CREATE TABLE IF NOT EXISTS ledger_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     uuid NOT NULL REFERENCES tickets(id),
  entry_type    text NOT NULL CHECK (entry_type IN ('deposit','payout_driver','commission_masar','commission_escrow')),
  amount        numeric(12,3) NOT NULL,
  party_user_id uuid REFERENCES users(id),         -- manufacturer for deposit, driver for payout
  details       jsonb,                              -- payout: {"iban":"...","cliq_alias":"..."} snapshot
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_ticket  ON ledger_entries(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON ledger_entries(created_at);

-- ───────── Ratings ─────────
CREATE TABLE IF NOT EXISTS ratings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES users(id),
  to_user_id   uuid NOT NULL REFERENCES users(id),
  stars        smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, from_user_id)
);
CREATE INDEX IF NOT EXISTS idx_ratings_to ON ratings(to_user_id);

CREATE OR REPLACE VIEW user_rating_stats AS
  SELECT to_user_id AS user_id, ROUND(AVG(stars)::numeric, 2) AS avg_stars, COUNT(*) AS ratings_count
  FROM ratings GROUP BY to_user_id;

-- ───────── Notifications and activity ─────────
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       text NOT NULL,              -- key from 07-NOTIFICATIONS-AND-EMAILS.md
  params     jsonb NOT NULL DEFAULT '{}',-- values the client uses to render localized text
  link       text,                       -- in-app path for the recipient's role
  ticket_id  uuid REFERENCES tickets(id) ON DELETE CASCADE,
  is_read    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS activity_log (
  id         bigserial PRIMARY KEY,
  type       text NOT NULL,              -- e.g. ticket_created, payment_received, driver_accepted ...
  ticket_id  uuid REFERENCES tickets(id) ON DELETE CASCADE,
  actor_id   uuid REFERENCES users(id),
  params     jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

