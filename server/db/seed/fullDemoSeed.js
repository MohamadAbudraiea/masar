import bcrypt from 'bcryptjs';
import { pool } from '../../src/db.js';
import { computeSplit } from '../../src/services/money.js';

export async function runFullDemoSeed() {
  console.log('--- Loading Full Demo Seed (09) ---');

  const passwordHash = await bcrypt.hash('Masar@123', 10);

  // 1. Core Platform Roles (Admin & Escrow)
  await pool.query(
    `INSERT INTO users (role, name, email, phone, password_hash, status, language, timezone, email_notifications, approved_at)
     VALUES ('admin', 'Lina Qasem (Masar Admin)', 'admin@masar.demo', '+962790000000', $1, 'approved', 'en', 'Asia/Amman', true, now())
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'approved'`,
    [passwordHash]
  );

  await pool.query(
    `INSERT INTO users (role, name, email, phone, password_hash, status, language, timezone, email_notifications, approved_at)
     VALUES ('escrow', 'SafePay Escrow', 'escrow@safepay.demo', '+962790000099', $1, 'approved', 'en', 'Asia/Amman', true, now())
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'approved'`,
    [passwordHash]
  );

  // 2. Manufacturers
  const manufacturers = [
    {
      name: 'Al-Nour Foods Co.',
      contact: 'Khaled Haddad',
      email: 'khaled@alnour.demo',
      phone: '+962790000001',
      city: 'Zarqa',
      area: 'Hashemiyya Industrial',
      lat: 32.0728,
      lng: 36.0880,
      cats: [1, 2, 3], // Dry, Chilled, Frozen
      status: 'approved',
    },
    {
      name: 'Petra Dairy Industries',
      contact: 'Omar Al-Basha',
      email: 'ops@petradairy.demo',
      phone: '+962790000002',
      city: 'Amman',
      area: 'Marka Industrial',
      lat: 31.9700,
      lng: 35.9900,
      cats: [2, 3, 4], // Chilled, Frozen, Liquid
      status: 'approved',
    },
    {
      name: 'Jordan Steel Works',
      contact: 'Fadi Shaker',
      email: 'sales@josteel.demo',
      phone: '+962790000003',
      city: 'Amman',
      area: 'Sahab Industrial',
      lat: 31.8670,
      lng: 36.0030,
      cats: [6, 5, 1], // Machinery, Bulk, Dry
      status: 'approved',
    },
    {
      name: 'Aqaba Chemicals Ltd.',
      contact: 'Tariq Ziyad',
      email: 'dispatch@aqabachem.demo',
      phone: '+962790000004',
      city: 'Aqaba',
      area: 'South Coast Industrial',
      lat: 29.5320,
      lng: 35.0063,
      cats: [7, 4, 5], // Hazardous, Liquid, Bulk
      status: 'approved',
    },
    {
      name: 'Madaba Furniture House',
      contact: 'Hani Masri',
      email: 'info@madabafurn.demo',
      phone: '+962790000005',
      city: 'Madaba',
      area: 'Madaba Center',
      lat: 31.7160,
      lng: 35.7939,
      cats: [10, 1], // Furniture, Dry
      status: 'approved',
    },
    {
      name: 'Mafraq Agri & Livestock',
      contact: 'Suleiman Al-Anzi',
      email: 'office@mafraqagri.demo',
      phone: '+962790000006',
      city: 'Mafraq',
      area: 'Mafraq Plains',
      lat: 32.3406,
      lng: 36.2080,
      cats: [8, 5, 1], // Livestock, Bulk, Dry
      status: 'approved',
    },
    {
      name: 'Jerash Olive Oil Co.',
      contact: 'Naser Qudah',
      email: 'info@jerasholive.demo',
      phone: '+962790000007',
      city: 'Jerash',
      area: 'Jerash Industrial Area',
      lat: 32.2723,
      lng: 35.8914,
      cats: [4, 1], // Liquid, Dry
      status: 'pending', // for approvals demo
    },
  ];

  const mfrIdMap = {};

  for (const m of manufacturers) {
    const res = await pool.query(
      `INSERT INTO users (role, name, email, phone, password_hash, status, language, timezone, email_notifications, approved_at)
       VALUES ('manufacturer', $1, $2, $3, $4, $5, 'en', 'Asia/Amman', true, CASE WHEN $5 = 'approved' THEN now() ELSE null END)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = EXCLUDED.status, name = EXCLUDED.name
       RETURNING id`,
      [m.name, m.email, m.phone, passwordHash, m.status]
    );
    const userId = res.rows[0].id;
    mfrIdMap[m.email] = userId;

    await pool.query(
      `INSERT INTO manufacturer_profiles (user_id, contact_person, phones, emails, commercial_registration_key, professions_license_key)
       VALUES ($1, $2, ARRAY[$3], ARRAY[$4], 'demo/cr_sample.pdf', 'demo/pl_sample.pdf')
       ON CONFLICT (user_id) DO UPDATE SET
         contact_person = EXCLUDED.contact_person,
         phones = EXCLUDED.phones,
         emails = EXCLUDED.emails`,
      [userId, m.contact, m.phone, m.email]
    );

    // Categories
    for (const catId of m.cats) {
      await pool.query(
        `INSERT INTO manufacturer_goods_categories (manufacturer_id, goods_category_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, catId]
      );
    }

    // Default pickup location
    await pool.query(
      `INSERT INTO locations (owner_id, kind, label, address, lat, lng, city, area, is_default)
       VALUES ($1, 'pickup', $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT DO NOTHING`,
      [userId, `${m.name} Main Site`, `${m.area}, ${m.city}`, m.lat, m.lng, m.city, m.area]
    );

    // Saved destinations
    await pool.query(
      `INSERT INTO locations (owner_id, kind, label, address, lat, lng, city, area, contact_name, contact_phone)
       VALUES ($1, 'destination', 'Fresh Market Central', 'Al-Hashmi, Irbid', 32.5556, 35.8469, 'Irbid', 'Al-Hashmi', 'Fadi Market Ops', '+962798881111')
       ON CONFLICT DO NOTHING`,
      [userId]
    );
  }

  // 3. Drivers
  const drivers = [
    {
      num: 1,
      name: 'Omar Saleh',
      email: 'omar@driver.demo',
      phone: '+962790010001',
      scope: 'internal',
      license: 4,
      cat: 'medium',
      type: 'long_chassis',
      body: 'refrigerated',
      cooling: 'chilled',
      plate: '44-12345',
      adr: false,
      gross: 'medium_2_5_7_5',
      status: 'approved',
    },
    {
      num: 2,
      name: 'Ali Mansour',
      email: 'ali@driver.demo',
      phone: '+962790010002',
      scope: 'internal',
      license: 4,
      cat: 'medium',
      type: 'long_chassis',
      body: 'refrigerated',
      cooling: 'chilled',
      plate: '44-55432',
      adr: false,
      gross: 'medium_2_5_7_5',
      status: 'approved',
    },
    {
      num: 3,
      name: 'Yousef Nasser',
      email: 'yousef@driver.demo',
      phone: '+962790010003',
      scope: 'internal',
      license: 4,
      cat: 'medium',
      type: 'short_chassis',
      body: 'refrigerated',
      cooling: 'chilled',
      plate: '44-99881',
      adr: false,
      gross: 'medium_2_5_7_5',
      status: 'approved',
    },
    {
      num: 4,
      name: 'Mahmoud Qudah',
      email: 'mahmoud@driver.demo',
      phone: '+962790010004',
      scope: 'internal',
      license: 5,
      cat: 'heavy',
      type: 'rigid',
      body: 'closed_box',
      cooling: null,
      plate: '50-12399',
      adr: false,
      gross: 'rigid_3_axles',
      status: 'approved',
    },
    {
      num: 5,
      name: 'Hasan Tarawneh',
      email: 'hasan@driver.demo',
      phone: '+962790010005',
      scope: 'external',
      license: 6,
      cat: 'heavy',
      type: 'tractor_trailer',
      body: 'flatbed',
      cooling: null,
      plate: '60-88412',
      adr: false,
      gross: 'tt_40_50',
      status: 'approved',
    },
    {
      num: 6,
      name: 'Ibrahim Al-Zoubi',
      email: 'ibrahim@driver.demo',
      phone: '+962790010006',
      scope: 'external',
      license: 6,
      cat: 'heavy',
      type: 'tractor_trailer',
      body: 'refrigerated',
      cooling: 'frozen',
      plate: '60-33120',
      adr: false,
      gross: 'tt_40_50',
      status: 'approved',
    },
    {
      num: 7,
      name: 'Sami Khalil',
      email: 'sami@driver.demo',
      phone: '+962790010007',
      scope: 'external',
      license: 5,
      cat: 'tanker',
      type: 'chemical_tanker',
      body: 'chemical_tanker',
      cooling: null,
      plate: '50-44910',
      adr: true,
      gross: 'by_vehicle_weight',
      status: 'approved',
    },
    {
      num: 8,
      name: 'Tariq Abu Hassan',
      email: 'tariq@driver.demo',
      phone: '+962790010008',
      scope: 'internal',
      license: 4,
      cat: 'light',
      type: 'van',
      body: 'closed_box',
      cooling: null,
      plate: '30-77123',
      adr: false,
      gross: 'light_up_to_2_5',
      status: 'approved',
    },
    {
      num: 9,
      name: 'Nabil Odeh',
      email: 'nabil@driver.demo',
      phone: '+962790010009',
      scope: 'internal',
      license: 5,
      cat: 'tanker',
      type: 'fuel_tanker',
      body: 'fuel_tanker',
      cooling: null,
      plate: '50-66231',
      adr: true,
      gross: 'by_vehicle_weight',
      status: 'approved',
    },
    {
      num: 10,
      name: 'Fares Haddadin',
      email: 'fares@driver.demo',
      phone: '+962790010010',
      scope: 'internal',
      license: 4,
      cat: 'medium',
      type: 'long_chassis',
      body: 'closed_box',
      cooling: null,
      plate: '44-77192',
      adr: false,
      gross: 'medium_2_5_7_5',
      status: 'approved',
    },
    {
      num: 11,
      name: 'Rami Shaheen',
      email: 'rami@driver.demo',
      phone: '+962790010011',
      scope: 'internal',
      license: 5,
      cat: 'heavy',
      type: 'rigid',
      body: 'tipper',
      cooling: null,
      plate: '50-99120',
      adr: false,
      gross: 'rigid_4_axles',
      status: 'approved',
    },
    {
      num: 12,
      name: 'Waleed Masri',
      email: 'waleed@driver.demo',
      phone: '+962790010012',
      scope: 'internal',
      license: 5,
      cat: 'heavy',
      type: 'rigid',
      body: 'livestock',
      cooling: null,
      plate: '50-11234',
      adr: false,
      gross: 'rigid_3_axles',
      status: 'approved',
    },
    {
      num: 13,
      name: 'Majed Rawashdeh',
      email: 'majed@driver.demo',
      phone: '+962790019999',
      scope: 'internal',
      license: 4,
      cat: 'medium',
      type: 'short_chassis',
      body: 'closed_box',
      cooling: null,
      plate: '44-99000',
      adr: false,
      gross: 'medium_2_5_7_5',
      status: 'pending', // for admin approvals demo
    },
  ];

  const driverIdMap = {};

  for (const d of drivers) {
    const res = await pool.query(
      `INSERT INTO users (role, name, email, phone, password_hash, status, language, timezone, email_notifications, approved_at)
       VALUES ('driver', $1, $2, $3, $4, $5, 'ar', 'Asia/Amman', true, CASE WHEN $5 = 'approved' THEN now() ELSE null END)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = EXCLUDED.status, name = EXCLUDED.name
       RETURNING id`,
      [d.name, d.email, d.phone, passwordHash, d.status]
    );
    const userId = res.rows[0].id;
    driverIdMap[d.email] = userId;

    await pool.query(
      `INSERT INTO driver_profiles (user_id, scope, license_class, iban, cliq_alias, id_doc_key, license_doc_key)
       VALUES ($1, $2, $3, $4, $5, 'demo/id_sample.pdf', 'demo/lic_sample.pdf')
       ON CONFLICT (user_id) DO UPDATE SET
         scope = EXCLUDED.scope,
         license_class = EXCLUDED.license_class,
         iban = EXCLUDED.iban,
         cliq_alias = EXCLUDED.cliq_alias`,
      [
        userId,
        d.scope,
        d.license,
        `JO94CBJO00100000000001310000${String(d.num).padStart(2, '0')}`,
        d.num % 2 === 1 ? `DRIVER_${d.num}` : null,
      ]
    );

    // Truck link
    const ttRes = await pool.query(
      `SELECT id FROM truck_types WHERE category = $1 AND type_code = $2 AND body_code = $3 LIMIT 1`,
      [d.cat, d.type, d.body]
    );
    const truckTypeId = ttRes.rows[0]?.id;

    if (truckTypeId) {
      await pool.query(
        `INSERT INTO trucks (driver_id, truck_type_id, plate_number, cooling, adr_certified, gross_weight_code, license_doc_key, photo_keys)
         VALUES ($1, $2, $3, $4, $5, $6, 'demo/truck_lic.pdf', ARRAY['demo/truck_photo.jpg'])
         ON CONFLICT (driver_id) DO UPDATE SET
           truck_type_id = EXCLUDED.truck_type_id,
           plate_number = EXCLUDED.plate_number,
           cooling = EXCLUDED.cooling,
           adr_certified = EXCLUDED.adr_certified,
           gross_weight_code = EXCLUDED.gross_weight_code`,
        [userId, truckTypeId, d.plate, d.cooling, d.adr, d.gross]
      );
    }
  }

  // 4. Reset ticket sequence so demo shipments have exact MSR numbers
  // 45 pre-seeded shipments: MSR-000079 ... MSR-000123
  // Set sequence start to 79
  await pool.query(`SELECT setval('ticket_seq', 78, true)`);

  const alNourId = mfrIdMap['khaled@alnour.demo'];
  const petraId = mfrIdMap['ops@petradairy.demo'];
  const steelId = mfrIdMap['sales@josteel.demo'];
  const chemId = mfrIdMap['dispatch@aqabachem.demo'];
  const furnId = mfrIdMap['info@madabafurn.demo'];
  const agriId = mfrIdMap['office@mafraqagri.demo'];

  const omarId = driverIdMap['omar@driver.demo'];
  const aliId = driverIdMap['ali@driver.demo'];
  const mahmoudId = driverIdMap['mahmoud@driver.demo'];
  const hasanId = driverIdMap['hasan@driver.demo'];
  const samiId = driverIdMap['sami@driver.demo'];

  console.log('Seeding 45 deterministic shipments (MSR-000079 ... MSR-000123)...');

  // Helper to create shipment with exact status history and financial split
  async function createSeedShipment({
    mfrId,
    driverId = null,
    status = 'audited',
    goodsCatId = 1,
    cargoDesc = 'Industrial Cargo',
    qty = 10,
    unit = 'ton',
    tripType = 'local',
    destCountry = null,
    pickup,
    dest,
    truck,
    cond = {},
    price = 750,
    timestamps = {},
  }) {
    const split = computeSplit(price);
    const nextSeqRes = await pool.query(`SELECT nextval('ticket_seq') AS num`);
    const num = parseInt(nextSeqRes.rows[0].num, 10);
    const ticketNumber = `MSR-${String(num).padStart(6, '0')}`;

    const res = await pool.query(
      `INSERT INTO tickets (
         ticket_number, manufacturer_id, driver_id, status,
         pickup_address, pickup_lat, pickup_lng, pickup_city, pickup_area,
         pickup_at, needs_loading, needs_unloading,
         dest_address, dest_lat, dest_lng, dest_city, dest_area,
         dest_name, dest_phone,
         goods_category_id, goods_description, quantity, unit, trip_type, destination_country,
         required_category, required_body, required_cooling,
         is_hazardous, temp_min, temp_max, adr_class, safety_certificate_key,
         liquid_type, customs_enabled, customs_declaration_number, customs_permit_type,
         price, escrow_pct, escrow_fee, masar_fee, driver_net, distance_km,
         status_history, created_at
       ) VALUES (
         $1, $2, $3, $4,
         $5, $6, $7, $8, $9,
         $10, $11, $12,
         $13, $14, $15, $16, $17,
         $18, $19,
         $20, $21, $22, $23, $24, $25,
         $26, $27, $28,
         $29, $30, $31, $32, $33,
         $34, $35, $36, $37,
         $38, $39, $40, $41, $42, $43,
         $44, $45
       ) RETURNING id, ticket_number, status, price, driver_net, escrow_fee, masar_fee`,
      [
        ticketNumber,
        mfrId,
        driverId,
        status,
        pickup.address,
        pickup.lat,
        pickup.lng,
        pickup.city,
        pickup.area,
        timestamps.pickup_at || new Date(Date.now() + 86400000).toISOString(),
        pickup.needs_loading || false,
        dest.needs_unloading || false,
        dest.address,
        dest.lat,
        dest.lng,
        dest.city,
        dest.area,
        dest.name || 'Recipient',
        dest.phone || '+962791112222',
        goodsCatId,
        cargoDesc,
        qty,
        unit,
        tripType,
        destCountry,
        truck.category,
        truck.body,
        truck.cooling || null,
        cond.is_hazardous || false,
        cond.temp_min || null,
        cond.temp_max || null,
        cond.adr_class || null,
        cond.safety_certificate_key || null,
        cond.liquid_type || null,
        cond.customs_enabled || false,
        cond.customs_declaration_number || null,
        cond.customs_permit_type || null,
        price,
        split.escrowPct,
        split.escrowFee,
        split.masarFee,
        split.driverNet,
        dest.distance_km || 120,
        JSON.stringify(timestamps.history || {}),
        timestamps.created_at || new Date().toISOString(),
      ]
    );

    const ticket = res.rows[0];

    // Seed ledger entries for audited shipments
    if (status === 'audited' && driverId) {
      await pool.query(
        `INSERT INTO ledger_entries (ticket_id, entry_type, amount, party_user_id, details)
         VALUES
         ($1, 'deposit', $2, $3, '{"payer":"manufacturer"}'),
         ($1, 'payout_driver', $4, $5, '{"iban":"JO94CBJO0010000000000131000001"}'),
         ($1, 'commission_masar', $6, NULL, '{"rate":"0.04"}'),
         ($1, 'commission_escrow', $7, NULL, '{"rate":"0.02"}')`,
        [
          ticket.id,
          ticket.price,
          mfrId,
          ticket.driver_net,
          driverId,
          ticket.masar_fee,
          ticket.escrow_fee,
        ]
      );

      // Seed bilateral rating
      await pool.query(
        `INSERT INTO ratings (ticket_id, from_user_id, to_user_id, stars, comment)
         VALUES
         ($1, $2, $3, 5, 'Arrived on time and goods were in perfect condition. Professional service.'),
         ($1, $3, $2, 5, 'Quick loading at factory and clear delivery directions.')
         ON CONFLICT DO NOTHING`,
        [ticket.id, mfrId, driverId]
      );
    }

    return ticket;
  }

  // 1. 27 Audited Shipments spread across the last 90 days
  for (let i = 0; i < 27; i++) {
    const daysAgo = 90 - i * 3;
    const baseDate = new Date(Date.now() - daysAgo * 86400000);
    const mfrPool = [alNourId, petraId, steelId, chemId, furnId, agriId];
    const curMfr = mfrPool[i % mfrPool.length];
    // Omar Saleh gets about 9 shipments
    const curDriver = i % 3 === 0 ? omarId : [mahmoudId, hasanId, samiId][i % 3];

    await createSeedShipment({
      mfrId: curMfr,
      driverId: curDriver,
      status: 'audited',
      goodsCatId: 1 + (i % 6),
      cargoDesc: `Delivered batch #${i + 101}`,
      qty: 12 + (i % 8),
      pickup: {
        address: 'Zarqa Industrial Area',
        lat: 32.0728,
        lng: 36.0880,
        city: 'Zarqa',
        area: 'Industrial',
      },
      dest: {
        address: 'Amman Central Terminal',
        lat: 31.9539,
        lng: 35.9106,
        city: 'Amman',
        area: 'Downtown',
        name: 'Fadi Commercial',
        phone: '+962791112233',
        distance_km: 35,
      },
      truck: {
        category: 'heavy',
        body: 'closed_box',
      },
      price: 600 + (i % 8) * 100,
      timestamps: {
        created_at: baseDate.toISOString(),
        history: {
          requested: baseDate.toISOString(),
          pending: new Date(baseDate.getTime() + 1800000).toISOString(),
          waiting_load: new Date(baseDate.getTime() + 7200000).toISOString(),
          in_delivery: new Date(baseDate.getTime() + 18000000).toISOString(),
          delivered: new Date(baseDate.getTime() + 32000000).toISOString(),
          audited: new Date(baseDate.getTime() + 45000000).toISOString(),
        },
      },
    });
  }

  // 2. 3 Delivered Shipments (awaiting confirmation)
  // One for Al-Nour to show "Confirm delivery" button
  await createSeedShipment({
    mfrId: alNourId,
    driverId: omarId,
    status: 'delivered',
    goodsCatId: 2,
    cargoDesc: 'Fresh Dairy Yogurt Cups',
    qty: 4,
    pickup: { address: 'Zarqa Factory', lat: 32.0728, lng: 36.0880, city: 'Zarqa', area: 'Hashemiyya' },
    dest: { address: 'Fresh Market, Irbid', lat: 32.5556, lng: 35.8469, city: 'Irbid', area: 'Al-Hashmi', name: 'Fadi Ops', distance_km: 82 },
    truck: { category: 'medium', body: 'refrigerated', cooling: 'chilled' },
    price: 680,
    timestamps: {
      created_at: new Date(Date.now() - 43200000).toISOString(),
      history: {
        requested: new Date(Date.now() - 43200000).toISOString(),
        pending: new Date(Date.now() - 40000000).toISOString(),
        waiting_load: new Date(Date.now() - 25000000).toISOString(),
        in_delivery: new Date(Date.now() - 14000000).toISOString(),
        delivered: new Date(Date.now() - 3600000).toISOString(),
      },
    },
  });

  for (let i = 0; i < 2; i++) {
    await createSeedShipment({
      mfrId: [petraId, steelId][i],
      driverId: [mahmoudId, hasanId][i],
      status: 'delivered',
      goodsCatId: 1,
      cargoDesc: 'Delivered Cargo Awaiting Confirmation',
      qty: 15,
      pickup: { address: 'Sahab Industrial', lat: 31.8670, lng: 36.0030, city: 'Amman', area: 'Sahab' },
      dest: { address: 'Karak Trade Center', lat: 31.1853, lng: 35.7048, city: 'Karak', area: 'Center', distance_km: 125 },
      truck: { category: 'heavy', body: 'closed_box' },
      price: 950,
      timestamps: {
        created_at: new Date(Date.now() - 86400000).toISOString(),
        history: {
          requested: new Date(Date.now() - 86400000).toISOString(),
          pending: new Date(Date.now() - 72000000).toISOString(),
          waiting_load: new Date(Date.now() - 50000000).toISOString(),
          in_delivery: new Date(Date.now() - 20000000).toISOString(),
          delivered: new Date(Date.now() - 7200000).toISOString(),
        },
      },
    });
  }

  // 3. 3 In Delivery Shipments (Active on live map moving trucks)
  for (let i = 0; i < 3; i++) {
    await createSeedShipment({
      mfrId: [petraId, steelId, chemId][i],
      driverId: [mahmoudId, hasanId, samiId][i],
      status: 'in_delivery',
      goodsCatId: [2, 6, 7][i],
      cargoDesc: 'Active Cargo In Transit',
      qty: 10 + i * 5,
      pickup: { address: 'Origin Terminal', lat: 31.9539, lng: 35.9106, city: 'Amman', area: 'Central' },
      dest: { address: 'Aqaba Port Terminal', lat: 29.5320, lng: 35.0063, city: 'Aqaba', area: 'Port', distance_km: 334 },
      truck: { category: 'heavy', body: i === 2 ? 'chemical_tanker' : 'closed_box' },
      cond: i === 2 ? { is_hazardous: true, adr_class: '3' } : {},
      price: 1850 + i * 400,
      timestamps: {
        created_at: new Date(Date.now() - 28800000).toISOString(),
        history: {
          requested: new Date(Date.now() - 28800000).toISOString(),
          pending: new Date(Date.now() - 25000000).toISOString(),
          waiting_load: new Date(Date.now() - 14400000).toISOString(),
          in_delivery: new Date(Date.now() - 7200000).toISOString(),
        },
      },
    });
  }

  // 4. 3 Waiting Load Shipments (One belongs to Ali Mansour so he is busy!)
  await createSeedShipment({
    mfrId: alNourId,
    driverId: aliId, // Ali Mansour is busy!
    status: 'waiting_load',
    goodsCatId: 2,
    cargoDesc: 'Chilled Milk Crates',
    qty: 3,
    pickup: { address: 'Al-Nour Zarqa Plant', lat: 32.0728, lng: 36.0880, city: 'Zarqa', area: 'Hashemiyya' },
    dest: { address: 'Salt Supermarket', lat: 32.0392, lng: 35.7272, city: 'Salt', area: 'Center', distance_km: 55 },
    truck: { category: 'medium', body: 'refrigerated', cooling: 'chilled' },
    price: 620,
    timestamps: {
      created_at: new Date(Date.now() - 14400000).toISOString(),
      history: {
        requested: new Date(Date.now() - 14400000).toISOString(),
        pending: new Date(Date.now() - 10800000).toISOString(),
        waiting_load: new Date(Date.now() - 3600000).toISOString(),
      },
    },
  });

  for (let i = 0; i < 2; i++) {
    await createSeedShipment({
      mfrId: [steelId, furnId][i],
      driverId: null,
      status: 'waiting_load',
      goodsCatId: 1,
      cargoDesc: 'Goods Scheduled For Loading',
      qty: 8,
      pickup: { address: 'Plant Warehouse', lat: 31.8670, lng: 36.0030, city: 'Amman', area: 'Sahab' },
      dest: { address: 'Madaba Center', lat: 31.7160, lng: 35.7939, city: 'Madaba', area: 'Downtown', distance_km: 42 },
      truck: { category: 'medium', body: 'closed_box' },
      price: 540,
      timestamps: {
        created_at: new Date(Date.now() - 7200000).toISOString(),
        history: {
          requested: new Date(Date.now() - 7200000).toISOString(),
          pending: new Date(Date.now() - 3600000).toISOString(),
          waiting_load: new Date(Date.now() - 1800000).toISOString(),
        },
      },
    });
  }

  // 5. 6 Pending Shipments (The 6 curated pending shipments from 09 §2)
  // 1. Al-Nour (Zarqa -> Irbid Fresh Market, chilled 3t, 650 JD)
  await createSeedShipment({
    mfrId: alNourId,
    status: 'pending',
    goodsCatId: 2,
    cargoDesc: 'Chilled Labneh & Cheese',
    qty: 3,
    pickup: { address: 'Al-Nour Zarqa Factory', lat: 32.0728, lng: 36.0880, city: 'Zarqa', area: 'Hashemiyya', needs_loading: true },
    dest: { address: 'Fresh Market Irbid', lat: 32.5556, lng: 35.8469, city: 'Irbid', area: 'Al-Hashmi', name: 'Fadi Ops', needs_unloading: true, distance_km: 82 },
    truck: { category: 'medium', body: 'refrigerated', cooling: 'chilled' },
    price: 650,
  });

  // 2. Petra Dairy (Amman -> Aqaba, chilled 10t, 1,850 JD)
  await createSeedShipment({
    mfrId: petraId,
    status: 'pending',
    goodsCatId: 2,
    cargoDesc: 'Bulk Milk Tanks',
    qty: 10,
    pickup: { address: 'Marka Plant', lat: 31.9700, lng: 35.9900, city: 'Amman', area: 'Marka' },
    dest: { address: 'Aqaba Distribution Hub', lat: 29.5320, lng: 35.0063, city: 'Aqaba', area: 'Port Area', distance_km: 334 },
    truck: { category: 'heavy', body: 'refrigerated', cooling: 'chilled' },
    price: 1850,
  });

  // 3. Jordan Steel (Sahab -> Aqaba, machinery 20t, 2,400 JD)
  await createSeedShipment({
    mfrId: steelId,
    status: 'pending',
    goodsCatId: 6,
    cargoDesc: 'Heavy Steel Beams',
    qty: 20,
    pickup: { address: 'Sahab Yard', lat: 31.8670, lng: 36.0030, city: 'Amman', area: 'Sahab' },
    dest: { address: 'Aqaba Port Terminal', lat: 29.5320, lng: 35.0063, city: 'Aqaba', area: 'Industrial', distance_km: 334 },
    truck: { category: 'heavy', body: 'flatbed' },
    price: 2400,
  });

  // 4. Aqaba Chemicals (Aqaba -> Amman, hazardous liquid 15,000L, ADR class 3, 1,300 JD)
  await createSeedShipment({
    mfrId: chemId,
    status: 'pending',
    goodsCatId: 7,
    cargoDesc: 'Ethanol Industrial Solution',
    qty: 15000,
    unit: 'liter',
    pickup: { address: 'Aqaba Chemical Depot', lat: 29.5320, lng: 35.0063, city: 'Aqaba', area: 'South Coast' },
    dest: { address: 'Amman Industrial Terminal', lat: 31.9539, lng: 35.9106, city: 'Amman', area: 'Terminal', distance_km: 334 },
    truck: { category: 'tanker', body: 'chemical_tanker' },
    cond: { is_hazardous: true, adr_class: '3', liquid_type: 'chemical_tanker' },
    price: 1300,
  });

  // 5. Madaba Furniture (Madaba -> Amman Abdoun, furniture 2.5t, 520 JD)
  await createSeedShipment({
    mfrId: furnId,
    status: 'pending',
    goodsCatId: 10,
    cargoDesc: 'Handcrafted Wooden Furniture',
    qty: 2.5,
    pickup: { address: 'Madaba Workshop', lat: 31.7160, lng: 35.7939, city: 'Madaba', area: 'Center' },
    dest: { address: 'Abdoun Luxury Residences', lat: 31.9454, lng: 35.8830, city: 'Amman', area: 'Abdoun', distance_km: 38 },
    truck: { category: 'medium', body: 'closed_box' },
    price: 520,
  });

  // 6. Petra Dairy (Amman -> Riyadh, international frozen 18t, 3,900 JD)
  await createSeedShipment({
    mfrId: petraId,
    status: 'pending',
    goodsCatId: 3,
    cargoDesc: 'Frozen Butter & Ice Cream Blocks',
    qty: 18,
    tripType: 'international',
    destCountry: 'Saudi Arabia',
    pickup: { address: 'Amman Marka Plant', lat: 31.9700, lng: 35.9900, city: 'Amman', area: 'Marka' },
    dest: { address: 'Al-Sulay Logistics District', lat: 24.7136, lng: 46.6753, city: 'Riyadh', area: 'Al-Sulay', distance_km: 1480 },
    truck: { category: 'heavy', body: 'refrigerated', cooling: 'frozen' },
    cond: { customs_enabled: true, customs_declaration_number: 'CD-2026-48821', customs_permit_type: 'export' },
    price: 3900,
  });

  // 6. 3 Requested Shipments (Unpaid)
  // Al-Nour has 1 to demonstrate Pay/Edit/Delete
  await createSeedShipment({
    mfrId: alNourId,
    status: 'requested',
    goodsCatId: 1,
    cargoDesc: 'Unpaid Dry Goods Consignment',
    qty: 6,
    pickup: { address: 'Al-Nour Zarqa Warehouse', lat: 32.0728, lng: 36.0880, city: 'Zarqa', area: 'Hashemiyya' },
    dest: { address: 'Amman Mall Hub', lat: 31.9539, lng: 35.9106, city: 'Amman', area: 'Mall Hub', distance_km: 30 },
    truck: { category: 'medium', body: 'closed_box' },
    price: 500,
  });

  for (let i = 0; i < 2; i++) {
    await createSeedShipment({
      mfrId: [steelId, agriId][i],
      status: 'requested',
      goodsCatId: [5, 8][i],
      cargoDesc: 'Unpaid Freight Request',
      qty: 12,
      pickup: { address: 'Pickup Depot', lat: 31.8670, lng: 36.0030, city: 'Amman', area: 'Sahab' },
      dest: { address: 'Destination Yard', lat: 32.2808, lng: 35.8993, city: 'Jerash', area: 'Center', distance_km: 65 },
      truck: { category: 'heavy', body: 'closed_box' },
      price: 700,
    });
  }

  // Set sequence to 123 so the first live shipment created in demo is MSR-000124!
  await pool.query(`SELECT setval('ticket_seq', 123, true)`);

  console.log('✓ Seeded 45 shipments (MSR-000079 ... MSR-000123).');
  console.log('✓ Ticket sequence reset: Next live shipment will be MSR-000124.');
  console.log('--- Full Demo Seed Completed Successfully! ---');
}
