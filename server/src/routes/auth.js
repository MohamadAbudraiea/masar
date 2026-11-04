import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, tx } from '../db.js';
import { config } from '../config.js';
import { AppError } from '../middleware/error.js';
import { serializeUser } from '../serializers/user.js';
import { notify } from '../services/notifications.js';

const router = express.Router();

/**
 * POST /api/auth/signup/manufacturer
 * Public manufacturer registration (status = pending)
 */
router.post('/signup/manufacturer', async (req, res, next) => {
  try {
    const {
      name,
      contact_person,
      phones,
      emails,
      password,
      location,
      goods_category_ids,
      commercial_registration_key,
      professions_license_key,
      language = 'en',
    } = req.body;

    if (!name || !password || !phones?.length || !emails?.length) {
      throw new AppError('VALIDATION_ERROR', 'Name, password, and at least one phone and email are required', 400);
    }
    if (!commercial_registration_key || !professions_license_key) {
      throw new AppError('VALIDATION_ERROR', 'Commercial registration and professions license PDFs are required', 400);
    }

    const primaryPhone = phones[0].trim();
    const primaryEmail = emails[0].trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await tx(async (client) => {
      // 1. Create user
      const uRes = await client.query(
        `INSERT INTO users (role, name, email, phone, password_hash, status, language)
         VALUES ('manufacturer', $1, $2, $3, $4, 'pending', $5)
         RETURNING *`,
        [name, primaryEmail, primaryPhone, passwordHash, language]
      );
      const newUser = uRes.rows[0];

      // 2. Create profile
      await client.query(
        `INSERT INTO manufacturer_profiles (user_id, contact_person, phones, emails, commercial_registration_key, professions_license_key)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newUser.id, contact_person || null, phones, emails, commercial_registration_key, professions_license_key]
      );

      // 3. Link goods categories
      if (Array.isArray(goods_category_ids)) {
        for (const catId of goods_category_ids) {
          await client.query(
            `INSERT INTO manufacturer_goods_categories (manufacturer_id, goods_category_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [newUser.id, catId]
          );
        }
      }

      // 4. Default pickup location if provided
      if (location && location.address && location.lat && location.lng) {
        await client.query(
          `INSERT INTO locations (owner_id, kind, label, address, lat, lng, city, area, is_default)
           VALUES ($1, 'pickup', $2, $3, $4, $5, $6, $7, true)`,
          [
            newUser.id,
            location.label || 'Default Factory / Warehouse',
            location.address,
            location.lat,
            location.lng,
            location.city || null,
            location.area || null,
          ]
        );
      }

      // 5. Notify admin of new pending signup
      const adminRes = await client.query(`SELECT id FROM users WHERE role = 'admin'`);
      const adminIds = adminRes.rows.map((a) => a.id);
      if (adminIds.length > 0) {
        await notify({
          client,
          userIds: adminIds,
          type: 'signup_pending_admin',
          params: { role: 'manufacturer', name },
          link: '/admin/approvals',
          email: {
            templateKey: 'NewSignupAdmin',
            data: { role: 'manufacturer', name, email: primaryEmail, phone: primaryPhone, userId: newUser.id },
          },
        });
      }

      // 6. Notify new user that signup was received (email only per 07 §2)
      if (primaryEmail) {
        await notify({
          client,
          userIds: [newUser.id],
          type: 'signup_received',
          params: { role: 'manufacturer', name },
          email: {
            templateKey: 'SignupReceived',
            data: { name, role: 'manufacturer', userId: newUser.id },
          },
        });
      }

      return newUser;
    });

    res.status(201).json({
      success: true,
      message: 'Signup submitted successfully. Your account is pending admin approval.',
      user: serializeUser(user),
    });
  } catch (err) {
    if (err.code === '23505') {
      return next(new AppError('ALREADY_EXISTS', 'A user with this email or phone number already exists', 409));
    }
    next(err);
  }
});

/**
 * POST /api/auth/signup/driver
 * Public driver registration (status = pending)
 */
router.post('/signup/driver', async (req, res, next) => {
  try {
    const {
      name,
      phone,
      email,
      password,
      scope = 'internal',
      license_class,
      iban,
      cliq_alias,
      id_doc_key,
      license_doc_key,
      passport_doc_key,
      truck,
      language = 'en',
    } = req.body;

    if (!name || !phone || !password || !license_class || !iban) {
      throw new AppError('VALIDATION_ERROR', 'Name, phone, password, license class, and IBAN are required', 400);
    }
    if (!id_doc_key || !license_doc_key) {
      throw new AppError('VALIDATION_ERROR', 'National ID and driving license documents are required', 400);
    }
    if (scope === 'external' && !passport_doc_key) {
      throw new AppError('VALIDATION_ERROR', 'Passport document is required for international drivers', 400);
    }
    if (!truck || !truck.truck_type_id || !truck.plate_number || !truck.license_doc_key) {
      throw new AppError('VALIDATION_ERROR', 'Truck details, plate number, and truck license are required', 400);
    }

    const primaryPhone = phone.trim();
    const primaryEmail = email ? email.trim().toLowerCase() : null;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await tx(async (client) => {
      // 1. Create user
      const uRes = await client.query(
        `INSERT INTO users (role, name, email, phone, password_hash, status, language)
         VALUES ('driver', $1, $2, $3, $4, 'pending', $5)
         RETURNING *`,
        [name, primaryEmail, primaryPhone, passwordHash, language]
      );
      const newUser = uRes.rows[0];

      // 2. Create driver profile
      await client.query(
        `INSERT INTO driver_profiles (user_id, scope, license_class, iban, cliq_alias, id_doc_key, license_doc_key, passport_doc_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          newUser.id,
          scope,
          parseInt(license_class, 10),
          iban.trim(),
          cliq_alias ? cliq_alias.trim() : null,
          id_doc_key,
          license_doc_key,
          passport_doc_key || null,
        ]
      );

      // 3. Create truck
      await client.query(
        `INSERT INTO trucks (driver_id, truck_type_id, plate_number, cooling, adr_certified, gross_weight_code, license_doc_key, photo_keys, adr_doc_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          newUser.id,
          truck.truck_type_id,
          truck.plate_number.trim(),
          truck.cooling || null,
          !!truck.adr_certified,
          truck.gross_weight_code || null,
          truck.license_doc_key,
          truck.photo_keys || [],
          truck.adr_doc_key || null,
        ]
      );

      // 4. Notify admin of new driver
      const adminRes = await client.query(`SELECT id FROM users WHERE role = 'admin'`);
      const adminIds = adminRes.rows.map((a) => a.id);
      if (adminIds.length > 0) {
        await notify({
          client,
          userIds: adminIds,
          type: 'signup_pending_admin',
          params: { role: 'driver', name },
          link: '/admin/approvals',
          email: {
            templateKey: 'NewSignupAdmin',
            data: { role: 'driver', name, email: primaryEmail, phone: primaryPhone, userId: newUser.id },
          },
        });
      }

      // 5. Notify new driver that signup was received (email only per 07 §2)
      if (primaryEmail) {
        await notify({
          client,
          userIds: [newUser.id],
          type: 'signup_received',
          params: { role: 'driver', name },
          email: {
            templateKey: 'SignupReceived',
            data: { name, role: 'driver', userId: newUser.id },
          },
        });
      }

      return newUser;
    });

    res.status(201).json({
      success: true,
      message: 'Signup submitted successfully. Your account is pending admin approval.',
      user: serializeUser(user),
    });
  } catch (err) {
    if (err.code === '23505') {
      return next(new AppError('ALREADY_EXISTS', 'A user with this phone number or email already exists', 409));
    }
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Body: { identifier, password } (email or full phone)
 */
router.post('/login', async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      throw new AppError('BAD_CREDENTIALS', 'Email/phone and password are required', 400);
    }

    const trimmed = identifier.trim();
    const result = await query(
      `SELECT * FROM users
       WHERE LOWER(email) = LOWER($1) OR phone = $1
       LIMIT 1`,
      [trimmed]
    );

    if (result.rows.length === 0) {
      throw new AppError('BAD_CREDENTIALS', 'Invalid credentials', 401);
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError('BAD_CREDENTIALS', 'Invalid credentials', 401);
    }

    // 30 days expiration per 02 §5
    const token = jwt.sign(
      { sub: user.id, role: user.role },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: serializeUser(user, user.role),
    });
  } catch (err) {
    next(err);
  }
});

export default router;

