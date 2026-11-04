import express from 'express';
import { query } from '../db.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();
router.use(auth);

/**
 * GET /api/search?q=
 * Role-scoped global search across tickets, manufacturers, and drivers (max 5 each)
 */
router.get('/', async (req, res, next) => {
  try {
    const q = req.query.q ? req.query.q.trim() : '';
    if (!q) {
      return res.json({ tickets: [], manufacturers: [], drivers: [] });
    }

    const pattern = `%${q}%`;
    const userRole = req.user.role;
    const userId = req.user.id;

    let tickets = [];
    let manufacturers = [];
    let drivers = [];

    if (userRole === 'admin' || userRole === 'escrow') {
      // 1. All Tickets
      const tRes = await query(
        `SELECT id, ticket_number, status, price, pickup_city, dest_city, created_at
         FROM tickets
         WHERE ticket_number ILIKE $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [pattern]
      );
      tickets = tRes.rows;

      // 2. All Manufacturers
      const mRes = await query(
        `SELECT id, name, phone, email, status
         FROM users
         WHERE role = 'manufacturer' AND (name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1)
         ORDER BY name ASC
         LIMIT 5`,
        [pattern]
      );
      manufacturers = mRes.rows;

      // 3. All Drivers
      const dRes = await query(
        `SELECT u.id, u.name, u.phone, u.email, u.status, trk.plate_number
         FROM users u
         LEFT JOIN trucks trk ON trk.driver_id = u.id
         WHERE u.role = 'driver' AND (u.name ILIKE $1 OR u.phone ILIKE $1 OR u.email ILIKE $1 OR trk.plate_number ILIKE $1)
         ORDER BY u.name ASC
         LIMIT 5`,
        [pattern]
      );
      drivers = dRes.rows;
    } else if (userRole === 'manufacturer') {
      // 1. Own Tickets only
      const tRes = await query(
        `SELECT id, ticket_number, status, price, pickup_city, dest_city, created_at
         FROM tickets
         WHERE manufacturer_id = $1 AND ticket_number ILIKE $2
         ORDER BY created_at DESC
         LIMIT 5`,
        [userId, pattern]
      );
      tickets = tRes.rows;

      // 2. Drivers who have worked on his shipments
      const dRes = await query(
        `SELECT DISTINCT d.id, d.name, d.phone, trk.plate_number
         FROM tickets t
         JOIN users d ON d.id = t.driver_id
         LEFT JOIN trucks trk ON trk.driver_id = d.id
         WHERE t.manufacturer_id = $1 AND (d.name ILIKE $2 OR d.phone ILIKE $2 OR trk.plate_number ILIKE $2)
         LIMIT 5`,
        [userId, pattern]
      );
      drivers = dRes.rows;
    } else if (userRole === 'driver') {
      // 1. Own Assigned Tickets
      const tRes = await query(
        `SELECT id, ticket_number, status, driver_net AS earnings, pickup_city, dest_city, created_at
         FROM tickets
         WHERE driver_id = $1 AND ticket_number ILIKE $2
         ORDER BY created_at DESC
         LIMIT 5`,
        [userId, pattern]
      );
      tickets = tRes.rows;

      // 2. Manufacturers of accepted shipments
      const mRes = await query(
        `SELECT DISTINCT m.id, m.name, m.phone
         FROM tickets t
         JOIN users m ON m.id = t.manufacturer_id
         WHERE t.driver_id = $1 AND (m.name ILIKE $2 OR m.phone ILIKE $2)
         LIMIT 5`,
        [userId, pattern]
      );
      manufacturers = mRes.rows;
    }

    res.json({
      tickets,
      manufacturers,
      drivers,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

