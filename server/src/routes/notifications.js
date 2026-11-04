import express from 'express';
import { query } from '../db.js';
import { auth } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';

const router = express.Router();
router.use(auth);

/**
 * GET /api/notifications
 * Returns list of notifications for the current user, along with unread count.
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const unreadOnly = req.query.unread === 'true';

    let filterClause = 'WHERE user_id = $1';
    const params = [userId];

    if (unreadOnly) {
      filterClause += ' AND is_read = false';
    }

    const listRes = await query(
      `SELECT id, type, params, link, ticket_id, is_read, created_at
       FROM notifications
       ${filterClause}
       ORDER BY created_at DESC
       LIMIT $2`,
      [...params, limit]
    );

    const countRes = await query(
      `SELECT COUNT(*)::int AS unread_count
       FROM notifications
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    res.json({
      notifications: listRes.rows,
      unreadCount: countRes.rows[0]?.unread_count || 0,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read.
 */
router.patch('/:id/read', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await query(
      `UPDATE notifications
       SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING id, is_read`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Notification not found', 404);
    }

    res.json({ success: true, id });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/read-all
 * Marks all notifications for the current user as read.
 */
router.post('/read-all', async (req, res, next) => {
  try {
    const userId = req.user.id;

    await query(
      `UPDATE notifications
       SET is_read = true
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/notifications/activity
 * Returns recent activity log (public to all authenticated roles for live platform activity).
 */
router.get('/activity', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);

    const result = await query(
      `SELECT a.id, a.type, a.ticket_id, a.actor_id, a.params, a.created_at,
              u.name AS actor_name, u.role AS actor_role
       FROM activity_log a
       LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({ activity: result.rows });
  } catch (err) {
    next(err);
  }
});

export default router;

