import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatMoney } from '../lib/format.js';

/** Brand series colours (05 §4 Charts: navy and amber first). */
export const SERIES = {
  navy: '#143B5E',
  amber: '#F5A82A',
  green: '#16A34A',
  teal: '#0D9488',
  blue: '#2563EB',
  violet: '#7C3AED',
  slate: '#94A3B8',
  red: '#DC2626',
};

const legendText = (v) => <span style={{ color: '#4A5B6D', fontWeight: 600 }}>{v}</span>;
const axisTick = { fill: '#4A5B6D', fontSize: 11, fontFamily: 'inherit' };

function compact(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return String(Math.round(v));
}

function shortPeriod(p) {
  // "2026-08-08" → "8 Aug", "2026-08" → "Aug 26", week labels left as-is
  if (typeof p !== 'string') return p;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(p) ? new Date(p + 'T00:00:00') : /^\d{4}-\d{2}$/.test(p) ? new Date(p + '-01T00:00:00') : null;
  if (!d || isNaN(d)) return p;
  return p.length === 7
    ? d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function MoneyTooltip({ active, payload, label, labelFormatter = shortPeriod }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-navy-900 text-white px-3 py-2.5 shadow-xl text-xs min-w-[180px]" dir="ltr">
      <div className="font-bold text-navy-100 mb-1.5">{labelFormatter(label)}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-navy-100">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
            {p.name}
          </span>
          <span className="font-bold tabular-nums">{p.unit === 'count' ? p.value : formatMoney(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * series: [{ key, name, color, type?: 'area'|'line' }]
 */
export function AreaTrend({ data = [], xKey = 'period', series = [], height = 260, stacked = false }) {
  return (
    <div style={{ height }} dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="#DDE5EC" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey={xKey} tickFormatter={shortPeriod} tick={axisTick} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tickFormatter={compact} tick={axisTick} axisLine={false} tickLine={false} width={44} />
          <Tooltip content={<MoneyTooltip />} cursor={{ stroke: '#143B5E', strokeDasharray: '2 4' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} formatter={legendText} />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2.25}
              fill={`url(#g-${s.key})`}
              stackId={stacked ? 'a' : undefined}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarCompare({ data = [], xKey = 'period', series = [], height = 260, stacked = false, horizontal = false }) {
  return (
    <div style={{ height }} dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: 8, bottom: 0, left: horizontal ? 8 : -8 }}
          barCategoryGap="22%"
        >
          <CartesianGrid stroke="#DDE5EC" strokeDasharray="3 4" vertical={horizontal} horizontal={!horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" tickFormatter={compact} tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey={xKey} tick={axisTick} axisLine={false} tickLine={false} width={130} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tickFormatter={shortPeriod} tick={axisTick} axisLine={false} tickLine={false} minTickGap={16} />
              <YAxis tickFormatter={compact} tick={axisTick} axisLine={false} tickLine={false} width={44} />
            </>
          )}
          <Tooltip content={<MoneyTooltip labelFormatter={(l) => (horizontal ? l : shortPeriod(l))} />} cursor={{ fill: '#E3EBF3', opacity: 0.6 }} />
          {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} formatter={legendText} />}
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              fill={s.color}
              stackId={stacked ? 'a' : undefined}
              radius={stacked && i < series.length - 1 ? 0 : horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]}
              maxBarSize={horizontal ? 18 : 28}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** data: [{ name, value, color }] */
export function Donut({ data = [], height = 200, centerLabel, centerValue, money = false }) {
  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);
  return (
    <div className="relative" style={{ height }} dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="92%" paddingAngle={2} stroke="none" isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-lg bg-navy-900 text-white px-2.5 py-1.5 text-xs shadow-xl">
                  <b>{payload[0].name}</b>: {money ? formatMoney(payload[0].value) : payload[0].value}
                  <span className="text-navy-100"> · {total ? Math.round((payload[0].value / total) * 100) : 0}%</span>
                </div>
              ) : null
            }
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-navy-900 tabular-nums leading-none">{centerValue ?? total}</span>
        {centerLabel && <span className="text-[11px] font-semibold text-ink-muted mt-1">{centerLabel}</span>}
      </div>
    </div>
  );
}

/** Standard chart panel. */
export function ChartCard({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`bg-card rounded-2xl border border-line p-5 ${className}`}>
      <header className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[15px] font-bold text-navy-900">{title}</h2>
          {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
