import { renderEmailLayout } from './layout.js';
import { buildDeepLink } from '../services/links.js';

export const TEMPLATE_KEYS = [
  'NewSignupAdmin',
  'SignupReceived',
  'AccountApproved',
  'AccountRejected',
  'AccountCreatedByAdmin',
  'PaymentReceived',
  'FundsHeld',
  'NewMatch',
  'DriverAccepted',
  'ShipmentAccepted',
  'OnItsWay',
  'DeliveredConfirm',
  'PayoutComplete',
  'DeliveryConfirmed',
  'ReleaseRecord',
];

export const templates = {
  // 1. NewSignupAdmin
  NewSignupAdmin: (data = {}) => {
    const role = data.role || 'manufacturer';
    const name = data.name || 'Sample User';
    const email = data.email || 'user@example.com';
    const phone = data.phone || '+962790000000';
    const submittedAt = data.submittedAt || 'Today at 14:30 (Asia/Amman)';
    const userId = data.userId || 'sample-user-id';
    const adminId = data.adminId || null;

    const path = `/admin/approvals?id=${userId}`;
    const subject = `New ${role} awaiting approval: ${name}`;

    return {
      subject,
      ...renderEmailLayout({
        previewText: `New ${role} registration awaiting review`,
        headline: `A new ${role} has registered and requires account review.`,
        facts: [
          { label: 'Role', value: role === 'driver' ? 'Driver (سائق)' : 'Manufacturer (مصنّع)' },
          { label: 'Name', value: name },
          { label: 'Phone', value: phone },
          { label: 'Email', value: email },
          { label: 'Submitted At', value: submittedAt },
        ],
        primaryButton: {
          text: 'Open in approvals',
          url: buildDeepLink(path, adminId),
        },
        recipientRole: 'admin',
      }),
    };
  },

  // 2. SignupReceived
  SignupReceived: (data = {}) => {
    const name = data.name || 'Partner';
    const role = data.role || 'driver';
    const userId = data.userId || null;

    const subject = `We received your Masar signup`;

    return {
      subject,
      ...renderEmailLayout({
        previewText: 'Your registration is under review by Masar compliance',
        headline: `We received your signup, ${name}!`,
        facts: [
          { label: 'Account Type', value: role === 'driver' ? 'Driver Partner' : 'Manufacturer' },
          { label: 'Status', value: 'Under Document Verification' },
          { label: 'Expected Review Time', value: 'Within 2-4 business hours' },
        ],
        primaryButton: {
          text: 'Log in to Masar',
          url: buildDeepLink('/login', userId),
        },
        footerNote: 'You will receive an email confirmation as soon as our verification team approves your documents.',
      }),
    };
  },

  // 3. AccountApproved
  AccountApproved: (data = {}) => {
    const name = data.name || 'Partner';
    const role = data.role || 'driver';
    const userId = data.userId || null;
    const roleHome = role === 'driver' ? '/driver' : role === 'manufacturer' ? '/manufacturer' : '/';

    const subject = `Your Masar account is approved`;

    return {
      subject,
      ...renderEmailLayout({
        previewText: 'Your account is active. Start using Masar today.',
        headline: `Congratulations ${name}! Your account is approved.`,
        facts: [
          { label: 'Account Status', value: 'Active & Verified' },
          { label: 'Assigned Role', value: role === 'driver' ? 'Verified Driver' : 'Approved Manufacturer' },
          { label: 'Escrow Protection', value: 'SafePay Escrow Active' },
        ],
        primaryButton: {
          text: 'Open your dashboard',
          url: buildDeepLink(roleHome, userId),
        },
        recipientRole: role,
      }),
    };
  },

  // 4. AccountRejected
  AccountRejected: (data = {}) => {
    const name = data.name || 'Partner';
    const reason = data.reason || 'Documents provided were unclear or incomplete.';
    const userId = data.userId || null;

    const subject = `Update on your Masar signup`;

    return {
      subject,
      ...renderEmailLayout({
        previewText: 'Action required regarding your registration documents',
        headline: `Update regarding your Masar application, ${name}.`,
        facts: [
          { label: 'Application Status', value: 'Requires Resubmission' },
          { label: 'Reason Provided', value: reason },
        ],
        primaryButton: {
          text: 'Log in and see reason',
          url: buildDeepLink('/pending-approval', userId),
        },
        footerNote: 'Please log in to your account to review the rejection notes and re-upload valid documents.',
      }),
    };
  },

  // 5. AccountCreatedByAdmin
  AccountCreatedByAdmin: (data = {}) => {
    const name = data.name || 'User';
    const tempPassword = data.tempPassword || 'Masar@2026';
    const emailOrPhone = data.emailOrPhone || 'user@example.com';
    const userId = data.userId || null;
    const role = data.role || 'manufacturer';

    const subject = `Your Masar account is ready`;

    return {
      subject,
      ...renderEmailLayout({
        previewText: 'Your credentials for the Masar Freight platform',
        headline: `Welcome to Masar, ${name}. Your account is ready.`,
        facts: [
          { label: 'Login Identifier', value: emailOrPhone },
          { label: 'Temporary Password', value: tempPassword },
          { label: 'Assigned Role', value: role },
        ],
        primaryButton: {
          text: 'Log in and change password',
          url: buildDeepLink('/login', userId),
        },
        footerNote: 'For security reasons, please change your temporary password immediately upon your first login.',
        recipientRole: role,
      }),
    };
  },

  // 6. PaymentReceived
  PaymentReceived: (data = {}) => {
    const n = data.ticketNumber || 'MSR-000101';
    const ticketId = data.ticketId || 'sample-id';
    const price = data.price || '850.000';
    const route = data.route || 'Amman → Zarqa';
    const userId = data.userId || null;

    const subject = `${n}: Payment received`;

    return {
      subject,
      ...renderEmailLayout({
        previewText: `Payment confirmed for ${n}. Published to drivers.`,
        headline: `Payment confirmed. ${n} is now open for drivers.`,
        facts: [
          { label: 'Shipment Number', value: n },
          { label: 'Route', value: route },
          { label: 'Deposit Held in Escrow', value: `${price} JD` },
          { label: 'Current Status', value: 'Pending Driver Acceptance' },
        ],
        primaryButton: {
          text: 'View shipment',
          url: buildDeepLink(`/manufacturer/shipments/${ticketId}`, userId),
        },
        footerNote: 'Your funds are held securely in SafePay Escrow until delivery is completed and confirmed by you.',
        recipientRole: 'manufacturer',
      }),
    };
  },

  // 7. FundsHeld
  FundsHeld: (data = {}) => {
    const n = data.ticketNumber || 'MSR-000101';
    const company = data.companyName || 'Al-Nour Dairy Co.';
    const companyId = data.companyId || 'company-id';
    const amount = data.amount || '850.000';
    const userId = data.userId || null;

    const subject = `${n}: Funds received`;

    return {
      subject,
      ...renderEmailLayout({
        previewText: `Escrow deposit logged for ${n}`,
        headline: `${amount} JD received for ${n} from ${company}.`,
        facts: [
          { label: 'Shipment Number', value: n },
          { label: 'Company', value: company },
          { label: 'Escrow Held Amount', value: `${amount} JD` },
          { label: 'Escrow Status', value: 'Held (Secured Deposit)' },
        ],
        primaryButton: {
          text: 'Held-funds record',
          url: buildDeepLink(`/escrow/held?q=${encodeURIComponent(n)}`, userId),
        },
        secondaryLink: {
          text: `View ${company} Profile`,
          url: buildDeepLink(`/escrow/companies/${companyId}`, userId),
        },
        recipientRole: 'escrow',
      }),
    };
  },

  // 8. NewMatch
  NewMatch: (data = {}) => {
    const n = data.ticketNumber || 'MSR-000101';
    const ticketId = data.ticketId || 'sample-id';
    const from = data.fromCity || 'Amman';
    const to = data.toCity || 'Aqaba';
    const earnings = data.earnings || '765.000';
    const pickupDate = data.pickupDate || 'Tomorrow at 08:00 (Asia/Amman)';
    const userId = data.userId || null;

    const subject = `${n}: New shipment for your truck`;

    return {
      subject,
      ...renderEmailLayout({
        previewText: `New trip available: ${from} to ${to}. Earn ${earnings} JD.`,
        headline: `New shipment: ${from} to ${to}, your earnings ${earnings} JD`,
        facts: [
          { label: 'Shipment', value: n },
          { label: 'Route', value: `${from} → ${to}` },
          { label: 'Pickup Date & Time', value: pickupDate },
          { label: 'Guaranteed Earnings', value: `${earnings} JD (SafePay Escrow)` },
        ],
        primaryButton: {
          text: 'See shipment details',
          url: buildDeepLink(`/driver/shipments/${ticketId}`, userId),
        },
        recipientRole: 'driver',
      }),
    };
  },

  // 9. DriverAccepted
  DriverAccepted: (data = {}) => {
    const n = data.ticketNumber || 'MSR-000101';
    const ticketId = data.ticketId || 'sample-id';
    const driverName = data.driverName || 'Omar Saleh';
    const driverPhone = data.driverPhone || '+962790010001';
    const driverId = data.driverId || 'driver-id';
    const plateNumber = data.plateNumber || '44-12345';
    const userId = data.userId || null;

    const subject = `${n}: Mr. ${driverName} accepted your shipment`;

    return {
      subject,
      ...renderEmailLayout({
        previewText: `Mr. ${driverName} has accepted shipment ${n}`,
        headline: `Mr. ${driverName} accepted ${n}.`,
        facts: [
          { label: 'Shipment', value: n },
          { label: 'Driver', value: `Mr. ${driverName}` },
          { label: 'Driver Phone', value: driverPhone },
          { label: 'Truck Plate', value: plateNumber },
          { label: 'Status', value: 'Waiting for Loading' },
        ],
        primaryButton: {
          text: 'View driver profile',
          url: buildDeepLink(`/manufacturer/drivers/${driverId}`, userId),
        },
        secondaryLink: {
          text: 'View shipment details',
          url: buildDeepLink(`/manufacturer/shipments/${ticketId}`, userId),
        },
        recipientRole: 'manufacturer',
      }),
    };
  },

  // 10. ShipmentAccepted
  ShipmentAccepted: (data = {}) => {
    const n = data.ticketNumber || 'MSR-000101';
    const ticketId = data.ticketId || 'sample-id';
    const pickupAddress = data.pickupAddress || 'Amman Industrial Estate';
    const pickupTime = data.pickupTime || 'Today at 10:00 (Asia/Amman)';
    const earnings = data.earnings || '765.000';
    const userId = data.userId || null;

    const subject = `${n}: You accepted this shipment`;

    return {
      subject,
      ...renderEmailLayout({
        previewText: `Pickup confirmed for ${n}. Head to loading site.`,
        headline: `You accepted ${n}. See pickup details.`,
        facts: [
          { label: 'Shipment', value: n },
          { label: 'Pickup Location', value: pickupAddress },
          { label: 'Pickup Time', value: pickupTime },
          { label: 'Your Net Earnings', value: `${earnings} JD` },
        ],
        primaryButton: {
          text: 'See pickup details',
          url: buildDeepLink(`/driver/active`, userId),
        },
        footerNote: 'Please notify the platform as soon as you arrive at the loading facility.',
        recipientRole: 'driver',
      }),
    };
  },

  // 11. OnItsWay
  OnItsWay: (data = {}) => {
    const n = data.ticketNumber || 'MSR-000101';
    const ticketId = data.ticketId || 'sample-id';
    const driverName = data.driverName || 'Omar Saleh';
    const toCity = data.toCity || 'Aqaba';
    const loadedAt = data.loadedAt || 'Today at 11:15 (Asia/Amman)';
    const userId = data.userId || null;

    const subject = `${n}: Your shipment is on its way`;

    return {
      subject,
      ...renderEmailLayout({
        previewText: `${n} loaded and in transit to ${toCity}`,
        headline: `${n} is on its way to ${toCity}.`,
        facts: [
          { label: 'Shipment', value: n },
          { label: 'Driver', value: `Mr. ${driverName}` },
          { label: 'Departure Time', value: loadedAt },
          { label: 'Status', value: 'In Delivery (En Route)' },
        ],
        primaryButton: {
          text: 'Track shipment',
          url: buildDeepLink(`/manufacturer/shipments/${ticketId}`, userId),
        },
        recipientRole: 'manufacturer',
      }),
    };
  },

  // 12. DeliveredConfirm
  DeliveredConfirm: (data = {}) => {
    const n = data.ticketNumber || 'MSR-000101';
    const ticketId = data.ticketId || 'sample-id';
    const driverName = data.driverName || 'Omar Saleh';
    const driverId = data.driverId || 'driver-id';
    const deliveredAt = data.deliveredAt || 'Today at 16:45 (Asia/Amman)';
    const userId = data.userId || null;

    const subject = `${n}: Delivered, please confirm`;

    return {
      subject,
      ...renderEmailLayout({
        previewText: `${n} was delivered. Please verify and confirm receipt.`,
        headline: `${n} was delivered. Verify with the receiver and confirm.`,
        facts: [
          { label: 'Shipment', value: n },
          { label: 'Delivered By', value: `Mr. ${driverName}` },
          { label: 'Delivery Time', value: deliveredAt },
          { label: 'Action Required', value: 'Confirm receipt to release driver payout' },
        ],
        primaryButton: {
          text: 'View and confirm delivery',
          url: buildDeepLink(`/manufacturer/shipments/${ticketId}`, userId),
        },
        secondaryLink: {
          text: `View Mr. ${driverName}'s profile`,
          url: buildDeepLink(`/manufacturer/drivers/${driverId}`, userId),
        },
        recipientRole: 'manufacturer',
      }),
    };
  },

  // 13. PayoutComplete
  PayoutComplete: (data = {}) => {
    const n = data.ticketNumber || 'MSR-000101';
    const amount = data.amount || '765.000';
    const iban = data.iban || 'JO94CBJO0010000000000131000001';
    const userId = data.userId || null;

    const subject = `${n}: ${amount} JD transferred to your account`;

    return {
      subject,
      ...renderEmailLayout({
        previewText: `SafePay Escrow release: ${amount} JD transferred`,
        headline: `${amount} JD transferred successfully to your account ${iban.slice(0, 4)}...${iban.slice(-4)}.`,
        facts: [
          { label: 'Shipment', value: n },
          { label: 'Transferred Amount', value: `${amount} JD` },
          { label: 'Bank Account (IBAN)', value: iban },
          { label: 'Transfer Status', value: 'Executed by SafePay Escrow' },
        ],
        primaryButton: {
          text: 'View earnings ledger',
          url: buildDeepLink(`/driver/earnings`, userId),
        },
        recipientRole: 'driver',
      }),
    };
  },

  // 14. DeliveryConfirmed
  DeliveryConfirmed: (data = {}) => {
    const n = data.ticketNumber || 'MSR-000101';
    const ticketId = data.ticketId || 'sample-id';
    const driverName = data.driverName || 'Omar Saleh';
    const driverId = data.driverId || 'driver-id';
    const userId = data.userId || null;

    const subject = `${n}: Delivery confirmed`;

    return {
      subject,
      ...renderEmailLayout({
        previewText: `Receipt confirmed for ${n}. Please rate your driver.`,
        headline: `Delivery of ${n} confirmed. Please rate Mr. ${driverName}.`,
        facts: [
          { label: 'Shipment', value: n },
          { label: 'Driver', value: `Mr. ${driverName}` },
          { label: 'Escrow Status', value: 'Audited & Payout Released' },
        ],
        primaryButton: {
          text: 'Rate driver and view shipment',
          url: buildDeepLink(`/manufacturer/shipments/${ticketId}`, userId),
        },
        recipientRole: 'manufacturer',
      }),
    };
  },

  // 15. ReleaseRecord
  ReleaseRecord: (data = {}) => {
    const n = data.ticketNumber || 'MSR-000101';
    const company = data.companyName || 'Al-Nour Dairy Co.';
    const companyId = data.companyId || 'company-id';
    const driverNet = data.driverNet || '765.000';
    const masarFee = data.masarFee || '59.500';
    const escrowFee = data.escrowFee || '25.500';
    const total = data.totalPrice || '850.000';
    const userId = data.userId || null;

    const subject = `${n}: Release record`;

    return {
      subject,
      ...renderEmailLayout({
        previewText: `SafePay release breakdown for ${n}`,
        headline: `${n} released: complete SafePay financial breakdown.`,
        facts: [
          { label: 'Shipment', value: n },
          { label: 'Depositing Company', value: company },
          { label: 'Total Shipment Price', value: `${total} JD` },
          { label: 'Driver Net Payout', value: `${driverNet} JD` },
          { label: 'Masar Platform Fee (7%)', value: `${masarFee} JD` },
          { label: 'SafePay Escrow Fee (3%)', value: `${escrowFee} JD` },
        ],
        primaryButton: {
          text: 'Release record',
          url: buildDeepLink(`/escrow/releases?q=${encodeURIComponent(n)}`, userId),
        },
        secondaryLink: {
          text: `View ${company} Profile`,
          url: buildDeepLink(`/escrow/companies/${companyId}`, userId),
        },
        recipientRole: 'escrow',
      }),
    };
  },
};

