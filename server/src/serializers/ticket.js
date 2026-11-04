import { config } from '../config.js';

/**
 * Computes early/late arrival info from arrived_at_pickup event.
 */
export function computeArrival(events = [], pickupAt) {
  if (!events || !pickupAt) return null;
  const arrEvent = events.find((e) => e.type === 'arrived_at_pickup');
  if (!arrEvent || !arrEvent.at) return null;

  const arrivedMs = new Date(arrEvent.at).getTime();
  const pickupMs = new Date(pickupAt).getTime();
  const deltaMinutes = Math.round((arrivedMs - pickupMs) / (60 * 1000));
  const tol = config.onTimeToleranceMin || 15;

  let label = 'On time';
  if (deltaMinutes < -tol) {
    label = `${Math.abs(deltaMinutes)} min early`;
  } else if (deltaMinutes > tol) {
    label = `${deltaMinutes} min late`;
  }

  return {
    arrived_at: arrEvent.at,
    delta_minutes: deltaMinutes,
    label,
  };
}

/**
 * Base ticket fields shared across all variants.
 */
function serializeBaseTicket(t) {
  return {
    id: t.id,
    ticket_number: t.ticket_number,
    status: t.status,
    status_history: t.status_history || {},
    events: t.events || [],
    pickup_at: t.pickup_at,
    needs_loading: !!t.needs_loading,
    needs_unloading: !!t.needs_unloading,
    goods: {
      category_id: t.goods_category_id,
      category_name: t.goods_category_name || null,
      description: t.goods_description || null,
      quantity: Number(t.quantity),
      unit: t.unit,
    },
    trip_type: t.trip_type,
    destination_country: t.destination_country || null,
    required_truck: {
      category: t.required_category,
      body: t.required_body,
      cooling: t.required_cooling || null,
    },
    is_hazardous: !!t.is_hazardous,
    temp_min: t.temp_min != null ? Number(t.temp_min) : null,
    temp_max: t.temp_max != null ? Number(t.temp_max) : null,
    adr_class: t.adr_class || null,
    liquid_type: t.liquid_type || null,
    dimensions: t.dimensions || null,
    customs_enabled: !!t.customs_enabled,
    distance_km: t.distance_km != null ? Number(t.distance_km) : null,
    created_at: t.created_at,
    arrival: computeArrival(t.events, t.pickup_at),
    rating: t.rating || null,
  };
}

/**
 * Serializes ticket for the manufacturer.
 * HARD RULE: Manufacturer sees total price only. NEVER sees escrow_fee, masar_fee, driver_net.
 */
export function serializeTicketForManufacturer(t) {
  const base = serializeBaseTicket(t);

  return {
    ...base,
    price: Number(t.price).toFixed(3),
    pickup: {
      address: t.pickup_address,
      lat: t.pickup_lat,
      lng: t.pickup_lng,
      city: t.pickup_city,
      area: t.pickup_area,
      label: t.pickup_label || null,
    },
    dest: {
      address: t.dest_address,
      lat: t.dest_lat,
      lng: t.dest_lng,
      city: t.dest_city,
      area: t.dest_area,
      dest_name: t.dest_name,
      dest_phone: t.dest_phone,
    },
    notes: t.notes || null,
    customs: t.customs_enabled
      ? {
          declaration_number: t.customs_declaration_number,
          permit_type: t.customs_permit_type,
          permit_details: t.customs_permit_details,
          docs_url: t.customs_docs_url || null,
        }
      : null,
    route_geometry: t.route_geometry || null,
    driver: t.driver_id
      ? {
          id: t.driver_id,
          name: t.driver_name,
          phone: t.driver_phone,
          rating: t.driver_rating != null ? Number(t.driver_rating) : null,
          ratings_count: t.driver_ratings_count || 0,
          completed_count: t.driver_completed_count || 0,
          truck: t.truck_plate_number
            ? {
                plate: t.truck_plate_number,
                type: t.truck_type_name,
                body: t.truck_body_name,
                photos: t.truck_photo_urls || [],
              }
            : null,
        }
      : null,
  };
}

/**
 * Serializes ticket for an unaccepted driver browsing pending shipments.
 * HARD RULE: Driver sees earnings only. City and area only.
 * NEVER sees price, fees, exact coordinates, street address, receiver phone, or manufacturer name.
 */
export function serializeTicketForDriverUnaccepted(t, driverState = {}) {
  const base = serializeBaseTicket(t);

  return {
    ...base,
    earnings: Number(t.driver_net).toFixed(3),
    pickup: {
      city: t.pickup_city,
      area: t.pickup_area,
    },
    dest: {
      city: t.dest_city,
      area: t.dest_area,
    },
    is_customs: !!t.customs_enabled,
    can_accept: driverState.can_accept ?? true,
    blocked_reason: driverState.blocked_reason || null,
  };
}

/**
 * Serializes ticket for the driver after acceptance.
 * HARD RULE: Driver sees earnings only. Gets full route and contact details.
 * NEVER sees price, escrow_fee, or masar_fee.
 */
export function serializeTicketForDriverAssigned(t) {
  const base = serializeBaseTicket(t);

  return {
    ...base,
    earnings: Number(t.driver_net).toFixed(3),
    pickup: {
      address: t.pickup_address,
      lat: t.pickup_lat,
      lng: t.pickup_lng,
      city: t.pickup_city,
      area: t.pickup_area,
      label: t.pickup_label || null,
    },
    dest: {
      address: t.dest_address,
      lat: t.dest_lat,
      lng: t.dest_lng,
      city: t.dest_city,
      area: t.dest_area,
      dest_name: t.dest_name,
      dest_phone: t.dest_phone,
    },
    notes: t.notes || null,
    customs: t.customs_enabled
      ? {
          declaration_number: t.customs_declaration_number,
          permit_type: t.customs_permit_type,
          permit_details: t.customs_permit_details,
          docs_url: t.customs_docs_url || null,
        }
      : null,
    route_geometry: t.route_geometry || null,
    manufacturer: {
      id: t.manufacturer_id,
      name: t.manufacturer_name,
      phone: t.manufacturer_phone,
      rating: t.manufacturer_rating != null ? Number(t.manufacturer_rating) : null,
      ratings_count: t.manufacturer_ratings_count || 0,
      pickup_location_label: t.pickup_label || null,
    },
  };
}

/**
 * Serializes ticket for escrow company.
 * Full financial breakdown and payout details. NEVER includes documents.
 */
export function serializeTicketForEscrow(t) {
  const base = serializeBaseTicket(t);

  return {
    ...base,
    price: Number(t.price).toFixed(3),
    escrow_pct: t.escrow_pct,
    escrow_fee: Number(t.escrow_fee).toFixed(3),
    masar_fee: Number(t.masar_fee).toFixed(3),
    driver_net: Number(t.driver_net).toFixed(3),
    pickup: {
      address: t.pickup_address,
      city: t.pickup_city,
      area: t.pickup_area,
    },
    dest: {
      address: t.dest_address,
      city: t.dest_city,
      area: t.dest_area,
      dest_name: t.dest_name,
      dest_phone: t.dest_phone,
    },
    manufacturer: {
      id: t.manufacturer_id,
      name: t.manufacturer_name,
      phone: t.manufacturer_phone,
    },
    driver: t.driver_id
      ? {
          id: t.driver_id,
          name: t.driver_name,
          phone: t.driver_phone,
          iban: t.driver_iban || null,
          cliq_alias: t.driver_cliq_alias || null,
        }
      : null,
    ledger_entries: t.ledger_entries || [],
  };
}

/**
 * Serializes ticket for Admin.
 * Full unredacted view.
 */
export function serializeTicketForAdmin(t) {
  const base = serializeBaseTicket(t);

  return {
    ...base,
    price: Number(t.price).toFixed(3),
    escrow_pct: t.escrow_pct,
    escrow_fee: Number(t.escrow_fee).toFixed(3),
    masar_fee: Number(t.masar_fee).toFixed(3),
    driver_net: Number(t.driver_net).toFixed(3),
    pickup: {
      address: t.pickup_address,
      lat: t.pickup_lat,
      lng: t.pickup_lng,
      city: t.pickup_city,
      area: t.pickup_area,
      label: t.pickup_label || null,
    },
    dest: {
      address: t.dest_address,
      lat: t.dest_lat,
      lng: t.dest_lng,
      city: t.dest_city,
      area: t.dest_area,
      dest_name: t.dest_name,
      dest_phone: t.dest_phone,
    },
    notes: t.notes || null,
    customs: t.customs_enabled
      ? {
          declaration_number: t.customs_declaration_number,
          permit_type: t.customs_permit_type,
          permit_details: t.customs_permit_details,
          docs_url: t.customs_docs_url || null,
        }
      : null,
    route_geometry: t.route_geometry || null,
    manufacturer: {
      id: t.manufacturer_id,
      name: t.manufacturer_name,
      phone: t.manufacturer_phone,
      rating: t.manufacturer_rating != null ? Number(t.manufacturer_rating) : null,
      ratings_count: t.manufacturer_ratings_count || 0,
    },
    driver: t.driver_id
      ? {
          id: t.driver_id,
          name: t.driver_name,
          phone: t.driver_phone,
          iban: t.driver_iban || null,
          cliq_alias: t.driver_cliq_alias || null,
          truck: t.truck_plate_number
            ? {
                plate: t.truck_plate_number,
                type: t.truck_type_name,
                body: t.truck_body_name,
                photos: t.truck_photo_urls || [],
              }
            : null,
        }
      : null,
    ledger_entries: t.ledger_entries || [],
  };
}

/**
 * Universal dispatcher based on role.
 */
export function serializeTicket(t, role, { isAssigned = false, driverState = {} } = {}) {
  switch (role) {
    case 'admin':
      return serializeTicketForAdmin(t);
    case 'escrow':
      return serializeTicketForEscrow(t);
    case 'manufacturer':
      return serializeTicketForManufacturer(t);
    case 'driver':
      return isAssigned
        ? serializeTicketForDriverAssigned(t)
        : serializeTicketForDriverUnaccepted(t, driverState);
    default:
      throw new Error(`Unsupported role for ticket serialization: ${role}`);
  }
}

