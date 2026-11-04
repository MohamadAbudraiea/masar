import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../lib/time.js';

/**
 * Standard DateTime component formatted in the user's timezone.
 */
export default function DateTime({ isoString, timezone = 'Asia/Amman', className = '' }) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-JO' : 'en-GB';

  if (!isoString) return <span className="text-slate-400">—</span>;

  const userTime = formatDateTime(isoString, timezone, locale);
  const ammanTime = formatDateTime(isoString, 'Asia/Amman', locale);
  const isDifferentZone = timezone !== 'Asia/Amman';

  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      title={isDifferentZone ? `Amman time: ${ammanTime}` : undefined}
    >
      <span className="tabular-nums">{userTime}</span>
      {isDifferentZone && (
        <span className="text-[10px] text-ink-muted px-1 rounded bg-slate-100 uppercase">
          {timezone.split('/')[1] || timezone}
        </span>
      )}
    </span>
  );
}

