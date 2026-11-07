import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../index.js';
import { query, pool } from '../db.js';

let server;
let baseUrl;
let manufacturerToken;
let manufacturerUser;
let driverToken;
let driverUser;
let ticketId;
let ticketNumber;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });

  // Login seeded manufacturer
  const mLogin = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'mohamadabudraiea@gmail.com', password: 'Masar@123' }),
  });
  const mData = await mLogin.json();
  assert.equal(mLogin.status, 200);
  manufacturerToken = mData.token;
  manufacturerUser = mData.user;

  // Login seeded driver
  const dLogin = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '+962790010001', password: 'Masar@123' }),
  });
  const dData = await dLogin.json();
  assert.equal(dLogin.status, 200);
  driverToken = dData.token;
  driverUser = dData.user;

  // Ensure driver is approved, internal scope, and has no active shipments blocking tests
  await query(`UPDATE users SET status = 'approved' WHERE id = $1`, [driverUser.id]);
  await query(`UPDATE driver_profiles SET scope = 'internal' WHERE user_id = $1`, [driverUser.id]);
  await query(
    `UPDATE tickets SET status = 'audited' WHERE driver_id = $1 AND status IN ('waiting_load', 'in_delivery')`,
    [driverUser.id]
  );
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('Phase 3 - 1. Manufacturer creates shipment in requested status', async () => {
  const res = await fetch(`${baseUrl}/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${manufacturerToken}`,
    },
    body: JSON.stringify({
      pickup_at: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      pickup: {
        address: 'King Abdullah II Industrial Estate, Sahab',
        lat: 31.875,
        lng: 35.986,
        city: 'Amman',
        area: 'Sahab',
      },
      needs_loading: true,
      needs_unloading: false,
      destination: {
        address: 'Zarqa Free Zone, Gate 2',
        lat: 32.072,
        lng: 36.087,
        city: 'Zarqa',
        area: 'Free Zone',
        dest_name: 'Mahmoud Al-Hajj',
        dest_phone: '+962788889999',
      },
      cargo: {
        goods_category_id: 1, // Food & Beverages (seeded for khaled@alnour.demo)
        goods_description: 'Packaged chilled dairy and juices',
        quantity: 4,
        unit: 'ton',
        trip_type: 'local',
        notes: 'Deliver before sunset',
      },
      required_truck: {
        category: 'medium',
        body: 'refrigerated',
        cooling: 'chilled',
      },
      price: 800, // 800 JD -> escrow fee = 16.000, masar fee = 32.000, driver net = 752.000
    }),
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.status, 'requested');
  assert.ok(data.ticket_number.startsWith('MSR-'));
  assert.equal(data.price, '800.000');

  // HARD RULE CHECK: Manufacturer NEVER sees escrow_fee, masar_fee, driver_net
  assert.equal(data.escrow_fee, undefined);
  assert.equal(data.masar_fee, undefined);
  assert.equal(data.driver_net, undefined);

  ticketId = data.id;
  ticketNumber = data.ticket_number;
});

test('Phase 3 - 2. Requested shipment is hidden from drivers in available list', async () => {
  const res = await fetch(`${baseUrl}/driver/available`, {
    headers: { Authorization: `Bearer ${driverToken}` },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  const found = data.items.some((item) => item.id === ticketId);
  assert.equal(found, false);
});

test('Phase 3 - 3. Manufacturer pays -> status becomes pending with escrow deposit', async () => {
  const res = await fetch(`${baseUrl}/tickets/${ticketId}/pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${manufacturerToken}` },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'pending');

  // Check ledger deposit
  const ledger = await query(
    `SELECT * FROM ledger_entries WHERE ticket_id = $1 AND entry_type = 'deposit'`,
    [ticketId]
  );
  assert.equal(ledger.rows.length, 1);
  assert.equal(Number(ledger.rows[0].amount), 800);

  // Editing now returns 409 INVALID_STATUS
  const patchRes = await fetch(`${baseUrl}/tickets/${ticketId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${manufacturerToken}`,
    },
    body: JSON.stringify({ price: 900 }),
  });
  assert.equal(patchRes.status, 409);
});

test('Phase 3 - 4. Driver sees matching pending shipment with earnings ONLY', async () => {
  const res = await fetch(`${baseUrl}/driver/available`, {
    headers: { Authorization: `Bearer ${driverToken}` },
  });
  assert.equal(res.status, 200);
  const data = await res.json();

  const ticket = data.items.find((item) => item.id === ticketId);
  assert.ok(ticket, 'Shipment should appear in available shipments');

  // HARD RULES:
  // - Driver sees earnings only: 752.000 JD
  assert.equal(ticket.earnings, '752.000');
  // - Driver NEVER sees total price or commissions
  assert.equal(ticket.price, undefined);
  assert.equal(ticket.escrow_fee, undefined);
  assert.equal(ticket.masar_fee, undefined);
  // - Driver does not see full address or coordinates
  assert.equal(ticket.pickup.address, undefined);
  assert.equal(ticket.pickup.lat, undefined);
  assert.equal(ticket.pickup.city, 'Amman');
  // - Driver does not see manufacturer details
  assert.equal(ticket.manufacturer, undefined);
});

test('Phase 3 - 5. Driver accepts shipment (atomic accept)', async () => {
  const res = await fetch(`${baseUrl}/tickets/${ticketId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'waiting_load');

  // Trying to accept again returns 409 ALREADY_TAKEN
  const dupRes = await fetch(`${baseUrl}/tickets/${ticketId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
  });
  assert.equal(dupRes.status, 409);

  // Check driver/active returns this shipment
  const activeRes = await fetch(`${baseUrl}/driver/active`, {
    headers: { Authorization: `Bearer ${driverToken}` },
  });
  assert.equal(activeRes.status, 200);
  const activeData = await activeRes.json();
  assert.equal(activeData.id, ticketId);
  assert.equal(activeData.status, 'waiting_load');
  // Once accepted, driver sees full address & manufacturer card
  assert.ok(activeData.pickup.address);
  assert.ok(activeData.manufacturer);
});

test('Phase 3 - 6. Driver reports arrival at pickup', async () => {
  const res = await fetch(`${baseUrl}/tickets/${ticketId}/arrived`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'waiting_load');
  const arrivedEvent = data.events.find((e) => e.type === 'arrived_at_pickup');
  assert.ok(arrivedEvent);
});

test('Phase 3 - 7. Manufacturer marks goods loaded', async () => {
  const res = await fetch(`${baseUrl}/tickets/${ticketId}/loaded`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${manufacturerToken}` },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'in_delivery');
});

test('Phase 3 - 8. Driver marks delivered -> driver becomes free', async () => {
  const res = await fetch(`${baseUrl}/tickets/${ticketId}/delivered`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'delivered');

  // Driver active shipment is now null because driver is free!
  const activeRes = await fetch(`${baseUrl}/driver/active`, {
    headers: { Authorization: `Bearer ${driverToken}` },
  });
  assert.equal(activeRes.status, 200);
  const activeData = await activeRes.json();
  assert.equal(activeData, null);
});

test('Phase 3 - 9. Manufacturer confirms delivery -> status audited & 3 ledger entries', async () => {
  const res = await fetch(`${baseUrl}/tickets/${ticketId}/confirm`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${manufacturerToken}` },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'audited');

  // Check 3 release ledger entries: payout_driver, commission_masar, commission_escrow
  const entriesRes = await query(
    `SELECT entry_type, amount, details FROM ledger_entries WHERE ticket_id = $1`,
    [ticketId]
  );

  const types = entriesRes.rows.map((r) => r.entry_type);
  assert.ok(types.includes('deposit'));
  assert.ok(types.includes('payout_driver'));
  assert.ok(types.includes('commission_masar'));
  assert.ok(types.includes('commission_escrow'));

  const payout = entriesRes.rows.find((r) => r.entry_type === 'payout_driver');
  assert.equal(Number(payout.amount), 752.0);
  assert.ok(payout.details); // Contains IBAN snapshot
});

test('Phase 3 - 10. Manufacturer and driver exchange ratings', async () => {
  // Manufacturer rates driver 5 stars
  const mRate = await fetch(`${baseUrl}/tickets/${ticketId}/rating`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${manufacturerToken}`,
    },
    body: JSON.stringify({ stars: 5, comment: 'Punctual and very professional driver!' }),
  });
  assert.equal(mRate.status, 200);

  // Driver rates manufacturer 5 stars
  const dRate = await fetch(`${baseUrl}/tickets/${ticketId}/rating`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${driverToken}`,
    },
    body: JSON.stringify({ stars: 5, comment: 'Smooth loading and clear directions' }),
  });
  assert.equal(dRate.status, 200);

  // Check ratings recorded
  const ratingsRes = await query(`SELECT * FROM ratings WHERE ticket_id = $1`, [ticketId]);
  assert.equal(ratingsRes.rows.length, 2);
});
