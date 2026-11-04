import test from 'node:test';
import assert from 'node:assert/strict';
import {
  serializeTicketForManufacturer,
  serializeTicketForDriverUnaccepted,
  serializeTicketForDriverAssigned,
  serializeTicketForEscrow,
  serializeTicketForAdmin,
  computeArrival,
} from './ticket.js';

const mockDbRow = {
  id: 'ticket-uuid-1',
  ticket_number: 'MSR-000124',
  status: 'pending',
  status_history: { requested: '2026-11-04T10:00:00+03:00', pending: '2026-11-04T10:30:00+03:00' },
  events: [{ type: 'arrived_at_pickup', at: '2026-11-04T11:40:00+03:00' }],
  pickup_at: '2026-11-04T12:00:00+03:00', // 20 min early
  pickup_address: 'Sahab Industrial City St 4',
  pickup_lat: 31.874,
  pickup_lng: 35.981,
  pickup_city: 'Amman',
  pickup_area: 'Sahab',
  pickup_label: 'Main Warehouse',
  dest_address: 'King Hussein St 12',
  dest_lat: 31.953,
  dest_lng: 35.928,
  dest_city: 'Amman',
  dest_area: 'Downtown',
  dest_name: 'Al-Barakah Trading',
  dest_phone: '+962791234567',
  goods_category_id: 1,
  goods_category_name: 'Dry',
  goods_description: 'Cartons of canned goods',
  quantity: '5.000',
  unit: 'ton',
  trip_type: 'local',
  required_category: 'medium',
  required_body: 'closed_box',
  price: '800.000',
  escrow_pct: 2,
  escrow_fee: '16.000',
  masar_fee: '32.000',
  driver_net: '752.000',
  notes: 'Fragile, do not stack over 3 layers',
  customs_enabled: false,
  manufacturer_id: 'man-1',
  manufacturer_name: 'Jordan Food Co',
  manufacturer_phone: '+96264020000',
  driver_id: 'drv-1',
  driver_name: 'Omar Mansour',
  driver_phone: '+962788888888',
  driver_iban: 'JO94CBJO0010000000000131000302',
};

test('computeArrival - accurately labels on-time, early, and late', () => {
  const pickup = '2026-11-04T12:00:00+03:00';

  // 10 min early -> on time (tolerance is 15 min)
  const onTime = computeArrival([{ type: 'arrived_at_pickup', at: '2026-11-04T11:50:00+03:00' }], pickup);
  assert.equal(onTime.label, 'On time');
  assert.equal(onTime.delta_minutes, -10);

  // 25 min early -> 25 min early
  const early = computeArrival([{ type: 'arrived_at_pickup', at: '2026-11-04T11:35:00+03:00' }], pickup);
  assert.equal(early.label, '25 min early');

  // 40 min late -> 40 min late
  const late = computeArrival([{ type: 'arrived_at_pickup', at: '2026-11-04T12:40:00+03:00' }], pickup);
  assert.equal(late.label, '40 min late');
});

test('serializeTicketForManufacturer - NEVER includes escrow_fee, masar_fee, driver_net', () => {
  const serialized = serializeTicketForManufacturer(mockDbRow);

  // Must see price
  assert.equal(serialized.price, '800.000');

  // Must NOT see commissions or driver net
  assert.equal(serialized.escrow_fee, undefined);
  assert.equal(serialized.masar_fee, undefined);
  assert.equal(serialized.escrow_pct, undefined);
  assert.equal(serialized.driver_net, undefined);

  // Sees full addresses
  assert.equal(serialized.pickup.address, 'Sahab Industrial City St 4');
  assert.equal(serialized.dest.address, 'King Hussein St 12');
});

test('serializeTicketForDriverUnaccepted - Driver sees ONLY earnings; NEVER price, fees, addresses, coords, or manufacturer', () => {
  const serialized = serializeTicketForDriverUnaccepted(mockDbRow, { can_accept: true });

  // Sees earnings
  assert.equal(serialized.earnings, '752.000');

  // NEVER sees price or fees
  assert.equal(serialized.price, undefined);
  assert.equal(serialized.escrow_fee, undefined);
  assert.equal(serialized.masar_fee, undefined);
  assert.equal(serialized.driver_net, undefined);

  // Only sees city and area, NOT street address or coordinates
  assert.equal(serialized.pickup.city, 'Amman');
  assert.equal(serialized.pickup.area, 'Sahab');
  assert.equal(serialized.pickup.address, undefined);
  assert.equal(serialized.pickup.lat, undefined);

  // Dest: no exact address, no name or phone
  assert.equal(serialized.dest.city, 'Amman');
  assert.equal(serialized.dest.address, undefined);
  assert.equal(serialized.dest.dest_name, undefined);
  assert.equal(serialized.dest.dest_phone, undefined);

  // Notes and manufacturer are hidden
  assert.equal(serialized.notes, undefined);
  assert.equal(serialized.manufacturer, undefined);
});

test('serializeTicketForDriverAssigned - Driver sees earnings, full route & manufacturer; NEVER price or fees', () => {
  const serialized = serializeTicketForDriverAssigned(mockDbRow);

  // Sees earnings
  assert.equal(serialized.earnings, '752.000');

  // NEVER sees price or commissions
  assert.equal(serialized.price, undefined);
  assert.equal(serialized.escrow_fee, undefined);
  assert.equal(serialized.masar_fee, undefined);

  // Sees full addresses and receiver contact
  assert.equal(serialized.pickup.address, 'Sahab Industrial City St 4');
  assert.equal(serialized.dest.address, 'King Hussein St 12');
  assert.equal(serialized.dest.dest_name, 'Al-Barakah Trading');
  assert.equal(serialized.dest.dest_phone, '+962791234567');

  // Sees manufacturer card
  assert.equal(serialized.manufacturer.name, 'Jordan Food Co');
});

test('serializeTicketForEscrow - Escrow sees full financial breakdown, driver IBAN, but NEVER documents', () => {
  const serialized = serializeTicketForEscrow(mockDbRow);

  assert.equal(serialized.price, '800.000');
  assert.equal(serialized.escrow_pct, 2);
  assert.equal(serialized.escrow_fee, '16.000');
  assert.equal(serialized.masar_fee, '32.000');
  assert.equal(serialized.driver_net, '752.000');
  assert.equal(serialized.driver.iban, 'JO94CBJO0010000000000131000302');

  // No documents
  assert.equal(serialized.customs, undefined);
});

test('serializeTicketForAdmin - Admin sees complete view with all financial and document fields', () => {
  const serialized = serializeTicketForAdmin(mockDbRow);

  assert.equal(serialized.price, '800.000');
  assert.equal(serialized.driver_net, '752.000');
  assert.equal(serialized.notes, 'Fragile, do not stack over 3 layers');
  assert.equal(serialized.pickup.lat, 31.874);
  assert.equal(serialized.driver.iban, 'JO94CBJO0010000000000131000302');
});

