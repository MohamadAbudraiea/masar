import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../index.js';

let server;
let baseUrl;
let adminToken;
let escrowToken;
let manufacturerToken;
let driverToken;
let manufacturerId;
let driverId;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });

  // 1. Admin login
  const adminRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'mohamadabudraiea2003@gmail.com', password: 'Masar@123' }),
  });
  const adminData = await adminRes.json();
  assert.equal(adminRes.status, 200);
  adminToken = adminData.token;

  // 2. Escrow login
  const escrowRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'mohamadabudraiea2003@outlook.com', password: 'Masar@123' }),
  });
  const escrowData = await escrowRes.json();
  assert.equal(escrowRes.status, 200);
  escrowToken = escrowData.token;

  // 3. Manufacturer login
  const mRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'mohamadabudraiea@gmail.com', password: 'Masar@123' }),
  });
  const mData = await mRes.json();
  assert.equal(mRes.status, 200);
  manufacturerToken = mData.token;
  manufacturerId = mData.user.id;

  // 4. Driver login
  const dRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '+962790010001', password: 'Masar@123' }),
  });
  const dData = await dRes.json();
  assert.equal(dRes.status, 200);
  driverToken = dData.token;
  driverId = dData.user.id;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Phase 5 - 1. Manufacturer Reports & CSV', async () => {
  // Overview
  const res = await fetch(`${baseUrl}/reports/manufacturer/overview`, {
    headers: { Authorization: `Bearer ${manufacturerToken}` },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.kpis, 'Should have kpis');
  assert.ok(data.needs_action, 'Should have needs_action');
  assert.ok(Array.isArray(data.spending_series), 'spending_series should be array');
  assert.ok(Array.isArray(data.by_status), 'by_status should be array');

  // Payments List JSON
  const payRes = await fetch(`${baseUrl}/reports/manufacturer/payments`, {
    headers: { Authorization: `Bearer ${manufacturerToken}` },
  });
  assert.equal(payRes.status, 200);
  const payData = await payRes.json();
  assert.ok(payData.kpis, 'Should have kpis');
  assert.ok(Array.isArray(payData.items), 'items should be array');

  // Payments List CSV
  const csvRes = await fetch(`${baseUrl}/reports/manufacturer/payments?format=csv`, {
    headers: { Authorization: `Bearer ${manufacturerToken}` },
  });
  assert.equal(csvRes.status, 200);
  assert.ok(csvRes.headers.get('content-type').includes('text/csv'));
});

test('Phase 5 - 2. Driver Earnings Report & CSV', async () => {
  // Earnings JSON
  const res = await fetch(`${baseUrl}/reports/driver/earnings`, {
    headers: { Authorization: `Bearer ${driverToken}` },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.kpis, 'Should have kpis');
  assert.ok(data.payout_account, 'Should have payout_account');
  assert.ok(Array.isArray(data.items), 'items should be array');

  // Earnings CSV
  const csvRes = await fetch(`${baseUrl}/reports/driver/earnings?format=csv`, {
    headers: { Authorization: `Bearer ${driverToken}` },
  });
  assert.equal(csvRes.status, 200);
  assert.ok(csvRes.headers.get('content-type').includes('text/csv'));
});

test('Phase 5 - 3. Escrow Reports (Overview, Held Funds, Releases & CSV)', async () => {
  // Overview
  const ovRes = await fetch(`${baseUrl}/reports/escrow/overview`, {
    headers: { Authorization: `Bearer ${escrowToken}` },
  });
  assert.equal(ovRes.status, 200);
  const ovData = await ovRes.json();
  assert.ok(ovData.kpis, 'Should have kpis');
  assert.ok(Array.isArray(ovData.held_vs_released_series), 'series should be array');

  // Held funds JSON
  const heldRes = await fetch(`${baseUrl}/reports/escrow/held`, {
    headers: { Authorization: `Bearer ${escrowToken}` },
  });
  assert.equal(heldRes.status, 200);
  const heldData = await heldRes.json();
  assert.ok(Array.isArray(heldData.items), 'held items should be array');

  // Held funds CSV
  const heldCsvRes = await fetch(`${baseUrl}/reports/escrow/held?format=csv`, {
    headers: { Authorization: `Bearer ${escrowToken}` },
  });
  assert.equal(heldCsvRes.status, 200);
  assert.ok(heldCsvRes.headers.get('content-type').includes('text/csv'));

  // Releases JSON
  const relRes = await fetch(`${baseUrl}/reports/escrow/releases`, {
    headers: { Authorization: `Bearer ${escrowToken}` },
  });
  assert.equal(relRes.status, 200);
  const relData = await relRes.json();
  assert.ok(Array.isArray(relData.items), 'release items should be array');

  // Releases CSV
  const relCsvRes = await fetch(`${baseUrl}/reports/escrow/releases?format=csv`, {
    headers: { Authorization: `Bearer ${escrowToken}` },
  });
  assert.equal(relCsvRes.status, 200);
  assert.ok(relCsvRes.headers.get('content-type').includes('text/csv'));
});

test('Phase 5 - 4. Admin Reports (Overview, Financial, Map, Activity & Ratings)', async () => {
  // Overview
  const ovRes = await fetch(`${baseUrl}/reports/admin/overview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(ovRes.status, 200);
  const ovData = await ovRes.json();
  assert.ok(ovData.kpis, 'Should have kpis');
  assert.ok(ovData.newest, 'Should have newest');
  assert.ok(ovData.top_rated, 'Should have top_rated');

  // Financial
  const finRes = await fetch(`${baseUrl}/reports/admin/financial?group=day`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(finRes.status, 200);
  const finData = await finRes.json();
  assert.ok(finData.kpis, 'Should have kpis');
  assert.ok(Array.isArray(finData.income_series), 'income_series should be array');

  // Financial CSV
  const finCsvRes = await fetch(`${baseUrl}/reports/admin/financial?format=csv`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(finCsvRes.status, 200);
  assert.ok(finCsvRes.headers.get('content-type').includes('text/csv'));

  // Admin Map
  const mapRes = await fetch(`${baseUrl}/reports/admin/map`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(mapRes.status, 200);
  const mapData = await mapRes.json();
  assert.ok(Array.isArray(mapData.items), 'map items should be array');

  // Admin Activity
  const actRes = await fetch(`${baseUrl}/reports/admin/activity?limit=10`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(actRes.status, 200);
  const actData = await actRes.json();
  assert.ok(Array.isArray(actData.items), 'activity items should be array');

  // Admin Ratings
  const ratRes = await fetch(`${baseUrl}/admin/ratings`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(ratRes.status, 200);
  const ratData = await ratRes.json();
  assert.ok(Array.isArray(ratData.items), 'ratings items should be array');
});

test('Phase 5 - 5. Manufacturers & Drivers APIs', async () => {
  // 1. Manufacturers list
  const mList = await fetch(`${baseUrl}/manufacturers`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(mList.status, 200);
  const mListData = await mList.json();
  assert.ok(mListData.items.length > 0);

  // 2. Manufacturer profile
  const mProfile = await fetch(`${baseUrl}/manufacturers/${manufacturerId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(mProfile.status, 200);
  const mProfileData = await mProfile.json();
  assert.equal(mProfileData.id, manufacturerId);

  // 3. Drivers list
  const dList = await fetch(`${baseUrl}/drivers`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(dList.status, 200);
  const dListData = await dList.json();
  assert.ok(dListData.items.length > 0);

  // 4. Driver profile
  const dProfile = await fetch(`${baseUrl}/drivers/${driverId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(dProfile.status, 200);
  const dProfileData = await dProfile.json();
  assert.equal(dProfileData.id, driverId);

  // 5. My drivers (for manufacturer)
  const myDrivers = await fetch(`${baseUrl}/me/drivers`, {
    headers: { Authorization: `Bearer ${manufacturerToken}` },
  });
  assert.equal(myDrivers.status, 200);
  const myDriversData = await myDrivers.json();
  assert.ok(Array.isArray(myDriversData.items));
});

test('Phase 5 - 6. Global Search', async () => {
  const res = await fetch(`${baseUrl}/search?q=MSR`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.tickets));
  assert.ok(Array.isArray(data.manufacturers));
  assert.ok(Array.isArray(data.drivers));
});

test('Phase 5 - 7. Tickets CSV Export and PDF Summary', async () => {
  // 1. Tickets CSV
  const csvRes = await fetch(`${baseUrl}/tickets?format=csv`, {
    headers: { Authorization: `Bearer ${manufacturerToken}` },
  });
  assert.equal(csvRes.status, 200);
  assert.ok(csvRes.headers.get('content-type').includes('text/csv'));

  // 2. Fetch an audited ticket or any ticket to test PDF
  const ticketsRes = await fetch(`${baseUrl}/tickets?status=audited`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(ticketsRes.status, 200);
  const ticketsData = await ticketsRes.json();

  if (ticketsData.items.length > 0) {
    const auditedTicketId = ticketsData.items[0].id;
    const pdfRes = await fetch(`${baseUrl}/tickets/${auditedTicketId}/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(pdfRes.status, 200);
    assert.ok(pdfRes.headers.get('content-type').includes('application/pdf'));
  }
});
