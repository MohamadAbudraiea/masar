import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const outputDirs = [
  path.resolve('./demo-documents'),
  path.resolve('../client/public/demo-docs'),
  path.resolve('../demo-documents'),
];

outputDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const pdfPath1 = path.join(outputDirs[0], 'Masar-Complete-Demo-Package.pdf');
const pdfPath2 = path.join(outputDirs[1], 'Masar-Complete-Demo-Package.pdf');
const pdfPath3 = path.join(outputDirs[2], 'Masar-Complete-Demo-Package.pdf');

const doc = new PDFDocument({ margin: 36, size: 'A4', autoFirstPage: false });

const stream1 = fs.createWriteStream(pdfPath1);
const stream2 = fs.createWriteStream(pdfPath2);
const stream3 = fs.createWriteStream(pdfPath3);

doc.pipe(stream1);
doc.pipe(stream2);
doc.pipe(stream3);

// Helper for top header on every page
function drawHeader(pageNum, totalPages, titleTag = 'Demo & Testing Reference') {
  doc.rect(0, 0, doc.page.width, 64).fill('#071E33'); // Deep Navy
  doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text('masar', 36, 18);
  doc.fillColor('#F5A82A').fontSize(12).font('Helvetica').text('· Escrow Freight Platform', 108, 25);

  doc
    .fillColor('#94A3B8')
    .fontSize(9)
    .font('Helvetica')
    .text(titleTag, doc.page.width - 240, 20, { width: 204, align: 'right' });
  doc
    .fillColor('#F5A82A')
    .fontSize(8)
    .font('Helvetica-Bold')
    .text(`PAGE ${pageNum} OF ${totalPages}`, doc.page.width - 240, 34, { width: 204, align: 'right' });

  // Gold accent rule
  doc.rect(0, 64, doc.page.width, 3).fill('#F5A82A');
}

function drawFooter() {
  const footerY = doc.page.height - 30;
  doc.rect(0, footerY - 4, doc.page.width, 1).fill('#E2E8F0');
  doc.fillColor('#94A3B8').fontSize(8).font('Helvetica').text(
    'Masar Platform · Ministry of Transport & Industrial Logistics Framework · Amman, Jordan · masar.vydo.tech',
    36,
    footerY,
    { align: 'center', width: doc.page.width - 72 }
  );
}

const TOTAL_PAGES = 5;

// ==========================================
// PAGE 1: CORE CREDENTIALS & RE-SEED GUIDE
// ==========================================
doc.addPage();
drawHeader(1, TOTAL_PAGES, 'Core Accounts & Platform Reset');

doc.y = 82;
doc.fillColor('#071E33').fontSize(16).font('Helvetica-Bold').text('1. Production Demo Accounts');
doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('Common Password for all accounts: Masar@123  (Also available via 1-tap quick fill on /login)');
doc.moveDown(0.5);

const accounts = [
  { role: 'Admin', name: 'Mohamad Abu Draiea (Admin)', email: 'mohamadabudraiea2003@gmail.com', phone: '+962790000000', note: 'Approvals, System Map, Audit Overview' },
  { role: 'Manufacturer', name: 'Al-Nour Foods Co.', email: 'mohamadabudraiea@gmail.com', phone: '+962790000001', note: 'Create shipments, pay escrow, confirm deliveries' },
  { role: 'Escrow', name: 'SafePay Escrow Jordan', email: 'mohamadabudraiea2003@outlook.com', phone: '+962790000099', note: 'Holds funds, releases driver payouts, ledger audits' },
  { role: 'Driver', name: 'Omar Ayman Saleh (Free)', email: 'mohamadayman773@gmail.com', phone: '+962790010001', note: 'Medium Refrigerated Truck (44-12345), ready to accept' },
];

accounts.forEach((acc, i) => {
  const y = doc.y;
  doc.roundedRect(36, y, doc.page.width - 72, 42, 5).fillAndStroke('#F8FAFC', '#E2E8F0');
  
  doc.fillColor('#071E33').fontSize(10).font('Helvetica-Bold').text(`[${acc.role}] ${acc.name}`, 48, y + 8);
  doc.fillColor('#D97706').fontSize(9).font('Helvetica-Bold').text('Password: Masar@123', doc.page.width - 170, y + 8, { width: 120, align: 'right' });
  
  doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica').text(`Email: ${acc.email}  |  Phone: ${acc.phone}`, 48, y + 24);
  doc.fillColor('#64748B').fontSize(8).font('Helvetica').text(acc.note, doc.page.width - 240, y + 24, { width: 190, align: 'right' });

  doc.y = y + 47;
});

doc.moveDown(0.8);
doc.fillColor('#071E33').fontSize(14).font('Helvetica-Bold').text('2. How to Re-Seed the Database Anytime');
doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('Execute this command in your terminal whenever you want to wipe test runs and restore clean seed data:');
doc.moveDown(0.4);

const cmdY = doc.y;
doc.roundedRect(36, cmdY, doc.page.width - 72, 38, 5).fill('#0F172A');
doc.fillColor('#10B981').fontSize(11).font('Courier-Bold').text('cd server; npm run db:seed', 50, cmdY + 12);
doc.fillColor('#94A3B8').fontSize(8).font('Helvetica').text('(Runs in PowerShell or CMD)', doc.page.width - 180, cmdY + 13);

doc.y = cmdY + 48;
doc.fillColor('#071E33').fontSize(9.5).font('Helvetica-Bold').text('What the seed script does automatically:');
doc.fillColor('#475569').fontSize(8.5).font('Helvetica');
doc.text('• Truncates all platform tables (users, shipments, ledger, ratings, notifications, activity) with CASCADE.');
doc.text('• Recreates all 4 core accounts above with approved status and password Masar@123.');
doc.text('• Seeds 7 distinct approved manufacturers across Jordan and 12 diverse drivers with varied trucks.');
doc.text('• Creates 4 pending approval applicants (2 manufacturers, 2 drivers) in /admin/approvals.');
doc.text('• Seeds 48 lifecycle shipments (29 audited with ratings, 4 in delivery, 3 delivered, 3 waiting load, 6 pending, 3 requested).');
doc.text('• Resets ticket sequence so your next live test shipment starts cleanly at MSR-000127.');
doc.text('• Leaves Captain Omar Ayman completely free and ready to accept new jobs.');

drawFooter();

// ==========================================
// PAGE 2: SIGN-UP DEMO DATA (DRIVER & MFR)
// ==========================================
doc.addPage();
drawHeader(2, TOTAL_PAGES, 'Registration Form Data');

doc.y = 82;
doc.fillColor('#071E33').fontSize(15).font('Helvetica-Bold').text('3. Driver Sign-Up Form Data  (/register/driver)');
doc.fillColor('#64748B').fontSize(8.5).font('Helvetica').text('Fill these values to test driver onboarding and see the applicant appear in /admin/approvals:');
doc.moveDown(0.4);

const driverFields = [
  ['Full Name', 'Rami Tareq Al-Zoubi'],
  ['Email', 'rami.zoubi.demo@gmail.com'],
  ['Phone Number', '+962795551234'],
  ['Password', 'Masar@123'],
  ['Operating Scope', 'Internal (Local within Jordan)'],
  ['License Class', 'Class 4 (Medium truck up to 7.5t)'],
  ['IBAN Number', 'JO94CBJO0010000000000131000077'],
  ['CliQ Alias (Optional)', 'RAMI_ZOUBI'],
  ['Truck Category', 'Medium'],
  ['Truck Type', 'Long Chassis'],
  ['Truck Body', 'Refrigerated  (Cooling: Chilled 2°C to 8°C)'],
  ['Truck Plate Number', '44-88991  (Jordan Cargo)'],
  ['Gross Vehicle Weight', 'Medium 2.5t - 7.5t (Gross Weight Code)'],
  ['ADR Certified', 'No (Unchecked)'],
  ['Required Document Uploads', 'Upload Page 5 of this PDF or Masar-Sample-Driver-License.pdf'],
];

driverFields.forEach(([label, val], idx) => {
  const y = doc.y;
  const isEven = idx % 2 === 0;
  doc.rect(36, y, doc.page.width - 72, 17).fill(isEven ? '#F8FAFC' : '#FFFFFF');
  doc.rect(36, y, doc.page.width - 72, 17).stroke('#E2E8F0');

  doc.fillColor('#64748B').fontSize(8).font('Helvetica').text(label, 44, y + 4, { width: 160 });
  doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(val, 204, y + 4, { width: doc.page.width - 248 });
  doc.y = y + 17;
});

doc.moveDown(0.8);
doc.fillColor('#071E33').fontSize(15).font('Helvetica-Bold').text('4. Manufacturer Sign-Up Form Data  (/register/manufacturer)');
doc.fillColor('#64748B').fontSize(8.5).font('Helvetica').text('Fill these values to test manufacturer onboarding:');
doc.moveDown(0.4);

const mfrFields = [
  ['Company Legal Name', 'Al-Safwa Modern Dairy & Food Industries'],
  ['Contact Person', 'Eng. Tareq Al-Qadi (General Manager)'],
  ['Primary Business Email', 'info@alsafwadairy.demo'],
  ['Primary Phone', '+962796662345'],
  ['Password', 'Masar@123'],
  ['Goods Categories', 'Food & Beverages (Check: Dry, Chilled, Frozen)'],
  ['Factory City & Area', 'City: Zarqa  |  Area: Hashemiyya Industrial Zone'],
  ['Street Address', 'Building 14, Sector 2, Hashemiyya Industrial Zone, Zarqa'],
  ['Map Coordinates (Lat / Lng)', '32.0728, 36.0880  (Select Zarqa on picker or type)'],
  ['Required Document Uploads', 'Upload Page 4 of this PDF or Masar-Sample-Commercial-Registration.pdf'],
];

mfrFields.forEach(([label, val], idx) => {
  const y = doc.y;
  const isEven = idx % 2 === 0;
  doc.rect(36, y, doc.page.width - 72, 17).fill(isEven ? '#F8FAFC' : '#FFFFFF');
  doc.rect(36, y, doc.page.width - 72, 17).stroke('#E2E8F0');

  doc.fillColor('#64748B').fontSize(8).font('Helvetica').text(label, 44, y + 4, { width: 160 });
  doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(val, 204, y + 4, { width: doc.page.width - 248 });
  doc.y = y + 17;
});

drawFooter();

// ==========================================
// PAGE 3: 2 TEST SHIPMENTS SPECIFICATIONS
// ==========================================
doc.addPage();
drawHeader(3, TOTAL_PAGES, 'Test Shipments (Matching & Non-Matching)');

doc.y = 82;
doc.fillColor('#071E33').fontSize(15).font('Helvetica-Bold').text('5. The 2 Test Shipments (Create as Al-Nour Foods Co.)');
doc.fillColor('#64748B').fontSize(8.5).font('Helvetica').text('Log in as mohamadabudraiea@gmail.com and click "Create Shipment"');
doc.moveDown(0.6);

// Shipment 1 Box
doc.fillColor('#071E33').fontSize(12).font('Helvetica-Bold').text('Shipment 1: Heavy Structural Steel (Non-Matching / Any Specs)');
doc.fillColor('#64748B').fontSize(8.5).font('Helvetica').text('Tests standard heavy equipment order (does NOT match Omar Ayman):');
doc.moveDown(0.3);

const s1BoxY = doc.y;
doc.roundedRect(36, s1BoxY, doc.page.width - 72, 120, 5).fillAndStroke('#F8FAFC', '#CBD5E1');
doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica');
doc.text('• Goods Category: Machinery & Equipment (or Dry Goods)', 48, s1BoxY + 10);
doc.text('• Cargo Description: Heavy Structural Steel Rebars (12m bundles)', 48, s1BoxY + 24);
doc.text('• Quantity: 18.0 tons  |  Trip Type: Local', 48, s1BoxY + 38);
doc.text('• Pickup Location: Al-Nour Zarqa Factory (Zarqa, Hashemiyya)', 48, s1BoxY + 52);
doc.text('• Pickup Date/Time: Tomorrow 10:00 AM', 48, s1BoxY + 66);
doc.text('• Destination: Aqaba Container Terminal Yard 4, Aqaba', 48, s1BoxY + 80);
doc.text('• Receiver: Eng. Mahmoud Site Logistics (+962798883333)', 48, s1BoxY + 94);
doc.text('• Required Truck: Category: Heavy  |  Body: Flatbed  |  Agreed Price: 1,800.000 JD', 48, s1BoxY + 106);

doc.y = s1BoxY + 132;

// Shipment 2 Box (THE CRITICAL MATCH FOR OMAR AYMAN)
doc.fillColor('#071E33').fontSize(12).font('Helvetica-Bold').text('Shipment 2: Fresh Dairy (100% MATCH FOR OMAR AYMAN SALEH)');
doc.fillColor('#10B981').fontSize(8.5).font('Helvetica-Bold').text('GUARANTEED TO APPEAR ON OMAR AYMAN\'S FEED (/driver) AND SHOW THE ACCEPT POPUP MODAL!');
doc.moveDown(0.3);

const s2BoxY = doc.y;
doc.roundedRect(36, s2BoxY, doc.page.width - 72, 190, 5).fillAndStroke('#FFFBEB', '#F59E0B'); // Warm amber border
doc.fillColor('#071E33').fontSize(9).font('Helvetica-Bold').text('Exact Matching Attribute Table:', 48, s2BoxY + 10);

const matchSpecs = [
  ['Goods Category', 'Food & Beverages', 'Matches refrigerated food transport'],
  ['Cargo Description', 'Chilled Fresh Labneh & Halloumi Cheeses (4°C)', 'Commercial dairy product consignment'],
  ['Quantity', '3.5 tons', 'Fits Omar\'s 2.5t - 7.5t payload rating'],
  ['Trip Type', 'Local (within Jordan)', 'Required for Omar\'s internal license scope'],
  ['Pickup Location', 'Al-Nour Zarqa Factory (Zarqa)', 'Origin terminal in Jordan'],
  ['Pickup Date / Time', 'Tomorrow at 09:00 AM', 'CRITICAL: Must be within 48h visibility window!'],
  ['Loading / Unloading', 'Needs loading: Yes  |  Needs unloading: Yes', 'Check both boxes on form'],
  ['Destination', 'Al-Hashmi St, Irbid (Fresh Market Central)', 'Jordan destination (82 km)'],
  ['Receiver Contact', 'Fadi Market Operations  |  +962798881111', 'Delivery contact point'],
  ['Required Truck', 'Category: Medium  |  Body: Refrigerated', 'Exact match to Omar\'s registered truck'],
  ['Required Cooling', 'Chilled  (Temp: 2°C to 6°C)', 'Exact match to Omar\'s chilled refrigeration'],
  ['Hazardous / Customs', 'Hazardous: NO  |  Customs: NO', 'Omar is non-ADR & internal scope'],
  ['Agreed Price', '650.000 JD  (Driver Net: 611.000 JD)', 'Escrow Fee: 13.000 JD, Masar: 26.000 JD'],
];

let rowY = s2BoxY + 26;
matchSpecs.forEach(([k, v, note]) => {
  doc.fillColor('#0F172A').fontSize(7.8).font('Helvetica-Bold').text(k, 48, rowY, { width: 120 });
  doc.fillColor('#B45309').fontSize(7.8).font('Helvetica-Bold').text(v, 172, rowY, { width: 175 });
  doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text(note, 350, rowY, { width: doc.page.width - 390 });
  rowY += 12.2;
});

doc.y = s2BoxY + 196;
doc.fillColor('#071E33').fontSize(9).font('Helvetica-Bold').text('Demo Step-by-Step Flow:');
doc.fillColor('#334155').fontSize(8).font('Helvetica');
doc.text('1. Click "Create Shipment" with the values above. The shipment is created in "requested" status.');
doc.text('2. In Al-Nour\'s dashboard, click "Pay Escrow" (650 JD). The status moves to "pending" (Escrow locked).');
doc.text('3. Log in as Driver (mohamadayman773@gmail.com / Masar@123). Shipment appears at top of feed!');
doc.text('4. Click "Accept Shipment" button -> The clean in-app confirmation popup appears smoothly without window alerts.');

drawFooter();

// ==========================================
// PAGE 4: COMMERCIAL REGISTRATION SAMPLE
// ==========================================
doc.addPage();
drawHeader(4, TOTAL_PAGES, 'Official Sample Commercial Registration');

doc.y = 80;
doc.fillColor('#071E33').fontSize(16).font('Helvetica-Bold').text('Commercial Registration Certificate');
doc.fillColor('#64748B').fontSize(10).font('Helvetica').text('Ministry of Industry and Trade · Company Registration Directorate · Hashemite Kingdom of Jordan');
doc.moveDown(0.6);

// Certificate Box
const cBoxY = doc.y;
doc.roundedRect(36, cBoxY, doc.page.width - 72, 60, 6).fillAndStroke('#F8FAFC', '#E2E8F0');
doc.fillColor('#071E33').fontSize(11).font('Helvetica-Bold').text('Certificate Ref: CR-JO-2026-981244', 50, cBoxY + 14);
doc.text('Entity: Al-Safwa Modern Dairy & Food Industries LLC', 50, cBoxY + 34);

doc.fillColor('#10B981').fontSize(10).font('Helvetica-Bold');
doc.text('STATUS: ACTIVE & REGISTERED', doc.page.width - 220, cBoxY + 24, { width: 170, align: 'right' });

doc.y = cBoxY + 76;
doc.fillColor('#071E33').fontSize(12).font('Helvetica-Bold').text('Registration Details & Legal Metadata');
doc.moveDown(0.3);

const crDetails = [
  ['National Company Registry Number', '200198421'],
  ['Legal Form', 'Limited Liability Company (LLC)'],
  ['Registered Capital', '250,000 JOD (Fully Paid)'],
  ['Authorized Manager & Signatory', 'Eng. Tareq Al-Qadi (General Manager)'],
  ['Main Industrial Activity', 'Manufacture & Cold Distribution of Dairy Products and Foodstuff'],
  ['Licensed Production Facility', 'Sector 2, Hashemiyya Industrial Zone, Zarqa, Jordan'],
  ['Commercial Registration Date', '14 May 2018 (Current Renewal: 2026/2027)'],
  ['National Tax Number', '109842109'],
  ['Chamber of Industry Membership', 'Zarqa Chamber of Industry - Member ID #4412'],
  ['Jordan Food & Drug Administration (JFDA)', 'Certified Sanitary Food Production Permit #JFDA-2026-FD81'],
];

crDetails.forEach(([k, v], idx) => {
  const y = doc.y;
  const isEven = idx % 2 === 0;
  doc.rect(36, y, doc.page.width - 72, 22).fill(isEven ? '#FFFFFF' : '#F8FAFC');
  doc.rect(36, y, doc.page.width - 72, 22).stroke('#E2E8F0');

  doc.fillColor('#64748B').fontSize(9).font('Helvetica').text(k, 48, y + 6, { width: 200 });
  doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(v, 252, y + 6, { width: doc.page.width - 296 });
  doc.y = y + 22;
});

doc.moveDown(1.2);
const sY = doc.y;
doc.roundedRect(36, sY, doc.page.width - 72, 54, 6).fillAndStroke('#F1F5F9', '#CBD5E1');
doc.circle(68, sY + 27, 18).fillAndStroke('#F5A82A', '#D97706');
doc.fillColor('#071E33').fontSize(9).font('Helvetica-Bold').text('MASAR', 52, sY + 23);

doc.fillColor('#071E33').fontSize(10).font('Helvetica-Bold').text('Certified for Masar Platform Verification', 98, sY + 12);
doc.fillColor('#64748B').fontSize(8.5).font('Helvetica').text('Valid sample attachment for manufacturer registration tests on https://masar.vydo.tech', 98, sY + 26);
doc.text('Issued in Amman, Jordan · Official Commercial Registrar Department', 98, sY + 38);

drawFooter();

// ==========================================
// PAGE 5: DRIVER & VEHICLE LICENSE SAMPLE
// ==========================================
doc.addPage();
drawHeader(5, TOTAL_PAGES, 'Official Sample Driver & Vehicle Permit');

doc.y = 80;
doc.fillColor('#071E33').fontSize(16).font('Helvetica-Bold').text('Commercial Driver & Vehicle Permit');
doc.fillColor('#64748B').fontSize(10).font('Helvetica').text('Public Security Directorate · Drivers & Vehicles Licensing Department · Jordan');
doc.moveDown(0.6);

const dBoxY = doc.y;
doc.roundedRect(36, dBoxY, doc.page.width - 72, 60, 6).fillAndStroke('#F8FAFC', '#E2E8F0');
doc.fillColor('#071E33').fontSize(11).font('Helvetica-Bold').text('Driver License Ref: DL-JO-4-0988214', 50, dBoxY + 14);
doc.text('Holder: Captain Rami Tareq Al-Zoubi (National ID: 9881023411)', 50, dBoxY + 34);

doc.fillColor('#10B981').fontSize(10).font('Helvetica-Bold');
doc.text('CATEGORY: CLASS 4 VALID', doc.page.width - 220, dBoxY + 24, { width: 170, align: 'right' });

doc.y = dBoxY + 76;
doc.fillColor('#071E33').fontSize(12).font('Helvetica-Bold').text('Driver Qualification & Vehicle Specifications');
doc.moveDown(0.3);

const dlDetails = [
  ['Full Driver Legal Name', 'Rami Tareq Al-Zoubi'],
  ['License Category', 'Class 4 (Medium Freight Transport up to 7.5 Tons Gross)'],
  ['Registered Truck Plate Number', '44-88991 (Jordan - Commercial Freight)'],
  ['Truck Make & Model', 'Mercedes-Benz Atego 815 (Long Chassis)'],
  ['Registered Body Type', 'Refrigerated Box Container (Chilled 2°C - 8°C)'],
  ['Refrigeration Unit Specs', 'Carrier Transicold Xarios 350 (-20°C to +10°C)'],
  ['Gross Vehicle Weight Code', 'Medium 2.5t - 7.5t (Payload: 4,200 kg)'],
  ['ADR Hazardous Certification', 'Not Certified (Standard Freight Only)'],
  ['Issuing Licensing Center', 'Zarqa Licensing Directorate'],
  ['Permit Expiry Date', '28 October 2030 (Annual Inspection Passed)'],
];

dlDetails.forEach(([k, v], idx) => {
  const y = doc.y;
  const isEven = idx % 2 === 0;
  doc.rect(36, y, doc.page.width - 72, 22).fill(isEven ? '#FFFFFF' : '#F8FAFC');
  doc.rect(36, y, doc.page.width - 72, 22).stroke('#E2E8F0');

  doc.fillColor('#64748B').fontSize(9).font('Helvetica').text(k, 48, y + 6, { width: 200 });
  doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(v, 252, y + 6, { width: doc.page.width - 296 });
  doc.y = y + 22;
});

doc.moveDown(1.2);
const sdY = doc.y;
doc.roundedRect(36, sdY, doc.page.width - 72, 54, 6).fillAndStroke('#F1F5F9', '#CBD5E1');
doc.circle(68, sdY + 27, 18).fillAndStroke('#F5A82A', '#D97706');
doc.fillColor('#071E33').fontSize(9).font('Helvetica-Bold').text('MASAR', 52, sdY + 23);

doc.fillColor('#071E33').fontSize(10).font('Helvetica-Bold').text('Certified Driver Documentation for Demo Uploads', 98, sdY + 12);
doc.fillColor('#64748B').fontSize(8.5).font('Helvetica').text('Valid sample attachment for driver registration tests on https://masar.vydo.tech', 98, sdY + 26);
doc.text('Verified under Jordan Traffic Law No. 49 · Commercial Transport Directorate', 98, sdY + 38);

drawFooter();

doc.end();
console.log('✓ Successfully generated unified 5-page Masar Demo Package PDF!');
