import express from 'express';
import bcrypt from 'bcryptjs';
import { query, tx } from '../db.js';
import { auth } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';

const router = express.Router();
router.use(auth);

/**
 * GET /api/settings
 * Returns the current user's profile and preferences.
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const userRes = await query(
      `SELECT id, role, name, phone, email, language, timezone, email_notifications, status, created_at, approved_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    const user = userRes.rows[0];
    if (!user) {
      throw new AppError('NOT_FOUND', 'User not found', 404);
    }

    let profile = null;
    if (user.role === 'manufacturer') {
      const pRes = await query(
        `SELECT contact_person, phones, emails
         FROM manufacturer_profiles
         WHERE user_id = $1`,
        [userId]
      );
      profile = pRes.rows[0] || null;
    } else if (user.role === 'driver') {
      const dRes = await query(
        `SELECT scope, license_class, iban, cliq_alias
         FROM driver_profiles
         WHERE user_id = $1`,
        [userId]
      );
      profile = dRes.rows[0] || null;
    }

    res.json({
      user,
      profile,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/settings/profile
 * Updates basic profile fields (name, phone, email, contact info, payout info).
 */
router.patch('/profile', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, phone, email, contact_person, phones, emails, iban, cliq_alias } = req.body;

    await tx(async (client) => {
      // 1. Update basic user fields
      const updates = [];
      const params = [];
      let idx = 1;

      if (name !== undefined) {
        if (!name.trim()) throw new AppError('VALIDATION_ERROR', 'Name cannot be empty', 400);
        updates.push(`name = $${idx++}`);
        params.push(name.trim());
      }

      if (phone !== undefined) {
        if (!phone.trim()) throw new AppError('VALIDATION_ERROR', 'Phone cannot be empty', 400);
        updates.push(`phone = $${idx++}`);
        params.push(phone.trim());
      }

      if (email !== undefined) {
        updates.push(`email = $${idx++}`);
        params.push(email ? email.trim() : null);
      }

      if (updates.length > 0) {
        params.push(userId);
        await client.query(
          `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`,
          params
        );
      }

      // 2. Role-specific profile updates
      if (req.user.role === 'manufacturer') {
        const mUpdates = [];
        const mParams = [];
        let mIdx = 1;

        if (contact_person !== undefined) {
          mUpdates.push(`contact_person = $${mIdx++}`);
          mParams.push(contact_person ? contact_person.trim() : null);
        }
        if (phones !== undefined && Array.isArray(phones)) {
          mUpdates.push(`phones = $${mIdx++}`);
          mParams.push(phones);
        }
        if (emails !== undefined && Array.isArray(emails)) {
          mUpdates.push(`emails = $${mIdx++}`);
          mParams.push(emails);
        }

        if (mUpdates.length > 0) {
          mParams.push(userId);
          await client.query(
            `UPDATE manufacturer_profiles SET ${mUpdates.join(', ')} WHERE user_id = $${mIdx}`,
            mParams
          );
        }
      } else if (req.user.role === 'driver') {
        const dUpdates = [];
        const dParams = [];
        let dIdx = 1;

        if (iban !== undefined) {
          if (!iban.trim() || !iban.trim().startsWith('JO')) {
            throw new AppError('VALIDATION_ERROR', 'Valid Jordanian IBAN starting with JO is required', 400);
          }
          dUpdates.push(`iban = $${dIdx++}`);
          dParams.push(iban.trim().toUpperCase());
        }
        if (cliq_alias !== undefined) {
          dUpdates.push(`cliq_alias = $${dIdx++}`);
          dParams.push(cliq_alias ? cliq_alias.trim() : null);
        }

        if (dUpdates.length > 0) {
          dParams.push(userId);
          await client.query(
            `UPDATE driver_profiles SET ${dUpdates.join(', ')} WHERE user_id = $${dIdx}`,
            dParams
          );
        }
      }
    });

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/settings/password
 * Changes the user's password after verifying their current password.
 */
router.patch('/password', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('VALIDATION_ERROR', 'Both current and new passwords are required', 400);
    }

    if (newPassword.length < 6) {
      throw new AppError('VALIDATION_ERROR', 'New password must be at least 6 characters', 400);
    }

    const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      throw new AppError('BAD_CREDENTIALS', 'Incorrect current password', 401);
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/settings/preferences
 * Updates language, timezone, and email_notifications toggle.
 */
router.patch('/preferences', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { language, timezone, email_notifications } = req.body;

    const updates = [];
    const params = [];
    let idx = 1;

    if (language !== undefined) {
      if (!['en', 'ar'].includes(language)) {
        throw new AppError('VALIDATION_ERROR', 'Language must be "en" or "ar"', 400);
      }
      updates.push(`language = $${idx++}`);
      params.push(language);
    }

    if (timezone !== undefined) {
      updates.push(`timezone = $${idx++}`);
      params.push(timezone || 'Asia/Amman');
    }

    if (email_notifications !== undefined) {
      updates.push(`email_notifications = $${idx++}`);
      params.push(Boolean(email_notifications));
    }

    if (updates.length === 0) {
      return res.json({ success: true, message: 'No changes provided' });
    }

    params.push(userId);
    const result = await query(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING id, language, timezone, email_notifications`,
      params
    );

    res.json({
      success: true,
      preferences: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

export default router;

