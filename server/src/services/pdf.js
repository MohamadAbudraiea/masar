import PDFDocument from 'pdfkit';
import { DateTime } from 'luxon';

/**
 * Formats date into Asia/Amman string
 */
function formatDate(date) {
  if (!date) return '-';
  const d = typeof date === 'string' ? DateTime.fromISO(date) : DateTime.fromJSDate(date);
  return d.setZone('Asia/Amman').toFormat('yyyy-MM-dd HH:mm');
}

function formatMoney(amount) {
  if (amount === null || amount === undefined) return '-';
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} JD`;
}

/**
 * Builds a role-shaped Shipment Summary PDF stream.
 *
 * @param {Object} ticket - Ticket with manufacturer, driver, goods, truck, ratings details
 * @param {string} role - 'manufacturer' | 'driver' | 'admin' | 'escrow'
 * @param {import('express').Response} res - Express response
 */
export function generateTicketPdf(ticket, role, res) {
  const doc = new PDFDocument({ margin: 48, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="Masar-Shipment-${ticket.ticket_number || ticket.id}.pdf"`
  );

  doc.pipe(res);

  // --- BRAND HEADER ---
  doc.rect(0, 0, doc.page.width, 70).fill('#071E33'); // Dark Navy Header
  doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text('masar', 48, 22);
  doc.fillColor('#F5A82A').fontSize(14).font('Helvetica').text('· Escrow Freight Platform', 120, 28);
  doc
    .fillColor('#94A3B8')
    .fontSize(10)
    .font('Helvetica')
    .text(`Official Shipment Summary`, doc.page.width - 200, 28, { width: 152, align: 'right' });

  doc.moveDown(3);
  doc.y = 88;

  // --- SHIPMENT OVERVIEW ---
  doc.fillColor('#071E33').fontSize(16).font('Helvetica-Bold').text(`Shipment: ${ticket.ticket_number}`);
  doc.fillColor('#64748B').fontSize(10).font('Helvetica').text(`Created: ${formatDate(ticket.created_at)} (Asia/Amman)`);
  doc.moveDown(0.8);

  // Route & Status Box
  const boxTop = doc.y;
  doc.roundedRect(48, boxTop, doc.page.width - 96, 60, 6).fillAndStroke('#F8FAFC', '#E2E8F0');
  
  doc.fillColor('#071E33').fontSize(12).font('Helvetica-Bold');
  doc.text(`From: ${ticket.pickup_city || ticket.pickup?.city || 'Amman'}`, 64, boxTop + 14);
  doc.text(`To: ${ticket.dest_city || ticket.dest?.city || 'Destination'}`, 240, boxTop + 14);
  
  doc.fillColor('#0284C7').fontSize(10).font('Helvetica');
  doc.text(`Distance: ${ticket.distance_km ? `${ticket.distance_km} km` : 'Standard route'}`, 64, boxTop + 36);
  doc.text(`Status: ${ticket.status ? ticket.status.toUpperCase() : 'DELIVERED & CONFIRMED'}`, 240, boxTop + 36);

  doc.y = boxTop + 76;

  // --- TIMELINE MILESTONES ---
  doc.fillColor('#071E33').fontSize(12).font('Helvetica-Bold').text('Status Milestones');
  doc.moveDown(0.4);

  const history = ticket.status_history || {};
  const milestones = [
    { label: 'Requested', time: history.requested || ticket.created_at },
    { label: 'Payment Held (Pending)', time: history.pending || ticket.paid_at },
    { label: 'Driver Assigned (Waiting Load)', time: history.waiting_load },
    { label: 'In Delivery', time: history.in_delivery },
    { label: 'Delivered at Destination', time: history.delivered || ticket.delivered_at },
    { label: 'Confirmed & Payout Released', time: history.audited || ticket.audited_at },
  ];

  milestones.forEach((m, idx) => {
    const isCompleted = Boolean(m.time);
    doc.circle(58, doc.y + 5, 4).fill(isCompleted ? '#F5A82A' : '#CBD5E1');
    doc.fillColor(isCompleted ? '#071E33' : '#94A3B8').fontSize(9).font(isCompleted ? 'Helvetica-Bold' : 'Helvetica');
    doc.text(m.label, 72, doc.y, { width: 220 });
    doc.fillColor('#64748B').fontSize(9).font('Helvetica');
    doc.text(m.time ? formatDate(m.time) : '—', 300, doc.y - 11, { width: 200, align: 'right' });
    doc.moveDown(0.5);
  });

  doc.moveDown(1);

  // --- CARGO & TRUCK DETAILS ---
  doc.fillColor('#071E33').fontSize(12).font('Helvetica-Bold').text('Cargo & Equipment');
  doc.moveDown(0.4);

  const cargoLeft = 48;
  const cargoWidth = (doc.page.width - 110) / 2;
  const cargoBoxY = doc.y;

  // Cargo column
  doc.roundedRect(cargoLeft, cargoBoxY, cargoWidth, 90, 4).fillAndStroke('#FFFFFF', '#E2E8F0');
  doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text('Cargo Specifications', cargoLeft + 12, cargoBoxY + 10);
  doc.fillColor('#64748B').fontSize(9).font('Helvetica');
  doc.text(`Category: ${ticket.goods_category_name_en || ticket.goods?.category_name || 'General Cargo'}`, cargoLeft + 12, cargoBoxY + 28);
  doc.text(`Quantity: ${ticket.goods_quantity || ticket.goods?.quantity || '—'} ${ticket.goods_unit || ticket.goods?.unit || 'ton'}`, cargoLeft + 12, cargoBoxY + 44);
  doc.text(`Trip Type: ${ticket.trip_type === 'international' ? 'International' : 'Local (Jordan)'}`, cargoLeft + 12, cargoBoxY + 60);
  doc.text(`Hazardous: ${ticket.is_hazardous ? 'Yes (ADR)' : 'No'}`, cargoLeft + 12, cargoBoxY + 74);

  // Truck column
  const truckLeft = cargoLeft + cargoWidth + 14;
  doc.roundedRect(truckLeft, cargoBoxY, cargoWidth, 90, 4).fillAndStroke('#FFFFFF', '#E2E8F0');
  doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text('Vehicle & Driver', truckLeft + 12, cargoBoxY + 10);
  doc.fillColor('#64748B').fontSize(9).font('Helvetica');
  doc.text(`Truck Type: ${ticket.truck_type_name_en || ticket.required_truck?.type || 'Standard'}`, truckLeft + 12, cargoBoxY + 28);
  doc.text(`Body: ${ticket.truck_body_name_en || ticket.required_truck?.body || 'Standard'}`, truckLeft + 12, cargoBoxY + 44);
  doc.text(`Plate: ${ticket.truck_plate_number || 'Registered'}`, truckLeft + 12, cargoBoxY + 60);
  doc.text(`Driver: ${ticket.driver_name || 'Assigned Driver'}`, truckLeft + 12, cargoBoxY + 74);

  doc.y = cargoBoxY + 104;

  // --- ROLE-SHAPED FINANCIAL STATEMENT ---
  doc.moveDown(0.5);
  doc.fillColor('#071E33').fontSize(12).font('Helvetica-Bold').text('Settlement & Escrow Statement');
  doc.moveDown(0.4);

  const moneyBoxY = doc.y;
  doc.roundedRect(48, moneyBoxY, doc.page.width - 96, 75, 4).fillAndStroke('#F1F5F9', '#CBD5E1');

  if (role === 'manufacturer') {
    // Manufacturer sees price only
    doc.fillColor('#475569').fontSize(10).font('Helvetica').text('Total Delivery Price Paid:', 64, moneyBoxY + 18);
    doc.fillColor('#071E33').fontSize(14).font('Helvetica-Bold').text(formatMoney(ticket.price), 260, moneyBoxY + 16);

    doc.fillColor('#64748B').fontSize(9).font('Helvetica');
    doc.text('Payment was held securely by SafePay Escrow and released upon your delivery confirmation.', 64, moneyBoxY + 44);
  } else if (role === 'driver') {
    // Driver sees earnings only
    doc.fillColor('#475569').fontSize(10).font('Helvetica').text('Net Payout to Driver:', 64, moneyBoxY + 18);
    doc.fillColor('#16A34A').fontSize(14).font('Helvetica-Bold').text(formatMoney(ticket.driver_net), 260, moneyBoxY + 16);

    doc.fillColor('#64748B').fontSize(9).font('Helvetica');
    doc.text(`Transferred to IBAN / CliQ account: ${ticket.driver_iban || 'Direct Payout'}.`, 64, moneyBoxY + 44);
  } else {
    // Admin & Escrow see full ledger breakdown
    doc.fillColor('#475569').fontSize(9).font('Helvetica');
    doc.text('Total Price:', 64, moneyBoxY + 12);
    doc.text(formatMoney(ticket.price), 150, moneyBoxY + 12);

    doc.text('Escrow Fee:', 64, moneyBoxY + 28);
    doc.text(formatMoney(ticket.escrow_fee), 150, moneyBoxY + 28);

    doc.text('Masar Fee:', 300, moneyBoxY + 12);
    doc.text(formatMoney(ticket.masar_fee), 400, moneyBoxY + 12);

    doc.text('Driver Net Payout:', 300, moneyBoxY + 28);
    doc.fillColor('#16A34A').font('Helvetica-Bold').text(formatMoney(ticket.driver_net), 400, moneyBoxY + 28);

    doc.fillColor('#64748B').font('Helvetica').fontSize(8);
    doc.text(`Escrow Payout Account: ${ticket.driver_iban || 'N/A'} | CliQ: ${ticket.driver_cliq_alias || 'N/A'}`, 64, moneyBoxY + 52);
  }

  // --- FOOTER ---
  doc.fontSize(8).fillColor('#94A3B8').text(
    `Masar Freight Technologies · Authenticated record for ${role} · Generated on ${DateTime.now().setZone('Asia/Amman').toFormat('yyyy-MM-dd HH:mm:ss')} (Asia/Amman)`,
    48,
    doc.page.height - 35,
    { align: 'center', width: doc.page.width - 96 }
  );

  doc.end();
}

