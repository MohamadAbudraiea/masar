import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, ArrowUpRight, Building2, Package } from 'lucide-react';
import { apiClient, getApiUrl } from '../../api/client.js';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import FilterBar from '../../components/FilterBar.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';
import { linkTo } from '../../lib/links.js';

export default function EscrowHeldFunds() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const { filters, setFilter, resetFilters } = useUrlFilters({
    from: '',
    to: '',
  });

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHeld = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient(`/reports/escrow/held${qs}`);
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to load held funds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeld();
  }, [filters.from, filters.to]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    params.set('format', 'csv');
    window.open(getApiUrl(`/reports/escrow/held?${params.toString()}`), '_blank');
  };

  const totalHeldAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const columns = [
    {
      key: 'manufacturer',
      header: isAr ? 'الشركة المصنّعة' : 'Company (Depositor)',
      render: (m) => (
        <Link
          to={`/escrow/companies/${m.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-bold text-navy-900 hover:text-amber-600 transition flex items-center gap-1.5"
        >
          <Building2 className="h-3.5 w-3.5 text-navy-700" />
          <span>{m.name}</span>
        </Link>
      ),
    },
    {
      key: 'ticket',
      header: isAr ? 'الشحنة' : 'Shipment',
      render: (t) => (
        <Link
          to={`/escrow/shipments/${t.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-mono font-bold text-navy-900 hover:underline flex items-center gap-1"
        >
          <Package className="h-3.5 w-3.5 text-amber-500" />
          <span>{t.ticket_number}</span>
        </Link>
      ),
    },
    {
      key: 'amount',
      header: isAr ? 'المبلغ المحجوز' : 'Held Amount',
      render: (val) => <span className="font-mono font-bold text-navy-900">{formatMoney(val)}</span>,
    },
    {
      key: 'held_since',
      header: isAr ? 'محتجز منذ' : 'Held Since',
      render: (val) => formatDateTime(val),
    },
    {
      key: 'status',
      header: isAr ? 'الحالة الحالية' : 'Current Status',
      render: (val) => <StatusChip status={val} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">
            {isAr ? 'الأموال المحجوزة بالضمان' : 'Funds Held in Escrow'}
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            {isAr
              ? `إجمالي المبالغ المحتجزة في حساب SafePay: ${formatMoney(totalHeldAmount)} (${items.length} شحنة)`
              : `Total collateral protected in SafePay: ${formatMoney(totalHeldAmount)} across ${items.length} shipments`}
          </p>
        </div>
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
        onRowClick={(row) => navigate(`/escrow/shipments/${row.ticket.id}`)}
        emptyMessage={
          isAr
            ? 'لا توجد أموال محتجزة بالضمان حالياً'
            : 'No funds are currently held in escrow.'
        }
      />
    </div>
  );
}

