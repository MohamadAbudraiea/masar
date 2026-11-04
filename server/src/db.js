import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

// Enforce Asia/Amman time zone on every connection
pool.on('connect', (client) => {
  client.query("SET TIME ZONE 'Asia/Amman'").catch((err) => {
    console.error("Error setting time zone on connection:", err.message);
  });
});

/**
 * Standard parameterized query runner.
 */
export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // Can log query time if in debug mode
  return res;
}

/**
 * Transaction helper: tx(async (client) => { ... })
 * Automatically manages BEGIN, COMMIT, and ROLLBACK.
 */
export async function tx(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

