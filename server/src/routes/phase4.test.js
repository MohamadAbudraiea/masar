import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../index.js';
import { query } from '../db.js';
import { TEMPLATE_KEYS, templates } from '../emails/templates.js';

let server;
let baseUrl;
let adminToken;
let mfrToken;
let driverToken;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });

  // Log in demo users
  const adminRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'mohamadabudraiea2003@gmail.com', password: 'Masar@123' }),
  });
  const adminData = await adminRes.json();
  adminToken = adminData.token;

  const mfrRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'mohamadabudraiea@gmail.com', password: 'Masar@123' }),
  });
  const mfrData = await mfrRes.json();
  mfrToken = mfrData.token;

  const driverRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '+962790010001', password: 'Masar@123' }),
  });
  const driverData = await driverRes.json();
  driverToken = driverData.token;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Phase 4 - 1. All 15 email templates render valid HTML and plain text', () => {
  assert.equal(TEMPLATE_KEYS.length, 15);
  for (const key of TEMPLATE_KEYS) {
    const fn = templates[key];
    assert.ok(fn, `Template generator exists for ${key}`);
    const res = fn();
    assert.ok(res.subject, `Template ${key} generates subject`);
    assert.ok(res.html.includes('MASAR'), `Template ${key} HTML contains MASAR header`);
    assert.ok(res.text.includes('MASAR'), `Template ${key} plain text contains MASAR brand`);
  }
});

test('Phase 4 - 2. GET /api/dev/emails and GET /api/dev/emails/:template', async () => {
  const listRes = await fetch(`${baseUrl}/dev/emails`);
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.equal(listData.templates.length, 15);

  const sampleRes = await fetch(`${baseUrl}/dev/emails/PaymentReceived`);
  assert.equal(sampleRes.status, 200);
  const html = await sampleRes.text();
  assert.ok(html.includes('Payment confirmed'));
});

test('Phase 4 - 3. Notifications API - list, unread count, read single, read all', async () => {
  // 1. Fetch notifications for manufacturer
  const res = await fetch(`${baseUrl}/notifications`, {
    headers: { Authorization: `Bearer ${mfrToken}` },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.notifications));
  assert.equal(typeof data.unreadCount, 'number');

  if (data.notifications.length > 0) {
    const target = data.notifications[0];
    // 2. Mark target notification as read
    const readRes = await fetch(`${baseUrl}/notifications/${target.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${mfrToken}` },
    });
    assert.equal(readRes.status, 200);
  }

  // 3. Mark all read
  const readAllRes = await fetch(`${baseUrl}/notifications/read-all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${mfrToken}` },
  });
  assert.equal(readAllRes.status, 200);

  // 4. Verify unread count is now 0
  const afterRes = await fetch(`${baseUrl}/notifications?unread=true`, {
    headers: { Authorization: `Bearer ${mfrToken}` },
  });
  const afterData = await afterRes.json();
  assert.equal(afterData.unreadCount, 0);
  assert.equal(afterData.notifications.length, 0);
});

test('Phase 4 - 4. GET /api/notifications/activity - returns platform activity stream', async () => {
  const res = await fetch(`${baseUrl}/notifications/activity`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.activity));
  assert.ok(data.activity.length > 0);
});

test('Phase 4 - 5. Settings API - read profile & preferences', async () => {
  const res = await fetch(`${baseUrl}/settings`, {
    headers: { Authorization: `Bearer ${mfrToken}` },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.user.role, 'manufacturer');
  assert.ok(data.profile.contact_person !== undefined);
  assert.equal(typeof data.user.email_notifications, 'boolean');
});

test('Phase 4 - 6. Settings API - update preferences (language, timezone, email toggle)', async () => {
  const res = await fetch(`${baseUrl}/settings/preferences`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mfrToken}`,
    },
    body: JSON.stringify({
      language: 'ar',
      timezone: 'Asia/Amman',
      email_notifications: false,
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.preferences.language, 'ar');
  assert.equal(data.preferences.email_notifications, false);

  // Revert back for clean test state
  await fetch(`${baseUrl}/settings/preferences`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mfrToken}`,
    },
    body: JSON.stringify({
      language: 'en',
      email_notifications: true,
    }),
  });
});

test('Phase 4 - 7. Settings API - change password verification', async () => {
  // Invalid current password should return 401 BAD_CREDENTIALS
  const badRes = await fetch(`${baseUrl}/settings/password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${driverToken}`,
    },
    body: JSON.stringify({
      currentPassword: 'WrongPassword123!',
      newPassword: 'NewPassword123!',
    }),
  });
  assert.equal(badRes.status, 401);

  // Short new password should return 400 VALIDATION_ERROR
  const shortRes = await fetch(`${baseUrl}/settings/password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${driverToken}`,
    },
    body: JSON.stringify({
      currentPassword: 'Masar@123',
      newPassword: '123',
    }),
  });
  assert.equal(shortRes.status, 400);
});
