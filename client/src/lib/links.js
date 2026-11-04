/**
 * Generates role-scoped links for shipments, manufacturers, and drivers.
 */
export function linkTo(role, entity, id) {
  if (!role || !entity || !id) return '#';

  switch (role) {
    case 'admin':
      if (entity === 'ticket') return `/admin/shipments/${id}`;
      if (entity === 'manufacturer') return `/admin/manufacturers/${id}`;
      if (entity === 'driver') return `/admin/drivers/${id}`;
      break;

    case 'escrow':
      if (entity === 'ticket') return `/escrow/shipments/${id}`;
      if (entity === 'manufacturer') return `/escrow/manufacturers/${id}`;
      if (entity === 'driver') return `/escrow/drivers/${id}`;
      break;

    case 'manufacturer':
      if (entity === 'ticket') return `/manufacturer/shipments/${id}`;
      if (entity === 'driver') return `/manufacturer/drivers/${id}`;
      break;

    case 'driver':
      if (entity === 'ticket') return `/driver/active`;
      break;

    default:
      return '#';
  }

  return '#';
}

