import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

/**
 * Shared table. Column options: key, header, render(val,row), className, align: 'start'|'end'|'center'
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage,
  emptyHint,
  onRowClick,
  page = 1,
  pageSize = 20,
  total = 0,
  onPageChange,
  footer,
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const totalPages = Math.ceil(total / pageSize) || 1;
  const alignCls = (a) => (a === 'end' ? 'text-end' : a === 'center' ? 'text-center' : 'text-start');

  return (
    <div className="bg-card rounded-2xl border border-line overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-[1]">
            <tr className="border-b border-line bg-surface/70 text-ink-muted">
              {columns.map((col, idx) => (
                <th key={col.key || idx} className={`py-3 px-4 text-xs font-semibold whitespace-nowrap ${alignCls(col.align)} ${col.headerClass || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading &&
              Array.from({ length: 6 }).map((_, r) => (
                <tr key={`sk${r}`}>
                  {columns.map((col, c) => (
                    <td key={c} className="py-4 px-4">
                      <div className="h-3.5 rounded bg-surface animate-pulse" style={{ width: `${45 + ((r * 7 + c * 13) % 45)}%` }} />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading &&
              data.map((row, rowIdx) => (
                <tr
                  key={row.id || row.ticket_id || rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-surface/70' : ''}`}
                >
                  {columns.map((col, colIdx) => (
                    <td key={col.key || colIdx} className={`py-3.5 px-4 align-middle ${alignCls(col.align)} ${col.className || ''}`}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && (!data || data.length === 0) && (
              <tr>
                <td colSpan={columns.length} className="py-14 text-center">
                  <div className="mx-auto h-12 w-12 rounded-full bg-surface flex items-center justify-center text-ink-muted mb-3">
                    <Inbox className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-navy-900">{emptyMessage || (isAr ? 'لا توجد نتائج' : 'Nothing to show here')}</p>
                  <p className="text-xs text-ink-muted mt-1">{emptyHint || (isAr ? 'جرّب تغيير الفلاتر.' : 'Try changing the filters.')}</p>
                </td>
              </tr>
            )}
          </tbody>
          {footer && !loading && data.length > 0 && <tfoot>{footer}</tfoot>}
        </table>
      </div>

      {total > 0 && onPageChange && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-line text-xs text-ink-muted">
          <span className="tabular-nums">
            {isAr
              ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} من ${total}`
              : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
          </span>
          {total > pageSize && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                aria-label={isAr ? 'السابق' : 'Previous page'}
                className="h-8 w-8 rounded-lg border border-line bg-card flex items-center justify-center disabled:opacity-40 hover:bg-surface"
              >
                <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
              </button>
              <span className="px-2 font-bold text-navy-900 tabular-nums">{page} / {totalPages}</span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                aria-label={isAr ? 'التالي' : 'Next page'}
                className="h-8 w-8 rounded-lg border border-line bg-card flex items-center justify-center disabled:opacity-40 hover:bg-surface"
              >
                <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
