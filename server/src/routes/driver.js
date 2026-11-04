import express from 'express';
import { query } from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { checkDriverMatch } from '../services/matching.js';
import {
  serializeTicketForDriverUnaccepted,
  serializeTicketForDriverAssigned,
} from '../serializers/ticket.js';
import { fetchTicketWithDetails } from './tickets.js';

const router = express.Router();
router.use(auth);
router.use(requireRole('driver'));

/**
 * Helper to get driver's full profile and truck data.
 */
async function getDriverDetails(driverId) {
  const res = await query(
    `SELECT d.user_id, d.scope, u.status, u.name, u.phone,
            t.plate_number, t.cooling, t.adr_certified, t.gross_weight_code,
            tt.category AS truck_category, tt.body_code, tt.unit, tt.payload_max
     FROM driver_profiles d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN trucks t ON t.driver_id = d.user_id
     LEFT JOIN truck_types tt ON tt.id = t.truck_type_id
     WHERE d.user_id = $1`,
    [driverId]
  );
  return res.rows[0] || null;
}

/**
 * GET /api/driver/available
 * Returns pending shipments matching the driver.
 * Driver sees ONLY earnings and broad locations (city/area).
 * Never reveals price, fees, exact addresses, or manufacturer until accepted.
 */
router.get('/available', async (req, res, next) => {
  try {
    const driver = await getDriverDetails(req.user.id);
    if (!driver || !driver.truck_category) {
      return res.json({ items: [], total: 0 });
    }

    // Check if driver has an active shipment
    const activeCheck = await query(
      `SELECT 1 FROM tickets WHERE driver_id = $1 AND status IN ('waiting_load', 'in_delivery')`,
      [req.user.id]
    );
    const hasActiveShipment = activeCheck.rows.length > 0;

    const { city, from, to, sort = 'pickup_at' } = req.query;

    const conditions = [`t.status = 'pending'`];
    const params = [];

    if (city) {
      params.push(`%${city.trim()}%`);
      conditions.push(`(t.pickup_city ILIKE $${params.length} OR t.dest_city ILIKE $${params.length})`);
    }

    if (from) {
      params.push(from);
      conditions.push(`t.pickup_at >= $${params.length}`);
    }

    if (to) {
      params.push(to);
      conditions.push(`t.pickup_at <= $${params.length}`);
    }

    let orderBy = 't.pickup_at ASC';
    if (sort === 'earnings') {
      orderBy = 't.driver_net DESC';
    }

    const sql = `
      SELECT t.*,
             gc.name_en AS goods_category_name_en,
             gc.name_ar AS goods_category_name_ar
      FROM tickets t
      LEFT JOIN goods_categories gc ON gc.id = t.goods_category_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy}
    `;

    const ticketsRes = await query(sql, params);

    const driverObj = {
      status: driver.status,
      scope: driver.scope,
      has_active_shipment: hasActiveShipment,
      truck: {
        category: driver.truck_category,
        body_code: driver.body_code,
        cooling: driver.cooling,
        payload_max: driver.payload_max,
        unit: driver.unit,
        adr_certified: driver.adr_certified,
      },
    };

    const matchingItems = [];
    for (const t of ticketsRes.rows) {
      const match = checkDriverMatch(t, driverObj);
      if (match.matches) {
        t.goods_category_name = t.goods_category_name_en;
        const serialized = serializeTicketForDriverUnaccepted(t, {
          canAccept: match.canAccept,
          blockedReason: match.blockedReason || (hasActiveShipment ? 'DRIVER_BUSY' : null),
        });
        matchingItems.push(serialized);
      }
    }

    res.json({ items: matchingItems, total: matchingItems.length });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/driver/active
 * Returns the driver's currently active shipment (in 'waiting_load' or 'in_delivery'), or null.
 */
router.get('/active', async (req, res, next) => {
  try {
    const activeRes = await query(
      `SELECT id FROM tickets
       WHERE driver_id = $1 AND status IN ('waiting_load', 'in_delivery')
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (activeRes.rows.length === 0) {
      return res.json(null);
    }

    const ticket = await fetchTicketWithDetails(activeRes.rows[0].id);
    if (!ticket) {
      return res.json(null);
    }

    const shaped = {
      ...ticket,
      goods_category_name: ticket.goods_category_name_en,
      truck_type_name: ticket.truck_type_name_en,
      truck_body_name: ticket.truck_body_name_en,
      truck_photo_urls: ticket.truck_photo_keys || [],
    };

    res.json(serializeTicketForDriverAssigned(shaped));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/driver/history
 * Returns the driver's past shipments ('delivered' and 'audited').
 */
router.get('/history', async (req, res, next) => {
  try {
    const { status, city, from, to, page = 1, page_size = 20 } = req.query;

    const conditions = [`t.driver_id = $1`];
    const params = [req.user.id];

    if (status) {
      const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
      params.push(statuses);
      conditions.push(`t.status = ANY($${params.length})`);
    } else {
      conditions.push(`t.status IN ('delivered', 'audited')`);
    }

    if (city) {
      params.push(`%${city.trim()}%`);
      conditions.push(`(t.pickup_city ILIKE $${params.length} OR t.dest_city ILIKE $${params.length})`);
    }

    if (from) {
      params.push(from);
      conditions.push(`t.created_at >= $${params.length}`);
    }

    if (to) {
      params.push(to);
      conditions.push(`t.created_at <= $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await query(`SELECT COUNT(*) FROM tickets t ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const limit = Math.max(1, Math.min(100, parseInt(page_size, 10) || 20));
    const offset = Math.max(0, ((parseInt(page, 10) || 1) - 1) * limit);

    const listSql = `
      SELECT t.id
      FROM tickets t
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const listRes = await query(listSql, params);

    const items = [];
    for (const row of listRes.rows) {
      const full = await fetchTicketWithDetails(row.id);
      if (full) {
        const shaped = {
          ...full,
          goods_category_name: full.goods_category_name_en,
          truck_type_name: full.truck_type_name_en,
          truck_body_name: full.truck_body_name_en,
          truck_photo_urls: full.truck_photo_keys || [],
        };
        items.push(serializeTicketForDriverAssigned(shaped));
      }
    }

    res.json({
      items,
      total,
      page: parseInt(page, 10) || 1,
      page_size: limit,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

