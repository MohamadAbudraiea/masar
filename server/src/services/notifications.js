import { query } from '../db.js';
import { sendEmail } from '../emails/service.js';

/**
 * Creates in-app notifications and optionally sends corresponding emails.
 *
 * @param {Object} options
 * @param {string | string[]} options.userIds - recipient user uuid(s)
 * @param {string} options.type - notification type key from 07-NOTIFICATIONS-AND-EMAILS.md
 * @param {Object} [options.params={}] - parameters for localized client-side string interpolation
 * @param {string} [options.link=null] - in-app path for the recipient's role
 * @param {string} [options.ticketId=null] - linked ticket uuid
 * @param {string} [options.actorId=null] - actor uuid for activity log
 * @param {Object} [options.email=null] - { templateKey, to, data }
 * @param {Object} [options.client=null] - optional pg client for transactional contexts
 */
export async function notify({
  userIds,
  type,
  params = {},
  link = null,
  ticketId = null,
  actorId = null,
  email = null,
  client = null,
}) {
  const runner = client?.query ? client : { query };
  const rawIds = Array.isArray(userIds) ? userIds : [userIds];
  const targetIds = rawIds.filter(Boolean);

  if (targetIds.length === 0) return { notifications: [] };

  const createdNotifications = [];

  // 1. Create in-app notifications
  for (const uid of targetIds) {
    try {
      const res = await runner.query(
        `INSERT INTO notifications (user_id, type, params, link, ticket_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [uid, type, JSON.stringify(params), link, ticketId]
      );
      if (res.rows[0]) createdNotifications.push(res.rows[0]);
    } catch (err) {
      console.error(`[Notification Error] Failed to insert notification for user ${uid}:`, err.message);
    }
  }

  // 2. Append to platform activity log
  try {
    await runner.query(
      `INSERT INTO activity_log (type, ticket_id, actor_id, params)
       VALUES ($1, $2, $3, $4)`,
      [type, ticketId, actorId, JSON.stringify(params)]
    );
  } catch (err) {
    console.error(`[Activity Log Error] Failed to log activity for ${type}:`, err.message);
  }

  // 3. Process email if configured
  if (email && email.templateKey) {
    // Run email sending asynchronously so we never block response or transaction
    setImmediate(async () => {
      try {
        for (const uid of targetIds) {
          // Fetch user details for notification settings & emails
          const userRes = await query(
            `SELECT u.id, u.role, u.name, u.email, u.email_notifications,
                    p.emails AS manufacturer_emails
             FROM users u
             LEFT JOIN manufacturer_profiles p ON p.user_id = u.id
             WHERE u.id = $1`,
            [uid]
          );

          const user = userRes.rows[0];
          if (!user) continue;

          // Determine recipient email(s)
          let toAddresses = [];
          if (email.to) {
            toAddresses = Array.isArray(email.to) ? email.to : [email.to];
          } else if (user.role === 'manufacturer' && Array.isArray(user.manufacturer_emails) && user.manufacturer_emails.length > 0) {
            // Manufacturers receive emails at all registered company email addresses (07 §4)
            toAddresses = user.manufacturer_emails;
          } else if (user.email) {
            toAddresses = [user.email];
          }

          if (toAddresses.length === 0) continue;

          const emailData = {
            userId: user.id,
            name: user.name,
            role: user.role,
            ticketId,
            ...(email.data || {}),
          };

          await sendEmail({
            to: toAddresses,
            templateKey: email.templateKey,
            data: emailData,
            emailNotificationsEnabled: user.email_notifications !== false,
          });
        }
      } catch (err) {
        console.error(`[Notification Email Error] Unexpected error sending email for ${type}:`, err.message);
      }
    });
  }

  return { notifications: createdNotifications };
}

/**
 * Compatibility helper for existing code that called createNotification directly
 */
export async function createNotification(clientOrPool, data) {
  const res = await notify({
    userIds: data.userId,
    type: data.type,
    params: data.params || {},
    link: data.link || null,
    ticketId: data.ticketId || null,
    client: clientOrPool,
  });
  return res.notifications[0] || null;
}

/**
 * Compatibility helper for existing code that called logActivity directly
 */
export async function logActivity(clientOrPool, data) {
  const runner = clientOrPool?.query ? clientOrPool : { query };
  const res = await runner.query(
    `INSERT INTO activity_log (type, ticket_id, actor_id, params)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.type, data.ticketId, data.actorId, JSON.stringify(data.params || {})]
  );
  return res.rows[0];
}
