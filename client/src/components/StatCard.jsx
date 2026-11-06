import React from 'react';
import { ArrowUpRight, AlertTriangle, AlertOctagon, CheckCircle2, Info } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

/**
 * KPI card (05 §4 KpiCard). Backwards compatible with the old StatCard API
 * (title, value, subtitle, icon, onClick) and adds:
 *
 *  - tone:     'navy' | 'amber' | 'green' | 'blue' | 'violet' | 'teal' | 'red' | 'slate'
 *  - featured: true → navy filled hero card (use for the 1–2 numbers that matter)
 *  - alert:    { level: 'warn' | 'danger' | 'ok' | 'info', text } → status pill + tinted border
 *  - spark:    number[] → tiny trend line at the bottom
 *  - share:    { value: 0..1, label } → thin progress bar (e.g. "46% of volume")
 *  - actionLabel: text shown on clickable cards (default "View")
 */
export const TONES = {
  navy:   { fg: '#143B5E', bg: '#E3EBF3', stroke: '#143B5E' },
  amber:  { fg: '#8A5A00', bg: '#FDF0D5', stroke: '#E39413' },
  green:  { fg: '#15803D', bg: '#DCFCE7', stroke: '#16A34A' },
  blue:   { fg: '#1D4ED8', bg: '#DBEAFE', stroke: '#2563EB' },
  violet: { fg: '#6D28D9', bg: '#EDE9FE', stroke: '#7C3AED' },
  teal:   { fg: '#0F766E', bg: '#CCFBF1', stroke: '#0D9488' },
  red:    { fg: '#B91C1C', bg: '#FEE2E2', stroke: '#DC2626' },
  slate:  { fg: '#475569', bg: '#E7ECF1', stroke: '#64748B' },
};

const ALERTS = {
  warn:   { icon: AlertTriangle, cls: 'bg-amber-100 text-[#8A5A00] ring-[#F5A82A]/40', border: 'border-line' },
  danger: { icon: AlertOctagon,  cls: 'bg-[#FEE2E2] text-[#B91C1C] ring-[#B91C1C]/20', border: 'border-[#B91C1C]/40' },
  ok:     { icon: CheckCircle2,  cls: 'bg-[#DCFCE7] text-[#15803D] ring-[#15803D]/20', border: 'border-line' },
  info:   { icon: Info,          cls: 'bg-navy-100 text-navy-700 ring-navy-700/10', border: 'border-line' },
};

/** Splits "2,325.000 JD" into number + unit so the unit can be rendered smaller. */
function splitUnit(value) {
  if (typeof value !== 'string') return [value, null];
  const m = value.match(/^(.*?)\s(JD|JOD|د\.أ|trips|شحنة|shipments)$/);
  if (!m) return [value, null];
  return [m[1], m[2]];
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = 'navy',
  featured = false,
  alert,
  spark,
  share,
  onClick,
  actionLabel,
  className = '',
}) {
  const isClickable = Boolean(onClick);
  const t = TONES[tone] || TONES.navy;
  const a = alert ? ALERTS[alert.level] || ALERTS.info : null;
  const [num, unit] = splitUnit(value);
  const Tag = isClickable ? 'button' : 'div';
  const isAr = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';

  const base = featured
    ? 'bg-navy-900 border-navy-900 text-white'
    : `bg-card text-ink ${a ? a.border : 'border-line'}`;

  return (
    <Tag
      type={isClickable ? 'button' : undefined}
      onClick={onClick}
      className={`group relative text-start w-full rounded-2xl border p-5 flex flex-col overflow-hidden transition-all duration-200 ${base} ${
        isClickable
          ? `cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(7,30,51,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
              featured ? 'hover:bg-navy-800' : 'hover:border-navy-700/40'
            }`
          : ''
      } ${className}`}
    >
      {/* coloured top rule — quiet identity per tone */}
      {!featured && <span className="absolute inset-x-0 top-0 h-1" style={{ background: t.stroke, opacity: 0.85 }} />}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <span
              className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center"
              style={featured ? { background: '#F5A82A', color: '#071E33' } : { background: t.bg, color: t.fg }}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </span>
          )}
          <span className={`text-[13px] font-semibold leading-tight ${featured ? 'text-navy-100' : 'text-ink-muted'}`}>
            {title}
          </span>
        </div>
        {isClickable && (
          <span
            className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center transition-all ${
              featured
                ? 'bg-navy-700 text-amber-500 group-hover:bg-amber-500 group-hover:text-navy-900'
                : 'bg-surface text-ink-muted group-hover:bg-navy-900 group-hover:text-amber-500'
            }`}
            aria-hidden="true"
          >
            <ArrowUpRight className={`h-3.5 w-3.5 ${isAr ? '-scale-x-100' : ''}`} />
          </span>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-1.5 flex-wrap">
        <span
          className={`text-[26px] leading-none font-extrabold tracking-tight tabular-nums ${
            featured ? 'text-white' : 'text-navy-900'
          }`}
        >
          {num}
        </span>
        {unit && (
          <span className={`text-sm font-bold ${featured ? 'text-amber-500' : 'text-ink-muted'}`}>{unit}</span>
        )}
      </div>

      {subtitle && (
        <div className={`mt-1.5 text-xs ${featured ? 'text-navy-100/80' : 'text-ink-muted'}`}>{subtitle}</div>
      )}

      {share && (
        <div className="mt-3">
          <div className={`h-1.5 rounded-full overflow-hidden ${featured ? 'bg-navy-700' : 'bg-surface'}`}>
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${Math.max(2, Math.min(100, share.value * 100))}%`, background: featured ? '#F5A82A' : t.stroke }}
            />
          </div>
          {share.label && (
            <div className={`mt-1 text-[11px] font-medium ${featured ? 'text-navy-100/80' : 'text-ink-muted'}`}>
              {share.label}
            </div>
          )}
        </div>
      )}

      {spark && spark.length > 1 && (
        <div className="mt-3 -mx-1 h-10" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark.map((v, i) => ({ i, v: Number(v) || 0 }))} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${tone}-${featured}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={featured ? '#F5A82A' : t.stroke} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={featured ? '#F5A82A' : t.stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={featured ? '#F5A82A' : t.stroke}
                strokeWidth={2}
                fill={`url(#spark-${tone}-${featured})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {a && (
        <div className={`mt-3 self-start inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${a.cls}`}>
          <a.icon className="h-3.5 w-3.5" />
          <span>{alert.text}</span>
        </div>
      )}

      {isClickable && actionLabel && (
        <div className={`mt-auto pt-3 text-[11px] font-bold ${featured ? 'text-amber-500' : 'text-navy-700'} opacity-70 group-hover:opacity-100`}>
          {actionLabel}
        </div>
      )}
    </Tag>
  );
}
