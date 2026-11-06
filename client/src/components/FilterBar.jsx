import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Download, Calendar } from 'lucide-react';

/**
 * Shared filter bar (05 §4). All state lives in the URL via the parent's useUrlFilters.
 * Optional `tabs`: [{ value, label, count? }] → status segments bound to filters.status.
 */
export default function FilterBar({
  filters = {},
  onFilterChange,
  onReset,
  onExportCsv,
  statuses = [],
  cities = [],
  tabs,
  placeholder,
  showDateRange = true,
  children,
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const active = ['q', 'status', 'city', 'from', 'to'].some((k) => filters[k]);
  const control =
    'h-10 px-3 text-sm bg-card border border-line rounded-xl text-ink focus:outline-none focus:border-navy-700/40 focus:ring-4 focus:ring-navy-100 transition';

  return (
    <div className="space-y-3">
      {tabs && (
        <div className="flex items-center gap-1 overflow-x-auto border-b border-line" role="tablist">
          {tabs.map((tb) => {
            const on = (filters.status || '') === tb.value;
            return (
              <button
                key={tb.value || 'all'}
                role="tab"
                aria-selected={on}
                onClick={() => onFilterChange('status', tb.value)}
                className={`relative shrink-0 h-11 px-3.5 text-sm font-bold transition ${on ? 'text-navy-900' : 'text-ink-muted hover:text-navy-900'}`}
              >
                {tb.label}
                {tb.count != null && (
                  <span className={`ms-2 rounded-full px-2 py-0.5 text-[11px] tabular-nums ${on ? 'bg-navy-900 text-white' : 'bg-surface text-ink-muted'}`}>
                    {tb.count}
                  </span>
                )}
                {on && <span className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-amber-500" />}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <input
            type="text"
            value={filters.q || ''}
            onChange={(e) => onFilterChange('q', e.target.value)}
            placeholder={placeholder || (isAr ? 'ابحث برقم الشحنة أو الاسم…' : 'Search by shipment number or name…')}
            className={`${control} w-full ps-9`}
          />
        </div>

        {statuses.length > 0 && !tabs && (
          <select value={filters.status || ''} onChange={(e) => onFilterChange('status', e.target.value)} className={control} aria-label={isAr ? 'الحالة' : 'Status'}>
            <option value="">{isAr ? 'كل الحالات' : 'All statuses'}</option>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        )}

        {cities.length > 0 && (
          <select value={filters.city || ''} onChange={(e) => onFilterChange('city', e.target.value)} className={control} aria-label={isAr ? 'المدينة' : 'City'}>
            <option value="">{isAr ? 'كل المدن' : 'All cities'}</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}

        {children}

        {showDateRange && (
          <label className="h-10 flex items-center gap-1.5 px-3 bg-card border border-line rounded-xl text-sm">
            <Calendar className="h-4 w-4 text-ink-muted" />
            <input
              type="date"
              value={filters.from || ''}
              onChange={(e) => onFilterChange('from', e.target.value)}
              className="bg-transparent focus:outline-none text-ink text-xs"
              aria-label={isAr ? 'من تاريخ' : 'From date'}
            />
            <span className="text-ink-muted">–</span>
            <input
              type="date"
              value={filters.to || ''}
              onChange={(e) => onFilterChange('to', e.target.value)}
              className="bg-transparent focus:outline-none text-ink text-xs"
              aria-label={isAr ? 'إلى تاريخ' : 'To date'}
            />
          </label>
        )}

        <div className="flex items-center gap-2 ms-auto">
          {onReset && active && (
            <button onClick={onReset} className="h-10 px-3 rounded-xl text-sm font-bold text-navy-900 hover:bg-card inline-flex items-center gap-1.5">
              <X className="h-4 w-4" />
              {isAr ? 'مسح الفلاتر' : 'Clear filters'}
            </button>
          )}
          {onExportCsv && (
            <button
              onClick={onExportCsv}
              className="h-10 px-3.5 rounded-xl border border-line bg-card hover:bg-surface text-sm font-bold text-navy-900 inline-flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              {isAr ? 'تصدير CSV' : 'Export CSV'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
