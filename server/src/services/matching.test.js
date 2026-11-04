import test from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import { checkDriverMatch } from './matching.js';

const baseTicket = {
  required_category: 'heavy',
  required_body: 'curtain',
  required_cooling: null,
  quantity: 15,
  unit: 'ton',
  trip_type: 'local',
  is_hazardous: false,
  pickup_at: DateTime.now().setZone('Asia/Amman').plus({ hours: 10 }).toISO(),
};

const baseDriver = {
  status: 'approved',
  scope: 'internal',
  has_active_shipment: false,
  truck: {
    category: 'heavy',
    body_code: 'curtain',
    cooling: null,
    payload_max: 20,
    unit: 'ton',
    adr_certified: false,
  },
};

test('checkDriverMatch - perfect match', () => {
  const result = checkDriverMatch(baseTicket, baseDriver);
  assert.equal(result.matches, true);
  assert.equal(result.canAccept, true);
  assert.equal(result.blockedReason, null);
});

test('checkDriverMatch - rejects unapproved driver', () => {
  const driver = { ...baseDriver, status: 'pending' };
  const result = checkDriverMatch(baseTicket, driver);
  assert.equal(result.matches, false);
  assert.equal(result.failReason, 'DRIVER_NOT_APPROVED');
});

test('checkDriverMatch - busy driver matches but cannot accept', () => {
  const driver = { ...baseDriver, has_active_shipment: true };
  const result = checkDriverMatch(baseTicket, driver);
  assert.equal(result.matches, true);
  assert.equal(result.canAccept, false);
  assert.equal(result.blockedReason, 'DRIVER_BUSY');
});

test('checkDriverMatch - truck body mismatch', () => {
  const driver = {
    ...baseDriver,
    truck: { ...baseDriver.truck, body_code: 'closed_box' },
  };
  const result = checkDriverMatch(baseTicket, driver);
  assert.equal(result.matches, false);
  assert.equal(result.failReason, 'TRUCK_TYPE_MISMATCH');
});

test('checkDriverMatch - insufficient payload', () => {
  const driver = {
    ...baseDriver,
    truck: { ...baseDriver.truck, payload_max: 10 }, // ticket is 15
  };
  const result = checkDriverMatch(baseTicket, driver);
  assert.equal(result.matches, false);
  assert.equal(result.failReason, 'INSUFFICIENT_PAYLOAD');
});

test('checkDriverMatch - cooling: chilled accepts frozen truck, but frozen rejects chilled truck', () => {
  const chilledTicket = { ...baseTicket, required_cooling: 'chilled' };
  const frozenTicket = { ...baseTicket, required_cooling: 'frozen' };

  const chilledTruck = { ...baseDriver.truck, cooling: 'chilled' };
  const frozenTruck = { ...baseDriver.truck, cooling: 'frozen' };

  // Chilled ticket with frozen truck -> OK
  const res1 = checkDriverMatch(chilledTicket, { ...baseDriver, truck: frozenTruck });
  assert.equal(res1.matches, true);

  // Frozen ticket with chilled truck -> Fails
  const res2 = checkDriverMatch(frozenTicket, { ...baseDriver, truck: chilledTruck });
  assert.equal(res2.matches, false);
  assert.equal(res2.failReason, 'COOLING_MISMATCH');
});

test('checkDriverMatch - international trip requires external scope driver', () => {
  const intTicket = { ...baseTicket, trip_type: 'international' };

  // Internal scope driver fails
  const resInternal = checkDriverMatch(intTicket, { ...baseDriver, scope: 'internal' });
  assert.equal(resInternal.matches, false);
  assert.equal(resInternal.failReason, 'SCOPE_MISMATCH');

  // External scope driver passes
  const resExternal = checkDriverMatch(intTicket, { ...baseDriver, scope: 'external' });
  assert.equal(resExternal.matches, true);
});

test('checkDriverMatch - hazardous shipment requires ADR certification', () => {
  const hazTicket = { ...baseTicket, is_hazardous: true };

  // Non-ADR truck fails
  const resNonAdr = checkDriverMatch(hazTicket, baseDriver);
  assert.equal(resNonAdr.matches, false);
  assert.equal(resNonAdr.failReason, 'ADR_REQUIRED');

  // ADR truck passes
  const resAdr = checkDriverMatch(hazTicket, {
    ...baseDriver,
    truck: { ...baseDriver.truck, adr_certified: true },
  });
  assert.equal(resAdr.matches, true);
});

test('checkDriverMatch - pickup beyond visibility window is hidden', () => {
  const now = DateTime.now().setZone('Asia/Amman');
  const futureTicket = {
    ...baseTicket,
    pickup_at: now.plus({ hours: 50 }).toISO(), // 50h > 48h
  };

  const res = checkDriverMatch(futureTicket, baseDriver, { now, visibilityWindowHours: 48 });
  assert.equal(res.matches, false);
  assert.equal(res.failReason, 'OUTSIDE_VISIBILITY_WINDOW');
});

