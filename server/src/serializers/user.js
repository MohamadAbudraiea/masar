/**
 * Sanitizes and formats user and profile outputs based on viewer role.
 * Implements visibility matrix from 01 §11.
 */

export function serializeUser(user, viewerRole = null) {
  if (!user) return null;

  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email || null,
    phone: user.phone || null,
    status: user.status,
    language: user.language,
    timezone: user.timezone,
    email_notifications: user.email_notifications,
    created_at: user.created_at,
    approved_at: user.approved_at,
    rejection_reason:
      viewerRole === 'admin' || user.status === 'rejected' ? user.rejection_reason : undefined,
  };
}

/**
 * Serializes a manufacturer profile shaped by viewer role.
 */
export function serializeManufacturerProfile(p, viewerRole, { isOwn = false } = {}) {
  if (!p) return null;

  const base = {
    id: p.user_id || p.id,
    name: p.name,
    contact_person: p.contact_person || null,
    phones: p.phones || [],
    emails: p.emails || [],
    goods_categories: p.goods_categories || [],
    rating: p.rating != null ? Number(p.rating) : null,
    ratings_count: p.ratings_count || 0,
    created_at: p.created_at,
  };

  // Documents are only visible to Admin or Self
  if (viewerRole === 'admin' || isOwn) {
    base.commercial_registration_url = p.commercial_registration_url || null;
    base.professions_license_url = p.professions_license_url || null;
  }

  // Financial stats for escrow/admin
  if (viewerRole === 'admin' || viewerRole === 'escrow') {
    base.stats = {
      total_tickets: p.total_tickets || 0,
      total_paid: p.total_paid ? Number(p.total_paid).toFixed(3) : '0.000',
    };
  }

  return base;
}

/**
 * Serializes a driver profile shaped by viewer role.
 * HARD RULE: IBAN and CliQ are only visible to Self, Escrow, and Admin. NEVER to Manufacturer!
 */
export function serializeDriverProfile(d, viewerRole, { isOwn = false } = {}) {
  if (!d) return null;

  const base = {
    id: d.user_id || d.id,
    name: d.name,
    phone: d.phone,
    email: d.email || null,
    scope: d.scope,
    license_class: d.license_class,
    rating: d.rating != null ? Number(d.rating) : null,
    ratings_count: d.ratings_count || 0,
    completed_count: d.completed_count || 0,
    created_at: d.created_at,
    truck: d.truck
      ? {
          category: d.truck.category,
          type: d.truck.type_name,
          body: d.truck.body_name,
          plate_number: d.truck.plate_number,
          cooling: d.truck.cooling || null,
          adr_certified: !!d.truck.adr_certified,
          photos: d.truck.photos || [],
        }
      : null,
  };

  // IBAN and CliQ alias: only for self, escrow, admin
  if (viewerRole === 'admin' || viewerRole === 'escrow' || isOwn) {
    base.iban = d.iban;
    base.cliq_alias = d.cliq_alias || null;
  }

  // Identity documents: only for self or admin
  if (viewerRole === 'admin' || isOwn) {
    base.id_doc_url = d.id_doc_url || null;
    base.license_doc_url = d.license_doc_url || null;
    base.passport_doc_url = d.passport_doc_url || null;
  }

  return base;
}

