/**
 * Generates an RFC 4180 compliant CSV string from an array of records.
 * 
 * @param {Array<Object>} records - Array of data objects
 * @param {Array<{ key: string, label: string, format?: (val: any, row: any) => string }>} columns - Column definitions
 * @returns {string} CSV formatted string
 */
export function generateCsv(records, columns) {
  if (!columns || columns.length === 0) {
    if (!records || records.length === 0) return '';
    columns = Object.keys(records[0]).map((k) => ({ key: k, label: k }));
  }

  const escapeCell = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = columns.map((col) => escapeCell(col.label || col.key)).join(',');

  const rows = (records || []).map((row) => {
    return columns
      .map((col) => {
        const val = col.format ? col.format(row[col.key], row) : row[col.key];
        return escapeCell(val);
      })
      .join(',');
  });

  return [headerRow, ...rows].join('\r\n');
}

/**
 * Sends a CSV response with proper HTTP headers.
 */
export function sendCsvResponse(res, filename, records, columns) {
  const csvContent = generateCsv(records, columns);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send('\uFEFF' + csvContent); // Include UTF-8 BOM for Excel compatibility
}

