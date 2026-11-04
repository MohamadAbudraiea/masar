import React from 'react';
import { useTranslation } from 'react-i18next';

const STATUS_STYLES = {
  requested: 'text-[#475569] bg-[#E7ECF1] border-[#D1D9E0]',
  pending: 'text-[#8A5A00] bg-[#FDF0D5] border-[#F5DC9A]',
  waiting_load: 'text-[#1D4ED8] bg-[#DBEAFE] border-[#BFDBFE]',
  in_delivery: 'text-[#0F766E] bg-[#CCFBF1] border-[#99F6E4]',
  delivered: 'text-[#6D28D9] bg-[#EDE9FE] border-[#DDD6FE]',
  audited: 'text-[#15803D] bg-[#DCFCE7] border-[#BBF7D0]',
  danger: 'text-[#B91C1C] bg-[#FEE2E2] border-[#FECACA]',
};

/**
 * Standard StatusChip with semantic color and role-specific labels.
 *
 * @param {Object} props
 * @param {string} props.status - status key
 * @param {'driver' | 'standard'} [props.roleMode] - 'driver' for driver vocabulary
 * @param {string} [props.className] - optional extra CSS classes
 */
export default function StatusChip({ status, roleMode = 'standard', className = '' }) {
  const { t } = useTranslation();

  const style = STATUS_STYLES[status] || STATUS_STYLES.requested;
  const translationKey = roleMode === 'driver' ? `driver_status.${status}` : `status.${status}`;
  const label = t(translationKey, { defaultValue: status });

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current me-1.5 opacity-75" />
      {label}
    </span>
  );
}

