import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, MessageSquare, Building2, Truck, ArrowUpRight } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import DataTable from '../../components/DataTable.jsx';
import { formatDateTime } from '../../lib/time.js';
import { linkTo } from '../../lib/links.js';

export default function AdminRatings() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const { filters, setFilter, resetFilters } = useUrlFilters({
    stars: '',
    page: '1',
  });

  const [ratings, setRatings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.stars) params.set('stars', filters.stars);
      params.set('page', filters.page || '1');
      params.set('page_size', '15');

      const data = await apiClient(`/admin/ratings?${params.toString()}`);
      setRatings(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch platform ratings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [filters.stars, filters.page]);

  const starFilters = [
    { label: isAr ? 'الكل' : 'All', value: '' },
    { label: '5 ★', value: '5' },
    { label: '4 ★', value: '4' },
    { label: '3 ★', value: '3' },
    { label: '2 ★', value: '2' },
    { label: '1 ★', value: '1' },
  ];

  const columns = [
    {
      key: 'stars',
      header: isAr ? 'التقييم' : 'Score',
      render: (val) => (
        <div className="flex items-center gap-1">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-4 w-4 ${
                  s <= val ? 'text-amber-500 fill-amber-500' : 'text-slate-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-bold text-navy-900 ml-1">({val}/5)</span>
        </div>
      ),
    },
    {
      key: 'comment',
      header: isAr ? 'الملاحظات والتعليق' : 'Feedback & Review',
      render: (val) => (
        <div className="max-w-md">
          {val ? (
            <p className="text-xs text-navy-900 italic line-clamp-2">"{val}"</p>
          ) : (
            <span className="text-xs text-ink-muted italic">
              {isAr ? 'بدون تعليق مكتوب' : 'No written comment'}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'from',
      header: isAr ? 'مُقدِّم التقييم' : 'Evaluator (From)',
      render: (_, row) => (
        <Link
          to={linkTo('admin', row.from_user_role, row.from_user_id)}
          className="inline-flex items-center gap-1.5 font-bold text-xs text-navy-900 hover:text-amber-600 hover:underline"
        >
          {row.from_user_role === 'manufacturer' ? (
            <Building2 className="h-3.5 w-3.5 text-navy-700 shrink-0" />
          ) : (
            <Truck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          )}
          <span>{row.from_user_name}</span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface border border-slate-200 text-ink-muted">
            {row.from_user_role}
          </span>
        </Link>
      ),
    },
    {
      key: 'to',
      header: isAr ? 'الطرف المُقيَّم' : 'Recipient (To)',
      render: (_, row) => (
        <Link
          to={linkTo('admin', row.to_user_role, row.to_user_id)}
          className="inline-flex items-center gap-1.5 font-bold text-xs text-navy-900 hover:text-amber-600 hover:underline"
        >
          {row.to_user_role === 'manufacturer' ? (
            <Building2 className="h-3.5 w-3.5 text-navy-700 shrink-0" />
          ) : (
            <Truck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          )}
          <span>{row.to_user_name}</span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface border border-slate-200 text-ink-muted">
            {row.to_user_role}
          </span>
        </Link>
      ),
    },
    {
      key: 'ticket_number',
      header: isAr ? 'الشحنة' : 'Shipment',
      render: (val, row) => (
        <Link
          to={`/admin/shipments/${row.ticket_id}`}
          className="font-mono text-xs font-bold text-navy-900 hover:text-amber-600 hover:underline inline-flex items-center gap-1"
        >
          {val}
          <ArrowUpRight className="h-3 w-3 text-ink-muted" />
        </Link>
      ),
    },
    {
      key: 'created_at',
      header: isAr ? 'التاريخ' : 'Date',
      render: (val) => (
        <span className="text-xs text-ink-muted font-mono">{formatDateTime(val)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
            {isAr ? 'تقييمات ومراجعات المنصة' : 'Platform Ratings & Reviews'}
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            {isAr
              ? `سجل تقييمات الشحنات المتبادلة بين الشاحنين والسائقين (${total} تقييم مسجل)`
              : `Bilateral shipment performance ratings between shippers and drivers (${total} recorded)`}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-surface-card border border-slate-200 p-1 rounded-xl shadow-xs self-start">
          {starFilters.map((sf) => (
            <button
              key={sf.value}
              onClick={() => setFilter('stars', sf.value)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                (filters.stars || '') === sf.value
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'text-ink-muted hover:text-navy-900 hover:bg-surface'
              }`}
            >
              {sf.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={ratings}
        loading={loading}
        total={total}
        page={parseInt(filters.page || '1', 10)}
        pageSize={15}
        onPageChange={(p) => setFilter('page', p)}
        emptyMessage={
          isAr
            ? 'لا توجد تقييمات مطابقة لمعايير البحث الحالية'
            : 'No ratings match the selected filter criteria'
        }
      />
    </div>
  );
}

