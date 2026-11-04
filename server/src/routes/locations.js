import express from 'express';
import { query, tx } from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { reverseGeocode } from '../services/geo.js';

const router = express.Router();
router.use(auth);

/**
 * GET /api/locations?kind=pickup|destination
 * Returns user's saved locations. Sorted: default first, then last_used_at DESC.
 */
router.get('/', async (req, res, next) => {
  try {
    const { kind } = req.query;
    let sql = `
      SELECT id, owner_id, kind, label, address, lat, lng, city, area,
             contact_name, contact_phone, is_default, last_used_at, created_at
      FROM locations
      WHERE owner_id = $1
    `;
    const params = [req.user.id];

    if (kind) {
      params.push(kind);
      sql += ` AND kind = $${params.length}`;
    }

    sql += ` ORDER BY is_default DESC, last_used_at DESC NULLS LAST, created_at DESC`;

    const result = await query(sql, params);
    res.json({ items: result.rows, total: result.rows.length });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/locations
 * Creates a new saved location.
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      kind,
      label,
      address,
      lat,
      lng,
      city: providedCity,
      area: providedArea,
      contact_name,
      contact_phone,
      is_default,
    } = req.body;

    if (!kind || !['pickup', 'destination'].includes(kind)) {
      throw new AppError('VALIDATION_ERROR', 'Valid kind (pickup or destination) is required', 400);
    }
    if (!label || !address || lat == null || lng == null) {
      throw new AppError('VALIDATION_ERROR', 'label, address, lat, and lng are required', 400);
    }

    let city = providedCity;
    let area = providedArea;

    if (!city || !area) {
      try {
        const rev = await reverseGeocode(lat, lng);
        if (!city && rev.city) city = rev.city;
        if (!area && rev.area) area = rev.area;
      } catch (e) {
        // Fallback gracefully
      }
    }

    const loc = await tx(async (client) => {
      if (is_default) {
        await client.query(
          `UPDATE locations SET is_default = false WHERE owner_id = $1 AND kind = $2`,
          [req.user.id, kind]
        );
      }

      const insertRes = await client.query(
        `INSERT INTO locations (
          owner_id, kind, label, address, lat, lng, city, area,
          contact_name, contact_phone, is_default, last_used_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
        RETURNING *`,
        [
          req.user.id,
          kind,
          label.trim(),
          address.trim(),
          Number(lat),
          Number(lng),
          city || 'Amman',
          area || null,
          contact_name ? contact_name.trim() : null,
          contact_phone ? contact_phone.trim() : null,
          !!is_default,
        ]
      );
      return insertRes.rows[0];
    });

    res.status(201).json(loc);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/locations/:id
 * Updates an existing location or marks it as default.
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      label,
      address,
      lat,
      lng,
      city,
      area,
      contact_name,
      contact_phone,
      is_default,
    } = req.body;

    const existing = await query(
      `SELECT * FROM locations WHERE id = $1 AND owner_id = $2`,
      [id, req.user.id]
    );
    if (existing.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Location not found', 404);
    }

    const current = existing.rows[0];

    const updated = await tx(async (client) => {
      if (is_default) {
        await client.query(
          `UPDATE locations SET is_default = false WHERE owner_id = $1 AND kind = $2`,
          [req.user.id, current.kind]
        );
      }

      const res = await client.query(
        `UPDATE locations
         SET label = COALESCE($1, label),
             address = COALESCE($2, address),
             lat = COALESCE($3, lat),
             lng = COALESCE($4, lng),
             city = COALESCE($5, city),
             area = COALESCE($6, area),
             contact_name = COALESCE($7, contact_name),
             contact_phone = COALESCE($8, contact_phone),
             is_default = COALESCE($9, is_default)
         WHERE id = $10 AND owner_id = $11
         RETURNING *`,
        [
          label !== undefined ? label.trim() : null,
          address !== undefined ? address.trim() : null,
          lat !== undefined ? Number(lat) : null,
          lng !== undefined ? Number(lng) : null,
          city !== undefined ? city.trim() : null,
          area !== undefined ? area.trim() : null,
          contact_name !== undefined ? (contact_name ? contact_name.trim() : null) : null,
          contact_phone !== undefined ? (contact_phone ? contact_phone.trim() : null) : null,
          is_default !== undefined ? !!is_default : null,
          id,
          req.user.id,
        ]
      );
      return res.rows[0];
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/locations/:id
 * Deletes a location. Tickets that referenced it will keep their snapshot.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `DELETE FROM locations WHERE id = $1 AND owner_id = $2 RETURNING id`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Location not found', 404);
    }
    res.json({ success: true, id });
  } catch (err) {
    next(err);
  }
});

export default router;

