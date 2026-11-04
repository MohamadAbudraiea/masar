import { DateTime } from 'luxon';
import { config } from '../config.js';

/**
 * Checks whether a driver's truck matches a ticket's requirements.
 * Implements the 7-predicate matching rule from 01 §8.
 *
 * @param {Object} ticket
 * @param {string} ticket.required_category - 'light' | 'medium' | 'heavy' | 'tanker'
 * @param {string} ticket.required_body - body code
 * @param {string} [ticket.required_cooling] - 'chilled' | 'frozen' | null
 * @param {number} ticket.quantity - cargo quantity
 * @param {string} ticket.unit - 'ton' | 'liter' | 'm3'
 * @param {string} ticket.trip_type - 'local' | 'international'
 * @param {boolean} ticket.is_hazardous - boolean
 * @param {string|Date} ticket.pickup_at - pickup timestamp
 *
 * @param {Object} driver
 * @param {string} driver.status - 'approved' | 'pending' | 'rejected'
 * @param {string} driver.scope - 'internal' | 'external'
 * @param {Object} driver.truck
 * @param {string} driver.truck.category
 * @param {string} driver.truck.body_code
 * @param {string} [driver.truck.cooling] - 'chilled' | 'frozen' | null
 * @param {number} driver.truck.payload_max
 * @param {string} driver.truck.unit
 * @param {boolean} driver.truck.adr_certified
 * @param {boolean} [driver.has_active_shipment] - true if driver currently has a shipment in 'waiting_load' or 'in_delivery'
 *
 * @param {Object} [options]
 * @param {number} [options.visibilityWindowHours] - defaults to config
 * @param {DateTime} [options.now] - reference time for testing
 *
 * @returns {{ matches: boolean, canAccept: boolean, blockedReason?: string, failReason?: string }}
 */
export function checkDriverMatch(ticket, driver, options = {}) {
  // 1. Driver must be approved
  if (driver.status !== 'approved') {
    return { matches: false, canAccept: false, failReason: 'DRIVER_NOT_APPROVED' };
  }

  const truck = driver.truck;
  if (!truck) {
    return { matches: false, canAccept: false, failReason: 'NO_TRUCK_REGISTERED' };
  }

  // 2. Category and body must match
  if (truck.category !== ticket.required_category || truck.body_code !== ticket.required_body) {
    return { matches: false, canAccept: false, failReason: 'TRUCK_TYPE_MISMATCH' };
  }

  // 3. Cooling match
  if (ticket.required_cooling === 'chilled') {
    if (truck.cooling !== 'chilled' && truck.cooling !== 'frozen') {
      return { matches: false, canAccept: false, failReason: 'COOLING_MISMATCH' };
    }
  } else if (ticket.required_cooling === 'frozen') {
    if (truck.cooling !== 'frozen') {
      return { matches: false, canAccept: false, failReason: 'COOLING_MISMATCH' };
    }
  }

  // 4. Unit agreement and capacity
  if (truck.unit !== ticket.unit || Number(truck.payload_max) < Number(ticket.quantity)) {
    return { matches: false, canAccept: false, failReason: 'INSUFFICIENT_PAYLOAD' };
  }

  // 5. Scope: international trip requires external scope driver
  if (ticket.trip_type === 'international' && driver.scope !== 'external') {
    return { matches: false, canAccept: false, failReason: 'SCOPE_MISMATCH' };
  }

  // 6. Hazardous requires ADR certified truck
  if (ticket.is_hazardous && !truck.adr_certified) {
    return { matches: false, canAccept: false, failReason: 'ADR_REQUIRED' };
  }

  // 7. Visibility window: pickup_at <= now + DRIVER_VISIBILITY_WINDOW_HOURS (0 disables)
  const windowHours =
    options.visibilityWindowHours !== undefined
      ? options.visibilityWindowHours
      : config.driverVisibilityWindowHours;

  if (windowHours > 0) {
    const refNow = options.now || DateTime.now().setZone('Asia/Amman');
    const pickupTime = DateTime.fromISO(
      typeof ticket.pickup_at === 'string' ? ticket.pickup_at : ticket.pickup_at.toISOString()
    ).setZone('Asia/Amman');

    const maxPickupTime = refNow.plus({ hours: windowHours });
    if (pickupTime > maxPickupTime) {
      return { matches: false, canAccept: false, failReason: 'OUTSIDE_VISIBILITY_WINDOW' };
    }
  }

  // Driver matches! Now check if free to accept
  const isBusy = !!driver.has_active_shipment;

  return {
    matches: true,
    canAccept: !isBusy,
    blockedReason: isBusy ? 'DRIVER_BUSY' : null,
  };
}

