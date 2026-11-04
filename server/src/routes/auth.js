import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { config } from '../config.js';
import { AppError } from '../middleware/error.js';
import { serializeUser } from '../serializers/user.js';

const router = express.Router();

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

