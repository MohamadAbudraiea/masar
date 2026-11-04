import { config } from '../config.js';

/**
 * Builds canonical in-app paths for each role based on MD-Files/06-SCREENS.md §7.
 */
export function buildRoleLink(role, entityType, id = null, extra = {}) {
  switch (entityType) {
    case 'ticket':
    case 'shipment':
      if (role === 'manufacturer') return `/manufacturer/shipments/${id}`;
      if (role === 'driver') return `/driver/shipments/${id}`;
      if (role === 'escrow') return `/escrow/shipments/${id}`;
      if (role === 'admin') return `/admin/shipments/${id}`;
      return `/`;

    case 'active_ticket':
      if (role === 'driver') return `/driver/active`;
      return buildRoleLink(role, 'ticket', id);

    case 'driver_profile':
      if (role === 'manufacturer') return `/manufacturer/drivers/${id}`;
      if (role === 'escrow') return `/escrow/drivers/${id}`;
      if (role === 'admin') return `/admin/drivers/${id}`;
      return `/driver/me`;

    case 'manufacturer_profile':
      if (role === 'driver') return `/driver/manufacturers/${id}`;
      if (role === 'escrow') return `/escrow/companies/${id}`;
      if (role === 'admin') return `/admin/manufacturers/${id}`;
      return `/manufacturer/profile`;

    case 'approvals':
      return id ? `/admin/approvals?id=${id}` : `/admin/approvals`;

    case 'held_funds':
      return extra.query ? `/escrow/held?q=${encodeURIComponent(extra.query)}` : `/escrow/held`;

    case 'releases':
      return extra.query ? `/escrow/releases?q=${encodeURIComponent(extra.query)}` : `/escrow/releases`;

    case 'driver_earnings':
      return `/driver/earnings`;

    case 'settings':
      return `/${role}/settings`;

    case 'notifications':
      return `/${role}/notifications`;

    default:
      return `/${role}`;
  }
}

/**
 * Wraps an in-app path in the deep link resolver format:
 * ${FRONTEND_URL}/open?to=<encodedPath>&as=<userId>
 */
export function buildDeepLink(inAppPath, asUserId = null) {
  const base = config.frontendUrl || 'http://localhost:5173';
  const encodedTo = encodeURIComponent(inAppPath || '/');
  const asParam = asUserId ? `&as=${asUserId}` : '';
  return `${base}/open?to=${encodedTo}${asParam}`;
}

