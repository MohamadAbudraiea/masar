import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Truck } from 'lucide-react';
import { formatDateTime } from '../lib/time.js';

export const STATIONS = [
  { key: 'requested', labelEn: 'Requested', labelAr: 'تم الإنشاء' },
  { key: 'pending', labelEn: 'Paid', labelAr: 'تم الدفع' },
  { key: 'waiting_load', labelEn: 'Accepted', labelAr: 'تم القبول' },
  { key: 'in_delivery', labelEn: 'Loaded', labelAr: 'تم التحميل' },
  { key: 'delivered', labelEn: 'Delivered', labelAr: 'تم التسليم' },
  { key: 'audited', labelEn: 'Confirmed', labelAr: 'تم التأكيد' },
];

const STATUS_ORDER = ['requested', 'pending', 'waiting_load', 'in_delivery', 'delivered', 'audited'];

/**
 * Signature Dotted-Route Timeline component.
 *
 * @param {Object} props
 * @param {string} props.status - current ticket status
 * @param {Object} [props.statusHistory] - timestamps per status
 * @param {Array} [props.events] - event log array
 * @param {string} [props.pickupAt] - scheduled pickup timestamp
 * @param {'desktop' | 'large' | 'compact'} [props.variant] - display variant
 * @param {string} [props.timezone] - user time zone
 */
export default function Timeline({
  status = 'requested',
  statusHistory = {},
  events = [],
  pickupAt,
  variant = 'desktop',
  timezone = 'Asia/Amman',
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const currentIndex = STATUS_ORDER.indexOf(status);
  const activeIdx = currentIndex === -1 ? 0 : currentIndex;

  // Arrival calculation
  const arrEvent = events?.find((e) => e.type === 'arrived_at_pickup');
  let arrivalBadge = null;
  if (arrEvent && arrEvent.at && pickupAt) {
    const arrMs = new Date(arrEvent.at).getTime();
    const pickMs = new Date(pickupAt).getTime();
    const deltaMin = Math.round((arrMs - pickMs) / 60000);

    if (Math.abs(deltaMin) <= 15) {
      arrivalBadge = { text: isAr ? 'في الموعد' : 'On time', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    } else if (deltaMin < -15) {
      const mins = Math.abs(deltaMin);
      arrivalBadge = { text: isAr ? `مبكّر بـ ${mins} دقيقة` : `${mins} min early`, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    } else {
      arrivalBadge = { text: isAr ? `متأخر بـ ${deltaMin} دقيقة` : `${deltaMin} min late`, color: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
  }

  // 1. Compact variant for tables
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1.5" title={status}>
        {STATUS_ORDER.map((s, idx) => (
          <span
            key={s}
            className={`w-2 h-2 rounded-full transition-colors ${
              idx <= activeIdx ? 'bg-amber-500' : 'bg-slate-300'
            }`}
          />
        ))}
      </div>
    );
  }

  // 2. Large vertical variant for Driver app
  if (variant === 'large') {
    return (
      <div className="space-y-4 py-2">
        {STATIONS.map((station, idx) => {
          const isDone = idx < activeIdx;
          const isCurrent = idx === activeIdx;
          const timestamp = statusHistory?.[station.key];

          return (
            <div key={station.key} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    isDone
                      ? 'bg-amber-500 text-navy-900'
                      : isCurrent
                      ? 'bg-amber-500 text-navy-900 ring-4 ring-amber-200 animate-pulse'
                      : 'border-2 border-slate-300 bg-white text-slate-400'
                  }`}
                >
                  {isDone ? (
                    <Check className="w-5 h-5 stroke-[3]" />
                  ) : isCurrent ? (
                    <Truck className="w-5 h-5 text-navy-900" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  )}
                </div>
                {idx < STATIONS.length - 1 && (
                  <div
                    className={`w-0.5 h-10 border-s-2 border-dotted my-1 ${
                      idx < activeIdx ? 'border-amber-500' : 'border-slate-300'
                    }`}
                  />
                )}
              </div>

              <div className="pt-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4
                    className={`text-lg font-bold ${
                      isCurrent ? 'text-navy-900 font-extrabold' : isDone ? 'text-navy-800' : 'text-slate-400'
                    }`}
                  >
                    {isAr ? station.labelAr : station.labelEn}
                  </h4>
                  {timestamp && (
                    <span className="text-xs text-ink-muted">
                      {formatDateTime(timestamp, timezone, isAr ? 'ar-JO' : 'en-GB')}
                    </span>
                  )}
                </div>

                {/* Show arrival badge between Accepted and Loaded */}
                {station.key === 'waiting_load' && arrivalBadge && (
                  <div className="mt-1">
                    <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border ${arrivalBadge.color}`}>
                      {arrivalBadge.text}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // 3. Desktop horizontal variant (Default)
  return (
    <div className="w-full py-4">
      <div className="relative flex items-center justify-between">
        {/* Dotted Route Connector Bar */}
        <div className="absolute top-5 start-8 end-8 h-0.5 border-t-2 border-dotted border-slate-300 -z-0" />
        <div
          className="absolute top-5 start-8 h-0.5 border-t-2 border-dotted border-amber-500 -z-0 transition-all duration-500"
          style={{
            width: activeIdx === 0 ? '0%' : `${(activeIdx / (STATIONS.length - 1)) * 100}%`,
          }}
        />

        {STATIONS.map((station, idx) => {
          const isDone = idx < activeIdx;
          const isCurrent = idx === activeIdx;
          const timestamp = statusHistory?.[station.key];

          return (
            <div key={station.key} className="relative z-10 flex flex-col items-center text-center max-w-[120px]">
              {/* Disc */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isDone
                    ? 'bg-amber-500 text-navy-900 shadow-sm'
                    : isCurrent
                    ? 'bg-amber-500 text-navy-900 ring-4 ring-amber-100 shadow-md transform scale-110'
                    : 'bg-white border-2 border-slate-300 text-slate-400'
                }`}
              >
                {isDone ? (
                  <Check className="w-5 h-5 stroke-[2.5]" />
                ) : isCurrent ? (
                  <Truck className="w-5 h-5 text-navy-900 animate-bounce" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                )}
              </div>

              {/* Station Label */}
              <div className="mt-2 text-xs font-bold leading-tight text-navy-900">
                {isAr ? station.labelAr : station.labelEn}
              </div>

              {/* Timestamp */}
              {timestamp ? (
                <div className="mt-0.5 text-[10px] text-ink-muted leading-tight">
                  {formatDateTime(timestamp, timezone, isAr ? 'ar-JO' : 'en-GB')}
                </div>
              ) : (
                <div className="mt-0.5 text-[10px] text-slate-300">—</div>
              )}

              {/* Arrival Event marker after Accepted */}
              {station.key === 'waiting_load' && arrivalBadge && (
                <div className="absolute -bottom-6 whitespace-nowrap">
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border shadow-xs ${arrivalBadge.color}`}>
                    {arrivalBadge.text}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

