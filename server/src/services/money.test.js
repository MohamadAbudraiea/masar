import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSplit } from './money.js';

test('computeSplit calculations match specification table', () => {
  const cases = [
    { price: 500, escrowPct: 2, escrowFee: '10.000', masarFee: '20.000', driverNet: '470.000' },
    { price: 800, escrowPct: 2, escrowFee: '16.000', masarFee: '32.000', driverNet: '752.000' },
    { price: 1000, escrowPct: 2, escrowFee: '20.000', masarFee: '40.000', driverNet: '940.000' },
    { price: 2500, escrowPct: 3, escrowFee: '75.000', masarFee: '100.000', driverNet: '2325.000' },
    { price: 6000, escrowPct: 5, escrowFee: '300.000', masarFee: '240.000', driverNet: '5460.000' },
  ];

  cases.forEach(({ price, escrowPct, escrowFee, masarFee, driverNet }) => {
    const result = computeSplit(price);
    assert.equal(result.escrowPct, escrowPct, `Escrow pct mismatch for ${price}`);
    assert.equal(result.escrowFee, escrowFee, `Escrow fee mismatch for ${price}`);
    assert.equal(result.masarFee, masarFee, `Masar fee mismatch for ${price}`);
    assert.equal(result.driverNet, driverNet, `Driver net mismatch for ${price}`);
  });
});
