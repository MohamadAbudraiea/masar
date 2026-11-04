import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestTruck } from './truckSuggest.js';

test('suggestTruck - dry goods: small vs large load', () => {
  // Small load (0.8 ton)
  const small = suggestTruck({ goodsCategory: 'dry', quantity: 0.8 });
  assert.ok(small.suggestions.length > 0);
  assert.equal(small.unit, 'ton');
  // First suggestion should be closest priority body & category
  assert.equal(small.suggestions[0].body, 'closed_box');
  assert.equal(small.suggestions[0].category, 'light');

  // Large load (25 tons) -> needs heavy
  const large = suggestTruck({ goodsCategory: 'dry', quantity: 25 });
  assert.ok(large.suggestions.length > 0);
  assert.equal(large.suggestions[0].category, 'heavy');
  assert.ok(large.suggestions[0].payload_max >= 25);
});

test('suggestTruck - chilled goods sets cooling chilled', () => {
  const result = suggestTruck({ goodsCategory: 'chilled', quantity: 2 });
  assert.ok(result.suggestions.length > 0);
  assert.equal(result.suggestions[0].body, 'refrigerated');
  assert.equal(result.suggestions[0].cooling, 'chilled');
});

test('suggestTruck - frozen goods sets cooling frozen', () => {
  const result = suggestTruck({ goodsCategory: 'frozen', quantity: 15 });
  assert.ok(result.suggestions.length > 0);
  assert.equal(result.suggestions[0].body, 'refrigerated');
  assert.equal(result.suggestions[0].cooling, 'frozen');
  assert.ok(result.suggestions[0].payload_max >= 15);
});

test('suggestTruck - liquids with specific liquid_type', () => {
  const water = suggestTruck({ goodsCategory: 'liquid', quantity: 15000, liquidType: 'water_tanker' });
  assert.equal(water.unit, 'liter');
  assert.equal(water.suggestions[0].category, 'tanker');
  assert.equal(water.suggestions[0].body, 'water_tanker');
  assert.ok(water.suggestions[0].payload_max >= 15000);

  // Gas tanker uses tons
  const gas = suggestTruck({ goodsCategory: 'liquid', quantity: 12, liquidType: 'gas_tanker' });
  assert.equal(gas.unit, 'ton');
  assert.equal(gas.suggestions[0].category, 'tanker');
  assert.equal(gas.suggestions[0].body, 'gas_tanker');
});

test('suggestTruck - machinery goods suggests flatbed/open/lowbed', () => {
  const result = suggestTruck({ goodsCategory: 'machinery', quantity: 26 });
  assert.ok(result.suggestions.length > 0);
  const bodies = result.suggestions.map((s) => s.body);
  assert.ok(bodies.includes('flatbed') || bodies.includes('lowbed'));
});

test('suggestTruck - returns empty suggestions for "other" category', () => {
  const result = suggestTruck({ goodsCategory: 'other', quantity: 5 });
  assert.deepEqual(result.suggestions, []);
});

