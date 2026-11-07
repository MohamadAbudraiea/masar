import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const outputDirs = [
  path.resolve('./demo-documents'),
  path.resolve('../client/public/demo-docs'),
];

outputDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function createBrandedDoc({ title, subtitle, docNumber, partyName, partyType, details }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  // 1. BRAND HEADER
  doc.rect(0, 0, doc.page.width, 75).fill('#071E33'); // Dark Navy
  doc.fillColor('#FFFFFF').fontSize(24).font('Helvetica-Bold').text('masar', 40, 24);
  doc.fillColor('#F5A82A').fontSize(14).font('Helvetica').text('· Escrow Freight Platform', 115, 31);
  doc
    .fillColor('#94A3B8')
    .fontSize(10)
    .font('Helvetica')
    .text('Official Sample Document', doc.page.width - 200, 31, { width: 160, align: 'right' });

  // Gold accent bar
  doc.rect(0, 75, doc.page.width, 4).fill('#F5A82A');

  // 2. DOCUMENT TITLE & META
  doc.y = 100;
  doc.fillColor('#071E33').fontSize(18).font('Helvetica-Bold').text(title);
  doc.fillColor('#64748B').fontSize(11).font('Helvetica').text(subtitle);
  doc.moveDown(0.6);

  // Status Badge & Ref
  const badgeTop = doc.y;
  doc.roundedRect(40, badgeTop, doc.page.width - 80, 50, 6).fillAndStroke('#F8FAFC', '#E2E8F0');
  
  doc.fillColor('#071E33').fontSize(11).font('Helvetica-Bold');
  doc.text(`Doc Ref: ${docNumber}`, 56, badgeTop + 14);
  doc.text(`Entity: ${partyName} (${partyType})`, 56, badgeTop + 30);

  doc.fillColor('#10B981').fontSize(11).font('Helvetica-Bold');
  doc.text('VERIFIED ACTIVE', doc.page.width - 170, badgeTop + 18, { width: 114, align: 'right' });

  doc.y = badgeTop + 65;

  // 3. DETAILS TABLE / SECTIONS
  doc.fillColor('#071E33').fontSize(13).font('Helvetica-Bold').text('Document Specification');
  doc.moveDown(0.4);

  const rowHeight = 32;
  details.forEach((item, index) => {
    const currentY = doc.y;
    const isEven = index % 2 === 0;
    doc.rect(40, currentY, doc.page.width - 80, rowHeight).fill(isEven ? '#FFFFFF' : '#F8FAFC');
    doc.rect(40, currentY, doc.page.width - 80, rowHeight).stroke('#E2E8F0');

    doc.fillColor('#64748B').fontSize(10).font('Helvetica');
    doc.text(item.label, 56, currentY + 10, { width: 180 });

    doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold');
    doc.text(item.value, 240, currentY + 10, { width: doc.page.width - 300 });

    doc.y = currentY + rowHeight;
  });

  doc.moveDown(1.5);

  // 4. OFFICIAL SEAL / WATERMARK BOX
  const sealY = doc.y;
  doc.roundedRect(40, sealY, doc.page.width - 80, 70, 6).fillAndStroke('#F1F5F9', '#CBD5E1');
  doc.circle(75, sealY + 35, 20).fillAndStroke('#F5A82A', '#D97706');
  doc.fillColor('#071E33').fontSize(10).font('Helvetica-Bold').text('MASAR', 58, sealY + 31);

  doc.fillColor('#071E33').fontSize(11).font('Helvetica-Bold').text('Official Masar Demo Verification Seal', 110, sealY + 18);
  doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('This sample document is pre-formatted for registration tests on https://masar.vydo.tech', 110, sealY + 34);
  doc.text('Issue Date: November 2026 · Valid through: November 2028 · Hashemite Kingdom of Jordan', 110, sealY + 48);

  // 5. FOOTER
  const footerY = doc.page.height - 40;
  doc.rect(0, footerY - 5, doc.page.width, 1).fill('#E2E8F0');
  doc.fillColor('#94A3B8').fontSize(9).font('Helvetica').text(
    'Masar Platform · Ministry of Transport & Industrial Logistics Framework · Amman, Jordan',
    40,
    footerY,
    { align: 'center', width: doc.page.width - 80 }
  );

  return doc;
}

const docs = [
  {
    fileName: 'Masar-Sample-Commercial-Registration.pdf',
    title: 'Commercial Registration Certificate',
    subtitle: 'Ministry of Industry and Trade · Company Registration Directorate',
    docNumber: 'CR-JO-2026-981244',
    partyName: 'Al-Safwa Modern Dairy & Food Industries',
    partyType: 'Limited Liability Company (LLC)',
    details: [
      { label: 'National Registry Number', value: '200198421' },
      { label: 'Registered Capital', value: '250,000 JOD' },
      { label: 'Authorized Signatory', value: 'Eng. Tareq Al-Qadi (General Manager)' },
      { label: 'Main Activity', value: 'Manufacture & Cold Distribution of Dairy Products' },
      { label: 'Industrial Zone', value: 'Hashemiyya Industrial Zone, Zarqa, Jordan' },
      { label: 'Registration Date', value: '14 May 2018 (Renewal: 2026/2027)' },
      { label: 'Tax Identification Number', value: '109842109' },
    ],
  },
  {
    fileName: 'Masar-Sample-Professions-License.pdf',
    title: 'Vocational & Professions License',
    subtitle: 'Greater Amman / Zarqa Municipality · Licenses Directorate',
    docNumber: 'PL-ZRQ-2026-004812',
    partyName: 'Al-Safwa Modern Dairy & Food Industries',
    partyType: 'Food Processing Plant',
    details: [
      { label: 'Municipal Sector', value: 'Hashemiyya Industrial Basin' },
      { label: 'Property / Plot Number', value: 'Plot 312, Basin 4 Al-Hashemiyya' },
      { label: 'License Class', value: 'Class A - Heavy Food Manufacturing & Chilling' },
      { label: 'Sanitary & Safety Approval', value: 'Jordan Food & Drug Administration (JFDA) Certified' },
      { label: 'Civil Defense Clearance', value: 'Hazard Prevention Directorate Approval #4412' },
      { label: 'Expiration Date', value: '31 December 2027' },
    ],
  },
  {
    fileName: 'Masar-Sample-Driver-License.pdf',
    title: 'Commercial Driver & Vehicle Permit',
    subtitle: 'Public Security Directorate · Drivers and Vehicles Licensing Department',
    docNumber: 'DL-JO-4-0988214',
    partyName: 'Captain Rami Tareq Al-Zoubi',
    partyType: 'Professional Heavy & Medium Transport',
    details: [
      { label: 'National ID Number', value: '9881023411' },
      { label: 'License Category', value: 'Class 4 (Medium Goods Vehicle up to 7.5 Tons)' },
      { label: 'Vehicle Registered Plate', value: '44-88991 (Jordan - Cargo)' },
      { label: 'Vehicle Make & Model', value: 'Mercedes-Benz Atego 815 (Refrigerated Box)' },
      { label: 'Cooling Unit Model', value: 'Thermo King V-500 MAX (-20°C to +15°C)' },
      { label: 'Issuance Authority', value: 'Zarqa Licensing Center' },
      { label: 'Expiry Date', value: '28 October 2030' },
    ],
  },
];

docs.forEach((d) => {
  outputDirs.forEach((dir) => {
    const filePath = path.join(dir, d.fileName);
    const pdf = createBrandedDoc(d);
    pdf.pipe(fs.createWriteStream(filePath));
    pdf.end();
  });
  console.log(`✓ Generated ${d.fileName}`);
});

