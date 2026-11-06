/**
 * One colour per money component, used in every table that splits a shipment's money
 * (admin financial, escrow shipments, releases, held funds). All pass WCAG AA on white.
 */
export const MONEY_COLS = {
  price: { text: 'text-navy-900', chip: 'bg-navy-100 text-navy-900', dot: '#143B5E', label: ['Total price', 'السعر الكلي'] },
  escrow: { text: 'text-[#0F766E]', chip: 'bg-[#CCFBF1] text-[#0F766E]', dot: '#0D9488', label: ['Escrow fee', 'عمولة الضمان'] },
  masar: { text: 'text-[#8A5A00]', chip: 'bg-amber-100 text-[#8A5A00]', dot: '#F5A82A', label: ['Masar fee', 'عمولة مسار'] },
  driver: { text: 'text-[#15803D]', chip: 'bg-[#DCFCE7] text-[#15803D]', dot: '#16A34A', label: ['Driver net', 'صافي السائق'] },
};
