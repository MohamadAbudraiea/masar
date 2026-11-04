import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../index.js';
import { pool } from '../db.js';

let server;
let baseUrl;
let adminToken;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });

  // Login as admin
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'admin@masar.demo',
      password: 'Masar@123',
    }),
  });
  const data = await loginRes.json();
  adminToken = data.token;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('POST /api/uploads - uploads file and returns key and name', async () => {
  const formData = new FormData();
  const fileBlob = new Blob(['%PDF-1.4 sample content'], { type: 'application/pdf' });
  formData.append('file', fileBlob, 'commercial_reg.pdf');

  const res = await fetch(`${baseUrl}/uploads?kind=documents`, {
    method: 'POST',
    body: formData,
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.key.startsWith('uploads/documents/'));
  assert.equal(data.name, 'commercial_reg.pdf');
});

test('GET /api/files/url - returns presigned download URL for given key', async () => {
  const res = await fetch(`${baseUrl}/files/url?key=uploads/documents/test.pdf`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.url);
});

test('POST /api/auth/signup/manufacturer - creates pending manufacturer and admin approves', async () => {
  const timestamp = Date.now();
  const uniqueEmail = `test.mfr.${timestamp}@test.demo`;
  const uniquePhone = `+962799${String(timestamp).slice(-6)}`;

  // 1. Submit signup
  const signupRes = await fetch(`${baseUrl}/auth/signup/manufacturer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Jordan Dairy Tech',
      contact_person: 'Sami Haddad',
      phones: [uniquePhone],
      emails: [uniqueEmail],
      password: 'TestPassword123!',
      commercial_registration_key: 'uploads/documents/cr.pdf',
      professions_license_key: 'uploads/documents/pl.pdf',
      goods_category_ids: [1, 2],
      location: {
        label: 'Main Facility',
        address: 'Amman Industrial Zone',
        lat: 31.95,
        lng: 35.92,
        city: 'Amman',
        area: 'Marka',
      },
    }),
  });

  assert.equal(signupRes.status, 201);
  const signupData = await signupRes.json();
  assert.equal(signupData.user.status, 'pending');
  const userId = signupData.user.id;

  // 2. Admin inspects approvals queue
  const queueRes = await fetch(`${baseUrl}/admin/approvals?type=manufacturer`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(queueRes.status, 200);
  const queueData = await queueRes.json();
  const pendingUser = queueData.items.find((u) => u.id === userId);
  assert.ok(pendingUser);
  assert.ok(pendingUser.profile.commercial_registration_url);

  // 3. Admin approves user
  const approveRes = await fetch(`${baseUrl}/admin/users/${userId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(approveRes.status, 200);

  // 4. Verify user can now log in with status = approved
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: uniqueEmail,
      password: 'TestPassword123!',
    }),
  });
  assert.equal(loginRes.status, 200);
  const loginData = await loginRes.json();
  assert.equal(loginData.user.status, 'approved');
});

test('POST /api/auth/signup/driver - creates pending driver and admin rejects with reason', async () => {
  const timestamp = Date.now();
  const uniquePhone = `+962798${String(timestamp).slice(-6)}`;

  // 1. Submit driver signup
  const signupRes = await fetch(`${baseUrl}/auth/signup/driver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Walid Jarrah',
      phone: uniquePhone,
      password: 'TestPassword123!',
      scope: 'internal',
      license_class: 4,
      iban: 'JO94CBJO0010000000000131999999',
      id_doc_key: 'uploads/documents/id.pdf',
      license_doc_key: 'uploads/documents/lic.pdf',
      truck: {
        truck_type_id: 1,
        plate_number: '12-99999',
        license_doc_key: 'uploads/documents/truck_lic.pdf',
        photo_keys: ['uploads/photos/truck1.jpg'],
      },
    }),
  });

  assert.equal(signupRes.status, 201);
  const signupData = await signupRes.json();
  const userId = signupData.user.id;

  // 2. Admin rejects with reason
  const rejectRes = await fetch(`${baseUrl}/admin/users/${userId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      reason: 'Driving license document is expired or blurry. Please re-upload.',
    }),
  });
  assert.equal(rejectRes.status, 200);

  // 3. Login returns rejected user with reason
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: uniquePhone,
      password: 'TestPassword123!',
    }),
  });
  assert.equal(loginRes.status, 200);
  const loginData = await loginRes.json();
  assert.equal(loginData.user.status, 'rejected');
  assert.equal(loginData.user.rejection_reason, 'Driving license document is expired or blurry. Please re-upload.');
});

