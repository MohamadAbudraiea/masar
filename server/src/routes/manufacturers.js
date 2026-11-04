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
 * GET /api/manufacturers
 * Role: admin, escrow
 */
router.get('/', requireRole('admin', 'escrow'), async (req, res, next) => {
  try {
    const { q, page = 1, page_size = 20 } = req.query;

    const params = [];
    let whereClause = `WHERE u.role = 'manufacturer'`;

    if (q) {
      params.push(`%${q.trim()}%`);
      whereClause += ` AND (u.name ILIKE $${params.length} OR u.phone ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    const countRes = await query(`SELECT COUNT(*) FROM users u ${whereClause}`, params);
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
        p.contact_person,
        COALESCE(urs.avg_stars, 0)::numeric(3,1) AS avg_stars,
        COALESCE(urs.ratings_count, 0)::int AS ratings_count,
        (SELECT COUNT(*)::int FROM tickets t WHERE t.manufacturer_id = u.id) AS tickets_count,
        (SELECT COALESCE(SUM(t.price), 0)::text FROM tickets t WHERE t.manufacturer_id = u.id AND t.status != 'requested') AS total_volume
      FROM users u
      LEFT JOIN manufacturer_profiles p ON p.user_id = u.id
      LEFT JOIN user_rating_stats urs ON urs.user_id = u.id
      ${whereClause}
      ORDER BY u.created_at DESC
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
 * GET /api/manufacturers/:id
 * Viewer-shaped profile per 01 §11 & 04 §7
 */
router.get('/:id', async (req, res, next) => {
  try {
    const manufacturerId = req.params.id;
    const userRole = req.user.role;
    const currentUserId = req.user.id;

    // Check permissions
    if (userRole === 'driver') {
      const accessCheck = await query(
        `SELECT 1 FROM tickets WHERE driver_id = $1 AND manufacturer_id = $2 LIMIT 1`,
        [currentUserId, manufacturerId]
      );
      if (accessCheck.rows.length === 0) {
        throw new AppError('FORBIDDEN', 'You have not completed shipments with this manufacturer', 403);
      }
    } else if (userRole === 'manufacturer' && currentUserId !== manufacturerId) {
      throw new AppError('FORBIDDEN', 'Access denied to other manufacturer profiles', 403);
    } else if (!['admin', 'escrow', 'driver', 'manufacturer'].includes(userRole)) {
      throw new AppError('FORBIDDEN', 'Access denied', 403);
    }

    const uRes = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at, u.language,
              p.contact_person, p.phones, p.emails,
              p.commercial_registration_key, p.professions_license_key,
              COALESCE(urs.avg_stars, 0)::numeric(3,1) AS avg_stars,
              COALESCE(urs.ratings_count, 0)::int AS ratings_count
       FROM users u
       LEFT JOIN manufacturer_profiles p ON p.user_id = u.id
       LEFT JOIN user_rating_stats urs ON urs.user_id = u.id
       WHERE u.id = $1 AND u.role = 'manufacturer'`,
      [manufacturerId]
    );

    if (uRes.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Manufacturer not found', 404);
    }

    const m = uRes.rows[0];

    // Locations
    const locRes = await query(
      `SELECT id, kind, label, address, lat, lng, city, area, is_default
       FROM locations
       WHERE owner_id = $1
       ORDER BY is_default DESC, last_used_at DESC NULLS LAST`,
      [manufacturerId]
    );

    // Goods Categories
    const catRes = await query(
      `SELECT gc.id, gc.name_en, gc.name_ar
       FROM manufacturer_goods_categories mgc
       JOIN goods_categories gc ON gc.id = mgc.goods_category_id
       WHERE mgc.manufacturer_id = $1`,
      [manufacturerId]
    );

    // Role-shaped extra fields
    let documents = undefined;
    if (userRole === 'admin' || (userRole === 'manufacturer' && currentUserId === manufacturerId)) {
      documents = {
        commercial_registration_url: m.commercial_registration_key
          ? await getPresignedDownloadUrl(m.commercial_registration_key)
          : null,
        professions_license_url: m.professions_license_key
          ? await getPresignedDownloadUrl(m.professions_license_key)
          : null,
      };
    }

    let financial_stats = undefined;
    if (userRole === 'escrow' || userRole === 'admin') {
      const statsRes = await query(
        `SELECT
           COUNT(*)::int AS total_shipments,
           COALESCE(SUM(price) FILTER (WHERE status != 'requested'), 0)::text AS total_deposited,
           COALESCE(SUM(price) FILTER (WHERE status IN ('pending', 'waiting_load', 'in_delivery', 'delivered')), 0)::text AS held,
           COALESCE(SUM(price) FILTER (WHERE status = 'audited'), 0)::text AS released
         FROM tickets
         WHERE manufacturer_id = $1`,
        [manufacturerId]
      );
      financial_stats = statsRes.rows[0];
    }

    // Driver's limited view
    if (userRole === 'driver') {
      return res.json({
        id: m.id,
        name: m.name,
        phone: m.phone,
        avg_stars: m.avg_stars,
        ratings_count: m.ratings_count,
        locations: locRes.rows.map((l) => ({
          city: l.city,
          area: l.area,
          lat: l.lat,
          lng: l.lng,
          address: l.address,
        })),
      });
    }

    res.json({
      id: m.id,
      name: m.name,
      email: m.email,
      phone: m.phone,
      status: m.status,
      created_at: m.created_at,
      contact_person: m.contact_person,
      phones: m.phones || [m.phone],
      emails: m.emails || [m.email],
      avg_stars: m.avg_stars,
      ratings_count: m.ratings_count,
      locations: locRes.rows,
      goods_categories: catRes.rows,
      documents,
      financial_stats,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/manufacturers/:id/tickets
 * Role: admin, escrow
 */
router.get('/:id/tickets', requireRole('admin', 'escrow'), async (req, res, next) => {
  try {
    const manufacturerId = req.params.id;
    const { status, page = 1, page_size = 20 } = req.query;

    const params = [manufacturerId];
    let whereClause = `WHERE t.manufacturer_id = $1`;

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
        d.name AS driver_name,
        d.phone AS driver_phone
      FROM tickets t
      LEFT JOIN goods_categories gc ON gc.id = t.goods_category_id
      LEFT JOIN users d ON d.id = t.driver_id
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
 * GET /api/manufacturers/:id/ratings
 */
router.get('/:id/ratings', async (req, res, next) => {
  try {
    const manufacturerId = req.params.id;
    const sql = `
      SELECT
        r.id,
        r.stars,
        r.comment,
        r.created_at,
        u.name AS from_name,
        t.ticket_number
      FROM ratings r
      JOIN users u ON u.id = r.from_user_id
      JOIN tickets t ON t.id = r.ticket_id
      WHERE r.to_user_id = $1
      ORDER BY r.created_at DESC
    `;
    const result = await query(sql, [manufacturerId]);
    res.json({ items: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/manufacturers
 * Admin manual creation per 04 §11
 */
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const {
      name,
      contact_person,
      phones = [],
      emails = [],
      location,
      goods_category_ids = [],
      commercial_registration_key,
      professions_license_key,
      language = 'en',
    } = req.body;

    if (!name || (!emails.length && !req.body.email) || (!phones.length && !req.body.phone)) {
      throw new AppError('VALIDATION_ERROR', 'Name, email, and phone are required', 400);
    }

    const primaryEmail = emails[0] || req.body.email;
    const primaryPhone = phones[0] || req.body.phone;

    // Generate random secure temporary password
    const tempPassword = `Masar@${crypto.randomInt(100000, 999999)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    let createdUser;
    await tx(async (client) => {
      const uRes = await client.query(
        `INSERT INTO users (role, name, email, phone, password_hash, status, language, approved_at, created_by_admin)
         VALUES ('manufacturer', $1, $2, $3, $4, 'approved', $5, now(), true)
         RETURNING id, role, name, email, phone, status, created_at`,
        [name, primaryEmail, primaryPhone, passwordHash, language]
      );
      createdUser = uRes.rows[0];

      await client.query(
        `INSERT INTO manufacturer_profiles (user_id, contact_person, phones, emails, commercial_registration_key, professions_license_key)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          createdUser.id,
          contact_person || null,
          phones.length ? phones : [primaryPhone],
          emails.length ? emails : [primaryEmail],
          commercial_registration_key || null,
          professions_license_key || null,
        ]
      );

      // Default pickup location if provided
      if (location && location.address) {
        await client.query(
          `INSERT INTO locations (owner_id, kind, label, address, lat, lng, city, area, is_default)
           VALUES ($1, 'pickup', $2, $3, $4, $5, $6, $7, true)`,
          [
            createdUser.id,
            location.label || 'Main Warehouse',
            location.address,
            location.lat || 31.95,
            location.lng || 35.91,
            location.city || 'Amman',
            location.area || 'Industrial Area',
          ]
        );
      }

      // Categories
      for (const catId of goods_category_ids) {
        await client.query(
          `INSERT INTO manufacturer_goods_categories (manufacturer_id, goods_category_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [createdUser.id, catId]
        );
      }

      await logActivity(client, {
        action: 'manufacturer_created_by_admin',
        userId: req.user.id,
        details: { manufacturer_id: createdUser.id, name: createdUser.name },
      });
    });

    // Send AccountCreatedByAdmin email
    await sendEmail({
      to: primaryEmail,
      templateKey: 'AccountCreatedByAdmin',
      data: {
        name: createdUser.name,
        role: 'manufacturer',
        identifier: primaryEmail,
        tempPassword,
        userId: createdUser.id,
      },
    });

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
