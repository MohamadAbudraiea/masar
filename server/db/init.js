import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDb() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  console.log(`Executing schema DDL from ${schemaPath}...`);
  const sql = fs.readFileSync(schemaPath, 'utf8');

  try {
    await pool.query(sql);
    console.log('✓ Database schema initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize database schema:', err);
    throw err;
  }
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('init.js')) {
  try {
    await initDb();
    await pool.end();
  } catch (err) {
    await pool.end();
    process.exit(1);
  }
}

