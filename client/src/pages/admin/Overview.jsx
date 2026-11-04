import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Box,
  Truck,
  TrendingUp,
  ShieldAlert,
  Clock,
  Package,
  Star,
  Activity,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { apiClient } from '../../api/client.js';
import StatCard from '../../components/StatCard.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';
import { linkTo } from '../../lib/links.js';

export default function AdminOverview() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [overview, setOverview] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newestTab, setNewestTab] = useState('pending'); // 'requested' | 'pending' | 'audited'

  const fetchOverview = async () => {
    try {
      const data = await apiClient('/reports/admin/overview');
      setOverview(data);
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    }
  };

  const fetchActivity = async () => {
    try {
      const act = await apiClient('/reports/admin/activity?limit=15');
      setActivity(act.items || []);
    } catch (err) {
      console.error('Failed to load admin activity:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOverview(), fetchActivity()]).finally(() => setLoading(false));

    // Live activity polling every 10 seconds per 06 §5.1
    const timer = setInterval(() => {
      fetchActivity();
      fetchOverview();
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  const kpis = overview?.kpis || {
    users: 0,
    active_shipments: 0,
    pending_approvals: 0,
    masar_revenue: '0.000',
    volume: '0.000',
  };

  const newestShipments = overview?.newest?.[newestTab] || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">
            {isAr ? 'لوحة تحكم إدارة مسار' : 'Masar Control Center'}
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            {isAr
              ? 'متابعة شاملة للحركة اليومية، السائقين، المصانع، والأنشطة المباشرة'
              : 'Real-time overview of users, live logistics movements, and platform commissions'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/approvals"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line bg-card hover:bg-surface text-xs font-bold text-navy-900 shadow-2xs"
          >
            <span>{isAr ? 'طلبات الانضمام' : 'Pending Approvals'}</span>
            {kpis.pending_approvals > 0 && (
              <span className="bg-amber-500 text-navy-900 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {kpis.pending_approvals}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          title={isAr ? 'إجمالي المستخدمين' : 'Total Users'}
          value={kpis.users}
          icon={Users}
          onClick={() => navigate('/admin/manufacturers')}
        />
        <StatCard
          title={isAr ? 'الشحنات النشطة' : 'Active Shipments'}
          value={kpis.active_shipments}
          icon={Truck}
          onClick={() => navigate('/admin/shipments?status=waiting_load,in_delivery')}
        />
        <StatCard
          title={isAr ? 'طلبات الاعتماد' : 'Pending Approvals'}
          value={kpis.pending_approvals}
          icon={ShieldAlert}
          subtitle={isAr ? 'مصانع وسائقين' : 'New signups'}
          onClick={() => navigate('/admin/approvals')}
        />
        <StatCard
          title={isAr ? 'إيرادات مسار (4%)' : 'Masar Revenue'}
          value={formatMoney(kpis.masar_revenue)}
          icon={TrendingUp}
          onClick={() => navigate('/admin/financial')}
        />
        <StatCard
          title={isAr ? 'إجمالي حجم التداول' : 'Total Volume'}
          value={formatMoney(kpis.volume)}
          icon={Box}
          onClick={() => navigate('/admin/financial')}
        />
      </div>

      {/* Main Grid: Activity Feed & Newest Shipments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Newest Shipments & Distributions */}
        <div className="space-y-6 lg:col-span-2">
          {/* Newest Shipments with Tabs */}
          <div className="bg-card rounded-2xl border border-line p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 border-b border-line pb-3">
              <div>
                <h2 className="text-base font-bold text-navy-900 tracking-tight">
                  {isAr ? 'أحدث الشحنات على المنصة' : 'Recent Shipments'}
                </h2>
                <p className="text-xs text-ink-muted">
                  {isAr ? 'عرض آخر الشحنات حسب الحالة' : 'Latest requested, open, and completed freight'}
                </p>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 bg-surface p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setNewestTab('pending')}
                  className={`px-3 py-1 rounded-lg transition ${
                    newestTab === 'pending' ? 'bg-navy-900 text-white shadow-xs' : 'text-ink-muted hover:text-navy-900'
                  }`}
                >
                  {isAr ? 'متاحة (Pending)' : 'Open (Pending)'}
                </button>
                <button
                  onClick={() => setNewestTab('audited')}
                  className={`px-3 py-1 rounded-lg transition ${
                    newestTab === 'audited' ? 'bg-navy-900 text-white shadow-xs' : 'text-ink-muted hover:text-navy-900'
                  }`}
                >
                  {isAr ? 'مكتملة (Audited)' : 'Confirmed (Audited)'}
                </button>
                <button
                  onClick={() => setNewestTab('requested')}
                  className={`px-3 py-1 rounded-lg transition ${
                    newestTab === 'requested' ? 'bg-navy-900 text-white shadow-xs' : 'text-ink-muted hover:text-navy-900'
                  }`}
                >
                  {isAr ? 'غير مدفوعة (Requested)' : 'Unpaid (Requested)'}
                </button>
              </div>
            </div>

            {/* Shipments List */}
            <div className="divide-y divide-line/60">
              {newestShipments.map((t) => (
                <div
                  key={t.id}
                  onClick={() => navigate(linkTo('admin', 'ticket', t.id))}
                  className="py-3 flex items-center justify-between hover:bg-surface/50 px-2 rounded-xl transition cursor-pointer text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-navy-900 hover:underline">{t.ticket_number}</span>
                      <StatusChip status={t.status} />
                    </div>
                    <div className="text-ink-muted mt-0.5">
                      <span className="font-medium text-slate-700">{t.manufacturer_name}</span>
                      {t.driver_name && <span> · Driver: {t.driver_name}</span>}
                    </div>
                  </div>

                  <div className="text-end">
                    <span className="font-mono font-bold text-navy-900">{formatMoney(t.price)}</span>
                    <div className="text-[10px] text-ink-muted">{formatDateTime(t.created_at || t.audited_at)}</div>
                  </div>
                </div>
              ))}

              {newestShipments.length === 0 && (
                <div className="text-center py-8 text-xs text-ink-muted">
                  {isAr ? 'لا توجد شحنات في هذه الفئة' : 'No shipments found in this category.'}
                </div>
              )}
            </div>
          </div>

          {/* Top Rated & Top by Volume */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Manufacturers */}
            <div className="bg-card rounded-2xl border border-line p-5 shadow-xs">
              <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-3">
                {isAr ? 'أعلى المصانع شحناً' : 'Top Manufacturers by Volume'}
              </h3>
              <div className="space-y-2.5">
                {(overview?.top_by_count?.manufacturers || []).map((m) => (
                  <div
                    key={m.id}
                    onClick={() => navigate(linkTo('admin', 'manufacturer', m.id))}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-surface cursor-pointer text-xs transition"
                  >
                    <span className="font-bold text-navy-900">{m.name}</span>
                    <span className="text-ink-muted font-semibold">
                      {m.count} {isAr ? 'شحنة' : 'shipments'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Drivers */}
            <div className="bg-card rounded-2xl border border-line p-5 shadow-xs">
              <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-3">
                {isAr ? 'أعلى السائقين تقييماً' : 'Top Rated Drivers'}
              </h3>
              <div className="space-y-2.5">
                {(overview?.top_rated?.drivers || []).map((d) => (
                  <div
                    key={d.id}
                    onClick={() => navigate(linkTo('admin', 'driver', d.id))}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-surface cursor-pointer text-xs transition"
                  >
                    <span className="font-bold text-navy-900">{d.name}</span>
                    <div className="flex items-center gap-1 font-bold text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                      <span>{d.avg_stars}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Live Activity Feed (10s polling) */}
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-line p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                  {isAr ? 'سجل العمليات المباشر' : 'Live Activity Stream'}
                </h2>
              </div>
              <span className="text-[10px] text-ink-muted">{isAr ? 'تحديث كل 10ث' : 'Refreshes every 10s'}</span>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto divide-y divide-line/40">
              {activity.map((act) => (
                <div key={act.id} className="pt-2.5 first:pt-0 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-ink-muted">
                    <span className="font-bold text-navy-900">{act.actor_name || 'System'}</span>
                    <span>{formatDateTime(act.created_at)}</span>
                  </div>
                  <div className="text-ink mt-0.5 font-medium">
                    {act.action?.replace(/_/g, ' ')}
                    {act.ticket_number && (
                      <Link
                        to={linkTo('admin', 'ticket', act.ticket_id)}
                        className="ms-1.5 font-bold text-navy-900 hover:text-amber-600 underline"
                      >
                        {act.ticket_number}
                      </Link>
                    )}
                  </div>
                </div>
              ))}

              {activity.length === 0 && (
                <div className="text-center py-8 text-xs text-ink-muted">
                  {isAr ? 'لا توجد أنشطة مسجلة' : 'No recorded activity yet'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
