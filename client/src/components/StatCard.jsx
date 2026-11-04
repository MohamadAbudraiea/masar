import React from 'react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  onClick,
}) {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`bg-card rounded-xl border border-line p-5 shadow-xs transition-all ${
        isClickable ? 'cursor-pointer hover:border-navy-300 hover:shadow-sm' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-muted">{title}</span>
        {Icon && (
          <div className="h-9 w-9 rounded-lg bg-surface border border-line/60 flex items-center justify-center text-navy-800">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold text-navy-900 tracking-tight">{value}</div>
        {subtitle && (
          <div className="mt-1 text-xs text-ink-muted flex items-center gap-1.5">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

