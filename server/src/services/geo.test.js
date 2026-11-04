import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateHaversineKm, extractCityAndArea, parseCoordinatesFromUrl } from './geo.js';

test('calculateHaversineKm - calculates distance between Amman and Zarqa', () => {
  // Amman (31.9539, 35.9106) to Zarqa (32.0608, 36.0942) is approximately 21-22 km
  const km = calculateHaversineKm(31.9539, 35.9106, 32.0608, 36.0942);
  assert.ok(km > 19 && km < 24, `Expected ~21km, got ${km}`);
});

test('extractCityAndArea - obeys fallback hierarchy', () => {
  // When town is present but not city -> chooses town
  const case1 = extractCityAndArea({ town: 'Fuheis', county: 'Balqa', suburb: 'Al-Balad' });
  assert.equal(case1.city, 'Fuheis');
  assert.equal(case1.area, 'Al-Balad');

  // When only municipality is present -> chooses municipality
  const case2 = extractCityAndArea({ municipality: 'Greater Amman', neighbourhood: 'Jabal Amman' });
  assert.equal(case2.city, 'Greater Amman');
  assert.equal(case2.area, 'Jabal Amman');

  // When city and village are both present -> prioritizes city
  const case3 = extractCityAndArea({ city: 'Amman', village: 'Marka', quarter: 'Al-Nuzha' });
  assert.equal(case3.city, 'Amman');
  assert.equal(case3.area, 'Al-Nuzha');
});

test('parseCoordinatesFromUrl - parses @lat,lng format', () => {
  const url = 'https://www.google.com/maps/@31.9539494,35.910635,14z';
  const coords = parseCoordinatesFromUrl(url);
  assert.ok(coords);
  assert.equal(coords.lat, 31.9539494);
  assert.equal(coords.lng, 35.910635);
});

test('parseCoordinatesFromUrl - parses !3d!4d format', () => {
  const url = 'https://www.google.com/maps/place/Data/@31.961234,35.923456,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d31.961234!4d35.923456';
  const coords = parseCoordinatesFromUrl(url);
  assert.ok(coords);
  assert.equal(coords.lat, 31.961234);
  assert.equal(coords.lng, 35.923456);
});

test('parseCoordinatesFromUrl - parses ?q=lat,lng format', () => {
  const url = 'https://maps.google.com/?q=32.012345,35.876543';
  const coords = parseCoordinatesFromUrl(url);
  assert.ok(coords);
  assert.equal(coords.lat, 32.012345);
  assert.equal(coords.lng, 35.876543);
});

