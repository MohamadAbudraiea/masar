import { DateTime } from 'luxon';

/**
 * Returns current ISO timestamp with Asia/Amman (+03:00) offset.
 * Example: 2026-11-04T16:20:00.000+03:00
 */
export function nowAmman() {
  return DateTime.now().setZone('Asia/Amman').toISO();
}

/**
 * Formats a given date/time to Asia/Amman ISO string.
 */
export function toAmmanISO(date) {
  if (!date) return null;
  return DateTime.fromJSDate(new Date(date)).setZone('Asia/Amman').toISO();
}

