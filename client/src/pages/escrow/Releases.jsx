import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Package, CheckCheck, CreditCard } from 'lucide-react';
import { apiClient, getApiUrl } from '../../api/client.js';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import FilterBar from '../../components/FilterBar.jsx';
import DataTable from '../../components/DataTable.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';

export default function EscrowReleases() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const { filters, setFilter, resetFilters } = useUrlFilters({
    from: '',
    to: '',
  });

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReleases = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient(`/reports/escrow/releases${qs}`);
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to load escrow releases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, [filters.from, filters.to]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    params.set('format', 'csv');
    window.open(getApiUrl(`/reports/escrow/releases?${params.toString()}`), '_blank');
  };

  const columns = [
    {
      key: 'ticket_number',
      header: isAr ? 'الشحنة' : 'Shipment',
      render: (val, row) => (
        <Link
          to={`/escrow/shipments/${row.ticket_id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-mono font-bold text-navy-900 hover:text-amber-600 transition flex items-center gap-1"
        >
          <Package className="h-3.5 w-3.5 text-amber-500" />
          <span>{val}</span>
        </Link>
      ),
    },
    {
      key: 'release_time',
      header: isAr ? 'تاريخ الصرف' : 'Release Date',
      render: (val) => formatDateTime(val),
    },
    {
      key: 'price',
      header: isAr ? 'إجمالي المبلغ' : 'Total Price',
      render: (val) => <span className="font-bold text-navy-900">{formatMoney(val)}</span>,
    },
    {
      key: 'escrow_commission',
      header: isAr ? 'عمولة SafePay' : 'Escrow Fee',
      render: (val) => <span className="font-semibold text-navy-700">{formatMoney(val)}</span>,
    },
    {
      key: 'masar_commission',
      header: isAr ? 'عمولة مسار' : 'Masar Fee',
      render: (val) => <span className="font-semibold text-slate-600">{formatMoney(val)}</span>,
    },
    {
      key: 'driver_net',
      header: isAr ? 'صافي السائق' : 'Driver Net',
      render: (val) => <span className="font-bold text-emerald-600 font-mono">{formatMoney(val)}</span>,
    },
    {
      key: 'driver_payout',
      header: isAr ? 'حساب السائق (IBAN / CliQ)' : 'Driver Payout Account',
      render: (_, row) => (
        <div>
          <div className="font-bold text-navy-900">{row.driver_name || 'Driver'}</div>
          <div className="font-mono text-[10px] text-ink-muted" dir="ltr">
            {row.iban || row.cliq_alias || 'Direct Transfer'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: isAr ? 'حالة التحويل' : 'Status',
      render: () => (
        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
          <CheckCheck className="h-3 w-3" />
          <span>{isAr ? 'تم التحويل' : 'Transferred'}</span>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy-900 tracking-tight">
          {isAr ? 'سجل صرف المستحقات' : 'Escrow Releases Ledger'}
        </h1>
        <p className="text-xs text-ink-muted mt-0.5">
          {isAr
            ? 'سجل العمليات المالية المصروفة للسائقين والعمولات بعد تأكيد التسليم'
            : 'Immutable ledger of settled payouts released to drivers, escrow, and platform'}
        </p>
      </div>

      <FilterBar
        filters={filters}
        onFilterChange={setFilter}
        onReset={resetFilters}
        onExportCsv={handleExportCsv}
      />

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        onRowClick={(row) => navigate(`/escrow/shipments/${row.ticket_id}`)}
        emptyMessage={
          isAr ? 'لا توجد دفعات مصروفة مسجلة' : 'No releases found in this timeframe.'
        }
      />
    </div>
  );
}

