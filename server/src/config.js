import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  timezone: process.env.TZ || 'Asia/Amman',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  driverVisibilityWindowHours: parseInt(process.env.DRIVER_VISIBILITY_WINDOW_HOURS || '48', 10),
  onTimeToleranceMin: parseInt(process.env.ON_TIME_TOLERANCE_MIN || '15', 10),

  // Supabase Storage
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '',
    bucket: process.env.SUPABASE_STORAGE_BUCKET || 'masar-documents',
  },

  // R2 Storage (Optional legacy / alternative)
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: process.env.R2_BUCKET || 'masar',
  },

  // Resend Email
  email: {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'Masar <no-reply@yourdomain.com>',
    redirectTo: process.env.EMAIL_REDIRECT_TO || null,
    supportEmail: process.env.SUPPORT_EMAIL || 'support@yourdomain.com',
  },

  // Geo
  geo: {
    nominatimUrl: process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org',
    nominatimUserAgent: process.env.NOMINATIM_USER_AGENT || 'masar-demo/1.0 (contact: you@yourdomain.com)',
    osrmUrl: process.env.OSRM_URL || 'https://router.project-osrm.org',
  },

  // Demo inboxes
  demo: {
    adminEmail: process.env.DEMO_ADMIN_EMAIL || '',
    escrowEmail: process.env.DEMO_ESCROW_EMAIL || '',
  },
};

