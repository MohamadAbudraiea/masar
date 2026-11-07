import bcrypt from 'bcryptjs';
import { pool } from '../../src/db.js';
import { computeSplit } from '../../src/services/money.js';

export async function runFullDemoSeed() {
  console.log('--- Loading Clean & Rich Demo Seed ---');

  // 0. Clean slate - wipe dynamic tables completely
  console.log('Clearing existing platform data (clean reset)...');
  await pool.query(`
    TRUNCATE TABLE 
      activity_log,
      notifications,
      ratings,
      ledger_entries,
      tickets,
      locations,
      trucks,
      driver_profiles,
      manufacturer_goods_categories,
      manufacturer_profiles,
      users
    RESTART IDENTITY CASCADE;
  `);

  const passwordHash = await bcrypt.hash('Masar@123', 10);

  // 1. Core Platform Roles (Admin & Escrow)
  console.log('Seeding Admin & Escrow...');
  const adminRes = await pool.query(
    `INSERT INTO users (role, name, email, phone, password_hash, status, language, timezone, email_notifications, approved_at)
     VALUES ('admin', 'Mohamad Abu Draiea (Admin)', 'mohamadabudraiea2003@gmail.com', '+962790000000', $1, 'approved', 'en', 'Asia/Amman', true, now())
     RETURNING id`,
    [passwordHash]
  );
  const adminId = adminRes.rows[0].id;

  const escrowRes = await pool.query(
    `INSERT INTO users (role, name, email, phone, password_hash, status, language, timezone, email_notifications, approved_at)
     VALUES ('escrow', 'SafePay Escrow Jordan', 'mohamadabudraiea2003@outlook.com', '+962790000099', $1, 'approved', 'en', 'Asia/Amman', true, now())
     RETURNING id`,
    [passwordHash]
  );
  const escrowId = escrowRes.rows[0].id;

  // 2. Manufacturers (7 Diverse Approved + 2 Pending in Admin Queue)
  console.log('Seeding 9 diverse manufacturers (7 approved, 2 pending)...');
  const manufacturers = [
    // 1. Hero Manufacturer
    {
      name: 'Al-Nour Foods Co.',
      contact: 'Mohamad Abu Draiea',
      email: 'mohamadabudraiea@gmail.com',
      phone: '+962790000001',
      city: 'Zarqa',
      area: 'Hashemiyya Industrial',
      address: 'Hashemiyya Industrial Area, Zarqa',
      lat: 32.0728,
      lng: 36.0880,
      cats: [1, 2, 3], // Dry, Chilled, Frozen
      status: 'approved',
      crKey: 'demo/cr_alnour.pdf',
      plKey: 'demo/pl_alnour.pdf',
      destinations: [
        { label: 'Fresh Market Central Irbid', address: 'Al-Hashmi St, Irbid', city: 'Irbid', area: 'Al-Hashmi', lat: 32.5556, lng: 35.8469, contact: 'Fadi Market Ops', phone: '+962798881111' },
        { label: 'Amman Retail Distribution Hub', address: 'Abdoun Commercial District, Amman', city: 'Amman', area: 'Abdoun', lat: 31.9454, lng: 35.8830, contact: 'Kareem Retail', phone: '+962798882222' },
        { label: 'Aqaba Cold Logistics Terminal', address: 'Port Customs Area, Aqaba', city: 'Aqaba', area: 'Port Area', lat: 29.5320, lng: 35.0063, contact: 'Sameh Port Ops', phone: '+962798882233' },
      ],
    },
    // 2. Heavy Steel & Construction
    {
      name: 'Jordan National Steel Works',
      contact: 'Eng. Fadi Shaker',
      email: 'logistics@jordansteel.demo',
      phone: '+962790000002',
      city: 'Amman',
      area: 'Sahab Industrial',
      address: 'King Abdullah II Industrial City, Sahab',
      lat: 31.8670,
      lng: 36.0030,
      cats: [6, 5, 1], // Machinery, Bulk, Dry
      status: 'approved',
      crKey: 'demo/cr_steel.pdf',
      plKey: 'demo/pl_steel.pdf',
      destinations: [
        { label: 'Aqaba Port Construction Yard', address: 'Aqaba Container Terminal Yard 4', city: 'Aqaba', area: 'Port Area', lat: 29.5320, lng: 35.0063, contact: 'Mahmoud Site Eng', phone: '+962798883333' },
        { label: 'Karak Trade Center', address: 'Al-Marj Commercial Zone, Karak', city: 'Karak', area: 'Al-Marj', lat: 31.1853, lng: 35.7048, contact: 'Bilal Contracting', phone: '+962798884444' },
      ],
    },
    // 3. Pharmaceuticals & Health
    {
      name: 'Petra Global Pharmaceuticals',
      contact: 'Dr. Omar Al-Basha',
      email: 'supply@petrapharma.demo',
      phone: '+962790000003',
      city: 'Salt',
      area: 'Salt Industrial Estate',
      address: 'Salt Industrial Estate, Salt',
      lat: 32.0392,
      lng: 35.7272,
      cats: [2, 3, 1], // Chilled, Frozen, Dry
      status: 'approved',
      crKey: 'demo/cr_pharma.pdf',
      plKey: 'demo/pl_pharma.pdf',
      destinations: [
        { label: 'Queen Alia Airport Cargo Terminal', address: 'QAIA Cargo Village, Zizia', city: 'Amman', area: 'Airport Cargo', lat: 31.7226, lng: 35.9932, contact: 'Ahmad Air Cargo', phone: '+962798885555' },
        { label: 'King Abdullah University Hospital Hub', address: 'Ramtha Highway, Irbid', city: 'Irbid', area: 'Ramtha', lat: 32.5020, lng: 35.9910, contact: 'Dr. Samer Pharmacy', phone: '+962798886666' },
      ],
    },
    // 4. Petrochemical & Industrial Liquids
    {
      name: 'Aqaba Petrochemical Refineries',
      contact: 'Tariq Ziyad',
      email: 'dispatch@aqabapetro.demo',
      phone: '+962790000004',
      city: 'Aqaba',
      area: 'South Coast Industrial Port',
      address: 'South Coast Industrial Area, Aqaba',
      lat: 29.5320,
      lng: 35.0063,
      cats: [7, 4, 5], // Hazardous, Liquid, Bulk
      status: 'approved',
      crKey: 'demo/cr_petro.pdf',
      plKey: 'demo/pl_petro.pdf',
      destinations: [
        { label: 'Amman Fuel Depot (Marka)', address: 'Marka Fuel Storage Terminal', city: 'Amman', area: 'Marka', lat: 31.9800, lng: 36.0100, contact: 'Ziyad Terminal Lead', phone: '+962798887777' },
        { label: 'Zarqa Refinery Logistics Hub', address: 'Jordan Petroleum Refinery Area', city: 'Zarqa', area: 'Hashemiyya', lat: 32.1100, lng: 36.1050, contact: 'Bashir Refinery', phone: '+962798888888' },
      ],
    },
    // 5. Agriculture & Olive Oil
    {
      name: 'Al-Badia Olive Oil & Agricultural Mills',
      contact: 'Naser Qudah',
      email: 'sales@badiaolive.demo',
      phone: '+962790000005',
      city: 'Jerash',
      area: 'Al-Qasabah Agricultural Zone',
      address: 'Jerash Agricultural Basin, Jerash',
      lat: 32.2723,
      lng: 35.8914,
      cats: [4, 1], // Liquid, Dry
      status: 'approved',
      crKey: 'demo/cr_olive.pdf',
      plKey: 'demo/pl_olive.pdf',
      destinations: [
        { label: 'Sweifieh Gourmet Food Market', address: 'Ali Nasouh Al-Taher St, Sweifieh', city: 'Amman', area: 'Sweifieh', lat: 31.9560, lng: 35.8600, contact: 'Tareq Store Mgr', phone: '+962798889999' },
      ],
    },
    // 6. Furniture & Woodcraft
    {
      name: 'Royal Amman Furniture & Woodcraft',
      contact: 'Hani Masri',
      email: 'export@ammanwood.demo',
      phone: '+962790000006',
      city: 'Amman',
      area: 'Marka Industrial Zone',
      address: 'Marka North Industrial Zone, Amman',
      lat: 31.9700,
      lng: 35.9900,
      cats: [10, 1], // Furniture, Dry
      status: 'approved',
      crKey: 'demo/cr_furniture.pdf',
      plKey: 'demo/pl_furniture.pdf',
      destinations: [
        { label: 'Ayla Oasis Hotel Project', address: 'Ayla Marina Village, Aqaba', city: 'Aqaba', area: 'Ayla', lat: 29.5480, lng: 34.9850, contact: 'Hassan Interior', phone: '+962798880001' },
      ],
    },
    // 7. Dead Sea Minerals
    {
      name: 'Dead Sea Salts & Minerals Co.',
      contact: 'Zaid Al-Majali',
      email: 'ops@deadseaminerals.demo',
      phone: '+962790000007',
      city: 'Karak',
      area: 'Ghor Al-Safi Industrial Area',
      address: 'Ghor Al-Safi Potash Works Basin, Karak',
      lat: 31.0360,
      lng: 35.4850,
      cats: [5, 1], // Bulk, Dry
      status: 'approved',
      crKey: 'demo/cr_deadsea.pdf',
      plKey: 'demo/pl_deadsea.pdf',
      destinations: [
        { label: 'Amman Chemical Packaging Plant', address: 'Al-Qastal Industrial Zone', city: 'Amman', area: 'Al-Qastal', lat: 31.7500, lng: 35.9400, contact: 'Munir Works', phone: '+962798880002' },
      ],
    },
    // 8. Pending Applicant 1 (Admin Approvals Queue)
    {
      name: 'Modern Packaging Solutions Co.',
      contact: 'Rami Al-Khatib',
      email: 'licensing@modernpackaging.demo',
      phone: '+962790000008',
      city: 'Irbid',
      area: 'Cyber City Industrial Park',
      address: 'Cyber City Industrial Zone, Irbid',
      lat: 32.4950,
      lng: 35.9800,
      cats: [1],
      status: 'pending',
      crKey: 'demo/cr_modern_packaging.pdf',
      plKey: 'demo/pl_modern_packaging.pdf',
      destinations: [],
    },
    // 9. Pending Applicant 2 (Admin Approvals Queue)
    {
      name: 'Arabian Chemical Compounds LLC',
      contact: 'Samir Ghanem',
      email: 'admin@arabchem.demo',
      phone: '+962790000009',
      city: 'Zarqa',
      area: 'Zarqa Free Zone',
      address: 'Zarqa Free Zone Sector 3, Zarqa',
      lat: 32.0500,
      lng: 36.1200,
      cats: [7, 4],
      status: 'pending',
      crKey: 'demo/cr_arabchem.pdf',
      plKey: 'demo/pl_arabchem.pdf',
      destinations: [],
    },
  ];

  const mfrIdMap = {};

  for (const m of manufacturers) {
    const res = await pool.query(
      `INSERT INTO users (role, name, email, phone, password_hash, status, language, timezone, email_notifications, approved_at)
       VALUES ('manufacturer', $1, $2, $3, $4, $5, 'en', 'Asia/Amman', true, CASE WHEN $5 = 'approved' THEN now() ELSE null END)
       RETURNING id`,
      [m.name, m.email, m.phone, passwordHash, m.status]
    );
    const userId = res.rows[0].id;
    mfrIdMap[m.email] = userId;

    await pool.query(
      `INSERT INTO manufacturer_profiles (user_id, contact_person, phones, emails, commercial_registration_key, professions_license_key)
       VALUES ($1, $2, ARRAY[$3], ARRAY[$4], $5, $6)`,
      [userId, m.contact, m.phone, m.email, m.crKey, m.plKey]
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
       VALUES ($1, 'pickup', $2, $3, $4, $5, $6, $7, true)`,
      [userId, `${m.name} Main Depot`, m.address, m.lat, m.lng, m.city, m.area]
    );

    // Saved destinations
    for (const d of m.destinations || []) {
      await pool.query(
        `INSERT INTO locations (owner_id, kind, label, address, lat, lng, city, area, contact_name, contact_phone)
         VALUES ($1, 'destination', $2, $3, $4, $5, $6, $7, $8, $9)`,
        [userId, d.label, d.address, d.lat, d.lng, d.city, d.area, d.contact, d.phone]
      );
    }
  }

  // 3. Drivers (12 Diverse Approved + 2 Pending in Admin Queue)
  console.log('Seeding 14 drivers (12 approved, 2 pending)...');
  const drivers = [
    // 1. Hero Driver (Omar Ayman Saleh - FREE and ready to accept shipments)
    {
      num: 1,
      name: 'Omar Ayman Saleh',
      email: 'mohamadayman773@gmail.com',
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
      idDoc: 'demo/id_omar.pdf',
      licDoc: 'demo/lic_omar.pdf',
      truckLicDoc: 'demo/truck_lic_omar.pdf',
      photos: ['demo/truck_photo_1.jpg'],
    },
    // 2. Ali Mansour (Medium Refrigerated, busy with waiting_load)
    {
      num: 2,
      name: 'Ali Mansour Al-Balawi',
      email: 'ali.mansour@masardrivers.demo',
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
      idDoc: 'demo/id_ali.pdf',
      licDoc: 'demo/lic_ali.pdf',
      truckLicDoc: 'demo/truck_lic_ali.pdf',
      photos: ['demo/truck_photo_2.jpg'],
    },
    // 3. Mahmoud Qudah (Heavy Rigid Closed Box)
    {
      num: 3,
      name: 'Mahmoud Qudah',
      email: 'mahmoud.qudah@masardrivers.demo',
      phone: '+962790010003',
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
      idDoc: 'demo/id_mahmoud.pdf',
      licDoc: 'demo/lic_mahmoud.pdf',
      truckLicDoc: 'demo/truck_lic_mahmoud.pdf',
      photos: ['demo/truck_photo_3.jpg'],
    },
    // 4. Hasan Tarawneh (Heavy Tractor Trailer Flatbed)
    {
      num: 4,
      name: 'Hasan Tarawneh',
      email: 'hasan.tarawneh@masardrivers.demo',
      phone: '+962790010004',
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
      idDoc: 'demo/id_hasan.pdf',
      licDoc: 'demo/lic_hasan.pdf',
      truckLicDoc: 'demo/truck_lic_hasan.pdf',
      passportDoc: 'demo/passport_hasan.pdf',
      photos: ['demo/truck_photo_4.jpg'],
    },
    // 5. Sami Khalil (Tanker Chemical Tanker, ADR certified)
    {
      num: 5,
      name: 'Sami Khalil',
      email: 'sami.khalil@masardrivers.demo',
      phone: '+962790010005',
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
      idDoc: 'demo/id_sami.pdf',
      licDoc: 'demo/lic_sami.pdf',
      truckLicDoc: 'demo/truck_lic_sami.pdf',
      passportDoc: 'demo/passport_sami.pdf',
      photos: ['demo/truck_photo_5.jpg'],
    },
    // 6. Ibrahim Al-Zoubi (Heavy Tractor Trailer Refrigerated - Frozen)
    {
      num: 6,
      name: 'Ibrahim Al-Zoubi',
      email: 'ibrahim.zoubi@masardrivers.demo',
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
      idDoc: 'demo/id_ibrahim.pdf',
      licDoc: 'demo/lic_ibrahim.pdf',
      truckLicDoc: 'demo/truck_lic_ibrahim.pdf',
      passportDoc: 'demo/passport_ibrahim.pdf',
      photos: ['demo/truck_photo_6.jpg'],
    },
    // 7. Tariq Abu Hassan (Light Van)
    {
      num: 7,
      name: 'Tariq Abu Hassan',
      email: 'tariq.abuhassan@masardrivers.demo',
      phone: '+962790010007',
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
      idDoc: 'demo/id_tariq.pdf',
      licDoc: 'demo/lic_tariq.pdf',
      truckLicDoc: 'demo/truck_lic_tariq.pdf',
      photos: ['demo/truck_photo_7.jpg'],
    },
    // 8. Nabil Odeh (Fuel Tanker)
    {
      num: 8,
      name: 'Nabil Odeh',
      email: 'nabil.odeh@masardrivers.demo',
      phone: '+962790010008',
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
      idDoc: 'demo/id_nabil.pdf',
      licDoc: 'demo/lic_nabil.pdf',
      truckLicDoc: 'demo/truck_lic_nabil.pdf',
      photos: ['demo/truck_photo_8.jpg'],
    },
    // 9. Fares Haddadin (Medium Long Chassis Closed Box)
    {
      num: 9,
      name: 'Fares Haddadin',
      email: 'fares.haddadin@masardrivers.demo',
      phone: '+962790010009',
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
      idDoc: 'demo/id_fares.pdf',
      licDoc: 'demo/lic_fares.pdf',
      truckLicDoc: 'demo/truck_lic_fares.pdf',
      photos: ['demo/truck_photo_9.jpg'],
    },
    // 10. Rami Shaheen (Heavy Rigid Tipper)
    {
      num: 10,
      name: 'Rami Shaheen',
      email: 'rami.shaheen@masardrivers.demo',
      phone: '+962790010010',
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
      idDoc: 'demo/id_rami.pdf',
      licDoc: 'demo/lic_rami.pdf',
      truckLicDoc: 'demo/truck_lic_rami.pdf',
      photos: ['demo/truck_photo_10.jpg'],
    },
    // 11. Waleed Masri (Heavy Rigid Livestock)
    {
      num: 11,
      name: 'Waleed Masri',
      email: 'waleed.masri@masardrivers.demo',
      phone: '+962790010011',
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
      idDoc: 'demo/id_waleed.pdf',
      licDoc: 'demo/lic_waleed.pdf',
      truckLicDoc: 'demo/truck_lic_waleed.pdf',
      photos: ['demo/truck_photo_11.jpg'],
    },
    // 12. Yousef Nasser (Medium Short Chassis Refrigerated)
    {
      num: 12,
      name: 'Yousef Nasser',
      email: 'yousef.nasser@masardrivers.demo',
      phone: '+962790010012',
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
      idDoc: 'demo/id_yousef.pdf',
      licDoc: 'demo/lic_yousef.pdf',
      truckLicDoc: 'demo/truck_lic_yousef.pdf',
      photos: ['demo/truck_photo_12.jpg'],
    },
    // 13. Pending Driver Applicant 1 (Admin Approvals Queue)
    {
      num: 13,
      name: 'Majed Rawashdeh',
      email: 'majed.rawashdeh@masardrivers.demo',
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
      status: 'pending',
      idDoc: 'demo/id_majed.pdf',
      licDoc: 'demo/lic_majed.pdf',
      truckLicDoc: 'demo/truck_lic_majed.pdf',
      photos: ['demo/truck_photo_13.jpg'],
    },
    // 14. Pending Driver Applicant 2 (Admin Approvals Queue)
    {
      num: 14,
      name: 'Khaled Al-Majali',
      email: 'khaled.majali@masardrivers.demo',
      phone: '+962790018888',
      scope: 'external',
      license: 6,
      cat: 'heavy',
      type: 'tractor_trailer',
      body: 'flatbed',
      cooling: null,
      plate: '60-77665',
      adr: false,
      gross: 'tt_40_50',
      status: 'pending',
      idDoc: 'demo/id_khaled_driver.pdf',
      licDoc: 'demo/lic_khaled_driver.pdf',
      truckLicDoc: 'demo/truck_lic_khaled.pdf',
      passportDoc: 'demo/passport_khaled.pdf',
      photos: ['demo/truck_photo_14.jpg'],
    },
  ];

  const driverIdMap = {};

  for (const d of drivers) {
    const res = await pool.query(
      `INSERT INTO users (role, name, email, phone, password_hash, status, language, timezone, email_notifications, approved_at)
       VALUES ('driver', $1, $2, $3, $4, $5, 'ar', 'Asia/Amman', true, CASE WHEN $5 = 'approved' THEN now() ELSE null END)
       RETURNING id`,
      [d.name, d.email, d.phone, passwordHash, d.status]
    );
    const userId = res.rows[0].id;
    driverIdMap[d.email] = userId;

    await pool.query(
      `INSERT INTO driver_profiles (user_id, scope, license_class, iban, cliq_alias, id_doc_key, license_doc_key, passport_doc_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        d.scope,
        d.license,
        `JO94CBJO00100000000001310000${String(d.num).padStart(2, '0')}`,
        d.num === 1 ? 'OMAR_AYMAN' : (d.num % 2 === 1 ? `DRIVER_${d.num}` : null),
        d.idDoc,
        d.licDoc,
        d.passportDoc || null,
      ]
    );

    // Link Truck
    const ttRes = await pool.query(
      `SELECT id FROM truck_types WHERE category = $1 AND type_code = $2 AND body_code = $3 LIMIT 1`,
      [d.cat, d.type, d.body]
    );
    const truckTypeId = ttRes.rows[0]?.id;

    if (truckTypeId) {
      await pool.query(
        `INSERT INTO trucks (driver_id, truck_type_id, plate_number, cooling, adr_certified, gross_weight_code, license_doc_key, photo_keys)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, truckTypeId, d.plate, d.cooling, d.adr, d.gross, d.truckLicDoc, d.photos]
      );
    }
  }

  // 4. Reset ticket sequence for deterministic numbering (starting from 79)
  await pool.query(`SELECT setval('ticket_seq', 78, true)`);

  const alNourId = mfrIdMap['mohamadabudraiea@gmail.com'];
  const steelId = mfrIdMap['logistics@jordansteel.demo'];
  const pharmaId = mfrIdMap['supply@petrapharma.demo'];
  const petroId = mfrIdMap['dispatch@aqabapetro.demo'];
  const oliveId = mfrIdMap['sales@badiaolive.demo'];
  const woodId = mfrIdMap['export@ammanwood.demo'];
  const mineralsId = mfrIdMap['ops@deadseaminerals.demo'];

  const heroDriverId = driverIdMap['mohamadayman773@gmail.com'];
  const aliId = driverIdMap['ali.mansour@masardrivers.demo'];
  const mahmoudId = driverIdMap['mahmoud.qudah@masardrivers.demo'];
  const hasanId = driverIdMap['hasan.tarawneh@masardrivers.demo'];
  const samiId = driverIdMap['sami.khalil@masardrivers.demo'];
  const ibrahimId = driverIdMap['ibrahim.zoubi@masardrivers.demo'];
  const tariqId = driverIdMap['tariq.abuhassan@masardrivers.demo'];
  const nabilId = driverIdMap['nabil.odeh@masardrivers.demo'];
  const faresId = driverIdMap['fares.haddadin@masardrivers.demo'];
  const ramiId = driverIdMap['rami.shaheen@masardrivers.demo'];
  const waleedId = driverIdMap['waleed.masri@masardrivers.demo'];
  const yousefId = driverIdMap['yousef.nasser@masardrivers.demo'];

  console.log('Seeding 48 rich and deterministic shipments across all statuses...');

  // Helper to create shipment with exact status history, financial ledger, and rating
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
    rating = null,
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
        dest.name || 'Recipient Logistics',
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
        dest.distance_km || 110,
        JSON.stringify(timestamps.history || {}),
        timestamps.created_at || new Date().toISOString(),
      ]
    );

    const ticket = res.rows[0];

    // Ledger settlement for audited shipments
    if (status === 'audited' && driverId) {
      await pool.query(
        `INSERT INTO ledger_entries (ticket_id, entry_type, amount, party_user_id, details, created_at)
         VALUES
         ($1, 'deposit', $2, $3, '{"payer":"manufacturer"}', $8),
         ($1, 'payout_driver', $4, $5, '{"iban":"JO94CBJO0010000000000131000001"}', $8),
         ($1, 'commission_masar', $6, NULL, '{"rate":"0.04"}', $8),
         ($1, 'commission_escrow', $7, NULL, '{"rate":"0.02"}', $8)`,
        [
          ticket.id,
          ticket.price,
          mfrId,
          ticket.driver_net,
          driverId,
          ticket.masar_fee,
          ticket.escrow_fee,
          timestamps.created_at || new Date().toISOString(),
        ]
      );

      // Bilateral ratings
      if (rating) {
        await pool.query(
          `INSERT INTO ratings (ticket_id, from_user_id, to_user_id, stars, comment, created_at)
           VALUES
           ($1, $2, $3, $4, $5, $7),
           ($1, $3, $2, $4, $6, $7)
           ON CONFLICT DO NOTHING`,
          [
            ticket.id,
            mfrId,
            driverId,
            rating.stars || 5,
            rating.mfrComment || 'Excellent service and on-time delivery.',
            rating.driverComment || 'Great company, fast loading and friendly team.',
            timestamps.created_at || new Date().toISOString(),
          ]
        );
      }
    }

    return ticket;
  }

  // Diverse Rating feedback pool
  const ratingFeedbacks = [
    {
      stars: 5,
      mfrComment: 'Punctual arrival at Zarqa plant. Maintained cold-chain integrity from start to finish.',
      driverComment: 'Fast warehouse loading and accurate delivery documentation. Very professional facility.',
    },
    {
      stars: 5,
      mfrComment: 'Smooth delivery to Irbid Central Market. Driver communicated arrival times proactively.',
      driverComment: 'Clear directions and the destination receiving crew was ready with forklifts.',
    },
    {
      stars: 5,
      mfrComment: 'Safe transport of heavy structural steel rebar to Aqaba. Highly competent captain.',
      driverComment: 'Heavy overhead cranes at Sahab loaded and secured the flatbed with proper balance.',
    },
    {
      stars: 5,
      mfrComment: 'Pharmaceutical cargo kept at exact temperature specifications (2°C-4°C) with full logs.',
      driverComment: 'Clean inspection bay at Salt and courteous receiving staff at the medical hub.',
    },
    {
      stars: 5,
      mfrComment: 'Fully certified ADR chemical tanker. Handled discharge with outstanding safety diligence.',
      driverComment: 'Standard operating safety procedures were strictly followed at the chemical terminal.',
    },
    {
      stars: 5,
      mfrComment: 'Bottled extra virgin olive oil cartons arrived in immaculate condition without any damage.',
      driverComment: 'Warm hospitality from the mill staff in Jerash and fast paperwork signing.',
    },
    {
      stars: 4,
      mfrComment: 'High-end furniture consignment delivered on time with protective blankets intact.',
      driverComment: 'Helpful receiving team at the Abdoun residential development.',
    },
    {
      stars: 5,
      mfrComment: 'Dead Sea mineral salts transported smoothly. Weighbridge clearance was very efficient.',
      driverComment: 'Well-organized dispatch bay at Ghor Al-Safi potash facility.',
    },
    {
      stars: 5,
      mfrComment: 'Driver inspected cargo strapping before departure and after highway transit. Top tier.',
      driverComment: 'Excellent manufacturer to work with. Dispatch documents were completely ready.',
    },
    {
      stars: 5,
      mfrComment: 'Great highway navigation and verified seal numbers upon arrival at the northern border.',
      driverComment: 'Clear delivery bill of lading and swift customs documentation processing.',
    },
  ];

  // 28 Distinct Audited Shipments spread across the last 90 days
  // Spread evenly across the 7 manufacturers and multiple drivers
  const auditedShipmentsConfig = [
    // Al-Nour (Food & Dairy) - 5 shipments (including 3 for hero driver Omar)
    {
      mfrId: alNourId,
      driverId: heroDriverId,
      goodsCatId: 2,
      cargoDesc: '3 Pallets of Fresh Pasteurized Milk & Labneh (4°C)',
      qty: 4.5,
      pickup: { address: 'Hashemiyya Industrial Area, Zarqa', lat: 32.0728, lng: 36.0880, city: 'Zarqa', area: 'Hashemiyya' },
      dest: { address: 'Al-Hashmi St, Irbid', lat: 32.5556, lng: 35.8469, city: 'Irbid', area: 'Al-Hashmi', name: 'Fadi Market Ops', distance_km: 82 },
      truck: { category: 'medium', body: 'refrigerated', cooling: 'chilled' },
      price: 680,
    },
    {
      mfrId: alNourId,
      driverId: heroDriverId,
      goodsCatId: 3,
      cargoDesc: 'Frozen Dairy Ice Cream Tubs (-18°C)',
      qty: 3.8,
      pickup: { address: 'Hashemiyya Industrial Area, Zarqa', lat: 32.0728, lng: 36.0880, city: 'Zarqa', area: 'Hashemiyya' },
      dest: { address: 'Abdoun Commercial District, Amman', lat: 31.9454, lng: 35.8830, city: 'Amman', area: 'Abdoun', name: 'Kareem Retail', distance_km: 38 },
      truck: { category: 'medium', body: 'refrigerated', cooling: 'chilled' },
      price: 520,
    },
    {
      mfrId: alNourId,
      driverId: yousefId,
      goodsCatId: 1,
      cargoDesc: 'Packaged Whole Wheat Flour & Bakery Mixes',
      qty: 6.0,
      pickup: { address: 'Hashemiyya Industrial Area, Zarqa', lat: 32.0728, lng: 36.0880, city: 'Zarqa', area: 'Hashemiyya' },
      dest: { address: 'Zizia Logistics Depot, Amman', lat: 31.7226, lng: 35.9932, city: 'Amman', area: 'Zizia', name: 'Zizia Bakery Hub', distance_km: 55 },
      truck: { category: 'medium', body: 'closed_box' },
      price: 490,
    },
    {
      mfrId: alNourId,
      driverId: heroDriverId,
      goodsCatId: 2,
      cargoDesc: 'Chilled Artisanal Halloumi & Akkawi Cheeses',
      qty: 3.2,
      pickup: { address: 'Hashemiyya Industrial Area, Zarqa', lat: 32.0728, lng: 36.0880, city: 'Zarqa', area: 'Hashemiyya' },
      dest: { address: 'Port Customs Area, Aqaba', lat: 29.5320, lng: 35.0063, city: 'Aqaba', area: 'Port Area', name: 'Aqaba Cold Storage', distance_km: 334 },
      truck: { category: 'medium', body: 'refrigerated', cooling: 'chilled' },
      price: 1450,
    },
    {
      mfrId: alNourId,
      driverId: faresId,
      goodsCatId: 1,
      cargoDesc: 'Canned Legumes & Preserved Tomato Paste',
      qty: 8.0,
      pickup: { address: 'Hashemiyya Industrial Area, Zarqa', lat: 32.0728, lng: 36.0880, city: 'Zarqa', area: 'Hashemiyya' },
      dest: { address: 'Al-Marj Commercial Zone, Karak', lat: 31.1853, lng: 35.7048, city: 'Karak', area: 'Al-Marj', name: 'Karak Wholesalers', distance_km: 145 },
      truck: { category: 'medium', body: 'closed_box' },
      price: 780,
    },

    // Jordan National Steel - 4 shipments
    {
      mfrId: steelId,
      driverId: hasanId,
      goodsCatId: 6,
      cargoDesc: 'Deformed Steel Reinforcing Rebars (Grade 60, 12m)',
      qty: 24.0,
      pickup: { address: 'King Abdullah II Industrial City, Sahab', lat: 31.8670, lng: 36.0030, city: 'Amman', area: 'Sahab' },
      dest: { address: 'Aqaba Container Terminal Yard 4', lat: 29.5320, lng: 35.0063, city: 'Aqaba', area: 'Port Area', name: 'Mahmoud Site Eng', distance_km: 320 },
      truck: { category: 'heavy', body: 'flatbed' },
      price: 2400,
    },
    {
      mfrId: steelId,
      driverId: mahmoudId,
      goodsCatId: 6,
      cargoDesc: 'Galvanized Steel Industrial Piping & Fittings',
      qty: 14.0,
      pickup: { address: 'King Abdullah II Industrial City, Sahab', lat: 31.8670, lng: 36.0030, city: 'Amman', area: 'Sahab' },
      dest: { address: 'Cyber City Industrial Zone, Irbid', lat: 32.4950, lng: 35.9800, city: 'Irbid', area: 'Cyber City', name: 'Irbid Contractors', distance_km: 98 },
      truck: { category: 'heavy', body: 'closed_box' },
      price: 1100,
    },
    {
      mfrId: steelId,
      driverId: hasanId,
      goodsCatId: 6,
      cargoDesc: 'Heavy Structural Steel I-Beams for Highway Overpass',
      qty: 22.5,
      pickup: { address: 'King Abdullah II Industrial City, Sahab', lat: 31.8670, lng: 36.0030, city: 'Amman', area: 'Sahab' },
      dest: { address: 'Al-Marj Commercial Zone, Karak', lat: 31.1853, lng: 35.7048, city: 'Karak', area: 'Al-Marj', name: 'Bilal Contracting', distance_km: 125 },
      truck: { category: 'heavy', body: 'flatbed' },
      price: 1650,
    },
    {
      mfrId: steelId,
      driverId: ramiId,
      goodsCatId: 5,
      cargoDesc: 'Bulk Steel Slag & Blast Furnace Mineral Aggregates',
      qty: 18.0,
      pickup: { address: 'King Abdullah II Industrial City, Sahab', lat: 31.8670, lng: 36.0030, city: 'Amman', area: 'Sahab' },
      dest: { address: 'Salt Industrial Estate, Salt', lat: 32.0392, lng: 35.7272, city: 'Salt', area: 'Industrial', name: 'Salt Ready-Mix Plant', distance_km: 58 },
      truck: { category: 'heavy', body: 'tipper' },
      price: 850,
    },

    // Petra Global Pharmaceuticals - 4 shipments
    {
      mfrId: pharmaId,
      driverId: heroDriverId,
      goodsCatId: 2,
      cargoDesc: 'Temperature-Controlled Pediatric Vaccines & Insulin Ampoules (2°C-8°C)',
      qty: 2.4,
      pickup: { address: 'Salt Industrial Estate, Salt', lat: 32.0392, lng: 35.7272, city: 'Salt', area: 'Industrial' },
      dest: { address: 'QAIA Cargo Village, Zizia', lat: 31.7226, lng: 35.9932, city: 'Amman', area: 'Airport Cargo', name: 'Ahmad Air Cargo', distance_km: 62 },
      truck: { category: 'medium', body: 'refrigerated', cooling: 'chilled' },
      price: 950,
    },
    {
      mfrId: pharmaId,
      driverId: yousefId,
      goodsCatId: 2,
      cargoDesc: 'Chilled Sterile Saline IV Solutions & Infusion Bags',
      qty: 3.5,
      pickup: { address: 'Salt Industrial Estate, Salt', lat: 32.0392, lng: 35.7272, city: 'Salt', area: 'Industrial' },
      dest: { address: 'Ramtha Highway, Irbid', lat: 32.5020, lng: 35.9910, city: 'Irbid', area: 'Ramtha', name: 'Dr. Samer Pharmacy', distance_km: 84 },
      truck: { category: 'medium', body: 'refrigerated', cooling: 'chilled' },
      price: 720,
    },
    {
      mfrId: pharmaId,
      driverId: ibrahimId,
      goodsCatId: 3,
      cargoDesc: 'Biological Diagnostic Reagents (-20°C Deep Frozen)',
      qty: 12.0,
      tripType: 'international',
      destCountry: 'Saudi Arabia',
      pickup: { address: 'Salt Industrial Estate, Salt', lat: 32.0392, lng: 35.7272, city: 'Salt', area: 'Industrial' },
      dest: { address: 'Al-Sulay Logistics District, Riyadh', lat: 24.7136, lng: 46.6753, city: 'Riyadh', area: 'Al-Sulay', name: 'Riyadh Medical Logistics', distance_km: 1480 },
      truck: { category: 'heavy', body: 'refrigerated', cooling: 'frozen' },
      cond: { customs_enabled: true, customs_declaration_number: 'CD-2026-99012', customs_permit_type: 'export' },
      price: 4200,
    },
    {
      mfrId: pharmaId,
      driverId: faresId,
      goodsCatId: 1,
      cargoDesc: 'Surgical Gauze, PPE Masks & Medical Disposables',
      qty: 4.0,
      pickup: { address: 'Salt Industrial Estate, Salt', lat: 32.0392, lng: 35.7272, city: 'Salt', area: 'Industrial' },
      dest: { address: 'Al-Bashir Hospital Warehouse, Amman', lat: 31.9360, lng: 35.9420, city: 'Amman', area: 'Ashrafiyeh', name: 'MOH Central Store', distance_km: 35 },
      truck: { category: 'medium', body: 'closed_box' },
      price: 450,
    },

    // Aqaba Petrochemicals - 4 shipments
    {
      mfrId: petroId,
      driverId: samiId,
      goodsCatId: 7,
      cargoDesc: 'Industrial Denatured Ethanol 96% (ADR Class 3)',
      qty: 16000,
      unit: 'liter',
      pickup: { address: 'South Coast Industrial Area, Aqaba', lat: 29.5320, lng: 35.0063, city: 'Aqaba', area: 'South Coast' },
      dest: { address: 'Marka Fuel Storage Terminal, Amman', lat: 31.9800, lng: 36.0100, city: 'Amman', area: 'Marka', name: 'Ziyad Terminal Lead', distance_km: 334 },
      truck: { category: 'tanker', body: 'chemical_tanker' },
      cond: { is_hazardous: true, adr_class: '3', liquid_type: 'chemical_tanker' },
      price: 1850,
    },
    {
      mfrId: petroId,
      driverId: nabilId,
      goodsCatId: 4,
      cargoDesc: 'Industrial Low-Sulfur Fuel Oil for Power Generation',
      qty: 22000,
      unit: 'liter',
      pickup: { address: 'South Coast Industrial Area, Aqaba', lat: 29.5320, lng: 35.0063, city: 'Aqaba', area: 'South Coast' },
      dest: { address: 'Jordan Petroleum Refinery Area, Zarqa', lat: 32.1100, lng: 36.1050, city: 'Zarqa', area: 'Hashemiyya', name: 'Bashir Refinery', distance_km: 345 },
      truck: { category: 'tanker', body: 'fuel_tanker' },
      cond: { is_hazardous: true, adr_class: '3', liquid_type: 'fuel_tanker' },
      price: 2100,
    },
    {
      mfrId: petroId,
      driverId: samiId,
      goodsCatId: 7,
      cargoDesc: 'Aqueous Ammonia 25% Solution (ADR Class 8 Corrosive)',
      qty: 14000,
      unit: 'liter',
      pickup: { address: 'South Coast Industrial Area, Aqaba', lat: 29.5320, lng: 35.0063, city: 'Aqaba', area: 'South Coast' },
      dest: { address: 'Al-Qastal Industrial Zone, Amman', lat: 31.7500, lng: 35.9400, city: 'Amman', area: 'Al-Qastal', name: 'Qastal Polymer Works', distance_km: 295 },
      truck: { category: 'tanker', body: 'chemical_tanker' },
      cond: { is_hazardous: true, adr_class: '8', liquid_type: 'chemical_tanker' },
      price: 1950,
    },
    {
      mfrId: petroId,
      driverId: mahmoudId,
      goodsCatId: 5,
      cargoDesc: 'Solid Polyethylene High-Density Resin Pellets in Jumbo Bags',
      qty: 15.0,
      pickup: { address: 'South Coast Industrial Area, Aqaba', lat: 29.5320, lng: 35.0063, city: 'Aqaba', area: 'South Coast' },
      dest: { address: 'King Abdullah II Industrial City, Sahab', lat: 31.8670, lng: 36.0030, city: 'Amman', area: 'Sahab', name: 'Plastic Extrusions Ltd', distance_km: 320 },
      truck: { category: 'heavy', body: 'closed_box' },
      price: 1350,
    },

    // Al-Badia Olive Oil - 4 shipments
    {
      mfrId: oliveId,
      driverId: heroDriverId,
      goodsCatId: 4,
      cargoDesc: 'Cold-Pressed Extra Virgin Olive Oil (16L Tin Cans)',
      qty: 4.2,
      pickup: { address: 'Jerash Agricultural Basin, Jerash', lat: 32.2723, lng: 35.8914, city: 'Jerash', area: 'Jerash' },
      dest: { address: 'Ali Nasouh Al-Taher St, Sweifieh', lat: 31.9560, lng: 35.8600, city: 'Amman', area: 'Sweifieh', name: 'Tareq Store Mgr', distance_km: 52 },
      truck: { category: 'medium', body: 'refrigerated', cooling: 'chilled' },
      price: 580,
    },
    {
      mfrId: oliveId,
      driverId: tariqId,
      goodsCatId: 4,
      cargoDesc: 'Premium Organic Olive Oil Glass Bottles (500ml x 24pk)',
      qty: 1.8,
      pickup: { address: 'Jerash Agricultural Basin, Jerash', lat: 32.2723, lng: 35.8914, city: 'Jerash', area: 'Jerash' },
      dest: { address: 'Dabouq Gourmet Market, Amman', lat: 31.9920, lng: 35.8280, city: 'Amman', area: 'Dabouq', name: 'Gourmet Selection', distance_km: 46 },
      truck: { category: 'light', body: 'closed_box' },
      price: 360,
    },
    {
      mfrId: oliveId,
      driverId: mahmoudId,
      goodsCatId: 1,
      cargoDesc: 'Processed Olive Pomace Solid Biomass Briquettes',
      qty: 12.0,
      pickup: { address: 'Jerash Agricultural Basin, Jerash', lat: 32.2723, lng: 35.8914, city: 'Jerash', area: 'Jerash' },
      dest: { address: 'Madaba Heating Plant, Madaba', lat: 31.7160, lng: 35.7939, city: 'Madaba', area: 'Madaba', name: 'EcoHeating Supplies', distance_km: 82 },
      truck: { category: 'heavy', body: 'closed_box' },
      price: 750,
    },
    {
      mfrId: oliveId,
      driverId: heroDriverId,
      goodsCatId: 4,
      cargoDesc: 'Export-Grade Early Harvest Green Olive Oil Drums',
      qty: 3.5,
      pickup: { address: 'Jerash Agricultural Basin, Jerash', lat: 32.2723, lng: 35.8914, city: 'Jerash', area: 'Jerash' },
      dest: { address: 'QAIA Cargo Village, Zizia', lat: 31.7226, lng: 35.9932, city: 'Amman', area: 'Airport Cargo', name: 'Gulf Air Freight', distance_km: 78 },
      truck: { category: 'medium', body: 'refrigerated', cooling: 'chilled' },
      price: 720,
    },

    // Royal Amman Furniture - 3 shipments
    {
      mfrId: woodId,
      driverId: faresId,
      goodsCatId: 10,
      cargoDesc: 'Solid Oak Executive Conference Tables & Ergonomic Chairs',
      qty: 3.2,
      pickup: { address: 'Marka North Industrial Zone, Amman', lat: 31.9700, lng: 35.9900, city: 'Amman', area: 'Marka' },
      dest: { address: 'Abdali Boulevard Tower 3, Amman', lat: 31.9630, lng: 35.9080, city: 'Amman', area: 'Al-Abdali', name: 'Boulevard Corporate Suites', distance_km: 12 },
      truck: { category: 'medium', body: 'closed_box' },
      price: 420,
    },
    {
      mfrId: woodId,
      driverId: mahmoudId,
      goodsCatId: 10,
      cargoDesc: 'Complete Custom Bedroom Suites for Resort Hotel',
      qty: 8.5,
      pickup: { address: 'Marka North Industrial Zone, Amman', lat: 31.9700, lng: 35.9900, city: 'Amman', area: 'Marka' },
      dest: { address: 'Ayla Marina Village, Aqaba', lat: 29.5480, lng: 34.9850, city: 'Aqaba', area: 'Ayla', name: 'Hassan Interior', distance_km: 338 },
      truck: { category: 'heavy', body: 'closed_box' },
      price: 1750,
    },
    {
      mfrId: woodId,
      driverId: tariqId,
      goodsCatId: 10,
      cargoDesc: 'Designer Teak Patio Lounge Chairs & Parasols',
      qty: 1.6,
      pickup: { address: 'Marka North Industrial Zone, Amman', lat: 31.9700, lng: 35.9900, city: 'Amman', area: 'Marka' },
      dest: { address: 'Dead Sea Panorama Resort, Sweimeh', lat: 31.7250, lng: 35.5900, city: 'Dead Sea', area: 'Sweimeh', name: 'Resort Amenities Ops', distance_km: 68 },
      truck: { category: 'light', body: 'closed_box' },
      price: 480,
    },

    // Dead Sea Salts & Minerals - 4 shipments
    {
      mfrId: mineralsId,
      driverId: hasanId,
      goodsCatId: 5,
      cargoDesc: 'High-Purity Dead Sea Magnesium Chloride Hexahydrate Crystals (25kg bags)',
      qty: 22.0,
      pickup: { address: 'Ghor Al-Safi Potash Works Basin, Karak', lat: 31.0360, lng: 35.4850, city: 'Karak', area: 'Ghor Al-Safi' },
      dest: { address: 'Aqaba Container Terminal Yard 4', lat: 29.5320, lng: 35.0063, city: 'Aqaba', area: 'Port Area', name: 'Export Container Line', distance_km: 195 },
      truck: { category: 'heavy', body: 'flatbed' },
      price: 1550,
    },
    {
      mfrId: mineralsId,
      driverId: mahmoudId,
      goodsCatId: 5,
      cargoDesc: 'Refined Cosmetic Black Mud & Therapeutic Bath Salts',
      qty: 11.5,
      pickup: { address: 'Ghor Al-Safi Potash Works Basin, Karak', lat: 31.0360, lng: 35.4850, city: 'Karak', area: 'Ghor Al-Safi' },
      dest: { address: 'Al-Qastal Industrial Zone, Amman', lat: 31.7500, lng: 35.9400, city: 'Amman', area: 'Al-Qastal', name: 'Munir Works', distance_km: 118 },
      truck: { category: 'heavy', body: 'closed_box' },
      price: 980,
    },
    {
      mfrId: mineralsId,
      driverId: ramiId,
      goodsCatId: 5,
      cargoDesc: 'Industrial Grade Potassium Sulfate Mineral Powder',
      qty: 17.5,
      pickup: { address: 'Ghor Al-Safi Potash Works Basin, Karak', lat: 31.0360, lng: 35.4850, city: 'Karak', area: 'Ghor Al-Safi' },
      dest: { address: 'Mafraq Agricultural Plains, Mafraq', lat: 32.3406, lng: 36.2080, city: 'Mafraq', area: 'Mafraq', name: 'Al-Anzi Agri Supplies', distance_km: 198 },
      truck: { category: 'heavy', body: 'tipper' },
      price: 1400,
    },
    {
      mfrId: mineralsId,
      driverId: heroDriverId,
      goodsCatId: 1,
      cargoDesc: 'Fine Spa Grade Dead Sea Salts in Retail Packs',
      qty: 3.8,
      pickup: { address: 'Ghor Al-Safi Potash Works Basin, Karak', lat: 31.0360, lng: 35.4850, city: 'Karak', area: 'Ghor Al-Safi' },
      dest: { address: 'Abdoun Commercial District, Amman', lat: 31.9454, lng: 35.8830, city: 'Amman', area: 'Abdoun', name: 'Luxury Spa Distributors', distance_km: 135 },
      truck: { category: 'medium', body: 'refrigerated', cooling: 'chilled' },
      price: 880,
    },
  ];

  // Seed the 28 Audited shipments
  for (let i = 0; i < auditedShipmentsConfig.length; i++) {
    const item = auditedShipmentsConfig[i];
    const daysAgo = 88 - i * 3;
    const baseDate = new Date(Date.now() - daysAgo * 86400000);
    const feedback = ratingFeedbacks[i % ratingFeedbacks.length];

    await createSeedShipment({
      ...item,
      status: 'audited',
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
      rating: feedback,
    });
  }
  console.log(`✓ Seeded 28 audited shipments with ledger entries and bilateral ratings.`);

  // 3 Delivered Shipments (Waiting for Manufacturer Confirmation)
  console.log('Seeding 3 delivered shipments (1 for Al-Nour ready to confirm)...');
  // 1. Al-Nour Foods Co. delivered by Yousef Nasser (Ready to confirm!)
  await createSeedShipment({
    mfrId: alNourId,
    driverId: yousefId,
    status: 'delivered',
    goodsCatId: 2,
    cargoDesc: 'Chilled Artisanal Labneh & Halloumi Consignment',
    qty: 3.5,
    pickup: { address: 'Hashemiyya Industrial Area, Zarqa', lat: 32.0728, lng: 36.0880, city: 'Zarqa', area: 'Hashemiyya' },
    dest: { address: 'Al-Hashmi St, Irbid', lat: 32.5556, lng: 35.8469, city: 'Irbid', area: 'Al-Hashmi', name: 'Fadi Market Ops', distance_km: 82 },
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

  // 2. Jordan Steel delivered by Mahmoud Qudah
  await createSeedShipment({
    mfrId: steelId,
    driverId: mahmoudId,
    status: 'delivered',
    goodsCatId: 6,
    cargoDesc: 'Reinforced Steel Wire Coils & Fasteners',
    qty: 12.0,
    pickup: { address: 'King Abdullah II Industrial City, Sahab', lat: 31.8670, lng: 36.0030, city: 'Amman', area: 'Sahab' },
    dest: { address: 'Al-Marj Commercial Zone, Karak', lat: 31.1853, lng: 35.7048, city: 'Karak', area: 'Al-Marj', name: 'Bilal Contracting', distance_km: 125 },
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

  // 3. Petra Pharmaceuticals delivered by Fares Haddadin
  await createSeedShipment({
    mfrId: pharmaId,
    driverId: faresId,
    status: 'delivered',
    goodsCatId: 1,
    cargoDesc: 'Medical Consumables & Sterile Syringes',
    qty: 3.0,
    pickup: { address: 'Salt Industrial Estate, Salt', lat: 32.0392, lng: 35.7272, city: 'Salt', area: 'Industrial' },
    dest: { address: 'Abdoun Commercial District, Amman', lat: 31.9454, lng: 35.8830, city: 'Amman', area: 'Abdoun', name: 'Kareem Retail', distance_km: 36 },
    truck: { category: 'medium', body: 'closed_box' },
    price: 520,
    timestamps: {
      created_at: new Date(Date.now() - 54000000).toISOString(),
      history: {
        requested: new Date(Date.now() - 54000000).toISOString(),
        pending: new Date(Date.now() - 48000000).toISOString(),
        waiting_load: new Date(Date.now() - 30000000).toISOString(),
        in_delivery: new Date(Date.now() - 15000000).toISOString(),
        delivered: new Date(Date.now() - 1800000).toISOString(),
      },
    },
  });

  // 4 In Delivery Shipments (Active on live map moving trucks)
  console.log('Seeding 4 in-delivery shipments (live trucks on map)...');
  // 1. Heavy Steel Beams on flatbed (Hasan Tarawneh en route Sahab -> Aqaba)
  await createSeedShipment({
    mfrId: steelId,
    driverId: hasanId,
    status: 'in_delivery',
    goodsCatId: 6,
    cargoDesc: 'Long Structural Steel Girders for Port Warehouse',
    qty: 22.0,
    pickup: { address: 'King Abdullah II Industrial City, Sahab', lat: 31.8670, lng: 36.0030, city: 'Amman', area: 'Sahab' },
    dest: { address: 'Aqaba Container Terminal Yard 4', lat: 29.5320, lng: 35.0063, city: 'Aqaba', area: 'Port Area', name: 'Mahmoud Site Eng', distance_km: 320 },
    truck: { category: 'heavy', body: 'flatbed' },
    price: 2350,
    timestamps: {
      created_at: new Date(Date.now() - 25200000).toISOString(),
      history: {
        requested: new Date(Date.now() - 25200000).toISOString(),
        pending: new Date(Date.now() - 21600000).toISOString(),
        waiting_load: new Date(Date.now() - 14400000).toISOString(),
        in_delivery: new Date(Date.now() - 7200000).toISOString(),
      },
    },
  });

  // 2. Chemical Tanker (Sami Khalil en route Aqaba -> Amman)
  await createSeedShipment({
    mfrId: petroId,
    driverId: samiId,
    status: 'in_delivery',
    goodsCatId: 7,
    cargoDesc: 'High-Purity Iso-Propyl Alcohol 99% (ADR Class 3)',
    qty: 15000,
    unit: 'liter',
    pickup: { address: 'South Coast Industrial Area, Aqaba', lat: 29.5320, lng: 35.0063, city: 'Aqaba', area: 'South Coast' },
    dest: { address: 'Marka Fuel Storage Terminal, Amman', lat: 31.9800, lng: 36.0100, city: 'Amman', area: 'Marka', name: 'Ziyad Terminal Lead', distance_km: 334 },
    truck: { category: 'tanker', body: 'chemical_tanker' },
    cond: { is_hazardous: true, adr_class: '3', liquid_type: 'chemical_tanker' },
    price: 1950,
    timestamps: {
      created_at: new Date(Date.now() - 28800000).toISOString(),
      history: {
        requested: new Date(Date.now() - 28800000).toISOString(),
        pending: new Date(Date.now() - 25000000).toISOString(),
        waiting_load: new Date(Date.now() - 16000000).toISOString(),
        in_delivery: new Date(Date.now() - 8000000).toISOString(),
      },
    },
  });

  // 3. Frozen Poultry on Heavy Tractor Trailer (Ibrahim Al-Zoubi en route Amman -> Aqaba)
  await createSeedShipment({
    mfrId: pharmaId,
    driverId: ibrahimId,
    status: 'in_delivery',
    goodsCatId: 3,
    cargoDesc: 'Deep Frozen Plasma & Pharmaceutical Culture Media (-22°C)',
    qty: 14.0,
    pickup: { address: 'Salt Industrial Estate, Salt', lat: 32.0392, lng: 35.7272, city: 'Salt', area: 'Industrial' },
    dest: { address: 'Port Customs Area, Aqaba', lat: 29.5320, lng: 35.0063, city: 'Aqaba', area: 'Port Area', name: 'Aqaba Medical Hub', distance_km: 355 },
    truck: { category: 'heavy', body: 'refrigerated', cooling: 'frozen' },
    price: 2600,
    timestamps: {
      created_at: new Date(Date.now() - 18000000).toISOString(),
      history: {
        requested: new Date(Date.now() - 18000000).toISOString(),
        pending: new Date(Date.now() - 15000000).toISOString(),
        waiting_load: new Date(Date.now() - 10000000).toISOString(),
        in_delivery: new Date(Date.now() - 4000000).toISOString(),
      },
    },
  });

  // 4. Dead Sea Minerals on Heavy Tipper (Rami Shaheen en route Karak -> Amman)
  await createSeedShipment({
    mfrId: mineralsId,
    driverId: ramiId,
    status: 'in_delivery',
    goodsCatId: 5,
    cargoDesc: 'Unrefined Dead Sea Mineral Salts for Industrial Bath Preparations',
    qty: 16.0,
    pickup: { address: 'Ghor Al-Safi Potash Works Basin, Karak', lat: 31.0360, lng: 35.4850, city: 'Karak', area: 'Ghor Al-Safi' },
    dest: { address: 'Al-Qastal Industrial Zone, Amman', lat: 31.7500, lng: 35.9400, city: 'Amman', area: 'Al-Qastal', name: 'Munir Works', distance_km: 118 },
    truck: { category: 'heavy', body: 'tipper' },
    price: 1150,
    timestamps: {
      created_at: new Date(Date.now() - 14400000).toISOString(),
      history: {
        requested: new Date(Date.now() - 14400000).toISOString(),
        pending: new Date(Date.now() - 11000000).toISOString(),
        waiting_load: new Date(Date.now() - 7200000).toISOString(),
        in_delivery: new Date(Date.now() - 2500000).toISOString(),
      },
    },
  });

  // 3 Waiting Load Shipments (One assigned to Ali Mansour so he is busy!)
  console.log('Seeding 3 waiting-load shipments (Ali Mansour is busy)...');
  await createSeedShipment({
    mfrId: alNourId,
    driverId: aliId, // Ali Mansour is busy!
    status: 'waiting_load',
    goodsCatId: 2,
    cargoDesc: 'Chilled Fresh Milk Bottles (4°C)',
    qty: 3.5,
    pickup: { address: 'Hashemiyya Industrial Area, Zarqa', lat: 32.0728, lng: 36.0880, city: 'Zarqa', area: 'Hashemiyya' },
    dest: { address: 'Abdoun Commercial District, Amman', lat: 31.9454, lng: 35.8830, city: 'Amman', area: 'Abdoun', name: 'Kareem Retail', distance_km: 38 },
    truck: { category: 'medium', body: 'refrigerated', cooling: 'chilled' },
    price: 610,
    timestamps: {
      created_at: new Date(Date.now() - 14400000).toISOString(),
      history: {
        requested: new Date(Date.now() - 14400000).toISOString(),
        pending: new Date(Date.now() - 10800000).toISOString(),
        waiting_load: new Date(Date.now() - 3600000).toISOString(),
      },
    },
  });

  await createSeedShipment({
    mfrId: woodId,
    driverId: null,
    status: 'waiting_load',
    goodsCatId: 10,
    cargoDesc: 'Hotel Lobby Wooden Fixtures & Reception Desk Modules',
    qty: 4.5,
    pickup: { address: 'Marka North Industrial Zone, Amman', lat: 31.9700, lng: 35.9900, city: 'Amman', area: 'Marka' },
    dest: { address: 'Ayla Marina Village, Aqaba', lat: 29.5480, lng: 34.9850, city: 'Aqaba', area: 'Ayla', name: 'Hassan Interior', distance_km: 338 },
    truck: { category: 'heavy', body: 'closed_box' },
    price: 1600,
    timestamps: {
      created_at: new Date(Date.now() - 7200000).toISOString(),
      history: {
        requested: new Date(Date.now() - 7200000).toISOString(),
        pending: new Date(Date.now() - 3600000).toISOString(),
        waiting_load: new Date(Date.now() - 1800000).toISOString(),
      },
    },
  });

  await createSeedShipment({
    mfrId: oliveId,
    driverId: null,
    status: 'waiting_load',
    goodsCatId: 4,
    cargoDesc: 'Cold-Pressed Virgin Olive Oil in Protective Drums',
    qty: 5.0,
    pickup: { address: 'Jerash Agricultural Basin, Jerash', lat: 32.2723, lng: 35.8914, city: 'Jerash', area: 'Jerash' },
    dest: { address: 'Ali Nasouh Al-Taher St, Sweifieh', lat: 31.9560, lng: 35.8600, city: 'Amman', area: 'Sweifieh', name: 'Tareq Store Mgr', distance_km: 52 },
    truck: { category: 'medium', body: 'closed_box' },
    price: 540,
    timestamps: {
      created_at: new Date(Date.now() - 9000000).toISOString(),
      history: {
        requested: new Date(Date.now() - 9000000).toISOString(),
        pending: new Date(Date.now() - 5400000).toISOString(),
        waiting_load: new Date(Date.now() - 1800000).toISOString(),
      },
    },
  });

  // 7 Pending Shipments (Escrow paid, open for Drivers on board)
  console.log('Seeding 7 pending shipments (including Hero Driver test shipment)...');
  // 1. HERO PENDING SHIPMENT - Matches Omar Ayman Saleh (Medium Refrigerated Chilled)
  // When logged in as Omar Ayman Saleh (mohamadayman773@gmail.com), this appears at the top of the dashboard!
  // Clicking "Accept Shipment" triggers our clean popup modal without window alerts!
  await createSeedShipment({
    mfrId: alNourId,
    status: 'pending',
    goodsCatId: 2,
    cargoDesc: 'Chilled Halloumi & Fresh Labneh Consignment (4°C)',
    qty: 3.0,
    pickup: {
      address: 'Hashemiyya Industrial Area, Zarqa',
      lat: 32.0728,
      lng: 36.0880,
      city: 'Zarqa',
      area: 'Hashemiyya',
      needs_loading: true,
    },
    dest: {
      address: 'Al-Hashmi St, Irbid',
      lat: 32.5556,
      lng: 35.8469,
      city: 'Irbid',
      area: 'Al-Hashmi',
      name: 'Fadi Market Ops',
      needs_unloading: true,
      distance_km: 82,
    },
    truck: { category: 'medium', body: 'refrigerated', cooling: 'chilled' },
    price: 650,
  });

  // 2. Petra Pharmaceuticals (Amman -> Aqaba, chilled 10t, 1,850 JD)
  await createSeedShipment({
    mfrId: pharmaId,
    status: 'pending',
    goodsCatId: 2,
    cargoDesc: 'Bulk Sterile Antibiotic Vials & Syringes (Chilled 4°C)',
    qty: 8.5,
    pickup: { address: 'Salt Industrial Estate, Salt', lat: 32.0392, lng: 35.7272, city: 'Salt', area: 'Industrial' },
    dest: { address: 'Port Customs Area, Aqaba', lat: 29.5320, lng: 35.0063, city: 'Aqaba', area: 'Port Area', name: 'Aqaba Health Hub', distance_km: 355 },
    truck: { category: 'heavy', body: 'refrigerated', cooling: 'chilled' },
    price: 1850,
  });

  // 3. Jordan Steel (Sahab -> Aqaba, heavy rebar 20t, 2,400 JD)
  await createSeedShipment({
    mfrId: steelId,
    status: 'pending',
    goodsCatId: 6,
    cargoDesc: 'Heavy Structural Steel Rebar Bundles (Grade 60)',
    qty: 20.0,
    pickup: { address: 'King Abdullah II Industrial City, Sahab', lat: 31.8670, lng: 36.0030, city: 'Amman', area: 'Sahab' },
    dest: { address: 'Aqaba Container Terminal Yard 4', lat: 29.5320, lng: 35.0063, city: 'Aqaba', area: 'Port Area', name: 'Mahmoud Site Eng', distance_km: 320 },
    truck: { category: 'heavy', body: 'flatbed' },
    price: 2400,
  });

  // 4. Aqaba Petrochemicals (Aqaba -> Amman, hazardous liquid 15,000L, ADR class 3, 1,600 JD)
  await createSeedShipment({
    mfrId: petroId,
    status: 'pending',
    goodsCatId: 7,
    cargoDesc: 'Industrial Solvent & Ethanol 96% Solution',
    qty: 15000,
    unit: 'liter',
    pickup: { address: 'South Coast Industrial Area, Aqaba', lat: 29.5320, lng: 35.0063, city: 'Aqaba', area: 'South Coast' },
    dest: { address: 'Marka Fuel Storage Terminal, Amman', lat: 31.9800, lng: 36.0100, city: 'Amman', area: 'Marka', name: 'Ziyad Terminal Lead', distance_km: 334 },
    truck: { category: 'tanker', body: 'chemical_tanker' },
    cond: { is_hazardous: true, adr_class: '3', liquid_type: 'chemical_tanker' },
    price: 1600,
  });

  // 5. Al-Badia Olive Oil (Jerash -> Amman Sweifieh, olive oil 2.5t, 480 JD)
  await createSeedShipment({
    mfrId: oliveId,
    status: 'pending',
    goodsCatId: 4,
    cargoDesc: 'Cold-Pressed Extra Virgin Olive Oil Cans',
    qty: 2.5,
    pickup: { address: 'Jerash Agricultural Basin, Jerash', lat: 32.2723, lng: 35.8914, city: 'Jerash', area: 'Jerash' },
    dest: { address: 'Ali Nasouh Al-Taher St, Sweifieh', lat: 31.9560, lng: 35.8600, city: 'Amman', area: 'Sweifieh', name: 'Tareq Store Mgr', distance_km: 52 },
    truck: { category: 'medium', body: 'closed_box' },
    price: 480,
  });

  // 6. Royal Amman Furniture (Amman -> Aqaba, furniture 5.0t, 920 JD)
  await createSeedShipment({
    mfrId: woodId,
    status: 'pending',
    goodsCatId: 10,
    cargoDesc: 'Handcrafted Teak Living Room Suites & Dining Tables',
    qty: 5.0,
    pickup: { address: 'Marka North Industrial Zone, Amman', lat: 31.9700, lng: 35.9900, city: 'Amman', area: 'Marka' },
    dest: { address: 'Ayla Marina Village, Aqaba', lat: 29.5480, lng: 34.9850, city: 'Aqaba', area: 'Ayla', name: 'Hassan Interior', distance_km: 338 },
    truck: { category: 'heavy', body: 'closed_box' },
    price: 920,
  });

  // 7. Petra Pharmaceuticals (Amman -> Riyadh, international frozen 18t, 3,900 JD)
  await createSeedShipment({
    mfrId: pharmaId,
    status: 'pending',
    goodsCatId: 3,
    cargoDesc: 'Deep-Frozen Bio-Active Plasma & Enzymes (-20°C)',
    qty: 18.0,
    tripType: 'international',
    destCountry: 'Saudi Arabia',
    pickup: { address: 'Salt Industrial Estate, Salt', lat: 32.0392, lng: 35.7272, city: 'Salt', area: 'Industrial' },
    dest: { address: 'Al-Sulay Logistics District, Riyadh', lat: 24.7136, lng: 46.6753, city: 'Riyadh', area: 'Al-Sulay', name: 'Riyadh Medical Logistics', distance_km: 1480 },
    truck: { category: 'heavy', body: 'refrigerated', cooling: 'frozen' },
    cond: { customs_enabled: true, customs_declaration_number: 'CD-2026-48821', customs_permit_type: 'export' },
    price: 3900,
  });

  // 3 Requested Shipments (Unpaid, waiting for manufacturer payment)
  console.log('Seeding 3 requested shipments (1 for Al-Nour ready to pay/edit)...');
  // 1. Al-Nour Foods Co. (Allows manufacturer to test Pay / Edit / Delete)
  await createSeedShipment({
    mfrId: alNourId,
    status: 'requested',
    goodsCatId: 1,
    cargoDesc: 'Dry Food Ingredients & Pasta Cartons (Unpaid Escrow Demo)',
    qty: 5.5,
    pickup: { address: 'Hashemiyya Industrial Area, Zarqa', lat: 32.0728, lng: 36.0880, city: 'Zarqa', area: 'Hashemiyya' },
    dest: { address: 'Abdoun Commercial District, Amman', lat: 31.9454, lng: 35.8830, city: 'Amman', area: 'Abdoun', name: 'Kareem Retail', distance_km: 38 },
    truck: { category: 'medium', body: 'closed_box' },
    price: 510,
  });

  // 2. Jordan National Steel
  await createSeedShipment({
    mfrId: steelId,
    status: 'requested',
    goodsCatId: 6,
    cargoDesc: 'High-Tensile Wire Mesh Panels for Flooring Concrete',
    qty: 12.0,
    pickup: { address: 'King Abdullah II Industrial City, Sahab', lat: 31.8670, lng: 36.0030, city: 'Amman', area: 'Sahab' },
    dest: { address: 'Cyber City Industrial Zone, Irbid', lat: 32.4950, lng: 35.9800, city: 'Irbid', area: 'Cyber City', name: 'Irbid Contractors', distance_km: 98 },
    truck: { category: 'heavy', body: 'closed_box' },
    price: 820,
  });

  // 3. Dead Sea Salts & Minerals
  await createSeedShipment({
    mfrId: mineralsId,
    status: 'requested',
    goodsCatId: 5,
    cargoDesc: 'Refined Salt Crystals for Water Softening Treatment',
    qty: 15.0,
    pickup: { address: 'Ghor Al-Safi Potash Works Basin, Karak', lat: 31.0360, lng: 35.4850, city: 'Karak', area: 'Ghor Al-Safi' },
    dest: { address: 'Al-Qastal Industrial Zone, Amman', lat: 31.7500, lng: 35.9400, city: 'Amman', area: 'Al-Qastal', name: 'Munir Works', distance_km: 118 },
    truck: { category: 'heavy', body: 'tipper' },
    price: 1050,
  });

  // Set sequence to 126 so the first live shipment created in demo is MSR-000127!
  await pool.query(`SELECT setval('ticket_seq', 126, true)`);

  // 5. Seed Notifications & Activity Log for all 4 user roles
  console.log('Seeding notifications & activity logs...');
  // Notifications for Admin (4 pending registration alerts)
  await pool.query(
    `INSERT INTO notifications (user_id, type, params, link, is_read, created_at)
     VALUES
     ($1, 'registration_submitted', '{"name":"Modern Packaging Solutions Co.","role":"manufacturer"}', '/admin/approvals', false, now() - interval '2 hours'),
     ($1, 'registration_submitted', '{"name":"Arabian Chemical Compounds LLC","role":"manufacturer"}', '/admin/approvals', false, now() - interval '5 hours'),
     ($1, 'registration_submitted', '{"name":"Majed Rawashdeh","role":"driver"}', '/admin/approvals', false, now() - interval '1 day'),
     ($1, 'registration_submitted', '{"name":"Khaled Al-Majali","role":"driver"}', '/admin/approvals', false, now() - interval '1 day'),
     ($1, 'shipment_audited', '{"ticket_number":"MSR-000105","amount":"1450.000"}', '/admin/tickets', true, now() - interval '3 days')`,
    [adminId]
  );

  // Notifications for Escrow
  await pool.query(
    `INSERT INTO notifications (user_id, type, params, link, is_read, created_at)
     VALUES
     ($1, 'escrow_deposit_received', '{"ticket_number":"MSR-000120","amount":"650.000"}', '/escrow', false, now() - interval '1 hour'),
     ($1, 'delivery_confirmed', '{"ticket_number":"MSR-000107","mfr_name":"Al-Nour Foods Co."}', '/escrow', false, now() - interval '3 hours'),
     ($1, 'payout_released', '{"ticket_number":"MSR-000104","amount":"611.000"}', '/escrow/ledger', true, now() - interval '2 days')`,
    [escrowId]
  );

  // Notifications for Hero Manufacturer (mohamadabudraiea@gmail.com)
  await pool.query(
    `INSERT INTO notifications (user_id, type, params, link, is_read, created_at)
     VALUES
     ($1, 'shipment_delivered', '{"ticket_number":"MSR-000107","driver_name":"Yousef Nasser"}', '/manufacturer/tickets', false, now() - interval '1 hour'),
     ($1, 'driver_assigned', '{"ticket_number":"MSR-000119","driver_name":"Ali Mansour Al-Balawi"}', '/manufacturer/tickets', false, now() - interval '4 hours'),
     ($1, 'audit_completed', '{"ticket_number":"MSR-000105","amount":"1450.000"}', '/manufacturer/tickets', true, now() - interval '3 days')`,
    [alNourId]
  );

  // Notifications for Hero Driver (mohamadayman773@gmail.com)
  await pool.query(
    `INSERT INTO notifications (user_id, type, params, link, is_read, created_at)
     VALUES
     ($1, 'new_matching_shipment', '{"ticket_number":"MSR-000120","origin":"Zarqa","destination":"Irbid"}', '/driver', false, now() - interval '30 minutes'),
     ($1, 'payout_transferred', '{"ticket_number":"MSR-000105","amount":"1363.000"}', '/driver/earnings', true, now() - interval '3 days'),
     ($1, 'rating_received', '{"stars":5,"comment":"Punctual arrival at Zarqa plant. Maintained cold-chain integrity from start to finish."}', '/driver/me', true, now() - interval '5 days')`,
    [heroDriverId]
  );

  // Activity Logs
  await pool.query(
    `INSERT INTO activity_log (type, actor_id, params, created_at)
     VALUES
     ('system_initialized', $1, '{"version":"1.0.0","environment":"production"}', now() - interval '90 days'),
     ('ticket_created', $2, '{"ticket_number":"MSR-000120","price":"650.000"}', now() - interval '2 hours'),
     ('payment_received', $3, '{"ticket_number":"MSR-000120","amount":"650.000"}', now() - interval '1 hour'),
     ('driver_assigned', $4, '{"ticket_number":"MSR-000119","plate":"44-55432"}', now() - interval '4 hours'),
     ('shipment_delivered', $4, '{"ticket_number":"MSR-000107","pod":"digital_signature"}', now() - interval '3 hours')`,
    [adminId, alNourId, escrowId, aliId]
  );

  console.log('✓ Seeded 48 shipments (MSR-000079 ... MSR-000126).');
  console.log('✓ Ticket sequence reset: Next live shipment will be MSR-000127.');
  console.log('--- Clean & Rich Demo Seed Completed Successfully! ---');
}
