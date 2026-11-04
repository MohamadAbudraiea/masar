/**
 * Formats a money amount to 3 decimal places with thousands separators.
 * Always uses Western digits (0-9) even in Arabic.
 * Example: 2325 -> "2,325.000 JD"
 */
export function formatMoney(amount, currency = 'JD') {
  if (amount == null || isNaN(amount)) return `0.000 ${currency}`;
  const num = Number(amount);
  const parts = num.toFixed(3).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${parts.join('.')} ${currency}`;
}

/**
 * Strips whitespace and standardizes phone display.
 */
export function formatPhone(phone) {
  if (!phone) return '';
  return phone.trim();
}

/**
 * Standard ticket number formatter.
 */
export function formatTicketNumber(num) {
  if (!num) return '';
  return num;
}

