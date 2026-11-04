import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CreditCard, Clock, CheckCheck, AlertCircle, ArrowUpRight } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import FilterBar from '../../components/FilterBar.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatCard from '../../components/StatCard.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';
import { linkTo } from '../../lib/links.js';

export default function ManufacturerPayments() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const { filters, setFilter, resetFilters } = useUrlFilters({
    from: '',
    to: '',
    page: '1',
  });

  const [kpis, setKpis] = useState({
    paid: '0.000',
    held: '0.000',
    released: '0.000',
    awaiting_payment: '0.000',
  });
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.from) queryParams.set('from', filters.from);
      if (filters.to) queryParams.set('to', filters.to);
      queryParams.set('page', filters.page || '1');
      queryParams.set('page_size', '15');

      const data = await apiClient(`/reports/manufacturer/payments?${queryParams.toString()}`);
      if (data.kpis) setKpis(data.kpis);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch manufacturer payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [filters.from, filters.to, filters.page]);

  const handleExportCsv = () => {
    const queryParams = new URLSearchParams();
    if (filters.from) queryParams.set('from', filters.from);
    if (filters.to) queryParams.set('to', filters.to);
    queryParams.set('format', 'csv');
    window.open(`/api/reports/manufacturer/payments?${queryParams.toString()}`, '_blank');
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
      key: 'price',
      header: isAr ? 'المبلغ' : 'Amount',
      render: (val) => <span className="font-bold text-navy-900">{formatMoney(val)}</span>,
    },
    {
      key: 'status',
      header: isAr ? 'الحالة' : 'Status',
      render: (val) => <StatusChip status={val} />,
    },
    {
      key: 'paid_at',
      header: isAr ? 'تاريخ الدفع بالضمان' : 'Paid at (Escrow Deposit)',
      render: (val) => (val ? formatDateTime(val) : '—'),
    },
    {
      key: 'released_at',
      header: isAr ? 'تاريخ الصرف للسائق' : 'Released at',
      render: (val) => (val ? formatDateTime(val) : '—'),
    },
    {
      key: 'driver',
      header: isAr ? 'السائق المستفيد' : 'Driver',
      render: (val) =>
        val ? (
          <Link
            to={linkTo('manufacturer', 'driver', val.id)}
            onClick={(e) => e.stopPropagation()}
            className="text-navy-900 font-semibold hover:underline"
          >
            {val.name}
          </Link>
        ) : (
          <span className="text-ink-muted italic">{isAr ? 'لم يُعيّن' : 'Unassigned'}</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-navy-900 tracking-tight">
          {isAr ? 'المدفوعات وحساب الضمان' : 'Payments & SafePay Escrow'}
        </h1>
        <p className="text-xs text-ink-muted mt-0.5">
          {isAr
            ? 'سجل المبالغ المودعة بحساب الضمان والمصروفة للسائقين'
            : 'Track delivery funds held in SafePay Escrow and released to drivers'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={isAr ? 'إجمالي المدفوع' : 'Total Paid'}
          value={formatMoney(kpis.paid)}
          icon={CreditCard}
        />
        <StatCard
          title={isAr ? 'محجوز بالضمان' : 'Held in Escrow'}
          value={formatMoney(kpis.held)}
          icon={Clock}
          subtitle={isAr ? 'حتى تأكيد الاستلام' : 'Protected in escrow'}
        />
        <StatCard
          title={isAr ? 'تم صرفه للسائقين' : 'Released to Drivers'}
          value={formatMoney(kpis.released)}
          icon={CheckCheck}
        />
        <StatCard
          title={isAr ? 'بانتظار الدفع' : 'Awaiting Payment'}
          value={formatMoney(kpis.awaiting_payment)}
          icon={AlertCircle}
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilter}
        onReset={resetFilters}
        onExportCsv={handleExportCsv}
      />

      {/* Payments Table */}
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        total={total}
        page={parseInt(filters.page || '1', 10)}
        pageSize={15}
        onPageChange={(p) => setFilter('page', p)}
        onRowClick={(row) => navigate(linkTo('manufacturer', 'ticket', row.ticket_id))}
      />
    </div>
  );
}

