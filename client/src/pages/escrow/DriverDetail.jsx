import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Truck, Phone, ArrowLeft, Clock, ArrowUpRight, CheckCheck, Package, Building2, CreditCard } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import StatCard from '../../components/StatCard.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';

export default function EscrowDriverDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [driver, setDriver] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [dData, tData] = await Promise.all([
          apiClient(`/drivers/${id}`),
          apiClient(`/drivers/${id}/tickets?page_size=20`),
        ]);
        setDriver(dData);
        setTickets(tData.items || []);
        setTotal(tData.total || 0);
      } catch (err) {
        console.error('Failed to load driver detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return <TruckLoader message={isAr ? 'جاري تحميل ملف السائق المالي...' : 'Loading driver financial profile...'} />;
  }

  if (!driver) {
    return (
      <div className="p-8 text-center text-xs text-ink-muted">
        {isAr ? 'السائق غير موجود' : 'Driver not found'}
      </div>
    );
  }

  const fin = driver.financial_stats || {
    pending_release: '0.000',
    total_released: '0.000',
    total_shipments: 0,
  };

  const payout = driver.payout || {};

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
      key: 'company',
      header: isAr ? 'الشركة المصنّعة' : 'Company',
      render: (_, row) => (
        <Link
          to={`/escrow/companies/${row.manufacturer_id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-bold text-navy-900 hover:underline"
        >
          {row.manufacturer_name}
        </Link>
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
      key: 'driver_net',
      header: isAr ? 'صافي السائق' : 'Driver Net Payout',
      render: (val) => (
        <span className="font-bold font-mono text-emerald-600">{formatMoney(val)}</span>
      ),
    },
    {
      key: 'status',
      header: isAr ? 'الحالة' : 'Status',
      render: (val) => <StatusChip status={val} />,
    },
    {
      key: 'created_at',
      header: isAr ? 'تاريخ الإنشاء' : 'Date',
      render: (val) => formatDateTime(val),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/escrow/drivers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-navy-900 mb-3"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          <span>{isAr ? 'العودة لقائمة السائقين' : 'Back to Drivers'}</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-surface border border-line flex items-center justify-center text-navy-900 font-bold">
              <Truck className="h-6 w-6 text-navy-800" />
            </div>
            <div>
              <h1 className="text-xl font-black text-navy-900">{driver.name}</h1>
              <div className="flex items-center gap-3 text-xs text-ink-muted">
                <span dir="ltr">{driver.phone}</span>
                <span>·</span>
                <span>
                  {driver.truck ? `${driver.truck.type_name} (${driver.truck.plate_number})` : 'Truck'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Driver Payout Card */}
      <div className="bg-card rounded-2xl border border-line p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-ink-muted block">
            {isAr ? 'حساب تحويل الأرباح المعتمد (SafePay Payout Destination)' : 'Verified Payout Account'}
          </span>
          <div className="font-mono text-base font-black text-navy-900 mt-1" dir="ltr">
            {payout.iban || 'JO0000000000000000000000000000'}
          </div>
          {payout.cliq_alias && (
            <div className="text-xs text-ink-muted font-mono mt-0.5">CliQ: {payout.cliq_alias}</div>
          )}
        </div>

        <div className="text-end">
          <span className="text-[10px] text-ink-muted block">{isAr ? 'حالة السائق' : 'Driver Status'}</span>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
            ✓ {driver.status}
          </span>
        </div>
      </div>

      {/* Escrow Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title={isAr ? 'مستحقات بانتظار الصرف' : 'Pending Delivery Release'}
          value={formatMoney(fin.pending_release)}
          icon={Clock}
          subtitle={isAr ? 'قيد التوصيل' : 'In delivery stage'}
        />
        <StatCard
          title={isAr ? 'إجمالي ما تم تحويله للسائق' : 'Total Settled Payouts'}
          value={formatMoney(fin.total_released)}
          icon={CheckCheck}
        />
        <StatCard
          title={isAr ? 'إجمالي الشحنات' : 'Total Handled Shipments'}
          value={`${fin.total_shipments} ${isAr ? 'شحنة' : 'trips'}`}
          icon={Package}
        />
      </div>

      {/* All Driver Shipments */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-navy-900">
          {isAr ? 'شحنات السائق على المنصة' : 'Driver Shipment History'}
        </h2>

        <DataTable
          columns={columns}
          data={tickets}
          loading={loading}
          total={total}
          onRowClick={(row) => navigate(`/escrow/shipments/${row.id}`)}
          emptyMessage={isAr ? 'لا توجد شحنات مسجلة لهذا السائق' : 'No shipments registered for this driver.'}
        />
      </div>
    </div>
  );
}

