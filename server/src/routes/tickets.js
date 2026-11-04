import express from 'express';
import { query, tx } from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { computeSplit } from '../services/money.js';
import { calculateRoute, reverseGeocode } from '../services/geo.js';
import { checkDriverMatch } from '../services/matching.js';
import { serializeTicket, computeArrival } from '../serializers/ticket.js';
import { notify, createNotification, logActivity } from '../services/notifications.js';
import { sendCsvResponse } from '../services/csv.js';
import { generateTicketPdf } from '../services/pdf.js';

const router = express.Router();
router.use(auth);

/**
 * Helper to fetch a ticket by ID with all joined entities needed for serializers.
 */
export async function fetchTicketWithDetails(ticketId, clientOrPool = null) {
  const runner = clientOrPool?.query ? clientOrPool : { query };

  const sql = `
    SELECT
      t.*,
      gc.name_en AS goods_category_name_en,
      gc.name_ar AS goods_category_name_ar,
      m.name AS manufacturer_name,
      m.phone AS manufacturer_phone,
      m_stats.avg_stars AS manufacturer_rating,
      m_stats.ratings_count AS manufacturer_ratings_count,
      d.name AS driver_name,
      d.phone AS driver_phone,
      dp.iban AS driver_iban,
      dp.cliq_alias AS driver_cliq_alias,
      d_stats.avg_stars AS driver_rating,
      d_stats.ratings_count AS driver_ratings_count,
      (
        SELECT COUNT(*)::int
        FROM tickets dt
        WHERE dt.driver_id = t.driver_id AND dt.status IN ('delivered', 'audited')
      ) AS driver_completed_count,
      trk.plate_number AS truck_plate_number,
      trk.photo_keys AS truck_photo_keys,
      tt.type_name_en AS truck_type_name_en,
      tt.type_name_ar AS truck_type_name_ar,
      tt.body_name_en AS truck_body_name_en,
      tt.body_name_ar AS truck_body_name_ar
    FROM tickets t
    JOIN users m ON m.id = t.manufacturer_id
    LEFT JOIN goods_categories gc ON gc.id = t.goods_category_id
    LEFT JOIN users d ON d.id = t.driver_id
    LEFT JOIN driver_profiles dp ON dp.user_id = t.driver_id
    LEFT JOIN trucks trk ON trk.driver_id = t.driver_id
    LEFT JOIN truck_types tt ON tt.id = trk.truck_type_id
    LEFT JOIN user_rating_stats m_stats ON m_stats.user_id = t.manufacturer_id
    LEFT JOIN user_rating_stats d_stats ON d_stats.user_id = t.driver_id
    WHERE t.id = $1
  `;

  const res = await runner.query(sql, [ticketId]);
  if (res.rows.length === 0) return null;

  const row = res.rows[0];

  // Fetch ledger entries for escrow/admin
  const ledgerRes = await runner.query(
    `SELECT id, entry_type, amount, party_user_id, details, created_at
     FROM ledger_entries
     WHERE ticket_id = $1
     ORDER BY created_at ASC`,
    [ticketId]
  );
  row.ledger_entries = ledgerRes.rows;

  // Fetch ratings
  const ratingsRes = await runner.query(
    `SELECT from_user_id, to_user_id, stars, comment, created_at
     FROM ratings
     WHERE ticket_id = $1`,
    [ticketId]
  );
  row.ratings = ratingsRes.rows;

  return row;
}

/**
 * Format ticket row for serialization.
 */
function shapeTicketRow(row, currentUserId) {
  const mineRating = row.ratings?.find((r) => r.from_user_id === currentUserId);
  const theirsRating = row.ratings?.find((r) => r.to_user_id === currentUserId);

  return {
    ...row,
    goods_category_name: row.goods_category_name_en,
    truck_type_name: row.truck_type_name_en,
    truck_body_name: row.truck_body_name_en,
    truck_photo_urls: row.truck_photo_keys || [],
    rating: row.ratings?.length
      ? {
        mine: mineRating ? { stars: mineRating.stars, comment: mineRating.comment } : null,
        theirs: theirsRating ? { stars: theirsRating.stars, comment: theirsRating.comment } : null,
      }
      : null,
  };
}

/**
 * GET /api/tickets
 * Role-scoped list with filter params:
 * q, status, from, to, date_field, date, city, goods_category_id, trip_type, page, page_size
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      q,
      status,
      from,
      to,
      date_field = 'created_at',
      date,
      city,
      goods_category_id,
      trip_type,
      page = 1,
      page_size = 20,
    } = req.query;

    const allowedDateFields = ['created_at', 'pickup_at'];
    const chosenDateField = allowedDateFields.includes(date_field) ? date_field : 'created_at';

    const conditions = [];
    const params = [];

    // Role Scoping
    if (req.user.role === 'manufacturer') {
      params.push(req.user.id);
      conditions.push(`t.manufacturer_id = $${params.length}`);
    } else if (req.user.role === 'driver') {
      params.push(req.user.id);
      conditions.push(`t.driver_id = $${params.length}`);
    } else if (!['admin', 'escrow'].includes(req.user.role)) {
      throw new AppError('FORBIDDEN', 'Access denied', 403);
    }

    // Status filter
    if (status) {
      const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
      if (statuses.length > 0) {
        params.push(statuses);
        conditions.push(`t.status = ANY($${params.length})`);
      }
    }

    // Search query (ticket_number)
    if (q) {
      params.push(`%${q.trim()}%`);
      conditions.push(`t.ticket_number ILIKE $${params.length}`);
    }

    // Date filters
    if (date) {
      params.push(date);
      conditions.push(`DATE(t.${chosenDateField} AT TIME ZONE 'Asia/Amman') = $${params.length}::date`);
    } else {
      if (from) {
        params.push(from);
        conditions.push(`t.${chosenDateField} >= $${params.length}`);
      }
      if (to) {
        params.push(to);
        conditions.push(`t.${chosenDateField} <= $${params.length}`);
      }
    }

    // City filter
    if (city) {
      params.push(`%${city.trim()}%`);
      conditions.push(`(t.pickup_city ILIKE $${params.length} OR t.dest_city ILIKE $${params.length})`);
    }

    if (goods_category_id) {
      params.push(Number(goods_category_id));
      conditions.push(`t.goods_category_id = $${params.length}`);
    }

    if (trip_type) {
      params.push(trip_type);
      conditions.push(`t.trip_type = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM tickets t ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const limit = Math.max(1, Math.min(100, parseInt(page_size, 10) || 20));
    const offset = Math.max(0, ((parseInt(page, 10) || 1) - 1) * limit);

    const listSql = `
      SELECT
        t.*,
        gc.name_en AS goods_category_name_en,
        gc.name_ar AS goods_category_name_ar,
        m.name AS manufacturer_name,
        m.phone AS manufacturer_phone,
        d.name AS driver_name,
        d.phone AS driver_phone,
        trk.plate_number AS truck_plate_number,
        tt.type_name_en AS truck_type_name_en,
        tt.body_name_en AS truck_body_name_en
      FROM tickets t
      JOIN users m ON m.id = t.manufacturer_id
      LEFT JOIN goods_categories gc ON gc.id = t.goods_category_id
      LEFT JOIN users d ON d.id = t.driver_id
      LEFT JOIN trucks trk ON trk.driver_id = t.driver_id
      LEFT JOIN truck_types tt ON tt.id = trk.truck_type_id
      ${whereClause}
      ORDER BY t.created_at DESC
      ${req.query.format === 'csv' ? '' : `LIMIT ${limit} OFFSET ${offset}`}
    `;

    const listRes = await query(listSql, params);

    const items = listRes.rows.map((row) => {
      const shaped = shapeTicketRow(row, req.user.id);
      return serializeTicket(shaped, req.user.role, {
        isAssigned: row.driver_id === req.user.id,
      });
    });

    if (req.query.format === 'csv') {
      let columns;
      if (req.user.role === 'manufacturer') {
        columns = [
          { key: 'ticket_number', label: 'Shipment Number' },
          { key: 'status', label: 'Status' },
          { key: 'pickup_city', label: 'Pickup City', format: (val, r) => r.pickup?.city || r.pickup_city || '' },
          { key: 'dest_city', label: 'Destination City', format: (val, r) => r.dest?.city || r.dest_city || '' },
          { key: 'pickup_at', label: 'Pickup Time' },
          { key: 'driver_name', label: 'Driver', format: (val, r) => r.driver?.name || '' },
          { key: 'price', label: 'Price (JD)' },
          { key: 'created_at', label: 'Created At' },
        ];
      } else if (req.user.role === 'driver') {
        columns = [
          { key: 'ticket_number', label: 'Shipment Number' },
          { key: 'status', label: 'Status' },
          { key: 'pickup_city', label: 'Pickup City', format: (val, r) => r.pickup?.city || r.pickup_city || '' },
          { key: 'dest_city', label: 'Destination City', format: (val, r) => r.dest?.city || r.dest_city || '' },
          { key: 'pickup_at', label: 'Pickup Time' },
          { key: 'earnings', label: 'Earnings (JD)' },
          { key: 'created_at', label: 'Created At' },
        ];
      } else {
        // Admin / Escrow
        columns = [
          { key: 'ticket_number', label: 'Shipment Number' },
          { key: 'status', label: 'Status' },
          { key: 'manufacturer_name', label: 'Manufacturer', format: (val, r) => r.manufacturer?.name || '' },
          { key: 'driver_name', label: 'Driver', format: (val, r) => r.driver?.name || '' },
          { key: 'pickup_city', label: 'Pickup City', format: (val, r) => r.pickup?.city || r.pickup_city || '' },
          { key: 'dest_city', label: 'Destination City', format: (val, r) => r.dest?.city || r.dest_city || '' },
          { key: 'pickup_at', label: 'Pickup Time' },
          { key: 'price', label: 'Price (JD)' },
          { key: 'escrow_fee', label: 'Escrow Fee (JD)' },
          { key: 'masar_fee', label: 'Masar Fee (JD)' },
          { key: 'driver_net', label: 'Driver Net (JD)' },
          { key: 'created_at', label: 'Created At' },
        ];
      }
      return sendCsvResponse(res, `masar-shipments-${Date.now()}.csv`, items, columns);
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

/**
 * POST /api/tickets
 * Creates a new shipment. Status: 'requested'.
 * If body.pay_now is true, runs pay immediately (status -> 'pending').
 */
router.post('/', requireRole('manufacturer'), async (req, res, next) => {
  try {
    const {
      pickup_at,
      pickup = {},
      needs_loading = false,
      needs_unloading = false,
      destination = {},
      cargo = {},
      required_truck = {},
      conditional = {},
      price,
      pay_now = false,
    } = req.body;

    // 1. Validation
    if (!pickup_at) {
      throw new AppError('VALIDATION_ERROR', 'pickup_at timestamp is required', 400);
    }
    if (!pickup.address || pickup.lat == null || pickup.lng == null) {
      throw new AppError('VALIDATION_ERROR', 'Pickup address, lat, and lng are required', 400);
    }
    if (!destination.address || destination.lat == null || destination.lng == null) {
      throw new AppError('VALIDATION_ERROR', 'Destination address, lat, and lng are required', 400);
    }
    if (!destination.dest_name || !destination.dest_phone) {
      throw new AppError('VALIDATION_ERROR', 'Receiver name and contact phone are required', 400);
    }
    if (!cargo.goods_category_id || !cargo.quantity || !cargo.unit) {
      throw new AppError('VALIDATION_ERROR', 'Cargo category, quantity, and unit are required', 400);
    }
    if (!required_truck.category || !required_truck.body) {
      throw new AppError('VALIDATION_ERROR', 'Required truck category and body are required', 400);
    }
    if (!price || Number(price) < 500) {
      throw new AppError('VALIDATION_ERROR', 'Price is required and must be at least 500.000 JD', 400);
    }

    // 2. Validate manufacturer registered for this category
    const catCheck = await query(
      `SELECT 1 FROM manufacturer_goods_categories
       WHERE manufacturer_id = $1 AND goods_category_id = $2`,
      [req.user.id, cargo.goods_category_id]
    );
    if (catCheck.rows.length === 0) {
      throw new AppError(
        'VALIDATION_ERROR',
        'You can only create shipments for goods categories registered in your manufacturer profile',
        400
      );
    }

    // 3. Compute Split
    const split = computeSplit(price);

    // 4. Calculate Route & Distance
    let distanceKm = null;
    let routeGeometry = null;
    try {
      const route = await calculateRoute(
        { lat: pickup.lat, lng: pickup.lng },
        { lat: destination.lat, lng: destination.lng }
      );
      distanceKm = route.distanceKm;
      routeGeometry = route.geometry;
    } catch (e) {
      console.warn('Route calculation fallback:', e.message);
    }

    // 5. Fill missing cities/areas via reverse geocode
    let pickupCity = pickup.city;
    let pickupArea = pickup.area;
    if (!pickupCity) {
      try {
        const rev = await reverseGeocode(pickup.lat, pickup.lng);
        pickupCity = rev.city;
        pickupArea = rev.area;
      } catch (e) { }
    }

    let destCity = destination.city;
    let destArea = destination.area;
    if (!destCity) {
      try {
        const rev = await reverseGeocode(destination.lat, destination.lng);
        destCity = rev.city;
        destArea = rev.area;
      } catch (e) { }
    }

    const nowIso = new Date().toISOString();
    const initialStatus = pay_now ? 'pending' : 'requested';
    const statusHistory = { requested: nowIso };
    if (pay_now) {
      statusHistory.pending = nowIso;
    }

    // 6. DB Transaction
    const newTicket = await tx(async (client) => {
      // Update location last_used_at if referenced
      if (pickup.location_id) {
        await client.query(
          `UPDATE locations SET last_used_at = now() WHERE id = $1 AND owner_id = $2`,
          [pickup.location_id, req.user.id]
        );
      }
      if (destination.location_id) {
        await client.query(
          `UPDATE locations SET last_used_at = now() WHERE id = $1 AND owner_id = $2`,
          [destination.location_id, req.user.id]
        );
      }

      const insertRes = await client.query(
        `INSERT INTO tickets (
          manufacturer_id, status, status_history, events,
          pickup_at, pickup_location_id, pickup_label, pickup_address, pickup_lat, pickup_lng, pickup_city, pickup_area,
          needs_loading, needs_unloading,
          dest_location_id, dest_address, dest_lat, dest_lng, dest_city, dest_area, dest_name, dest_phone,
          goods_category_id, goods_description, quantity, unit, trip_type, destination_country, notes,
          required_category, required_body, required_cooling,
          is_hazardous, temp_min, temp_max, adr_class, safety_certificate_key, liquid_type, dimensions,
          customs_enabled, customs_declaration_number, customs_permit_type, customs_permit_details, customs_docs_key,
          price, escrow_pct, escrow_fee, masar_fee, driver_net,
          distance_km, route_geometry
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22,
          $23, $24, $25, $26, $27, $28, $29,
          $30, $31, $32,
          $33, $34, $35, $36, $37, $38, $39,
          $40, $41, $42, $43, $44,
          $45, $46, $47, $48, $49,
          $50, $51
        )
        RETURNING *`,
        [
          req.user.id,
          initialStatus,
          JSON.stringify(statusHistory),
          JSON.stringify([]),
          pickup_at,
          pickup.location_id || null,
          pickup.label || null,
          pickup.address.trim(),
          Number(pickup.lat),
          Number(pickup.lng),
          pickupCity || 'Amman',
          pickupArea || null,
          !!needs_loading,
          !!needs_unloading,
          destination.location_id || null,
          destination.address.trim(),
          Number(destination.lat),
          Number(destination.lng),
          destCity || 'Amman',
          destArea || null,
          destination.dest_name.trim(),
          destination.dest_phone.trim(),
          cargo.goods_category_id,
          cargo.goods_description || null,
          Number(cargo.quantity),
          cargo.unit,
          cargo.trip_type || 'local',
          cargo.destination_country || null,
          cargo.notes || null,
          required_truck.category,
          required_truck.body,
          required_truck.cooling || null,
          !!conditional.is_hazardous,
          conditional.temp_min != null ? Number(conditional.temp_min) : null,
          conditional.temp_max != null ? Number(conditional.temp_max) : null,
          conditional.adr_class || null,
          conditional.safety_certificate_key || null,
          conditional.liquid_type || null,
          conditional.dimensions ? JSON.stringify(conditional.dimensions) : null,
          !!conditional.customs_enabled,
          conditional.customs_declaration_number || null,
          conditional.customs_permit_type || null,
          conditional.customs_permit_details || null,
          conditional.customs_docs_key || null,
          split.price,
          split.escrowPct,
          split.escrowFee,
          split.masarFee,
          split.driverNet,
          distanceKm,
          routeGeometry ? JSON.stringify(routeGeometry) : null,
        ]
      );

      const created = insertRes.rows[0];

      // Activity log & notifications
      await logActivity(client, {
        type: 'ticket_created',
        ticketId: created.id,
        actorId: req.user.id,
        params: { ticket_number: created.ticket_number },
      });

      await createNotification(client, {
        userId: req.user.id,
        type: 'ticket_created',
        params: { n: created.ticket_number },
        link: `/manufacturer/shipments/${created.id}`,
        ticketId: created.id,
      });

      // If pay_now was selected
      if (pay_now) {
        await client.query(
          `INSERT INTO ledger_entries (ticket_id, entry_type, amount, party_user_id)
           VALUES ($1, 'deposit', $2, $3)`,
          [created.id, split.price, req.user.id]
        );

        await logActivity(client, {
          type: 'payment_received',
          ticketId: created.id,
          actorId: req.user.id,
          params: { amount: split.price, ticket_number: created.ticket_number },
        });

        await createNotification(client, {
          userId: req.user.id,
          type: 'payment_received_mfr',
          params: { n: created.ticket_number },
          link: `/manufacturer/shipments/${created.id}`,
          ticketId: created.id,
        });

        // Notify Escrow
        const escrowUsers = await client.query(`SELECT id FROM users WHERE role = 'escrow'`);
        for (const esc of escrowUsers.rows) {
          await createNotification(client, {
            userId: esc.id,
            type: 'payment_received_escrow',
            params: {
              amount: `${split.price} JD`,
              n: created.ticket_number,
              company: req.user.name,
            },
            link: `/escrow/shipments/${created.id}`,
            ticketId: created.id,
          });
        }
      }

      return created;
    });

    const fullTicket = await fetchTicketWithDetails(newTicket.id);
    const shaped = shapeTicketRow(fullTicket, req.user.id);
    res.status(201).json(serializeTicket(shaped, req.user.role));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tickets/:id
 * Returns role-shaped ticket detail.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const ticket = await fetchTicketWithDetails(req.params.id);
    if (!ticket) {
      throw new AppError('NOT_FOUND', 'Shipment not found', 404);
    }

    // Role check & Scoping
    if (req.user.role === 'manufacturer') {
      if (ticket.manufacturer_id !== req.user.id) {
        throw new AppError('FORBIDDEN', 'Access denied to this shipment', 403);
      }
    } else if (req.user.role === 'driver') {
      const isAssigned = ticket.driver_id === req.user.id;
      if (!isAssigned) {
        // Must be in pending status and visible to driver
        if (ticket.status !== 'pending') {
          throw new AppError('FORBIDDEN', 'Access denied to this shipment', 403);
        }
      }
    } else if (!['admin', 'escrow'].includes(req.user.role)) {
      throw new AppError('FORBIDDEN', 'Access denied', 403);
    }

    const shaped = shapeTicketRow(ticket, req.user.id);
    const serialized = serializeTicket(shaped, req.user.role, {
      isAssigned: ticket.driver_id === req.user.id,
    });

    res.json(serialized);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/tickets/:id
 * Manufacturer can only edit while status = 'requested'.
 * Recomputes split if price changed.
 */
router.patch('/:id', requireRole('manufacturer'), async (req, res, next) => {
  try {
    const existing = await query(
      `SELECT * FROM tickets WHERE id = $1 AND manufacturer_id = $2`,
      [req.params.id, req.user.id]
    );
    if (existing.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Shipment not found', 404);
    }

    const ticket = existing.rows[0];
    if (ticket.status !== 'requested') {
      throw new AppError(
        'INVALID_STATUS',
        'Shipments can only be modified before payment (while awaiting payment)',
        409
      );
    }

    const {
      pickup_at,
      pickup,
      needs_loading,
      needs_unloading,
      destination,
      cargo,
      required_truck,
      conditional,
      price,
    } = req.body;

    let split = null;
    if (price != null) {
      if (Number(price) < 500) {
        throw new AppError('VALIDATION_ERROR', 'Price must be at least 500.000 JD', 400);
      }
      split = computeSplit(price);
    }

    await tx(async (client) => {
      await client.query(
        `UPDATE tickets
         SET pickup_at = COALESCE($1, pickup_at),
             needs_loading = COALESCE($2, needs_loading),
             needs_unloading = COALESCE($3, needs_unloading),
             notes = COALESCE($4, notes),
             price = COALESCE($5, price),
             escrow_pct = COALESCE($6, escrow_pct),
             escrow_fee = COALESCE($7, escrow_fee),
             masar_fee = COALESCE($8, masar_fee),
             driver_net = COALESCE($9, driver_net),
             updated_at = now()
         WHERE id = $10`,
        [
          pickup_at || null,
          needs_loading != null ? !!needs_loading : null,
          needs_unloading != null ? !!needs_unloading : null,
          cargo?.notes || null,
          split ? split.price : null,
          split ? split.escrowPct : null,
          split ? split.escrowFee : null,
          split ? split.masarFee : null,
          split ? split.driverNet : null,
          ticket.id,
        ]
      );
    });

    const fullTicket = await fetchTicketWithDetails(ticket.id);
    const shaped = shapeTicketRow(fullTicket, req.user.id);
    res.json(serializeTicket(shaped, req.user.role));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/tickets/:id
 * Manufacturer can delete while status = 'requested'.
 */
router.delete('/:id', requireRole('manufacturer'), async (req, res, next) => {
  try {
    const existing = await query(
      `SELECT * FROM tickets WHERE id = $1 AND manufacturer_id = $2`,
      [req.params.id, req.user.id]
    );
    if (existing.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Shipment not found', 404);
    }

    const ticket = existing.rows[0];
    if (ticket.status !== 'requested') {
      throw new AppError(
        'INVALID_STATUS',
        'Shipments can only be deleted before payment (while awaiting payment)',
        409
      );
    }

    await query(`DELETE FROM tickets WHERE id = $1`, [ticket.id]);
    res.json({ success: true, id: ticket.id });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tickets/:id/pay
 * Manufacturer pays into escrow: status 'requested' -> 'pending'.
 */
router.post('/:id/pay', requireRole('manufacturer'), async (req, res, next) => {
  try {
    const existing = await query(
      `SELECT * FROM tickets WHERE id = $1 AND manufacturer_id = $2`,
      [req.params.id, req.user.id]
    );
    if (existing.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Shipment not found', 404);
    }

    const ticket = existing.rows[0];
    if (ticket.status !== 'requested') {
      throw new AppError(
        'INVALID_STATUS',
        `Cannot pay for shipment with status '${ticket.status}'. Must be 'requested'.`,
        409
      );
    }

    const nowIso = new Date().toISOString();

    await tx(async (client) => {
      await client.query(
        `UPDATE tickets
         SET status = 'pending',
             status_history = jsonb_set(status_history, '{pending}', to_jsonb($1::text)),
             updated_at = now()
         WHERE id = $2`,
        [nowIso, ticket.id]
      );

      // Ledger deposit entry
      await client.query(
        `INSERT INTO ledger_entries (ticket_id, entry_type, amount, party_user_id)
         VALUES ($1, 'deposit', $2, $3)`,
        [ticket.id, ticket.price, req.user.id]
      );

      // Activity log
      await logActivity(client, {
        type: 'payment_received',
        ticketId: ticket.id,
        actorId: req.user.id,
        params: { amount: ticket.price, ticket_number: ticket.ticket_number },
      });

      // Notification to Manufacturer
      await notify({
        client,
        userIds: [req.user.id],
        type: 'payment_received_mfr',
        params: { n: ticket.ticket_number },
        link: `/manufacturer/shipments/${ticket.id}`,
        ticketId: ticket.id,
        email: {
          templateKey: 'PaymentReceived',
          data: {
            ticketNumber: ticket.ticket_number,
            ticketId: ticket.id,
            price: Number(ticket.price).toFixed(3),
            route: `${ticket.pickup_city || 'Jordan'} → ${ticket.destination_city || 'Jordan'}`,
          },
        },
      });

      // Notification to Escrow
      const escrowUsers = await client.query(`SELECT id FROM users WHERE role = 'escrow'`);
      const escrowIds = escrowUsers.rows.map((e) => e.id);
      if (escrowIds.length > 0) {
        await notify({
          client,
          userIds: escrowIds,
          type: 'payment_received_escrow',
          params: {
            amount: `${Number(ticket.price).toFixed(3)} JD`,
            n: ticket.ticket_number,
            company: req.user.name,
          },
          link: `/escrow/shipments/${ticket.id}`,
          ticketId: ticket.id,
          email: {
            templateKey: 'FundsHeld',
            data: {
              ticketNumber: ticket.ticket_number,
              ticketId: ticket.id,
              companyName: req.user.name,
              amount: Number(ticket.price).toFixed(3),
            },
          },
        });
      }

      // Broadcast new_match to qualified free drivers
      const freeDriversRes = await client.query(
        `SELECT u.id, u.name, u.email,
                d.scope, d.license_class,
                t.gross_weight_code, t.cooling, t.adr_certified,
                tt.category, tt.type_code, tt.body_code, tt.payload_min, tt.payload_max, tt.unit
         FROM users u
         JOIN driver_profiles d ON d.user_id = u.id
         JOIN trucks t ON t.driver_id = u.id
         JOIN truck_types tt ON tt.id = t.truck_type_id
         WHERE u.status = 'approved'
           AND NOT EXISTS (
             SELECT 1 FROM tickets act
             WHERE act.driver_id = u.id AND act.status IN ('waiting_load', 'in_delivery')
           )`
      );

      for (const d of freeDriversRes.rows) {
        const match = checkDriverMatch(
          {
            required_category: ticket.suggested_category,
            required_body: ticket.suggested_body_code,
            required_cooling: ticket.cooling,
            quantity: ticket.quantity,
            unit: ticket.unit || 'ton',
            trip_type: ticket.trip_type,
            is_hazardous: ticket.adr_certified,
            pickup_at: ticket.pickup_at,
          },
          {
            status: 'approved',
            scope: d.scope,
            truck: {
              category: d.category,
              body_code: d.body_code,
              cooling: d.cooling,
              payload_max: Number(d.payload_max),
              unit: d.unit,
              adr_certified: d.adr_certified,
            },
            has_active_shipment: false,
          }
        );

        if (match.matches && match.canAccept) {
          await notify({
            client,
            userIds: [d.id],
            type: 'new_match',
            params: {
              n: ticket.ticket_number,
              from: ticket.pickup_city || 'Jordan',
              to: ticket.destination_city || 'Jordan',
              earnings: `${Number(ticket.driver_net).toFixed(3)} JD`,
            },
            link: `/driver/shipments/${ticket.id}`,
            ticketId: ticket.id,
            email: {
              templateKey: 'NewMatch',
              data: {
                ticketNumber: ticket.ticket_number,
                ticketId: ticket.id,
                fromCity: ticket.pickup_city || 'Jordan',
                toCity: ticket.destination_city || 'Jordan',
                earnings: Number(ticket.driver_net).toFixed(3),
                pickupDate: ticket.pickup_at ? new Date(ticket.pickup_at).toLocaleString('en-GB', { timeZone: 'Asia/Amman' }) + ' (Asia/Amman)' : '',
              },
            },
          });
        }
      }
    });

    const fullTicket = await fetchTicketWithDetails(ticket.id);
    const shaped = shapeTicketRow(fullTicket, req.user.id);
    res.json(serializeTicket(shaped, req.user.role));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tickets/:id/accept
 * Driver accepts pending shipment: 'pending' -> 'waiting_load'.
 * Atomic update; checks ALREADY_TAKEN and DRIVER_BUSY.
 */
router.post('/:id/accept', requireRole('driver'), async (req, res, next) => {
  try {
    // 1. Driver must be approved
    if (req.user.status !== 'approved') {
      throw new AppError('NOT_APPROVED', 'Your driver account has not been approved yet', 403);
    }

    // 2. Availability: 1 active ticket per driver (in waiting_load or in_delivery)
    const activeRes = await query(
      `SELECT id, ticket_number FROM tickets
       WHERE driver_id = $1 AND status IN ('waiting_load', 'in_delivery')`,
      [req.user.id]
    );
    if (activeRes.rows.length > 0) {
      throw new AppError(
        'DRIVER_BUSY',
        'Finish your active shipment first',
        409
      );
    }

    // 3. Check Driver match predicate
    const driverRes = await query(
      `SELECT d.user_id, d.scope, u.status,
              t.plate_number, t.cooling, t.adr_certified, t.gross_weight_code,
              tt.category AS truck_category, tt.body_code, tt.unit, tt.payload_max
       FROM driver_profiles d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN trucks t ON t.driver_id = d.user_id
       LEFT JOIN truck_types tt ON tt.id = t.truck_type_id
       WHERE d.user_id = $1`,
      [req.user.id]
    );
    if (driverRes.rows.length === 0 || !driverRes.rows[0].truck_category) {
      throw new AppError('VALIDATION_ERROR', 'No registered truck found for driver', 400);
    }

    const driverData = driverRes.rows[0];
    const targetTicket = await query(`SELECT * FROM tickets WHERE id = $1`, [req.params.id]);
    if (targetTicket.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Shipment not found', 404);
    }
    const tRow = targetTicket.rows[0];

    const match = checkDriverMatch(tRow, {
      status: driverData.status,
      scope: driverData.scope,
      has_active_shipment: false,
      truck: {
        category: driverData.truck_category,
        body_code: driverData.body_code,
        cooling: driverData.cooling,
        payload_max: driverData.payload_max,
        unit: driverData.unit,
        adr_certified: driverData.adr_certified,
      },
    });

    if (!match.matches) {
      throw new AppError('FORBIDDEN', `You do not qualify for this shipment: ${match.failReason}`, 403);
    }

    const nowIso = new Date().toISOString();

    // 4. Atomic Accept
    const acceptedTicket = await tx(async (client) => {
      const updateRes = await client.query(
        `UPDATE tickets
         SET status = 'waiting_load',
             driver_id = $1,
             status_history = jsonb_set(status_history, '{waiting_load}', to_jsonb($2::text)),
             updated_at = now()
         WHERE id = $3 AND status = 'pending' AND driver_id IS NULL
         RETURNING *`,
        [req.user.id, nowIso, tRow.id]
      );

      if (updateRes.rows.length === 0) {
        throw new AppError('ALREADY_TAKEN', 'Shipment already taken', 409);
      }

      const accepted = updateRes.rows[0];

      // Activity log
      await logActivity(client, {
        type: 'driver_accepted',
        ticketId: accepted.id,
        actorId: req.user.id,
        params: { ticket_number: accepted.ticket_number, driver_name: req.user.name },
      });

      // Notification to Manufacturer: "Mr. {driver} accepted {n}"
      await notify({
        client,
        userIds: [accepted.manufacturer_id],
        type: 'driver_accepted_mfr',
        params: {
          driver: req.user.name,
          n: accepted.ticket_number,
        },
        link: `/manufacturer/shipments/${accepted.id}`,
        ticketId: accepted.id,
        email: {
          templateKey: 'DriverAccepted',
          data: {
            ticketNumber: accepted.ticket_number,
            ticketId: accepted.id,
            driverName: req.user.name,
            driverPhone: req.user.phone,
            driverId: req.user.id,
          },
        },
      });

      // Notification to Driver
      await notify({
        client,
        userIds: [req.user.id],
        type: 'driver_accepted_driver',
        params: { n: accepted.ticket_number },
        link: `/driver/active`,
        ticketId: accepted.id,
        email: {
          templateKey: 'ShipmentAccepted',
          data: {
            ticketNumber: accepted.ticket_number,
            ticketId: accepted.id,
            pickupAddress: accepted.pickup_address,
            pickupTime: accepted.pickup_at ? new Date(accepted.pickup_at).toLocaleString('en-GB', { timeZone: 'Asia/Amman' }) + ' (Asia/Amman)' : '',
            earnings: Number(accepted.driver_net).toFixed(3),
          },
        },
      });

      return accepted;
    });

    const fullTicket = await fetchTicketWithDetails(acceptedTicket.id);
    const shaped = shapeTicketRow(fullTicket, req.user.id);
    res.json(serializeTicket(shaped, req.user.role, { isAssigned: true }));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tickets/:id/arrived
 * Driver reports arrival at pickup location.
 * Appends 'arrived_at_pickup' event to events JSONB.
 */
router.post('/:id/arrived', requireRole('driver'), async (req, res, next) => {
  try {
    const existing = await query(
      `SELECT * FROM tickets WHERE id = $1 AND driver_id = $2`,
      [req.params.id, req.user.id]
    );
    if (existing.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Shipment not found or not assigned to you', 404);
    }

    const ticket = existing.rows[0];
    if (ticket.status !== 'waiting_load') {
      throw new AppError(
        'INVALID_STATUS',
        `Can only mark arrival while waiting for loading (current status: '${ticket.status}')`,
        409
      );
    }

    const events = ticket.events || [];
    const alreadyArrived = events.some((e) => e.type === 'arrived_at_pickup');
    const nowIso = new Date().toISOString();

    if (!alreadyArrived) {
      events.push({
        type: 'arrived_at_pickup',
        at: nowIso,
        by: req.user.id,
      });

      await tx(async (client) => {
        await client.query(
          `UPDATE tickets SET events = $1, updated_at = now() WHERE id = $2`,
          [JSON.stringify(events), ticket.id]
        );

        await logActivity(client, {
          type: 'driver_arrived',
          ticketId: ticket.id,
          actorId: req.user.id,
          params: { ticket_number: ticket.ticket_number, driver_name: req.user.name },
        });

        // Arrival label (e.g. On time, 10 min early)
        const arrivalInfo = computeArrival(events, ticket.pickup_at);

        await createNotification(client, {
          userId: ticket.manufacturer_id,
          type: 'driver_arrived',
          params: {
            driver: req.user.name,
            early_late: arrivalInfo?.label || 'On time',
          },
          link: `/manufacturer/shipments/${ticket.id}`,
          ticketId: ticket.id,
        });
      });
    }

    const fullTicket = await fetchTicketWithDetails(ticket.id);
    const shaped = shapeTicketRow(fullTicket, req.user.id);
    res.json(serializeTicket(shaped, req.user.role, { isAssigned: true }));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tickets/:id/loaded
 * Manufacturer confirms goods loaded: 'waiting_load' -> 'in_delivery'.
 */
router.post('/:id/loaded', requireRole('manufacturer'), async (req, res, next) => {
  try {
    const existing = await query(
      `SELECT * FROM tickets WHERE id = $1 AND manufacturer_id = $2`,
      [req.params.id, req.user.id]
    );
    if (existing.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Shipment not found', 404);
    }

    const ticket = existing.rows[0];
    if (ticket.status !== 'waiting_load') {
      throw new AppError(
        'INVALID_STATUS',
        `Can only confirm goods loaded while in 'waiting_load' status (current status: '${ticket.status}')`,
        409
      );
    }

    const nowIso = new Date().toISOString();

    await tx(async (client) => {
      await client.query(
        `UPDATE tickets
         SET status = 'in_delivery',
             status_history = jsonb_set(status_history, '{in_delivery}', to_jsonb($1::text)),
             updated_at = now()
         WHERE id = $2`,
        [nowIso, ticket.id]
      );

      await logActivity(client, {
        type: 'goods_loaded',
        ticketId: ticket.id,
        actorId: req.user.id,
        params: { ticket_number: ticket.ticket_number },
      });

      // Notification to Manufacturer
      await notify({
        client,
        userIds: [req.user.id],
        type: 'loaded_mfr',
        params: { n: ticket.ticket_number },
        link: `/manufacturer/shipments/${ticket.id}`,
        ticketId: ticket.id,
        email: {
          templateKey: 'OnItsWay',
          data: {
            ticketNumber: ticket.ticket_number,
            ticketId: ticket.id,
            toCity: ticket.destination_city || 'Jordan',
            loadedAt: new Date().toLocaleString('en-GB', { timeZone: 'Asia/Amman' }) + ' (Asia/Amman)',
          },
        },
      });

      // Notification to Driver
      if (ticket.driver_id) {
        await notify({
          client,
          userIds: [ticket.driver_id],
          type: 'loaded_driver',
          params: { n: ticket.ticket_number },
          link: `/driver/active`,
          ticketId: ticket.id,
        });
      }
    });

    const fullTicket = await fetchTicketWithDetails(ticket.id);
    const shaped = shapeTicketRow(fullTicket, req.user.id);
    res.json(serializeTicket(shaped, req.user.role));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tickets/:id/delivered
 * Driver confirms delivery at destination: 'in_delivery' -> 'delivered'.
 * DRIVER BECOMES FREE HERE for next shipment!
 */
router.post('/:id/delivered', requireRole('driver'), async (req, res, next) => {
  try {
    const existing = await query(
      `SELECT * FROM tickets WHERE id = $1 AND driver_id = $2`,
      [req.params.id, req.user.id]
    );
    if (existing.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Shipment not found or not assigned to you', 404);
    }

    const ticket = existing.rows[0];
    if (ticket.status !== 'in_delivery') {
      throw new AppError(
        'INVALID_STATUS',
        `Can only mark delivered while in 'in_delivery' status (current status: '${ticket.status}')`,
        409
      );
    }

    const nowIso = new Date().toISOString();

    await tx(async (client) => {
      await client.query(
        `UPDATE tickets
         SET status = 'delivered',
             status_history = jsonb_set(status_history, '{delivered}', to_jsonb($1::text)),
             updated_at = now()
         WHERE id = $2`,
        [nowIso, ticket.id]
      );

      await logActivity(client, {
        type: 'shipment_delivered',
        ticketId: ticket.id,
        actorId: req.user.id,
        params: { ticket_number: ticket.ticket_number },
      });

      // Notification to Manufacturer: Verify and confirm
      await notify({
        client,
        userIds: [ticket.manufacturer_id],
        type: 'delivered_mfr',
        params: { n: ticket.ticket_number },
        link: `/manufacturer/shipments/${ticket.id}`,
        ticketId: ticket.id,
        email: {
          templateKey: 'DeliveredConfirm',
          data: {
            ticketNumber: ticket.ticket_number,
            ticketId: ticket.id,
            driverName: req.user.name,
            driverId: req.user.id,
            deliveredAt: new Date().toLocaleString('en-GB', { timeZone: 'Asia/Amman' }) + ' (Asia/Amman)',
          },
        },
      });

      // Notification to Driver: Earnings pending release
      await notify({
        client,
        userIds: [req.user.id],
        type: 'delivered_driver',
        params: {
          earnings: `${Number(ticket.driver_net).toFixed(3)} JD`,
        },
        link: `/driver/shipments/${ticket.id}`,
        ticketId: ticket.id,
      });

      // Notification to Escrow
      const escrowUsers = await client.query(`SELECT id FROM users WHERE role = 'escrow'`);
      const escrowIds = escrowUsers.rows.map((e) => e.id);
      if (escrowIds.length > 0) {
        await notify({
          client,
          userIds: escrowIds,
          type: 'delivered_escrow',
          params: { n: ticket.ticket_number },
          link: `/escrow/shipments/${ticket.id}`,
          ticketId: ticket.id,
        });
      }
    });

    const fullTicket = await fetchTicketWithDetails(ticket.id);
    const shaped = shapeTicketRow(fullTicket, req.user.id);
    res.json(serializeTicket(shaped, req.user.role, { isAssigned: true }));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tickets/:id/confirm
 * Manufacturer confirms delivery: 'delivered' -> 'audited'.
 * Escrow funds released. Ledger entries inserted (payout_driver, commission_masar, commission_escrow).
 */
router.post('/:id/confirm', requireRole('manufacturer'), async (req, res, next) => {
  try {
    const existing = await query(
      `SELECT * FROM tickets WHERE id = $1 AND manufacturer_id = $2`,
      [req.params.id, req.user.id]
    );
    if (existing.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Shipment not found', 404);
    }

    const ticket = existing.rows[0];
    if (ticket.status !== 'delivered') {
      throw new AppError(
        'INVALID_STATUS',
        `Can only confirm delivery when status is 'delivered' (current status: '${ticket.status}')`,
        409
      );
    }

    // Driver details snapshot for payout entry
    const driverProfileRes = await query(
      `SELECT d.name, dp.iban, dp.cliq_alias
       FROM users d
       JOIN driver_profiles dp ON dp.user_id = d.id
       WHERE d.id = $1`,
      [ticket.driver_id]
    );
    const driverInfo = driverProfileRes.rows[0] || {};

    const nowIso = new Date().toISOString();

    await tx(async (client) => {
      // 1. Transition to audited
      await client.query(
        `UPDATE tickets
         SET status = 'audited',
             status_history = jsonb_set(status_history, '{audited}', to_jsonb($1::text)),
             updated_at = now()
         WHERE id = $2`,
        [nowIso, ticket.id]
      );

      // 2. Ledger entries: payout_driver, commission_masar, commission_escrow
      await client.query(
        `INSERT INTO ledger_entries (ticket_id, entry_type, amount, party_user_id, details)
         VALUES ($1, 'payout_driver', $2, $3, $4)`,
        [
          ticket.id,
          ticket.driver_net,
          ticket.driver_id,
          JSON.stringify({
            iban: driverInfo.iban || null,
            cliq_alias: driverInfo.cliq_alias || null,
          }),
        ]
      );

      await client.query(
        `INSERT INTO ledger_entries (ticket_id, entry_type, amount)
         VALUES ($1, 'commission_masar', $2)`,
        [ticket.id, ticket.masar_fee]
      );

      await client.query(
        `INSERT INTO ledger_entries (ticket_id, entry_type, amount)
         VALUES ($1, 'commission_escrow', $2)`,
        [ticket.id, ticket.escrow_fee]
      );

      // 3. Activity log
      await logActivity(client, {
        type: 'payout_released',
        ticketId: ticket.id,
        actorId: req.user.id,
        params: {
          ticket_number: ticket.ticket_number,
          driver_net: ticket.driver_net,
          masar_fee: ticket.masar_fee,
          escrow_fee: ticket.escrow_fee,
        },
      });

      // 4. Notifications
      // Driver: "{amount} transferred successfully to your account {iban}"
      const payoutDest = driverInfo.iban || driverInfo.cliq_alias || 'your account';
      await notify({
        client,
        userIds: [ticket.driver_id],
        type: 'payout_driver',
        params: {
          amount: `${Number(ticket.driver_net).toFixed(3)} JD`,
          iban: payoutDest,
        },
        link: `/driver/earnings`,
        ticketId: ticket.id,
        email: {
          templateKey: 'PayoutComplete',
          data: {
            ticketNumber: ticket.ticket_number,
            amount: Number(ticket.driver_net).toFixed(3),
            iban: payoutDest,
          },
        },
      });

      // Manufacturer: "Delivery of {n} confirmed. Please rate Mr. {driver}"
      await notify({
        client,
        userIds: [req.user.id],
        type: 'confirmed_mfr',
        params: {
          n: ticket.ticket_number,
          driver: driverInfo.name || 'Driver',
        },
        link: `/manufacturer/shipments/${ticket.id}`,
        ticketId: ticket.id,
        email: {
          templateKey: 'DeliveryConfirmed',
          data: {
            ticketNumber: ticket.ticket_number,
            ticketId: ticket.id,
            driverName: driverInfo.name || 'Driver',
          },
        },
      });

      // Escrow: full breakdown released
      const escrowUsers = await client.query(`SELECT id FROM users WHERE role = 'escrow'`);
      const escrowIds = escrowUsers.rows.map((e) => e.id);
      if (escrowIds.length > 0) {
        await notify({
          client,
          userIds: escrowIds,
          type: 'release_escrow',
          params: { n: ticket.ticket_number },
          link: `/escrow/shipments/${ticket.id}`,
          ticketId: ticket.id,
          email: {
            templateKey: 'ReleaseRecord',
            data: {
              ticketNumber: ticket.ticket_number,
              companyName: req.user.name,
              totalPrice: Number(ticket.price).toFixed(3),
              driverNet: Number(ticket.driver_net).toFixed(3),
              masarFee: Number(ticket.masar_fee).toFixed(3),
              escrowFee: Number(ticket.escrow_fee).toFixed(3),
            },
          },
        });
      }

      // Admin: Masar commission +{amount} from {n}
      const adminUsers = await client.query(`SELECT id FROM users WHERE role = 'admin'`);
      const adminIds = adminUsers.rows.map((a) => a.id);
      if (adminIds.length > 0) {
        await notify({
          client,
          userIds: adminIds,
          type: 'masar_income',
          params: {
            amount: `${Number(ticket.masar_fee).toFixed(3)} JD`,
            n: ticket.ticket_number,
          },
          link: `/admin/shipments/${ticket.id}`,
          ticketId: ticket.id,
        });
      }
    });

    const fullTicket = await fetchTicketWithDetails(ticket.id);
    const shaped = shapeTicketRow(fullTicket, req.user.id);
    res.json(serializeTicket(shaped, req.user.role));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tickets/:id/rating
 * Rate manufacturer or driver: 1-5 stars + optional comment.
 * Allowed ONLY when status = 'audited'. One rating per side per ticket.
 */
router.post('/:id/rating', async (req, res, next) => {
  try {
    const { stars, comment } = req.body;
    if (!stars || stars < 1 || stars > 5) {
      throw new AppError('VALIDATION_ERROR', 'Rating stars must be between 1 and 5', 400);
    }

    const ticketRes = await query(`SELECT * FROM tickets WHERE id = $1`, [req.params.id]);
    if (ticketRes.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Shipment not found', 404);
    }
    const ticket = ticketRes.rows[0];

    if (ticket.status !== 'audited') {
      throw new AppError(
        'INVALID_STATUS',
        'Ratings can only be submitted after delivery is confirmed (status: audited)',
        409
      );
    }

    let toUserId = null;
    if (req.user.id === ticket.manufacturer_id) {
      toUserId = ticket.driver_id;
    } else if (req.user.id === ticket.driver_id) {
      toUserId = ticket.manufacturer_id;
    } else {
      throw new AppError('FORBIDDEN', 'Only parties to this shipment can submit a rating', 403);
    }

    await tx(async (client) => {
      await client.query(
        `INSERT INTO ratings (ticket_id, from_user_id, to_user_id, stars, comment)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (ticket_id, from_user_id)
         DO UPDATE SET stars = EXCLUDED.stars, comment = EXCLUDED.comment`,
        [ticket.id, req.user.id, toUserId, Math.round(stars), comment ? comment.trim() : null]
      );

      // Notification to rated user
      await createNotification(client, {
        userId: toUserId,
        type: 'rating_received',
        params: {
          from: req.user.name,
          stars: Math.round(stars),
        },
        ticketId: ticket.id,
      });
    });

    res.json({ success: true, message: 'Rating submitted successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tickets/:id/pdf
 * Generates role-shaped official summary PDF for audited shipments.
 */
router.get('/:id/pdf', async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const ticket = await fetchTicketWithDetails(ticketId);

    if (!ticket) {
      throw new AppError('NOT_FOUND', 'Shipment not found', 404);
    }

    // Role check:
    if (req.user.role === 'manufacturer' && ticket.manufacturer_id !== req.user.id) {
      throw new AppError('FORBIDDEN', 'Access denied to this shipment', 403);
    }
    if (req.user.role === 'driver' && ticket.driver_id !== req.user.id) {
      throw new AppError('FORBIDDEN', 'Access denied to this shipment', 403);
    }

    if (ticket.status !== 'audited') {
      throw new AppError('INVALID_STATUS', 'Summary PDF is only available for confirmed (audited) shipments', 400);
    }

    generateTicketPdf(ticket, req.user.role, res);
  } catch (err) {
    next(err);
  }
});

export default router;
