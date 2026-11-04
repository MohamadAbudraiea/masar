import express from 'express';
import { query } from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { sendCsvResponse } from '../services/csv.js';
import { serializeTicket } from '../serializers/ticket.js';

const router = express.Router();
router.use(auth);

// ─────────────────────────────────────────────────────────
// 1. MANUFACTURER REPORTS
// ─────────────────────────────────────────────────────────

/**
 * GET /api/reports/manufacturer/overview
 */
router.get('/manufacturer/overview', requireRole('manufacturer'), async (req, res, next) => {
  try {
    const manufacturerId = req.user.id;
    const { from, to } = req.query;

    let dateFilter = '';
    const dateParams = [manufacturerId];
    if (from) {
      dateParams.push(from);
      dateFilter += ` AND t.created_at >= $${dateParams.length}`;
    }
    if (to) {
      dateParams.push(to);
      dateFilter += ` AND t.created_at <= $${dateParams.length}`;
    }

    // 1. KPIs
    const kpiSql = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE t.status IN ('pending', 'waiting_load', 'in_delivery', 'delivered'))::int AS active,
        COALESCE(SUM(t.price) FILTER (WHERE t.status != 'requested'), 0)::text AS total_paid,
        COALESCE(SUM(t.price) FILTER (WHERE t.status IN ('pending', 'waiting_load', 'in_delivery', 'delivered')), 0)::text AS held,
        COALESCE(SUM(t.price) FILTER (WHERE t.status = 'audited'), 0)::text AS released,
        COALESCE(SUM(t.price) FILTER (WHERE t.status = 'requested'), 0)::text AS awaiting_payment
      FROM tickets t
      WHERE t.manufacturer_id = $1 ${dateFilter}
    `;
    const kpiRes = await query(kpiSql, dateParams);
    const kpis = kpiRes.rows[0];

    // 2. Needs Your Action (unpaid, waiting load, delivered to confirm)
    const actionSql = `
      SELECT
        COUNT(*) FILTER (WHERE t.status = 'requested')::int AS unpaid,
        COUNT(*) FILTER (WHERE t.status = 'waiting_load')::int AS to_mark_loaded,
        COUNT(*) FILTER (WHERE t.status = 'delivered')::int AS to_confirm
      FROM tickets t
      WHERE t.manufacturer_id = $1
    `;
    const actionRes = await query(actionSql, [manufacturerId]);
    const needsAction = actionRes.rows[0];

    // 3. Spending over time
    const spendingSql = `
      SELECT
        TO_CHAR(t.created_at AT TIME ZONE 'Asia/Amman', 'YYYY-MM-DD') AS date,
        SUM(t.price)::numeric(12,3) AS amount
      FROM tickets t
      WHERE t.manufacturer_id = $1 AND t.status != 'requested' ${dateFilter}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    const spendingRes = await query(spendingSql, dateParams);

    // 4. By status
    const statusSql = `
      SELECT
        t.status,
        COUNT(*)::int AS count,
        COALESCE(SUM(t.price), 0)::numeric(12,3) AS amount
      FROM tickets t
      WHERE t.manufacturer_id = $1 ${dateFilter}
      GROUP BY t.status
    `;
    const statusRes = await query(statusSql, dateParams);

    // 5. By goods category
    const catSql = `
      SELECT
        COALESCE(gc.name_en, 'Other') AS category_name,
        COUNT(*)::int AS count,
        COALESCE(SUM(t.price), 0)::numeric(12,3) AS amount
      FROM tickets t
      LEFT JOIN goods_categories gc ON gc.id = t.goods_category_id
      WHERE t.manufacturer_id = $1 ${dateFilter}
      GROUP BY gc.name_en
    `;
    const catRes = await query(catSql, dateParams);

    // 6. Top drivers worked with
    const driversSql = `
      SELECT
        d.id AS driver_id,
        d.name,
        COUNT(*)::int AS count,
        COALESCE(urs.avg_stars, 0)::numeric(3,1) AS avg_rating
      FROM tickets t
      JOIN users d ON d.id = t.driver_id
      LEFT JOIN user_rating_stats urs ON urs.user_id = d.id
      WHERE t.manufacturer_id = $1 AND t.status IN ('delivered', 'audited') ${dateFilter}
      GROUP BY d.id, d.name, urs.avg_stars
      ORDER BY count DESC
      LIMIT 5
    `;
    const driversRes = await query(driversSql, dateParams);

    // 7. Recent shipments (serialized for manufacturer)
    const recentSql = `
      SELECT
        t.*,
        gc.name_en AS goods_category_name_en,
        d.name AS driver_name,
        d.phone AS driver_phone
      FROM tickets t
      LEFT JOIN goods_categories gc ON gc.id = t.goods_category_id
      LEFT JOIN users d ON d.id = t.driver_id
      WHERE t.manufacturer_id = $1
      ORDER BY t.created_at DESC
      LIMIT 5
    `;
    const recentRes = await query(recentSql, [manufacturerId]);
    const recent = recentRes.rows.map((r) =>
      serializeTicket(
        {
          ...r,
          goods_category_name: r.goods_category_name_en,
          driver: r.driver_id ? { id: r.driver_id, name: r.driver_name, phone: r.driver_phone } : null,
        },
        'manufacturer'
      )
    );

    res.json({
      kpis,
      needs_action: needsAction,
      spending_series: spendingRes.rows.map((r) => ({ date: r.date, amount: parseFloat(r.amount) })),
      by_status: statusRes.rows,
      by_category: catRes.rows,
      top_drivers: driversRes.rows,
      recent,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/manufacturer/payments
 */
router.get('/manufacturer/payments', requireRole('manufacturer'), async (req, res, next) => {
  try {
    const manufacturerId = req.user.id;
    const { from, to, page = 1, page_size = 20, format } = req.query;

    const params = [manufacturerId];
    let whereClause = `WHERE t.manufacturer_id = $1`;

    if (from) {
      params.push(from);
      whereClause += ` AND t.created_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      whereClause += ` AND t.created_at <= $${params.length}`;
    }

    // KPIs
    const kpiSql = `
      SELECT
        COALESCE(SUM(t.price) FILTER (WHERE t.status != 'requested'), 0)::text AS paid,
        COALESCE(SUM(t.price) FILTER (WHERE t.status IN ('pending', 'waiting_load', 'in_delivery', 'delivered')), 0)::text AS held,
        COALESCE(SUM(t.price) FILTER (WHERE t.status = 'audited'), 0)::text AS released,
        COALESCE(SUM(t.price) FILTER (WHERE t.status = 'requested'), 0)::text AS awaiting_payment
      FROM tickets t
      ${whereClause}
    `;
    const kpiRes = await query(kpiSql, params);

    // Count
    const countRes = await query(`SELECT COUNT(*) FROM tickets t ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const limit = Math.max(1, Math.min(100, parseInt(page_size, 10) || 20));
    const offset = Math.max(0, ((parseInt(page, 10) || 1) - 1) * limit);

    const listSql = `
      SELECT
        t.id AS ticket_id,
        t.ticket_number,
        t.price,
        t.status,
        (t.status_history->>'pending')::timestamptz AS paid_at,
        (t.status_history->>'audited')::timestamptz AS released_at,
        t.created_at,
        d.id AS driver_id,
        d.name AS driver_name
      FROM tickets t
      LEFT JOIN users d ON d.id = t.driver_id
      ${whereClause}
      ORDER BY t.created_at DESC
      ${format === 'csv' ? '' : `LIMIT ${limit} OFFSET ${offset}`}
    `;
    const listRes = await query(listSql, params);

    const items = listRes.rows.map((r) => ({
      ticket_id: r.ticket_id,
      ticket_number: r.ticket_number,
      price: r.price,
      status: r.status,
      paid_at: r.paid_at,
      released_at: r.released_at,
      created_at: r.created_at,
      driver: r.driver_id ? { id: r.driver_id, name: r.driver_name } : null,
    }));

    if (format === 'csv') {
      const columns = [
        { key: 'ticket_number', label: 'Shipment Number' },
        { key: 'price', label: 'Price (JD)' },
        { key: 'status', label: 'Status' },
        { key: 'driver', label: 'Driver', format: (d) => d?.name || '—' },
        { key: 'paid_at', label: 'Paid At' },
        { key: 'released_at', label: 'Released At' },
        { key: 'created_at', label: 'Created At' },
      ];
      return sendCsvResponse(res, `manufacturer-payments-${Date.now()}.csv`, items, columns);
    }

    res.json({
      kpis: kpiRes.rows[0],
      items,
      total,
      page: parseInt(page, 10) || 1,
      page_size: limit,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────
// 2. DRIVER REPORTS
// ─────────────────────────────────────────────────────────

/**
 * GET /api/reports/driver/earnings
 */
router.get('/driver/earnings', requireRole('driver'), async (req, res, next) => {
  try {
    const driverId = req.user.id;
    const { from, to, page = 1, page_size = 20, format } = req.query;

    const params = [driverId];
    let whereClause = `WHERE t.driver_id = $1`;

    if (from) {
      params.push(from);
      whereClause += ` AND t.created_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      whereClause += ` AND t.created_at <= $${params.length}`;
    }

    // Driver KPIs
    const kpiSql = `
      SELECT
        COALESCE(SUM(t.driver_net) FILTER (WHERE t.status IN ('waiting_load', 'in_delivery', 'delivered')), 0)::text AS pending_release,
        COALESCE(SUM(t.driver_net) FILTER (WHERE t.status = 'audited'), 0)::text AS paid_out,
        COALESCE(SUM(t.driver_net) FILTER (
          WHERE t.status = 'audited' AND (t.status_history->>'audited')::timestamptz >= DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Amman')
        ), 0)::text AS this_month,
        COUNT(*) FILTER (WHERE t.status IN ('delivered', 'audited'))::int AS completed_count
      FROM tickets t
      ${whereClause}
    `;
    const kpiRes = await query(kpiSql, params);

    // Driver payout account info
    const profileRes = await query(
      `SELECT iban, cliq_alias FROM driver_profiles WHERE user_id = $1`,
      [driverId]
    );
    const payoutAccount = profileRes.rows[0] || { iban: null, cliq_alias: null };

    // Count
    const countRes = await query(`SELECT COUNT(*) FROM tickets t ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const limit = Math.max(1, Math.min(100, parseInt(page_size, 10) || 20));
    const offset = Math.max(0, ((parseInt(page, 10) || 1) - 1) * limit);

    const listSql = `
      SELECT
        t.id AS ticket_id,
        t.ticket_number,
        t.driver_net AS earnings,
        t.pickup_city,
        t.dest_city,
        t.status,
        (t.status_history->>'delivered')::timestamptz AS delivered_at,
        (t.status_history->>'audited')::timestamptz AS completed_at,
        t.created_at
      FROM tickets t
      ${whereClause}
      ORDER BY t.created_at DESC
      ${format === 'csv' ? '' : `LIMIT ${limit} OFFSET ${offset}`}
    `;
    const listRes = await query(listSql, params);

    const items = listRes.rows.map((r) => ({
      ticket_id: r.ticket_id,
      ticket_number: r.ticket_number,
      earnings: r.earnings,
      pickup_city: r.pickup_city,
      dest_city: r.dest_city,
      status: r.status,
      completed_at: r.completed_at || r.delivered_at,
      created_at: r.created_at,
    }));

    if (format === 'csv') {
      const columns = [
        { key: 'ticket_number', label: 'Shipment Number' },
        { key: 'earnings', label: 'Your Earnings (JD)' },
        { key: 'pickup_city', label: 'Pickup City' },
        { key: 'dest_city', label: 'Destination City' },
        { key: 'status', label: 'Status' },
        { key: 'completed_at', label: 'Completed Date' },
      ];
      return sendCsvResponse(res, `driver-earnings-${Date.now()}.csv`, items, columns);
    }

    res.json({
      kpis: kpiRes.rows[0],
      payout_account: payoutAccount,
      items,
      total,
      page: parseInt(page, 10) || 1,
      page_size: limit,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────
// 3. ESCROW REPORTS
// ─────────────────────────────────────────────────────────

/**
 * GET /api/reports/escrow/overview
 */
router.get('/reports/escrow/overview', requireRole('escrow'), async (req, res, next) => {
  return handleEscrowOverview(req, res, next);
});
router.get('/escrow/overview', requireRole('escrow'), async (req, res, next) => {
  return handleEscrowOverview(req, res, next);
});

async function handleEscrowOverview(req, res, next) {
  try {
    const { from, to } = req.query;

    const params = [];
    let dateFilter = '';
    if (from) {
      params.push(from);
      dateFilter += ` AND t.created_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      dateFilter += ` AND t.created_at <= $${params.length}`;
    }

    const kpiSql = `
      SELECT
        COALESCE(SUM(t.price) FILTER (WHERE t.status IN ('pending', 'waiting_load', 'in_delivery', 'delivered')), 0)::text AS held,
        COALESCE(SUM(t.price) FILTER (WHERE t.status = 'audited'), 0)::text AS released_in_period,
        COALESCE(SUM(t.escrow_fee) FILTER (WHERE t.status = 'audited'), 0)::text AS commission_earned,
        COUNT(*) FILTER (WHERE t.status = 'delivered')::int AS awaiting_release_count
      FROM tickets t
      WHERE 1=1 ${dateFilter}
    `;
    const kpiRes = await query(kpiSql, params);

    // Held vs Released over time (by day)
    const seriesSql = `
      SELECT
        TO_CHAR(COALESCE((t.status_history->>'audited')::timestamptz, (t.status_history->>'pending')::timestamptz, t.created_at) AT TIME ZONE 'Asia/Amman', 'YYYY-MM-DD') AS date,
        COALESCE(SUM(t.price) FILTER (WHERE t.status IN ('pending', 'waiting_load', 'in_delivery', 'delivered')), 0)::numeric(12,3) AS held,
        COALESCE(SUM(t.price) FILTER (WHERE t.status = 'audited'), 0)::numeric(12,3) AS released
      FROM tickets t
      WHERE t.status != 'requested' ${dateFilter}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    const seriesRes = await query(seriesSql, params);

    // Commission series
    const commSql = `
      SELECT
        TO_CHAR((t.status_history->>'audited')::timestamptz AT TIME ZONE 'Asia/Amman', 'YYYY-MM-DD') AS date,
        COALESCE(SUM(t.escrow_fee), 0)::numeric(12,3) AS amount
      FROM tickets t
      WHERE t.status = 'audited' ${dateFilter}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    const commRes = await query(commSql, params);

    res.json({
      kpis: kpiRes.rows[0],
      held_vs_released_series: seriesRes.rows.map((r) => ({
        date: r.date,
        held: parseFloat(r.held),
        released: parseFloat(r.released),
      })),
      commission_series: commRes.rows.map((r) => ({
        date: r.date,
        amount: parseFloat(r.amount),
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/escrow/held
 */
router.get('/escrow/held', requireRole('escrow'), async (req, res, next) => {
  try {
    const { from, to, format } = req.query;
    const params = [];
    let whereClause = `WHERE t.status IN ('pending', 'waiting_load', 'in_delivery', 'delivered')`;

    if (from) {
      params.push(from);
      whereClause += ` AND (t.status_history->>'pending')::timestamptz >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      whereClause += ` AND (t.status_history->>'pending')::timestamptz <= $${params.length}`;
    }

    const sql = `
      SELECT
        t.id AS ticket_id,
        t.ticket_number,
        t.price AS amount,
        (t.status_history->>'pending')::timestamptz AS held_since,
        t.status,
        m.id AS manufacturer_id,
        m.name AS manufacturer_name
      FROM tickets t
      JOIN users m ON m.id = t.manufacturer_id
      ${whereClause}
      ORDER BY (t.status_history->>'pending') DESC NULLS LAST
    `;
    const result = await query(sql, params);

    const items = result.rows.map((r) => ({
      manufacturer: { id: r.manufacturer_id, name: r.manufacturer_name },
      ticket: { id: r.ticket_id, ticket_number: r.ticket_number },
      amount: r.amount,
      held_since: r.held_since,
      status: r.status,
    }));

    if (format === 'csv') {
      const columns = [
        { key: 'manufacturer', label: 'Company', format: (m) => m?.name || '' },
        { key: 'ticket', label: 'Shipment', format: (t) => t?.ticket_number || '' },
        { key: 'amount', label: 'Held Amount (JD)' },
        { key: 'held_since', label: 'Held Since' },
        { key: 'status', label: 'Status' },
      ];
      return sendCsvResponse(res, `escrow-held-funds-${Date.now()}.csv`, items, columns);
    }

    res.json({ items, total: items.length });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/escrow/releases
 */
router.get('/escrow/releases', requireRole('escrow'), async (req, res, next) => {
  try {
    const { from, to, format } = req.query;
    const params = [];
    let whereClause = `WHERE t.status = 'audited'`;

    if (from) {
      params.push(from);
      whereClause += ` AND (t.status_history->>'audited')::timestamptz >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      whereClause += ` AND (t.status_history->>'audited')::timestamptz <= $${params.length}`;
    }

    const sql = `
      SELECT
        t.id AS ticket_id,
        t.ticket_number,
        (t.status_history->>'audited')::timestamptz AS release_time,
        t.price,
        t.escrow_fee,
        t.masar_fee,
        t.driver_net,
        d.id AS driver_id,
        d.name AS driver_name,
        dp.iban,
        dp.cliq_alias,
        'Transferred' AS status
      FROM tickets t
      LEFT JOIN users d ON d.id = t.driver_id
      LEFT JOIN driver_profiles dp ON dp.user_id = t.driver_id
      ${whereClause}
      ORDER BY (t.status_history->>'audited') DESC NULLS LAST
    `;
    const result = await query(sql, params);

    const items = result.rows.map((r) => ({
      ticket_id: r.ticket_id,
      ticket_number: r.ticket_number,
      release_time: r.release_time,
      price: r.price,
      escrow_commission: r.escrow_fee,
      masar_commission: r.masar_fee,
      driver_net: r.driver_net,
      driver_name: r.driver_name,
      iban: r.iban,
      cliq_alias: r.cliq_alias,
      status: r.status,
    }));

    if (format === 'csv') {
      const columns = [
        { key: 'ticket_number', label: 'Shipment' },
        { key: 'release_time', label: 'Release Time' },
        { key: 'price', label: 'Total Price (JD)' },
        { key: 'escrow_commission', label: 'Escrow Fee (JD)' },
        { key: 'masar_commission', label: 'Masar Fee (JD)' },
        { key: 'driver_net', label: 'Driver Net (JD)' },
        { key: 'driver_name', label: 'Driver' },
        { key: 'iban', label: 'IBAN' },
        { key: 'cliq_alias', label: 'CliQ' },
        { key: 'status', label: 'Status' },
      ];
      return sendCsvResponse(res, `escrow-releases-${Date.now()}.csv`, items, columns);
    }

    res.json({ items, total: items.length });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────
// 4. ADMIN REPORTS
// ─────────────────────────────────────────────────────────

/**
 * GET /api/reports/admin/overview
 */
router.get('/admin/overview', requireRole('admin'), async (req, res, next) => {
  try {
    // 1. KPIs
    const usersCountRes = await query(`SELECT COUNT(*)::int AS count FROM users`);
    const activeShipmentsRes = await query(
      `SELECT COUNT(*)::int AS count FROM tickets WHERE status IN ('pending', 'waiting_load', 'in_delivery')`
    );
    const pendingApprovalsRes = await query(
      `SELECT COUNT(*)::int AS count FROM users WHERE status = 'pending'`
    );
    const moneyRes = await query(
      `SELECT
         COALESCE(SUM(masar_fee) FILTER (WHERE status = 'audited'), 0)::text AS masar_revenue,
         COALESCE(SUM(price) FILTER (WHERE status != 'requested'), 0)::text AS volume
       FROM tickets`
    );

    const kpis = {
      users: usersCountRes.rows[0].count,
      active_shipments: activeShipmentsRes.rows[0].count,
      pending_approvals: pendingApprovalsRes.rows[0].count,
      masar_revenue: moneyRes.rows[0].masar_revenue,
      volume: moneyRes.rows[0].volume,
      cancel_rate: null,
    };

    // 2. Newest 5 requested, 5 pending, 5 audited
    const newestRequested = await query(
      `SELECT t.id, t.ticket_number, t.price, t.status, t.created_at, m.name AS manufacturer_name
       FROM tickets t JOIN users m ON m.id = t.manufacturer_id
       WHERE t.status = 'requested' ORDER BY t.created_at DESC LIMIT 5`
    );
    const newestPending = await query(
      `SELECT t.id, t.ticket_number, t.price, t.status, t.created_at, m.name AS manufacturer_name
       FROM tickets t JOIN users m ON m.id = t.manufacturer_id
       WHERE t.status = 'pending' ORDER BY t.created_at DESC LIMIT 5`
    );
    const newestAudited = await query(
      `SELECT t.id, t.ticket_number, t.price, t.status, (t.status_history->>'audited')::timestamptz AS audited_at, m.name AS manufacturer_name, d.name AS driver_name
       FROM tickets t
       JOIN users m ON m.id = t.manufacturer_id
       LEFT JOIN users d ON d.id = t.driver_id
       WHERE t.status = 'audited' ORDER BY (t.status_history->>'audited') DESC NULLS LAST LIMIT 5`
    );

    // 3. Top rated
    const topRatedM = await query(
      `SELECT u.id, u.name, urs.avg_stars, urs.ratings_count
       FROM users u
       JOIN user_rating_stats urs ON urs.user_id = u.id
       WHERE u.role = 'manufacturer'
       ORDER BY urs.avg_stars DESC, urs.ratings_count DESC
       LIMIT 5`
    );
    const topRatedD = await query(
      `SELECT u.id, u.name, urs.avg_stars, urs.ratings_count
       FROM users u
       JOIN user_rating_stats urs ON urs.user_id = u.id
       WHERE u.role = 'driver'
       ORDER BY urs.avg_stars DESC, urs.ratings_count DESC
       LIMIT 5`
    );

    // 4. Top by count
    const topCountM = await query(
      `SELECT u.id, u.name, COUNT(t.id)::int AS count
       FROM users u
       JOIN tickets t ON t.manufacturer_id = u.id
       WHERE u.role = 'manufacturer'
       GROUP BY u.id, u.name
       ORDER BY count DESC
       LIMIT 5`
    );
    const topCountD = await query(
      `SELECT u.id, u.name, COUNT(t.id)::int AS count
       FROM users u
       JOIN tickets t ON t.driver_id = u.id
       WHERE u.role = 'driver' AND t.status IN ('delivered', 'audited')
       GROUP BY u.id, u.name
       ORDER BY count DESC
       LIMIT 5`
    );

    // 5. Status distribution
    const statusDist = await query(
      `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(price), 0)::text AS amount
       FROM tickets
       GROUP BY status
       ORDER BY count DESC`
    );

    res.json({
      kpis,
      newest: {
        requested: newestRequested.rows,
        pending: newestPending.rows,
        audited: newestAudited.rows,
      },
      top_rated: {
        manufacturers: topRatedM.rows,
        drivers: topRatedD.rows,
      },
      top_by_count: {
        manufacturers: topCountM.rows,
        drivers: topCountD.rows,
      },
      status_distribution: statusDist.rows,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/admin/financial?group=day|week|month
 */
router.get('/admin/financial', requireRole('admin'), async (req, res, next) => {
  try {
    const { group = 'day', from, to, format } = req.query;

    const params = [];
    let whereClause = `WHERE t.status != 'requested'`;
    if (from) {
      params.push(from);
      whereClause += ` AND t.created_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      whereClause += ` AND t.created_at <= $${params.length}`;
    }

    // KPIs
    const kpiSql = `
      SELECT
        COALESCE(SUM(t.masar_fee) FILTER (WHERE t.status = 'audited'), 0)::text AS masar_income,
        COALESCE(SUM(t.escrow_fee) FILTER (WHERE t.status = 'audited'), 0)::text AS escrow_commissions,
        COALESCE(SUM(t.price), 0)::text AS volume,
        COALESCE(SUM(t.price) FILTER (WHERE t.status IN ('pending', 'waiting_load', 'in_delivery', 'delivered')), 0)::text AS held,
        COALESCE(SUM(t.price) FILTER (WHERE t.status = 'audited'), 0)::text AS released
      FROM tickets t
      ${whereClause}
    `;
    const kpiRes = await query(kpiSql, params);

    // Grouping interval
    let dateTrunc = "DATE_TRUNC('day', t.created_at AT TIME ZONE 'Asia/Amman')";
    let dateFormat = 'YYYY-MM-DD';
    if (group === 'week') {
      dateTrunc = "DATE_TRUNC('week', t.created_at AT TIME ZONE 'Asia/Amman')";
      dateFormat = 'YYYY-"W"IW';
    } else if (group === 'month') {
      dateTrunc = "DATE_TRUNC('month', t.created_at AT TIME ZONE 'Asia/Amman')";
      dateFormat = 'YYYY-MM';
    }

    const seriesSql = `
      SELECT
        TO_CHAR(${dateTrunc}, '${dateFormat}') AS period,
        COALESCE(SUM(t.masar_fee) FILTER (WHERE t.status = 'audited'), 0)::numeric(12,3) AS masar_income,
        COALESCE(SUM(t.escrow_fee) FILTER (WHERE t.status = 'audited'), 0)::numeric(12,3) AS escrow_commissions,
        COALESCE(SUM(t.price), 0)::numeric(12,3) AS volume
      FROM tickets t
      ${whereClause}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    const seriesRes = await query(seriesSql, params);

    // By manufacturer
    const mSql = `
      SELECT
        m.id AS manufacturer_id,
        m.name,
        COALESCE(SUM(t.price), 0)::numeric(12,3) AS volume,
        COUNT(t.id)::int AS count,
        COALESCE(SUM(t.masar_fee) FILTER (WHERE t.status = 'audited'), 0)::numeric(12,3) AS masar_revenue
      FROM users m
      JOIN tickets t ON t.manufacturer_id = m.id
      ${whereClause}
      GROUP BY m.id, m.name
      ORDER BY volume DESC
    `;
    const mRes = await query(mSql, params);

    // By driver
    const dSql = `
      SELECT
        d.id AS driver_id,
        d.name,
        COALESCE(SUM(t.price), 0)::numeric(12,3) AS volume,
        COUNT(t.id)::int AS count,
        COALESCE(SUM(t.driver_net) FILTER (WHERE t.status = 'audited'), 0)::numeric(12,3) AS driver_net
      FROM users d
      JOIN tickets t ON t.driver_id = d.id
      ${whereClause}
      GROUP BY d.id, d.name
      ORDER BY volume DESC
    `;
    const dRes = await query(dSql, params);

    if (format === 'csv') {
      const columns = [
        { key: 'period', label: 'Period' },
        { key: 'masar_income', label: 'Masar Income (JD)' },
        { key: 'escrow_commissions', label: 'Escrow Fee (JD)' },
        { key: 'volume', label: 'Total Volume (JD)' },
      ];
      return sendCsvResponse(res, `financial-report-${Date.now()}.csv`, seriesRes.rows, columns);
    }

    res.json({
      kpis: kpiRes.rows[0],
      income_series: seriesRes.rows.map((r) => ({
        period: r.period,
        masar_income: parseFloat(r.masar_income),
        escrow_commissions: parseFloat(r.escrow_commissions),
        volume: parseFloat(r.volume),
      })),
      by_manufacturer: mRes.rows,
      by_driver: dRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/admin/map
 */
router.get('/admin/map', requireRole('admin'), async (req, res, next) => {
  try {
    const sql = `
      SELECT
        t.id AS ticket_id,
        t.ticket_number,
        t.status,
        t.pickup_lat,
        t.pickup_lng,
        t.pickup_city,
        t.dest_lat,
        t.dest_lng,
        t.dest_city,
        t.route_geometry,
        t.distance_km,
        (t.status_history->>'in_delivery') AS in_delivery_at,
        d.name AS driver_name
      FROM tickets t
      LEFT JOIN users d ON d.id = t.driver_id
      WHERE t.status IN ('pending', 'waiting_load', 'in_delivery')
      ORDER BY t.created_at DESC
    `;
    const result = await query(sql);

    const items = result.rows.map((r) => ({
      ticket_id: r.ticket_id,
      ticket_number: r.ticket_number,
      status: r.status,
      pickup: {
        lat: parseFloat(r.pickup_lat),
        lng: parseFloat(r.pickup_lng),
        city: r.pickup_city,
      },
      dest: {
        lat: parseFloat(r.dest_lat),
        lng: parseFloat(r.dest_lng),
        city: r.dest_city,
      },
      route_geometry: r.route_geometry,
      distance_km: r.distance_km ? parseFloat(r.distance_km) : null,
      in_delivery_at: r.in_delivery_at,
      driver_name: r.driver_name,
    }));

    res.json({ items });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/admin/activity?limit=30&before=
 */
router.get('/admin/activity', requireRole('admin'), async (req, res, next) => {
  try {
    const { limit = 30, before } = req.query;
    const maxLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 30));

    const params = [];
    let whereClause = '';
    if (before) {
      params.push(before);
      whereClause = `WHERE a.created_at < $1`;
    }

    params.push(maxLimit);
    const sql = `
      SELECT
        a.id,
        a.type AS action,
        a.params AS details,
        a.created_at,
        u.id AS actor_id,
        u.name AS actor_name,
        u.role AS actor_role,
        t.id AS ticket_id,
        t.ticket_number
      FROM activity_log a
      LEFT JOIN users u ON u.id = a.actor_id
      LEFT JOIN tickets t ON t.id = a.ticket_id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${params.length}
    `;

    const result = await query(sql, params);
    res.json({ items: result.rows });
  } catch (err) {
    next(err);
  }
});

export default router;
