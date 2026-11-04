import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, tx } from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { getPresignedDownloadUrl } from '../services/storage.js';
import { serializeUser } from '../serializers/user.js';
import { notify, logActivity } from '../services/notifications.js';
import { sendEmail } from '../emails/service.js';

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

      // Notify user of account approval
      await notify({
        client,
        userIds: [userId],
        type: 'account_approved',
        link: `/${uRes.rows[0].role}`,
        email: {
          templateKey: 'AccountApproved',
          data: { name: uRes.rows[0].name, role: uRes.rows[0].role, userId },
        },
      });
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

      // Notify user of rejection with reason
      await notify({
        client,
        userIds: [userId],
        type: 'account_rejected',
        params: { reason: reason.trim() },
        email: {
          templateKey: 'AccountRejected',
          data: { name: uRes.rows[0].name, reason: reason.trim(), userId },
        },
      });
    });

    res.json({ success: true, message: 'User registration rejected' });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/users/:id
 * Admin edits any user's profile and settings, including a driver's truck.
 */
router.patch('/users/:id', async (req, res, next) => {
  try {
    const userId = req.params.id;
    const {
      name,
      email,
      phone,
      status,
      contact_person,
      phones,
      emails,
      scope,
      license_class,
      iban,
      cliq_alias,
      truck,
    } = req.body;

    const uRes = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
    if (uRes.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'User not found', 404);
    }
    const user = uRes.rows[0];

    await tx(async (client) => {
      // 1. Basic user fields
      const userUpdates = [];
      const userValues = [];
      let idx = 1;

      if (name !== undefined) {
        userUpdates.push(`name = $${idx++}`);
        userValues.push(name);
      }
      if (email !== undefined) {
        userUpdates.push(`email = $${idx++}`);
        userValues.push(email);
      }
      if (phone !== undefined) {
        userUpdates.push(`phone = $${idx++}`);
        userValues.push(phone);
      }
      if (status !== undefined) {
        userUpdates.push(`status = $${idx++}`);
        userValues.push(status);
      }

      if (userUpdates.length > 0) {
        userValues.push(userId);
        await client.query(
          `UPDATE users SET ${userUpdates.join(', ')} WHERE id = $${idx}`,
          userValues
        );
      }

      // 2. Profile updates
      if (user.role === 'manufacturer') {
        const mUpdates = [];
        const mValues = [];
        let mIdx = 1;

        if (contact_person !== undefined) {
          mUpdates.push(`contact_person = $${mIdx++}`);
          mValues.push(contact_person);
        }
        if (phones !== undefined) {
          mUpdates.push(`phones = $${mIdx++}`);
          mValues.push(phones);
        }
        if (emails !== undefined) {
          mUpdates.push(`emails = $${mIdx++}`);
          mValues.push(emails);
        }

        if (mUpdates.length > 0) {
          mValues.push(userId);
          await client.query(
            `UPDATE manufacturer_profiles SET ${mUpdates.join(', ')} WHERE user_id = $${mIdx}`,
            mValues
          );
        }
      } else if (user.role === 'driver') {
        const dUpdates = [];
        const dValues = [];
        let dIdx = 1;

        if (scope !== undefined) {
          dUpdates.push(`scope = $${dIdx++}`);
          dValues.push(scope);
        }
        if (license_class !== undefined) {
          dUpdates.push(`license_class = $${dIdx++}`);
          dValues.push(license_class);
        }
        if (iban !== undefined) {
          dUpdates.push(`iban = $${dIdx++}`);
          dValues.push(iban);
        }
        if (cliq_alias !== undefined) {
          dUpdates.push(`cliq_alias = $${dIdx++}`);
          dValues.push(cliq_alias);
        }

        if (dUpdates.length > 0) {
          dValues.push(userId);
          await client.query(
            `UPDATE driver_profiles SET ${dUpdates.join(', ')} WHERE user_id = $${dIdx}`,
            dValues
          );
        }

        // Truck update (admin only per 00 §6 / 04 §11)
        if (truck && typeof truck === 'object') {
          const { truck_type_id, plate_number, cooling, gross_weight_code, adr_certified } = truck;
          await client.query(
            `INSERT INTO trucks (driver_id, truck_type_id, plate_number, cooling, gross_weight_code, adr_certified)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (driver_id) DO UPDATE SET
               truck_type_id = COALESCE(EXCLUDED.truck_type_id, trucks.truck_type_id),
               plate_number = COALESCE(EXCLUDED.plate_number, trucks.plate_number),
               cooling = COALESCE(EXCLUDED.cooling, trucks.cooling),
               gross_weight_code = COALESCE(EXCLUDED.gross_weight_code, trucks.gross_weight_code),
               adr_certified = COALESCE(EXCLUDED.adr_certified, trucks.adr_certified)`,
            [
              userId,
              truck_type_id || null,
              plate_number || 'Registered',
              cooling || 'none',
              gross_weight_code || 'class_1',
              adr_certified || false,
            ]
          );
        }
      }

      await logActivity(client, {
        action: 'user_updated_by_admin',
        userId: req.user.id,
        details: { target_user_id: userId, changes: req.body },
      });
    });

    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Generates a temporary password and emails it once per 04 §11.
 */
router.post('/users/:id/reset-password', async (req, res, next) => {
  try {
    const userId = req.params.id;

    const uRes = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
    if (uRes.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'User not found', 404);
    }
    const user = uRes.rows[0];

    const tempPassword = `Masar@${crypto.randomInt(100000, 999999)}`;
    const newHash = await bcrypt.hash(tempPassword, 10);

    await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, userId]);

    if (user.email) {
      await sendEmail({
        to: user.email,
        templateKey: 'AccountCreatedByAdmin', // reuse password credentials layout
        data: {
          name: user.name,
          role: user.role,
          identifier: user.email,
          tempPassword,
          userId: user.id,
        },
      });
    }

    res.json({
      success: true,
      message: 'Temporary password generated and dispatched',
      temp_password: tempPassword,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/ratings
 * All platform ratings with filter options per 04 §10
 */
router.get('/ratings', async (req, res, next) => {
  try {
    const { stars, from_user_id, to_user_id, page = 1, page_size = 20 } = req.query;

    const params = [];
    const conditions = [];

    if (stars) {
      params.push(parseInt(stars, 10));
      conditions.push(`r.stars = $${params.length}`);
    }
    if (from_user_id) {
      params.push(from_user_id);
      conditions.push(`r.from_user_id = $${params.length}`);
    }
    if (to_user_id) {
      params.push(to_user_id);
      conditions.push(`r.to_user_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM ratings r ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const limit = Math.max(1, Math.min(100, parseInt(page_size, 10) || 20));
    const offset = Math.max(0, ((parseInt(page, 10) || 1) - 1) * limit);

    const sql = `
      SELECT
        r.id,
        r.ticket_id,
        r.stars,
        r.comment,
        r.created_at,
        u_from.id AS from_user_id,
        u_from.name AS from_user_name,
        u_from.role AS from_user_role,
        u_to.id AS to_user_id,
        u_to.name AS to_user_name,
        u_to.role AS to_user_role,
        t.ticket_number
      FROM ratings r
      JOIN users u_from ON u_from.id = r.from_user_id
      JOIN users u_to ON u_to.id = r.to_user_id
      JOIN tickets t ON t.id = r.ticket_id
      ${whereClause}
      ORDER BY r.created_at DESC
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

export default router;

