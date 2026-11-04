import bcrypt from 'bcryptjs';
import { pool } from '../../src/db.js';
import { config } from '../../src/config.js';

export async function seedDemoAccounts() {
  console.log('Seeding demo accounts...');

  const passwordHash = await bcrypt.hash('Masar@123', 10);

  // 1. Admin
  const adminEmail = config.demo.adminEmail || 'admin@masar.demo';
  const adminRes = await pool.query(
    `INSERT INTO users (role, name, email, phone, password_hash, status, language, timezone, email_notifications, approved_at)
     VALUES ('admin', 'Lina Qasem (Masar Admin)', $1, '+962790000000', $2, 'approved', 'en', 'Asia/Amman', true, now())
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'approved'
     RETURNING id`,
    [adminEmail, passwordHash]
  );
  const adminId = adminRes.rows[0].id;

  // 2. Escrow
  const escrowEmail = config.demo.escrowEmail || 'escrow@safepay.demo';
  const escrowRes = await pool.query(
    `INSERT INTO users (role, name, email, phone, password_hash, status, language, timezone, email_notifications, approved_at)
     VALUES ('escrow', 'SafePay Escrow', $1, '+962790000099', $2, 'approved', 'en', 'Asia/Amman', true, now())
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'approved'
     RETURNING id`,
    [escrowEmail, passwordHash]
  );
  const escrowId = escrowRes.rows[0].id;

  // 3. Manufacturer (Al-Nour Foods Co.)
  const mfrRes = await pool.query(
    `INSERT INTO users (role, name, email, phone, password_hash, status, language, timezone, email_notifications, approved_at)
     VALUES ('manufacturer', 'Al-Nour Foods Co.', 'khaled@alnour.demo', '+962790000001', $1, 'approved', 'en', 'Asia/Amman', true, now())
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'approved'
     RETURNING id`,
    [passwordHash]
  );
  const mfrId = mfrRes.rows[0].id;

  // Manufacturer profile
  await pool.query(
    `INSERT INTO manufacturer_profiles (user_id, contact_person, phones, emails, commercial_registration_key, professions_license_key)
     VALUES ($1, 'Khaled Haddad', ARRAY['+962790000001'], ARRAY['khaled@alnour.demo'], 'demo/cr_alnour.pdf', 'demo/pl_alnour.pdf')
     ON CONFLICT (user_id) DO UPDATE SET
       contact_person = EXCLUDED.contact_person,
       phones = EXCLUDED.phones,
       emails = EXCLUDED.emails`,
    [mfrId]
  );

  // Goods categories for Al-Nour (Dry=1, Chilled=2, Frozen=3)
  for (const catId of [1, 2, 3]) {
    await pool.query(
      `INSERT INTO manufacturer_goods_categories (manufacturer_id, goods_category_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [mfrId, catId]
    );
  }

  // Default pickup location for Al-Nour (Zarqa Industrial)
  await pool.query(
    `INSERT INTO locations (owner_id, kind, label, address, lat, lng, city, area, is_default)
     VALUES ($1, 'pickup', 'Al-Nour Factory (Zarqa)', 'Hashemiyya Industrial Area, Zarqa', 32.0728, 36.0880, 'Zarqa', 'Hashemiyya Industrial', true)
     ON CONFLICT DO NOTHING`,
    [mfrId]
  );

  // 4. Driver (Omar Saleh - Demo Hero, free)
  const driverRes = await pool.query(
    `INSERT INTO users (role, name, email, phone, password_hash, status, language, timezone, email_notifications, approved_at)
     VALUES ('driver', 'Omar Saleh', 'omar@driver.demo', '+962790010001', $1, 'approved', 'ar', 'Asia/Amman', true, now())
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'approved'
     RETURNING id`,
    [passwordHash]
  );
  const driverId = driverRes.rows[0].id;

  // Driver profile
  await pool.query(
    `INSERT INTO driver_profiles (user_id, scope, license_class, iban, cliq_alias, id_doc_key, license_doc_key)
     VALUES ($1, 'internal', 4, 'JO94CBJO0010000000000131000001', 'OMAR_MSR', 'demo/id_omar.pdf', 'demo/lic_omar.pdf')
     ON CONFLICT (user_id) DO UPDATE SET
       scope = EXCLUDED.scope,
       license_class = EXCLUDED.license_class,
       iban = EXCLUDED.iban,
       cliq_alias = EXCLUDED.cliq_alias`,
    [driverId]
  );

  // Find truck_type_id for medium long_chassis refrigerated
  const ttRes = await pool.query(
    `SELECT id FROM truck_types WHERE category = 'medium' AND type_code = 'long_chassis' AND body_code = 'refrigerated' LIMIT 1`
  );
  const truckTypeId = ttRes.rows[0]?.id;

  if (truckTypeId) {
    await pool.query(
      `INSERT INTO trucks (driver_id, truck_type_id, plate_number, cooling, adr_certified, gross_weight_code, license_doc_key, photo_keys)
       VALUES ($1, $2, '44-12345', 'chilled', false, 'medium_2_5_7_5', 'demo/truck_lic_omar.pdf', ARRAY['demo/truck_photo_1.jpg'])
       ON CONFLICT (driver_id) DO UPDATE SET
         truck_type_id = EXCLUDED.truck_type_id,
         plate_number = EXCLUDED.plate_number,
         cooling = EXCLUDED.cooling`,
      [driverId, truckTypeId]
    );
  }

  console.log('✓ Seeded core demo accounts (Admin, Escrow, Manufacturer, Driver).');
}

