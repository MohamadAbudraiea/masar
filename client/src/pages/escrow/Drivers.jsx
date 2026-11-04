import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Truck, ArrowUpRight, DollarSign, Star, CreditCard } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import FilterBar from '../../components/FilterBar.jsx';
import DataTable from '../../components/DataTable.jsx';
import { formatMoney } from '../../lib/format.js';

export default function EscrowDrivers() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const { filters, setFilter, resetFilters } = useUrlFilters({
    q: '',
    page: '1',
  });

  const [drivers, setDrivers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      params.set('page', filters.page || '1');
      params.set('page_size', '15');

      const data = await apiClient(`/drivers?${params.toString()}`);
      setDrivers(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load escrow drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [filters.q, filters.page]);

  const columns = [
    {
      key: 'name',
      header: isAr ? 'السائق' : 'Driver Name',
      render: (val, row) => (
        <div>
          <span className="font-bold text-navy-900 hover:text-amber-600 transition flex items-center gap-1">
            {val}
            <ArrowUpRight className="h-3 w-3 text-ink-muted" />
          </span>
          <span className="text-[11px] text-ink-muted" dir="ltr">
            {row.phone}
          </span>
        </div>
      ),
    },
    {
      key: 'iban',
      header: isAr ? 'حساب الصرف (IBAN)' : 'IBAN Account',
      render: (val, row) => (
        <div>
          <div className="font-mono text-xs font-semibold text-navy-900" dir="ltr">
            {val || 'JO0000000000000000000000000000'}
          </div>
          {row.cliq_alias && (
            <div className="text-[10px] text-ink-muted font-mono">CliQ: {row.cliq_alias}</div>
          )}
        </div>
      ),
    },
    {
      key: 'completed_count',
      header: isAr ? 'الشحنات المكتملة' : 'Completed Deliveries',
      render: (val) => (
        <span className="font-bold text-navy-900">
          {val || 0} {isAr ? 'شحنة' : 'trips'}
        </span>
      ),
    },
    {
      key: 'total_earnings',
      header: isAr ? 'إجمالي مستحقات السائق' : 'Total Net Payouts',
      render: (val) => (
        <span className="font-bold font-mono text-emerald-600">{formatMoney(val)}</span>
      ),
    },
    {
      key: 'truck',
      header: isAr ? 'الشاحنة' : 'Truck & Plate',
      render: (val) =>
        val ? (
          <div>
            <div className="font-medium text-navy-900">
              {val.type_name} · {val.body_name}
            </div>
            <div className="font-mono text-[10px] text-ink-muted">{val.plate_number}</div>
          </div>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy-900 tracking-tight">
          {isAr ? 'السائقون وحسابات الصرف' : 'Drivers & Payout Accounts'}
        </h1>
        <p className="text-xs text-ink-muted mt-0.5">
          {isAr
            ? 'بيانات السائقين البنكية المسجلة (IBAN و CliQ) وإجمالي التحويلات'
            : 'Verified driver bank credentials and total settled freight payouts'}
        </p>
      </div>

      <FilterBar
        filters={filters}
        onFilterChange={setFilter}
        onReset={resetFilters}
        placeholder={isAr ? 'بحث باسم السائق، الهاتف، أو لوحة الشاحنة...' : 'Search driver, phone, plate...'}
        showDateRange={false}
      />

      <DataTable
        columns={columns}
        data={drivers}
        loading={loading}
        total={total}
        page={parseInt(filters.page || '1', 10)}
        pageSize={15}
        onPageChange={(p) => setFilter('page', p)}
        onRowClick={(row) => navigate(`/escrow/drivers/${row.id}`)}
        emptyMessage={isAr ? 'لا يوجد سائقون مسجلون' : 'No drivers found'}
      />
    </div>
  );
}

