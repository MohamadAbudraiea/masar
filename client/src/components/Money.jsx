import React from 'react';
import { formatMoney } from '../lib/format.js';

/**
 * Renders money amounts with tabular numerals and exact 3 decimal precision.
 */
export default function Money({ amount, currency = 'JD', className = '' }) {
  const formatted = formatMoney(amount, currency);

  return (
    <span
      className={`font-mono tabular-nums font-semibold tracking-tight ${className}`}
      dir="ltr"
    >
      {formatted}
    </span>
  );
}

