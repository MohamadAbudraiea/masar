import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage,
  onRowClick,
  page = 1,
  pageSize = 20,
  total = 0,
  onPageChange,
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const totalPages = Math.ceil(total / pageSize) || 1;

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-line p-8 flex flex-col items-center justify-center min-h-[260px] animate-pulse">
        <div className="h-6 w-32 bg-surface rounded mb-4" />
        <div className="space-y-3 w-full max-w-md">
          <div className="h-4 bg-surface rounded w-full" />
          <div className="h-4 bg-surface rounded w-5/6" />
          <div className="h-4 bg-surface rounded w-4/6" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-line p-12 text-center flex flex-col items-center justify-center min-h-[260px]">
        <div className="h-12 w-12 rounded-full bg-surface flex items-center justify-center text-ink-muted mb-3">
          <Inbox className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-ink-muted">
          {emptyMessage || (isAr ? 'لا توجد بيانات متاحة' : 'No records found')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-line overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-start border-collapse text-xs">
          <thead>
            <tr className="border-b border-line bg-surface/50 text-ink-muted font-medium">
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  className={`py-3.5 px-4 text-start font-semibold ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {data.map((row, rowIdx) => (
              <tr
                key={row.id || row.ticket_id || rowIdx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-surface/60' : ''
                }`}
              >
                {columns.map((col, colIdx) => (
                  <td key={col.key || colIdx} className={`py-3.5 px-4 ${col.className || ''}`}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {total > pageSize && onPageChange && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-line bg-surface/30 text-xs text-ink-muted">
          <div>
            {isAr
              ? `عرض ${(page - 1) * pageSize + 1} إلى ${Math.min(page * pageSize, total)} من أصل ${total}`
              : `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, total)} of ${total}`}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-line bg-card disabled:opacity-40 hover:bg-surface transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-medium text-navy-900">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-line bg-card disabled:opacity-40 hover:bg-surface transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

