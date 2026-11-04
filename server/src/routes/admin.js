import express from 'express';
import bcrypt from 'bcryptjs';
import { query, tx } from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { getPresignedDownloadUrl } from '../services/storage.js';
import { serializeUser } from '../serializers/user.js';

const router = express.Router();
router.use(auth);
router.use(requireRole('admin'));

/**
 * GET /api/admin/approvals?type=manufacturer|driver
 * Returns pending signups with presigned document URLs for inspection.
 */
router.get('/approvals', async (req, res, next) => {
  try {
    const type = req.query.type; // optional filter 'manufacturer' | 'driver'

    let whereClause = `WHERE u.status = 'pending'`;
    const params = [];
    if (type) {
      params.push(type);
      whereClause += ` AND u.role = $1`;
    }

    const usersRes = await query(
      `SELECT u.id, u.role, u.name, u.email, u.phone, u.status, u.created_at, u.language
       FROM users u
       ${whereClause}
       ORDER BY u.created_at ASC`,
      params
    );

    const items = [];
    for (const u of usersRes.rows) {
      if (u.role === 'manufacturer') {
        const pRes = await query(
          `SELECT p.*,
                  ARRAY(
                    SELECT gc.name_en
                    FROM manufacturer_goods_categories mgc
                    JOIN goods_categories gc ON gc.id = mgc.goods_category_id
                    WHERE mgc.manufacturer_id = p.user_id
                  ) AS category_names
           FROM manufacturer_profiles p
           WHERE p.user_id = $1`,
          [u.id]
        );
        const profile = pRes.rows[0];

        // Presigned document URLs
        let crUrl = null;
        let plUrl = null;
        if (profile?.commercial_registration_key) {
          crUrl = await getPresignedDownloadUrl(profile.commercial_registration_key);
        }
        if (profile?.professions_license_key) {
          plUrl = await getPresignedDownloadUrl(profile.professions_license_key);
        }

        items.push({
          ...u,
          profile: profile
            ? {
                ...profile,
                commercial_registration_url: crUrl,
                professions_license_url: plUrl,
              }
            : null,
        });
      } else if (u.role === 'driver') {
        const dRes = await query(
          `SELECT d.*,
                  t.plate_number, t.cooling, t.adr_certified, t.gross_weight_code,
                  t.license_doc_key AS truck_license_doc_key, t.photo_keys, t.adr_doc_key,
                  tt.type_name_en, tt.type_name_ar, tt.body_name_en, tt.body_name_ar,
                  tt.category AS truck_category
           FROM driver_profiles d
           LEFT JOIN trucks t ON t.driver_id = d.user_id
           LEFT JOIN truck_types tt ON tt.id = t.truck_type_id
           WHERE d.user_id = $1`,
          [u.id]
        );
        const profile = dRes.rows[0];

        let idUrl = null;
        let licUrl = null;
        let passportUrl = null;
        let truckLicUrl = null;
        let adrUrl = null;
        const photoUrls = [];

        if (profile?.id_doc_key) idUrl = await getPresignedDownloadUrl(profile.id_doc_key);
        if (profile?.license_doc_key) licUrl = await getPresignedDownloadUrl(profile.license_doc_key);
        if (profile?.passport_doc_key) passportUrl = await getPresignedDownloadUrl(profile.passport_doc_key);
        if (profile?.truck_license_doc_key) truckLicUrl = await getPresignedDownloadUrl(profile.truck_license_doc_key);
        if (profile?.adr_doc_key) adrUrl = await getPresignedDownloadUrl(profile.adr_doc_key);

        if (Array.isArray(profile?.photo_keys)) {
          for (const key of profile.photo_keys) {
            photoUrls.push(await getPresignedDownloadUrl(key));
          }
        }

        items.push({
          ...u,
          profile: profile
            ? {
                ...profile,
                id_doc_url: idUrl,
                license_doc_url: licUrl,
                passport_doc_url: passportUrl,
                truck_license_doc_url: truckLicUrl,
                adr_doc_url: adrUrl,
                truck_photos: photoUrls,
              }
            : null,
        });
      }
    }

    res.json({ items, total: items.length });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/users/:id/approve
 * Approves a pending user.
 */
router.post('/users/:id/approve', async (req, res, next) => {
  try {
    const userId = req.params.id;

    const uRes = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
    if (uRes.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'User not found', 404);
    }

    await tx(async (client) => {
      await client.query(
        `UPDATE users
         SET status = 'approved', approved_at = now(), rejection_reason = null
         WHERE id = $1`,
        [userId]
      );

      // Create notification
      await client.query(
        `INSERT INTO notifications (user_id, type, params, link)
         VALUES ($1, 'account_approved', '{}', '/${uRes.rows[0].role}')`,
        [userId]
      );
    });

    res.json({ success: true, message: 'User approved successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/users/:id/reject
 * Rejects a pending user with reason.
 */
router.post('/users/:id/reject', async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      throw new AppError('VALIDATION_ERROR', 'A rejection reason is required', 400);
    }

    const uRes = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
    if (uRes.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'User not found', 404);
    }

    await tx(async (client) => {
      await client.query(
        `UPDATE users
         SET status = 'rejected', rejection_reason = $1
         WHERE id = $2`,
        [reason.trim(), userId]
      );

      await client.query(
        `INSERT INTO notifications (user_id, type, params)
         VALUES ($1, 'account_rejected', $2)`,
        [userId, JSON.stringify({ reason: reason.trim() })]
      );
    });

    res.json({ success: true, message: 'User registration rejected' });
  } catch (err) {
    next(err);
  }
});

export default router;

