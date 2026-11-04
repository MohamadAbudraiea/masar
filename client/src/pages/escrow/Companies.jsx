import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Phone, ArrowUpRight, DollarSign, Star } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import FilterBar from '../../components/FilterBar.jsx';
import DataTable from '../../components/DataTable.jsx';
import { formatMoney } from '../../lib/format.js';

export default function EscrowCompanies() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const { filters, setFilter, resetFilters } = useUrlFilters({
    q: '',
    page: '1',
  });

  const [companies, setCompanies] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      params.set('page', filters.page || '1');
      params.set('page_size', '15');

      const data = await apiClient(`/manufacturers?${params.toString()}`);
      setCompanies(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [filters.q, filters.page]);

  const columns = [
    {
      key: 'name',
      header: isAr ? 'الشركة المصنّعة' : 'Company Name',
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
      key: 'tickets_count',
      header: isAr ? 'عدد الشحنات' : 'Total Shipments',
      render: (val) => (
        <span className="font-bold text-navy-900">
          {val || 0} {isAr ? 'شحنة' : 'trips'}
        </span>
      ),
    },
    {
      key: 'total_volume',
      header: isAr ? 'حجم الودائع الإجمالي' : 'Total Freight Deposits',
      render: (val) => <span className="font-bold font-mono text-navy-900">{formatMoney(val)}</span>,
    },
    {
      key: 'contact_person',
      header: isAr ? 'المسؤول' : 'Contact Person',
      render: (val) => val || '—',
    },
    {
      key: 'avg_stars',
      header: isAr ? 'التقييم' : 'Rating',
      render: (val, row) => (
        <div className="flex items-center gap-1 text-amber-500 font-bold">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
          <span>{val || '5.0'}</span>
          <span className="text-[10px] text-ink-muted">({row.ratings_count || 0})</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy-900 tracking-tight">
          {isAr ? 'الشركات المصنّعة والودائع' : 'Companies & Freight Escrow Accounts'}
        </h1>
        <p className="text-xs text-ink-muted mt-0.5">
          {isAr
            ? 'متابعة حسابات الشركات وأرصدة الودائع المحجوزة والمصروفة'
            : 'Corporate escrow accounts, deposited freight volumes, and active shipments'}
        </p>
      </div>

      <FilterBar
        filters={filters}
        onFilterChange={setFilter}
        onReset={resetFilters}
        placeholder={isAr ? 'بحث باسم الشركة أو الهاتف...' : 'Search company name or phone...'}
        showDateRange={false}
      />

      <DataTable
        columns={columns}
        data={companies}
        loading={loading}
        total={total}
        page={parseInt(filters.page || '1', 10)}
        pageSize={15}
        onPageChange={(p) => setFilter('page', p)}
        onRowClick={(row) => navigate(`/escrow/companies/${row.id}`)}
        emptyMessage={isAr ? 'لا توجد شركات مطابقة' : 'No companies found'}
      />
    </div>
  );
}

