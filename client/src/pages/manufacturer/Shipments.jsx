import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, PlusCircle, ArrowUpRight } from 'lucide-react';
import { apiClient, getApiUrl } from '../../api/client.js';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import FilterBar from '../../components/FilterBar.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';
import { linkTo } from '../../lib/links.js';

export default function ManufacturerShipments() {
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

  const statusTabs = [
    { value: '', label: isAr ? 'الكل' : 'All' },
    { value: 'requested', label: isAr ? 'بانتظار الدفع' : 'Awaiting payment' },
    { value: 'pending', label: isAr ? 'متاحة للسائقين' : 'Open' },
    { value: 'waiting_load,in_delivery', label: isAr ? 'قيد التنفيذ' : 'In progress' },
    { value: 'delivered', label: isAr ? 'تم التسليم' : 'Delivered' },
    { value: 'audited', label: isAr ? 'مكتملة ومؤكدة' : 'Confirmed' },
  ];

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
      console.error('Failed to fetch shipments:', err);
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
      render: (val, row) => (
        <span className="font-bold text-navy-900 hover:text-amber-600 transition flex items-center gap-1">
          {val}
          <ArrowUpRight className="h-3 w-3 text-ink-muted" />
        </span>
      ),
    },
    {
      key: 'route',
      header: isAr ? 'المسار' : 'Route',
      render: (_, row) => (
        <div className="font-medium text-navy-900">
          {row.pickup?.city || 'Amman'} → {row.dest?.city || 'Destination'}
          <span className="block text-[10px] text-ink-muted">
            {row.distance_km ? `${row.distance_km} km` : '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'pickup_at',
      header: isAr ? 'موعد التحميل' : 'Pickup Time',
      render: (val) => formatDateTime(val),
    },
    {
      key: 'driver',
      header: isAr ? 'السائق' : 'Driver',
      render: (_, row) =>
        row.driver ? (
          <Link
            to={linkTo('manufacturer', 'driver', row.driver.id)}
            onClick={(e) => e.stopPropagation()}
            className="text-navy-900 font-semibold hover:underline"
          >
            {row.driver.name}
          </Link>
        ) : (
          <span className="text-ink-muted italic">{isAr ? 'لم يُعيّن بعد' : 'Unassigned'}</span>
        ),
    },
    {
      key: 'price',
      header: isAr ? 'السعر' : 'Price',
      render: (val) => <span className="font-bold text-navy-900">{formatMoney(val)}</span>,
    },
    {
      key: 'status',
      header: isAr ? 'الحالة' : 'Status',
      render: (val) => <StatusChip status={val} />,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">
            {isAr ? 'شحناتي' : 'My Shipments'}
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            {isAr
              ? `إدارة وتتبع كافة الشحنات (${total} شحنة)`
              : `Manage and track all freight shipments (${total} total)`}
          </p>
        </div>

        <Link
          to="/manufacturer/shipments/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-navy-900 font-bold text-xs shadow-xs transition"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>{isAr ? 'طلب شحنة جديدة' : 'Post New Shipment'}</span>
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-line text-xs font-semibold">
        {statusTabs.map((tab) => {
          const isActive = (filters.status || '') === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setFilter('status', tab.value)}
              className={`px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'text-ink-muted hover:text-navy-900 hover:bg-surface'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilter}
        onReset={resetFilters}
        onExportCsv={handleExportCsv}
      />

      {/* Shipments Table */}
      <DataTable
        columns={columns}
        data={tickets}
        loading={loading}
        total={total}
        page={parseInt(filters.page || '1', 10)}
        pageSize={15}
        onPageChange={(p) => setFilter('page', p)}
        onRowClick={(row) => navigate(linkTo('manufacturer', 'ticket', row.id))}
        emptyMessage={
          isAr
            ? 'لا توجد شحنات مطابقة للمعايير المحددة'
            : 'No shipments match the selected filters.'
        }
      />
    </div>
  );
}

