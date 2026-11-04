/**
 * Formats ISO strings into human readable date/time using the user's time zone.
 */
export function formatDateTime(isoString, timeZone = 'Asia/Amman', locale = 'en-GB') {
  if (!isoString) return '—';
  const date = new Date(isoString);

  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return formatter.format(date);
  } catch (err) {
    return new Date(isoString).toLocaleString();
  }
}

export function formatDateOnly(isoString, timeZone = 'Asia/Amman', locale = 'en-GB') {
  if (!isoString) return '—';
  const date = new Date(isoString);

  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return formatter.format(date);
  } catch (err) {
    return new Date(isoString).toLocaleDateString();
  }
}

