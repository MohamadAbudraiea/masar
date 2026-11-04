import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, RotateCcw, Download, Calendar } from 'lucide-react';

export default function FilterBar({
  filters = {},
  onFilterChange,
  onReset,
  onExportCsv,
  statuses = [],
  cities = [],
  placeholder,
  showDateRange = true,
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  return (
    <div className="bg-card rounded-xl border border-line p-3 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <input
            type="text"
            value={filters.q || ''}
            onChange={(e) => onFilterChange('q', e.target.value)}
            placeholder={placeholder || (isAr ? 'بحث برقم الشحنة أو الاسم...' : 'Search by shipment # or name...')}
            className="w-full ps-9 pe-3 py-2 text-xs bg-surface/50 border border-line rounded-lg focus:outline-none focus:border-amber-500 text-ink"
          />
        </div>

        {/* Status Dropdown */}
        {statuses.length > 0 && (
          <select
            value={filters.status || ''}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="py-2 px-3 text-xs bg-surface/50 border border-line rounded-lg focus:outline-none focus:border-amber-500 text-ink"
          >
            <option value="">{isAr ? 'كافة الحالات' : 'All Statuses'}</option>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        )}

        {/* City Filter */}
        {cities.length > 0 && (
          <select
            value={filters.city || ''}
            onChange={(e) => onFilterChange('city', e.target.value)}
            className="py-2 px-3 text-xs bg-surface/50 border border-line rounded-lg focus:outline-none focus:border-amber-500 text-ink"
          >
            <option value="">{isAr ? 'كافة المدن' : 'All Cities'}</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        {/* Date Filters */}
        {showDateRange && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-ink-muted flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
            </span>
            <input
              type="date"
              value={filters.from || ''}
              onChange={(e) => onFilterChange('from', e.target.value)}
              className="py-1.5 px-2 bg-surface/50 border border-line rounded-lg focus:outline-none text-ink text-xs"
              title={isAr ? 'من تاريخ' : 'From date'}
            />
            <span className="text-ink-muted">→</span>
            <input
              type="date"
              value={filters.to || ''}
              onChange={(e) => onFilterChange('to', e.target.value)}
              className="py-1.5 px-2 bg-surface/50 border border-line rounded-lg focus:outline-none text-ink text-xs"
              title={isAr ? 'إلى تاريخ' : 'To date'}
            />
          </div>
        )}

        {/* Action Buttons: Reset & Export CSV */}
        <div className="flex items-center gap-2 ms-auto">
          {onReset && (
            <button
              onClick={onReset}
              className="p-2 rounded-lg border border-line bg-surface/40 hover:bg-surface text-ink-muted hover:text-navy-900 transition-colors"
              title={isAr ? 'إعادة ضبط' : 'Reset filters'}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}

          {onExportCsv && (
            <button
              onClick={onExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line bg-card hover:bg-surface text-xs font-medium text-navy-900 transition-colors shadow-2xs"
            >
              <Download className="h-3.5 w-3.5 text-amber-500" />
              <span>{isAr ? 'تصدير CSV' : 'Export CSV'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

