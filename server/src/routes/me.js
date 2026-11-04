import express from 'express';
import bcrypt from 'bcryptjs';
import { query, tx } from '../db.js';
import { auth } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import {
  serializeUser,
  serializeManufacturerProfile,
  serializeDriverProfile,
} from '../serializers/user.js';

const router = express.Router();
router.use(auth);

/**
 * GET /api/me
 * Returns current user + profile (+ truck for driver)
 */
router.get('/', async (req, res, next) => {
  try {
    const user = req.user;
    let profileData = null;

    if (user.role === 'manufacturer') {
      const pRes = await query(
        `SELECT p.*,
                ARRAY(
                  SELECT mgc.goods_category_id
                  FROM manufacturer_goods_categories mgc
                  WHERE mgc.manufacturer_id = p.user_id
                ) AS goods_categories
         FROM manufacturer_profiles p
         WHERE p.user_id = $1`,
        [user.id]
      );
      if (pRes.rows[0]) {
        profileData = serializeManufacturerProfile(
          { ...pRes.rows[0], name: user.name },
          user.role,
          { isOwn: true }
        );
      }
    } else if (user.role === 'driver') {
      const dRes = await query(
        `SELECT d.*,
                t.plate_number, t.cooling, t.adr_certified, t.gross_weight_code, t.photo_keys,
                tt.category AS truck_category, tt.type_name_en, tt.type_name_ar,
                tt.body_name_en, tt.body_name_ar
         FROM driver_profiles d
         LEFT JOIN trucks t ON t.driver_id = d.user_id
         LEFT JOIN truck_types tt ON tt.id = t.truck_type_id
         WHERE d.user_id = $1`,
        [user.id]
      );
      if (dRes.rows[0]) {
        const row = dRes.rows[0];
        const truck = row.plate_number
          ? {
              category: row.truck_category,
              type_name: user.language === 'ar' ? row.type_name_ar : row.type_name_en,
              body_name: user.language === 'ar' ? row.body_name_ar : row.body_name_en,
              plate_number: row.plate_number,
              cooling: row.cooling,
              adr_certified: row.adr_certified,
              photos: row.photo_keys || [],
            }
          : null;
        profileData = serializeDriverProfile(
          { ...row, name: user.name, phone: user.phone, email: user.email, truck },
          user.role,
          { isOwn: true }
        );
      }
    }

    res.json({
      ...serializeUser(user, user.role),
      profile: profileData,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/me
 * Update editable profile fields per role (04 §2)
 */
router.patch('/', async (req, res, next) => {
  try {
    const user = req.user;
    const {
      name,
      language,
      timezone,
      email_notifications,
      contact_person,
      phones,
      emails,
      goods_category_ids,
      iban,
      cliq_alias,
      scope,
      license_class,
    } = req.body;

    await tx(async (client) => {
      // 1. Update basic user fields
      const updates = [];
      const values = [];
      let idx = 1;

      if (name !== undefined) {
        updates.push(`name = $${idx++}`);
        values.push(name);
      }
      if (language !== undefined) {
        updates.push(`language = $${idx++}`);
        values.push(language);
      }
      if (timezone !== undefined) {
        updates.push(`timezone = $${idx++}`);
        values.push(timezone);
      }
      if (email_notifications !== undefined) {
        updates.push(`email_notifications = $${idx++}`);
        values.push(email_notifications);
      }

      if (updates.length > 0) {
        values.push(user.id);
        await client.query(
          `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`,
          values
        );
      }

      // 2. Role-specific profile updates
      if (user.role === 'manufacturer') {
        const pUpdates = [];
        const pValues = [];
        let pIdx = 1;

        if (contact_person !== undefined) {
          pUpdates.push(`contact_person = $${pIdx++}`);
          pValues.push(contact_person);
        }
        if (phones !== undefined) {
          pUpdates.push(`phones = $${pIdx++}`);
          pValues.push(phones);
        }
        if (emails !== undefined) {
          pUpdates.push(`emails = $${pIdx++}`);
          pValues.push(emails);
        }

        if (pUpdates.length > 0) {
          pValues.push(user.id);
          await client.query(
            `UPDATE manufacturer_profiles SET ${pUpdates.join(', ')} WHERE user_id = $${pIdx}`,
            pValues
          );
        }

        // Goods categories (instant update per 04 §2)
        if (Array.isArray(goods_category_ids)) {
          await client.query(`DELETE FROM manufacturer_goods_categories WHERE manufacturer_id = $1`, [user.id]);
          for (const catId of goods_category_ids) {
            await client.query(
              `INSERT INTO manufacturer_goods_categories (manufacturer_id, goods_category_id) VALUES ($1, $2)`,
              [user.id, catId]
            );
          }
        }
      } else if (user.role === 'driver') {
        const dUpdates = [];
        const dValues = [];
        let dIdx = 1;

        if (iban !== undefined) {
          dUpdates.push(`iban = $${dIdx++}`);
          dValues.push(iban);
        }
        if (cliq_alias !== undefined) {
          dUpdates.push(`cliq_alias = $${dIdx++}`);
          dValues.push(cliq_alias);
        }
        if (scope !== undefined) {
          dUpdates.push(`scope = $${dIdx++}`);
          dValues.push(scope);
        }
        if (license_class !== undefined) {
          dUpdates.push(`license_class = $${dIdx++}`);
          dValues.push(license_class);
        }

        if (dUpdates.length > 0) {
          dValues.push(user.id);
          await client.query(
            `UPDATE driver_profiles SET ${dUpdates.join(', ')} WHERE user_id = $${dIdx}`,
            dValues
          );
        }
      }
    });

    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/me/password
 * Body: { current_password, new_password }
 */
router.post('/password', async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      throw new AppError('VALIDATION_ERROR', 'Both current and new password are required', 400);
    }

    const uRes = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const isMatch = await bcrypt.compare(current_password, uRes.rows[0].password_hash);
    if (!isMatch) {
      throw new AppError('BAD_CREDENTIALS', 'Current password is incorrect', 400);
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/me/drivers
 * Returns drivers that worked on this manufacturer's shipments with trip counts and ratings.
 */
router.get('/drivers', async (req, res, next) => {
  try {
    if (req.user.role !== 'manufacturer') {
      throw new AppError('FORBIDDEN', 'Only manufacturers can access my drivers', 403);
    }

    const sql = `
      SELECT
        d.id,
        d.name,
        d.phone,
        COALESCE(urs.avg_stars, 0)::numeric(3,1) AS avg_rating,
        COALESCE(urs.ratings_count, 0)::int AS ratings_count,
        COUNT(t.id)::int AS trips_count,
        trk.plate_number,
        trk.photo_keys,
        tt.type_name_en,
        tt.body_name_en,
        tt.category AS truck_category
      FROM tickets t
      JOIN users d ON d.id = t.driver_id
      LEFT JOIN user_rating_stats urs ON urs.user_id = d.id
      LEFT JOIN trucks trk ON trk.driver_id = d.id
      LEFT JOIN truck_types tt ON tt.id = trk.truck_type_id
      WHERE t.manufacturer_id = $1 AND t.driver_id IS NOT NULL
      GROUP BY d.id, d.name, d.phone, urs.avg_stars, urs.ratings_count, trk.plate_number, trk.photo_keys, tt.type_name_en, tt.body_name_en, tt.category
      ORDER BY trips_count DESC, d.name ASC
    `;

    const result = await query(sql, [req.user.id]);
    res.json({ items: result.rows });
  } catch (err) {
    next(err);
  }
});

export default router;

