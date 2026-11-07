import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../index.js';
import { pool } from '../db.js';

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('POST /api/auth/login - valid email returns JWT and user', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'mohamadabudraiea@gmail.com',
      password: 'Masar@123',
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.token, 'Token must be present');
  assert.equal(data.user.role, 'manufacturer');
  assert.equal(data.user.name, 'Al-Nour Foods Co.');
});

test('POST /api/auth/login - valid phone works for driver', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: '+962790010001',
      password: 'Masar@123',
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.token);
  assert.equal(data.user.role, 'driver');
  assert.equal(data.user.name, 'Omar Ayman Saleh');
});

test('POST /api/auth/login - invalid password returns 401 BAD_CREDENTIALS', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'mohamadabudraiea@gmail.com',
      password: 'WrongPassword',
    }),
  });

  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error.code, 'BAD_CREDENTIALS');
});

test('GET /api/me - returns authenticated user and profile', async () => {
  // First login as driver
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: '+962790010001',
      password: 'Masar@123',
    }),
  });
  const { token } = await loginRes.json();

  // Then call /me
  const meRes = await fetch(`${baseUrl}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  assert.equal(meRes.status, 200);
  const meData = await meRes.json();
  assert.equal(meData.role, 'driver');
  assert.equal(meData.name, 'Omar Ayman Saleh');
  assert.ok(meData.profile, 'Driver profile must exist');
  assert.equal(meData.profile.truck?.plate_number, '44-12345');
});
