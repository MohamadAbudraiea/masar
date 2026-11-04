import { query } from '../db.js';

/**
 * Creates an in-app notification row.
 * Accepts either a pg transaction client or defaults to pool query.
 */
export async function createNotification(clientOrPool, {
  userId,
  type,
  params = {},
  link = null,
  ticketId = null,
}) {
  const runner = clientOrPool?.query ? clientOrPool : { query };
  const res = await runner.query(
    `INSERT INTO notifications (user_id, type, params, link, ticket_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, type, JSON.stringify(params), link, ticketId]
  );
  return res.rows[0];
}

/**
 * Appends an activity log row for platform-wide event tracking.
 */
export async function logActivity(clientOrPool, {
  type,
  ticketId = null,
  actorId = null,
  params = {},
}) {
  const runner = clientOrPool?.query ? clientOrPool : { query };
  const res = await runner.query(
    `INSERT INTO activity_log (type, ticket_id, actor_id, params)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [type, ticketId, actorId, JSON.stringify(params)]
  );
  return res.rows[0];
}

