import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, tx } from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { getPresignedDownloadUrl } from '../services/storage.js';
import { sendEmail } from '../emails/service.js';
import { logActivity } from '../services/notifications.js';

const router = express.Router();
router.use(auth);

/**
 * GET /api/drivers
 * Role: admin, escrow
 */
router.get('/', requireRole('admin', 'escrow'), async (req, res, next) => {
  try {
    const { q, page = 1, page_size = 20 } = req.query;

    const params = [];
    let whereClause = `WHERE u.role = 'driver'`;

    if (q) {
      params.push(`%${q.trim()}%`);
      whereClause += ` AND (u.name ILIKE $${params.length} OR u.phone ILIKE $${params.length} OR u.email ILIKE $${params.length} OR trk.plate_number ILIKE $${params.length})`;
    }

    const countRes = await query(
      `SELECT COUNT(*)
       FROM users u
       LEFT JOIN trucks trk ON trk.driver_id = u.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const limit = Math.max(1, Math.min(100, parseInt(page_size, 10) || 20));
    const offset = Math.max(0, ((parseInt(page, 10) || 1) - 1) * limit);

    const sql = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.status,
        u.created_at,
        dp.scope,
        dp.license_class,
        dp.iban,
        dp.cliq_alias,
        trk.plate_number,
        trk.cooling,
        trk.adr_certified,
        trk.photo_keys,
        tt.id AS truck_type_id,
        tt.type_name_en,
        tt.body_name_en,
        tt.category AS truck_category,
        COALESCE(urs.avg_stars, 0)::numeric(3,1) AS avg_stars,
        COALESCE(urs.ratings_count, 0)::int AS ratings_count,
        (SELECT COUNT(*)::int FROM tickets t WHERE t.driver_id = u.id AND t.status IN ('delivered', 'audited')) AS completed_count,
        (SELECT COALESCE(SUM(t.driver_net), 0)::text FROM tickets t WHERE t.driver_id = u.id AND t.status = 'audited') AS total_earnings
      FROM users u
      LEFT JOIN driver_profiles dp ON dp.user_id = u.id
      LEFT JOIN trucks trk ON trk.driver_id = u.id
      LEFT JOIN truck_types tt ON tt.id = trk.truck_type_id
      LEFT JOIN user_rating_stats urs ON urs.user_id = u.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const result = await query(sql, params);

    const items = result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      status: r.status,
      created_at: r.created_at,
      scope: r.scope,
      license_class: r.license_class,
      iban: req.user.role === 'escrow' ? r.iban : undefined,
      cliq_alias: req.user.role === 'escrow' ? r.cliq_alias : undefined,
      avg_stars: r.avg_stars,
      ratings_count: r.ratings_count,
      completed_count: r.completed_count,
      total_earnings: req.user.role === 'admin' || req.user.role === 'escrow' ? r.total_earnings : undefined,
      truck: r.plate_number
        ? {
            id: r.truck_type_id,
            category: r.truck_category,
            type_name: r.type_name_en,
            body_name: r.body_name_en,
            plate_number: r.plate_number,
            cooling: r.cooling,
            adr_certified: r.adr_certified,
            photos: r.photo_keys || [],
          }
        : null,
    }));

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
 * GET /api/drivers/:id
 * Viewer-shaped driver profile
 */
router.get('/:id', async (req, res, next) => {
  try {
    const driverId = req.params.id;
    const userRole = req.user.role;
    const currentUserId = req.user.id;

    // Check permissions
    if (userRole === 'manufacturer') {
      const accessCheck = await query(
        `SELECT 1 FROM tickets WHERE driver_id = $1 AND manufacturer_id = $2 LIMIT 1`,
        [driverId, currentUserId]
      );
      if (accessCheck.rows.length === 0) {
        throw new AppError('FORBIDDEN', 'You have no shipments associated with this driver', 403);
      }
    } else if (userRole === 'driver' && currentUserId !== driverId) {
      throw new AppError('FORBIDDEN', 'Access denied to other driver profiles', 403);
    } else if (!['admin', 'escrow', 'manufacturer', 'driver'].includes(userRole)) {
      throw new AppError('FORBIDDEN', 'Access denied', 403);
    }

    const dRes = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at, u.language,
              dp.scope, dp.license_class, dp.iban, dp.cliq_alias,
              dp.id_doc_key, dp.license_doc_key, dp.passport_doc_key,
              trk.plate_number, trk.cooling, trk.adr_certified, trk.gross_weight_code,
              trk.license_doc_key AS truck_license_doc_key, trk.photo_keys, trk.adr_doc_key,
              tt.id AS truck_type_id, tt.category AS truck_category,
              tt.type_name_en, tt.type_name_ar, tt.body_name_en, tt.body_name_ar,
              COALESCE(urs.avg_stars, 0)::numeric(3,1) AS avg_stars,
              COALESCE(urs.ratings_count, 0)::int AS ratings_count,
              (SELECT COUNT(*)::int FROM tickets t WHERE t.driver_id = u.id AND t.status IN ('delivered', 'audited')) AS completed_count
       FROM users u
       LEFT JOIN driver_profiles dp ON dp.user_id = u.id
       LEFT JOIN trucks trk ON trk.driver_id = u.id
       LEFT JOIN truck_types tt ON tt.id = trk.truck_type_id
       LEFT JOIN user_rating_stats urs ON urs.user_id = u.id
       WHERE u.id = $1 AND u.role = 'driver'`,
      [driverId]
    );

    if (dRes.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Driver not found', 404);
    }

    const d = dRes.rows[0];

    // Truck photos presigned
    const photoUrls = [];
    if (Array.isArray(d.photo_keys)) {
      for (const k of d.photo_keys) {
        photoUrls.push(await getPresignedDownloadUrl(k));
      }
    }

    const truck = d.plate_number
      ? {
          type_id: d.truck_type_id,
          category: d.truck_category,
          type_name: d.type_name_en,
          body_name: d.body_name_en,
          plate_number: d.plate_number,
          cooling: d.cooling,
          adr_certified: d.adr_certified,
          gross_weight_code: d.gross_weight_code,
          photos: photoUrls,
        }
      : null;

    // Documents (admin or self)
    let documents = undefined;
    if (userRole === 'admin' || (userRole === 'driver' && currentUserId === driverId)) {
      documents = {
        id_doc_url: d.id_doc_key ? await getPresignedDownloadUrl(d.id_doc_key) : null,
        license_doc_url: d.license_doc_key ? await getPresignedDownloadUrl(d.license_doc_key) : null,
        passport_doc_url: d.passport_doc_key ? await getPresignedDownloadUrl(d.passport_doc_key) : null,
        truck_license_doc_url: d.truck_license_doc_key ? await getPresignedDownloadUrl(d.truck_license_doc_key) : null,
        adr_doc_url: d.adr_doc_key ? await getPresignedDownloadUrl(d.adr_doc_key) : null,
      };
    }

    // Escrow financial stats & payout info
    let payout = undefined;
    let financial_stats = undefined;
    if (userRole === 'escrow' || userRole === 'admin') {
      payout = {
        iban: d.iban,
        cliq_alias: d.cliq_alias,
      };

      const statsRes = await query(
        `SELECT
           COALESCE(SUM(driver_net) FILTER (WHERE status IN ('waiting_load', 'in_delivery', 'delivered')), 0)::text AS pending_release,
           COALESCE(SUM(driver_net) FILTER (WHERE status = 'audited'), 0)::text AS total_released,
           COUNT(*)::int AS total_shipments
         FROM tickets
         WHERE driver_id = $1`,
        [driverId]
      );
      financial_stats = statsRes.rows[0];
    }

    // Manufacturer view (privacy-shaped per 01 §11)
    if (userRole === 'manufacturer') {
      // Fetch own shipments with this driver
      const ownTicketsRes = await query(
        `SELECT id, ticket_number, status, pickup_city, dest_city, created_at, price
         FROM tickets
         WHERE driver_id = $1 AND manufacturer_id = $2
         ORDER BY created_at DESC`,
        [driverId, currentUserId]
      );

      return res.json({
        id: d.id,
        name: d.name,
        phone: d.phone,
        avg_stars: d.avg_stars,
        ratings_count: d.ratings_count,
        completed_count: d.completed_count,
        truck,
        own_shipments: ownTicketsRes.rows,
      });
    }

    res.json({
      id: d.id,
      name: d.name,
      email: d.email,
      phone: d.phone,
      status: d.status,
      created_at: d.created_at,
      scope: d.scope,
      license_class: d.license_class,
      avg_stars: d.avg_stars,
      ratings_count: d.ratings_count,
      completed_count: d.completed_count,
      truck,
      documents,
      payout,
      financial_stats,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/drivers/:id/completed
 * Privacy-limited completed list for manufacturer viewer per 01 §11 & 04 §7:
 * Route (city -> city), date, rating, and manufacturer name as plain text (no links, no ticket numbers!).
 */
router.get('/:id/completed', requireRole('manufacturer'), async (req, res, next) => {
  try {
    const driverId = req.params.id;
    const currentUserId = req.user.id;

    const sql = `
      SELECT
        t.id,
        t.pickup_city,
        t.dest_city,
        t.audited_at AS date,
        CASE
          WHEN t.manufacturer_id = $2 THEN t.ticket_number
          ELSE NULL
        END AS ticket_number,
        m.name AS manufacturer_name,
        r.stars AS rating
      FROM tickets t
      JOIN users m ON m.id = t.manufacturer_id
      LEFT JOIN ratings r ON r.ticket_id = t.id AND r.from_user_id = t.manufacturer_id
      WHERE t.driver_id = $1 AND t.status IN ('delivered', 'audited')
      ORDER BY t.created_at DESC
    `;

    const result = await query(sql, [driverId, currentUserId]);
    res.json({ items: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/drivers/:id/tickets
 * Role: admin, escrow
 */
router.get('/:id/tickets', requireRole('admin', 'escrow'), async (req, res, next) => {
  try {
    const driverId = req.params.id;
    const { status, page = 1, page_size = 20 } = req.query;

    const params = [driverId];
    let whereClause = `WHERE t.driver_id = $1`;

    if (status) {
      const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
      if (statuses.length > 0) {
        params.push(statuses);
        whereClause += ` AND t.status = ANY($${params.length})`;
      }
    }

    const countRes = await query(`SELECT COUNT(*) FROM tickets t ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const limit = Math.max(1, Math.min(100, parseInt(page_size, 10) || 20));
    const offset = Math.max(0, ((parseInt(page, 10) || 1) - 1) * limit);

    const sql = `
      SELECT
        t.*,
        gc.name_en AS goods_category_name_en,
        m.name AS manufacturer_name,
        m.phone AS manufacturer_phone
      FROM tickets t
      JOIN users m ON m.id = t.manufacturer_id
      LEFT JOIN goods_categories gc ON gc.id = t.goods_category_id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const result = await query(sql, params);
    res.json({
      items: result.rows,
      total,
      page: parseInt(page, 10) || 1,
      page_size: limit,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/drivers
 * Admin manual driver creation per 04 §11
 */
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const {
      name,
      phone,
      email,
      scope = 'internal',
      license_class = 4,
      truck_type_id,
      plate_number,
      cooling = 'none',
      gross_weight_code,
      adr_certified = false,
      iban,
      cliq_alias,
      language = 'en',
    } = req.body;

    if (!name || !phone) {
      throw new AppError('VALIDATION_ERROR', 'Name and phone are required', 400);
    }

    // Generate random secure temporary password
    const tempPassword = `Masar@${crypto.randomInt(100000, 999999)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    let createdUser;
    await tx(async (client) => {
      const uRes = await client.query(
        `INSERT INTO users (role, name, email, phone, password_hash, status, language, approved_at, created_by_admin)
         VALUES ('driver', $1, $2, $3, $4, 'approved', $5, now(), true)
         RETURNING id, role, name, email, phone, status, created_at`,
        [name, email || null, phone, passwordHash, language]
      );
      createdUser = uRes.rows[0];

      await client.query(
        `INSERT INTO driver_profiles (user_id, scope, license_class, iban, cliq_alias)
         VALUES ($1, $2, $3, $4, $5)`,
        [createdUser.id, scope, license_class, iban || 'JO0000000000000000000000000000', cliq_alias || null]
      );

      if (truck_type_id) {
        await client.query(
          `INSERT INTO trucks (driver_id, truck_type_id, plate_number, cooling, gross_weight_code, adr_certified)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [createdUser.id, truck_type_id, plate_number || '12-34567', cooling, gross_weight_code || 'class_1', adr_certified]
        );
      }

      await logActivity(client, {
        action: 'driver_created_by_admin',
        userId: req.user.id,
        details: { driver_id: createdUser.id, name: createdUser.name },
      });
    });

    if (email) {
      await sendEmail({
        to: email,
        templateKey: 'AccountCreatedByAdmin',
        data: {
          name: createdUser.name,
          role: 'driver',
          identifier: email,
          tempPassword,
          userId: createdUser.id,
        },
      });
    }

    res.status(201).json({
      success: true,
      user: createdUser,
      temp_password: tempPassword,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

