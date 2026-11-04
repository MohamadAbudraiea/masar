import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Phone, Mail, ArrowLeft, Lock, ArrowUpRight, CheckCheck, Clock, Package } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import StatCard from '../../components/StatCard.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';

export default function EscrowCompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [company, setCompany] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [cData, tData] = await Promise.all([
          apiClient(`/manufacturers/${id}`),
          apiClient(`/manufacturers/${id}/tickets?page_size=20`),
        ]);
        setCompany(cData);
        setTickets(tData.items || []);
        setTotal(tData.total || 0);
      } catch (err) {
        console.error('Failed to load company detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return <TruckLoader message={isAr ? 'جاري تحميل ملف الشركة المالي...' : 'Loading company financial profile...'} />;
  }

  if (!company) {
    return (
      <div className="p-8 text-center text-xs text-ink-muted">
        {isAr ? 'الشركة غير موجودة' : 'Company not found'}
      </div>
    );
  }

  const fin = company.financial_stats || {
    total_deposited: '0.000',
    held: '0.000',
    released: '0.000',
    total_shipments: 0,
  };

  const columns = [
    {
      key: 'ticket_number',
      header: isAr ? 'رقم الشحنة' : 'Shipment #',
      render: (val, row) => (
        <span className="font-mono font-bold text-navy-900 hover:text-amber-600 transition">
          {val}
        </span>
      ),
    },
    {
      key: 'route',
      header: isAr ? 'المسار' : 'Route',
      render: (_, row) => (
        <span className="font-medium text-navy-900">
          {row.pickup_city} → {row.dest_city}
        </span>
      ),
    },
    {
      key: 'driver',
      header: isAr ? 'السائق المعيّن' : 'Assigned Driver',
      render: (_, row) =>
        row.driver_id ? (
          <Link
            to={`/escrow/drivers/${row.driver_id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-navy-900 font-semibold hover:underline"
          >
            {row.driver_name}
          </Link>
        ) : (
          <span className="text-ink-muted italic">{isAr ? 'غير معيّن' : 'Unassigned'}</span>
        ),
    },
    {
      key: 'price',
      header: isAr ? 'المبلغ' : 'Price',
      render: (val) => <span className="font-bold text-navy-900">{formatMoney(val)}</span>,
    },
    {
      key: 'status',
      header: isAr ? 'الحالة' : 'Status',
      render: (val) => <StatusChip status={val} />,
    },
    {
      key: 'created_at',
      header: isAr ? 'تاريخ الإنشاء' : 'Created At',
      render: (val) => formatDateTime(val),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/escrow/companies"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-navy-900 mb-3"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          <span>{isAr ? 'العودة للشركات' : 'Back to Companies'}</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-surface border border-line flex items-center justify-center text-navy-900 font-bold">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-navy-900">{company.name}</h1>
              <div className="flex items-center gap-3 text-xs text-ink-muted">
                <span>{company.contact_person || 'General Management'}</span>
                <span>·</span>
                <span dir="ltr">{company.phone}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Escrow Financial Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={isAr ? 'إجمالي الودائع' : 'Total Deposited'}
          value={formatMoney(fin.total_deposited)}
          icon={ArrowUpRight}
        />
        <StatCard
          title={isAr ? 'محجوز حالياً بالضمان' : 'Currently Held'}
          value={formatMoney(fin.held)}
          icon={Lock}
          subtitle={isAr ? 'بانتظار التسليم' : 'Awaiting delivery'}
        />
        <StatCard
          title={isAr ? 'تم صرفه للسائقين' : 'Released Payouts'}
          value={formatMoney(fin.released)}
          icon={CheckCheck}
        />
        <StatCard
          title={isAr ? 'عدد الشحنات الكلي' : 'Total Shipments'}
          value={`${fin.total_shipments} ${isAr ? 'شحنة' : 'trips'}`}
          icon={Package}
        />
      </div>

      {/* All Company Shipments */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-navy-900">
          {isAr ? 'كافة شحنات الشركة المودعة بالضمان' : 'Company Freight Shipments'}
        </h2>

        <DataTable
          columns={columns}
          data={tickets}
          loading={loading}
          total={total}
          onRowClick={(row) => navigate(`/escrow/shipments/${row.id}`)}
          emptyMessage={isAr ? 'لا توجد شحنات مسجلة لهذه الشركة' : 'No shipments registered for this company.'}
        />
      </div>
    </div>
  );
}

