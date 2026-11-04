import 'dotenv/config';
import { pool } from '../../src/db.js';
import { goodsCategories } from './goodsCategories.js';
import { categoryNames, typeNames, bodyNames, gross, truckRows } from './truckTypes.js';
import { seedDemoAccounts } from './demoAccounts.js';

export async function seedReferenceData() {
  console.log('Seeding reference data...');

  // 1. Goods Categories
  for (const cat of goodsCategories) {
    await pool.query(
      `INSERT INTO goods_categories (id, code, name_en, name_ar, sort)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         code = EXCLUDED.code,
         name_en = EXCLUDED.name_en,
         name_ar = EXCLUDED.name_ar,
         sort = EXCLUDED.sort`,
      [cat.id, cat.code, cat.name_en, cat.name_ar, cat.id]
    );
  }
  console.log(`✓ Seeded ${goodsCategories.length} goods categories.`);

  // 2. Truck Types
  for (const row of truckRows) {
    const [category, type_code, body_code, payload_min, payload_max, unit, license_class] = row;
    const is_refrigerated = body_code === 'refrigerated';
    const is_service_vehicle = type_code === 'heavy_service';

    const type_name_en = typeNames[type_code]?.en || type_code;
    const type_name_ar = typeNames[type_code]?.ar || type_code;
    const body_name_en = bodyNames[body_code]?.en || body_code;
    const body_name_ar = bodyNames[body_code]?.ar || body_code;

    // Gross weight selection rule
    let grossConfig;
    if (category === 'light') {
      grossConfig = gross.light;
    } else if (category === 'medium') {
      grossConfig = gross.medium;
    } else if (type_code === 'rigid') {
      grossConfig = gross.rigid;
    } else if (type_code === 'tractor_trailer') {
      grossConfig = gross.tractor_trailer;
    } else {
      // heavy_service and all tankers
      grossConfig = gross.by_vehicle;
    }

    await pool.query(
      `INSERT INTO truck_types (
         category, type_code, type_name_en, type_name_ar,
         body_code, body_name_en, body_name_ar, unit,
         payload_min, payload_max, license_class,
         is_refrigerated, is_service_vehicle,
         gross_weight_mode, gross_weight_options
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (type_code, body_code) DO UPDATE SET
         category = EXCLUDED.category,
         type_name_en = EXCLUDED.type_name_en,
         type_name_ar = EXCLUDED.type_name_ar,
         body_name_en = EXCLUDED.body_name_en,
         body_name_ar = EXCLUDED.body_name_ar,
         unit = EXCLUDED.unit,
         payload_min = EXCLUDED.payload_min,
         payload_max = EXCLUDED.payload_max,
         license_class = EXCLUDED.license_class,
         is_refrigerated = EXCLUDED.is_refrigerated,
         is_service_vehicle = EXCLUDED.is_service_vehicle,
         gross_weight_mode = EXCLUDED.gross_weight_mode,
         gross_weight_options = EXCLUDED.gross_weight_options`,
      [
        category,
        type_code,
        type_name_en,
        type_name_ar,
        body_code,
        body_name_en,
        body_name_ar,
        unit,
        payload_min,
        payload_max,
        license_class,
        is_refrigerated,
        is_service_vehicle,
        grossConfig.mode,
        JSON.stringify(grossConfig.options),
      ]
    );
  }
  console.log(`✓ Seeded ${truckRows.length} truck catalog configurations.`);
  // 3. Demo Accounts
  await seedDemoAccounts();
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('index.js')) {
  try {
    await seedReferenceData();
    console.log('Seeding finished successfully.');
    await pool.end();
  } catch (err) {
    console.error('Seeding failed:', err);
    await pool.end();
    process.exit(1);
  }
}

