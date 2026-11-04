import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, ArrowUpRight, Building2, Truck } from 'lucide-react';
import { apiClient, getApiUrl } from '../../api/client.js';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import FilterBar from '../../components/FilterBar.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';

export default function EscrowShipments() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const { filters, setFilter, resetFilters } = useUrlFilters({
    status: '',
    q: '',
    from: '',
    to: '',
    page: '1',
  });

  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.set('status', filters.status);
      if (filters.q) queryParams.set('q', filters.q);
      if (filters.from) queryParams.set('from', filters.from);
      if (filters.to) queryParams.set('to', filters.to);
      queryParams.set('page', filters.page || '1');
      queryParams.set('page_size', '15');

      const data = await apiClient(`/tickets?${queryParams.toString()}`);
      setTickets(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch escrow shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filters.status, filters.q, filters.from, filters.to, filters.page]);

  const handleExportCsv = () => {
    const queryParams = new URLSearchParams();
    if (filters.status) queryParams.set('status', filters.status);
    if (filters.q) queryParams.set('q', filters.q);
    if (filters.from) queryParams.set('from', filters.from);
    if (filters.to) queryParams.set('to', filters.to);
    queryParams.set('format', 'csv');
    window.open(getApiUrl(`/tickets?${queryParams.toString()}`), '_blank');
  };

  const columns = [
    {
      key: 'ticket_number',
      header: isAr ? 'رقم الشحنة' : 'Shipment #',
      render: (val) => (
        <span className="font-mono font-bold text-navy-900 hover:text-amber-600 transition flex items-center gap-1">
          {val}
          <ArrowUpRight className="h-3 w-3 text-ink-muted" />
        </span>
      ),
    },
    {
      key: 'parties',
      header: isAr ? 'الأطراف (المصنع / السائق)' : 'Parties (Company / Driver)',
      render: (_, row) => (
        <div className="space-y-0.5">
          <Link
            to={`/escrow/companies/${row.manufacturer_id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-bold text-navy-900 hover:underline flex items-center gap-1"
          >
            <Building2 className="h-3 w-3 text-navy-700" />
            <span>{row.manufacturer?.name || row.manufacturer_name}</span>
          </Link>
          {row.driver_id ? (
            <Link
              to={`/escrow/drivers/${row.driver_id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-ink-muted hover:text-navy-900 hover:underline flex items-center gap-1"
            >
              <Truck className="h-3 w-3 text-emerald-600" />
              <span>{row.driver?.name || row.driver_name}</span>
            </Link>
          ) : (
            <span className="text-[10px] text-ink-muted italic">{isAr ? 'لم يُعيّن سائق' : 'Unassigned'}</span>
          )}
        </div>
      ),
    },
    {
      key: 'route',
      header: isAr ? 'المسار' : 'Route',
      render: (_, row) => (
        <div className="font-medium text-navy-900">
          {row.pickup?.city || row.pickup_city} → {row.dest?.city || row.dest_city}
        </div>
      ),
    },
    {
      key: 'price',
      header: isAr ? 'السعر الكلي' : 'Total Price',
      render: (val) => <span className="font-bold text-navy-900">{formatMoney(val)}</span>,
    },
    {
      key: 'escrow_fee',
      header: isAr ? 'عمولة SafePay' : 'Escrow Fee',
      render: (val) => <span className="font-semibold text-navy-700">{formatMoney(val)}</span>,
    },
    {
      key: 'driver_net',
      header: isAr ? 'صافي السائق' : 'Driver Net',
      render: (val) => <span className="font-bold text-emerald-600 font-mono">{formatMoney(val)}</span>,
    },
    {
      key: 'status',
      header: isAr ? 'الحالة' : 'Status',
      render: (val) => <StatusChip status={val} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy-900 tracking-tight">
          {isAr ? 'سجل كافة الشحنات والضمانات' : 'All Freight Shipments & Escrows'}
        </h1>
        <p className="text-xs text-ink-muted mt-0.5">
          {isAr
            ? `متابعة الحسابات المالية والعمولات لكافة الشحنات (${total} شحنة)`
            : `Comprehensive financial ledger of platform freight contracts (${total} total)`}
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
        data={tickets}
        loading={loading}
        total={total}
        page={parseInt(filters.page || '1', 10)}
        pageSize={15}
        onPageChange={(p) => setFilter('page', p)}
        onRowClick={(row) => navigate(`/escrow/shipments/${row.id}`)}
      />
    </div>
  );
}

