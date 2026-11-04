import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';
import { AppError } from './error.js';

export async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('BAD_CREDENTIALS', 'Missing or invalid Authorization header', 401));
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const result = await query(
      'SELECT id, role, name, email, phone, status, language, timezone, email_notifications FROM users WHERE id = $1',
      [payload.sub]
    );

    if (result.rows.length === 0) {
      return next(new AppError('BAD_CREDENTIALS', 'User no longer exists', 401));
    }

    const user = result.rows[0];
    req.user = user;
    next();
  } catch (err) {
    return next(new AppError('BAD_CREDENTIALS', 'Invalid or expired token', 401));
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('BAD_CREDENTIALS', 'Authentication required', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('FORBIDDEN', 'Access denied for your role', 403));
    }
    next();
  };
}

