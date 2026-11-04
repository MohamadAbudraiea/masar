import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package,
  PlusCircle,
  Clock,
  ArrowRight,
  MapPin,
  Calendar,
  AlertCircle,
  Eye,
  CreditCard,
  Truck,
  CheckCircle,
  CheckCheck,
  Star,
  RotateCcw,
} from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { useAuth } from '../../state/auth.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';
import StatCard from '../../components/StatCard.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';
import { linkTo } from '../../lib/links.js';

export default function ManufacturerOverview() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await apiClient(`/reports/manufacturer/overview${queryString}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load manufacturer overview:', err);
      setError(err.message || 'Failed to load dashboard overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [from, to]);

  const kpis = data?.kpis || {
    total: 0,
    active: 0,
    total_paid: '0.000',
    held: '0.000',
    released: '0.000',
    awaiting_payment: '0.000',
  };

  const needsAction = data?.needs_action || { unpaid: 0, to_mark_loaded: 0, to_confirm: 0 };
  const hasActions = needsAction.unpaid > 0 || needsAction.to_mark_loaded > 0 || needsAction.to_confirm > 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">
            {isAr ? 'لوحة تحكم المصنع' : 'Manufacturer Dashboard'}
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            {isAr ? `مرحباً بك، ${user?.name}` : `Welcome back, ${user?.name}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date range filter */}
          <div className="flex items-center gap-1.5 text-xs bg-card border border-line px-2.5 py-1.5 rounded-xl shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-ink-muted" />
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-transparent focus:outline-none text-ink text-xs"
              title={isAr ? 'من تاريخ' : 'From date'}
            />
            <span className="text-ink-muted">→</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-transparent focus:outline-none text-ink text-xs"
              title={isAr ? 'إلى تاريخ' : 'To date'}
            />
            {(from || to) && (
              <button
                onClick={() => {
                  setFrom('');
                  setTo('');
                }}
                className="text-ink-muted hover:text-navy-900 ms-1"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
          </div>

          <Link
            to="/manufacturer/shipments/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-navy-900 font-bold text-xs shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>{isAr ? 'طلب شحنة جديدة' : 'Post Shipment'}</span>
          </Link>
        </div>
      </div>

      {/* Needs Your Action Strip */}
      {hasActions ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-navy-900 flex items-center justify-center font-bold shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-navy-900">
                {isAr ? 'إجراءات تتطلب تدخلك الآن' : 'Actions Require Your Attention'}
              </div>
              <div className="text-xs text-ink-muted mt-0.5">
                {isAr
                  ? 'لديك شحنات بانتظار الدفع أو التحميل أو تأكيد التسليم'
                  : 'You have shipments awaiting payment, loading confirmation, or delivery receipt.'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {needsAction.unpaid > 0 && (
              <Link
                to="/manufacturer/shipments?status=requested"
                className="px-3 py-1.5 rounded-lg bg-card border border-amber-500/40 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition shadow-2xs"
              >
                {needsAction.unpaid} {isAr ? 'بانتظار الدفع' : 'Unpaid (Pay now)'}
              </Link>
            )}
            {needsAction.to_mark_loaded > 0 && (
              <Link
                to="/manufacturer/shipments?status=waiting_load"
                className="px-3 py-1.5 rounded-lg bg-card border border-line text-xs font-semibold text-navy-900 hover:bg-surface transition shadow-2xs"
              >
                {needsAction.to_mark_loaded} {isAr ? 'بانتظار التحميل' : 'Mark loaded'}
              </Link>
            )}
            {needsAction.to_confirm > 0 && (
              <Link
                to="/manufacturer/shipments?status=delivered"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-xs"
              >
                {needsAction.to_confirm} {isAr ? 'بانتظار تأكيدك' : 'Confirm delivery'}
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-line rounded-2xl p-3.5 px-4 flex items-center justify-between text-xs text-ink-muted">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>{isAr ? 'أنت على اطلاع تام بكافة الشحنات. لا توجد إجراءات معلقة.' : "You're all caught up! No pending actions require your attention."}</span>
          </div>
          <Link to="/manufacturer/shipments" className="text-navy-900 font-semibold hover:underline">
            {isAr ? 'عرض كافة الشحنات →' : 'View all shipments →'}
          </Link>
        </div>
      )}

      {/* KPI Row (Price only) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title={isAr ? 'إجمالي الشحنات' : 'Total Shipments'}
          value={kpis.total}
          icon={Package}
          onClick={() => navigate('/manufacturer/shipments')}
        />
        <StatCard
          title={isAr ? 'الشحنات النشطة' : 'Active Shipments'}
          value={kpis.active}
          icon={Truck}
          onClick={() => navigate('/manufacturer/shipments?status=waiting_load,in_delivery')}
        />
        <StatCard
          title={isAr ? 'إجمالي المدفوع' : 'Total Paid'}
          value={formatMoney(kpis.total_paid)}
          icon={CreditCard}
          onClick={() => navigate('/manufacturer/payments')}
        />
        <StatCard
          title={isAr ? 'محجوز بالضمان' : 'Held in Escrow'}
          value={formatMoney(kpis.held)}
          icon={Clock}
          subtitle={isAr ? 'حتى استلام البضائع' : 'Pending completion'}
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
          onClick={() => navigate('/manufacturer/shipments?status=requested')}
        />
      </div>

      {/* Middle Row: Visual Breakdowns & Top Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="bg-card rounded-2xl border border-line p-5 shadow-xs">
          <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-4">
            {isAr ? 'توزيع الشحنات حسب الحالة' : 'Shipments by Status'}
          </h2>
          <div className="space-y-3">
            {(data?.by_status || []).map((s) => (
              <div key={s.status} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <StatusChip status={s.status} />
                  <span className="text-ink-muted">({s.count})</span>
                </div>
                <span className="font-semibold text-navy-900">{formatMoney(s.amount)}</span>
              </div>
            ))}
            {(!data?.by_status || data.by_status.length === 0) && (
              <div className="text-xs text-ink-muted text-center py-6">
                {isAr ? 'لا توجد بيانات' : 'No status data'}
              </div>
            )}
          </div>
        </div>

        {/* Goods Category Distribution */}
        <div className="bg-card rounded-2xl border border-line p-5 shadow-xs">
          <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-4">
            {isAr ? 'توزيع البضائع المشحونة' : 'By Goods Category'}
          </h2>
          <div className="space-y-3">
            {(data?.by_category || []).map((c) => (
              <div key={c.category_name} className="flex items-center justify-between text-xs">
                <span className="font-medium text-navy-900">{c.category_name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-ink-muted">
                    {c.count} {isAr ? 'شحنة' : 'trips'}
                  </span>
                  <span className="font-semibold text-navy-900">{formatMoney(c.amount)}</span>
                </div>
              </div>
            ))}
            {(!data?.by_category || data.by_category.length === 0) && (
              <div className="text-xs text-ink-muted text-center py-6">
                {isAr ? 'لا توجد بيانات' : 'No category data'}
              </div>
            )}
          </div>
        </div>

        {/* Top Drivers Worked With */}
        <div className="bg-card rounded-2xl border border-line p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
              {isAr ? 'أبرز السائقين' : 'Top Drivers'}
            </h2>
            <Link to="/manufacturer/drivers" className="text-xs font-semibold text-navy-900 hover:underline">
              {isAr ? 'عرض الكل' : 'View all'}
            </Link>
          </div>
          <div className="space-y-3">
            {(data?.top_drivers || []).map((d) => (
              <div
                key={d.driver_id}
                onClick={() => navigate(linkTo('manufacturer', 'driver', d.driver_id))}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface/70 cursor-pointer transition border border-line/40 text-xs"
              >
                <div>
                  <div className="font-bold text-navy-900">{d.name}</div>
                  <div className="flex items-center gap-1 text-[11px] text-ink-muted mt-0.5">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                    <span>{d.avg_rating}</span>
                  </div>
                </div>
                <div className="text-end">
                  <span className="font-bold text-navy-900">{d.count}</span>
                  <div className="text-[10px] text-ink-muted">{isAr ? 'رحلات مكتملة' : 'completed trips'}</div>
                </div>
              </div>
            ))}
            {(!data?.top_drivers || data.top_drivers.length === 0) && (
              <div className="text-xs text-ink-muted text-center py-6">
                {isAr ? 'لم تكتمل أي رحلات بعد' : 'No completed trips yet'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Shipments Section */}
      <div className="bg-card rounded-2xl border border-line p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-navy-900 tracking-tight">
              {isAr ? 'أحدث الشحنات' : 'Recent Shipments'}
            </h2>
            <p className="text-xs text-ink-muted">
              {isAr ? 'آخر الشحنات المطلوبة والنشطة في حسابك' : 'Latest requested and active shipments'}
            </p>
          </div>
          <Link
            to="/manufacturer/shipments"
            className="text-xs font-bold text-navy-900 hover:text-amber-600 flex items-center gap-1 transition"
          >
            <span>{isAr ? 'كافة الشحنات' : 'View all shipments'}</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        </div>

        {loading ? (
          <TruckLoader message={isAr ? 'جاري تحميل الشحنات...' : 'Loading shipments...'} />
        ) : !data?.recent || data.recent.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-line rounded-xl">
            <Package className="w-8 h-8 text-ink-muted mx-auto mb-2" />
            <p className="text-xs text-ink-muted">
              {isAr ? 'لا توجد شحنات مسجلة بعد' : 'No shipments created yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line/60">
            {data.recent.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => navigate(linkTo('manufacturer', 'ticket', ticket.id))}
                className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-surface/50 px-2 rounded-xl transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center text-navy-900 shrink-0 font-bold text-xs">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-navy-900 hover:underline">
                        {ticket.ticket_number}
                      </span>
                      <StatusChip status={ticket.status} />
                    </div>
                    <div className="text-xs text-ink-muted flex items-center gap-2 mt-0.5">
                      <span className="font-medium text-navy-800">
                        {ticket.pickup?.city || 'Amman'} → {ticket.dest?.city || 'Destination'}
                      </span>
                      <span>·</span>
                      <span>{formatDateTime(ticket.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6">
                  {ticket.driver && (
                    <div className="text-start md:text-end">
                      <div className="text-xs font-semibold text-navy-900">{ticket.driver.name}</div>
                      <div className="text-[10px] text-ink-muted">{ticket.driver.phone}</div>
                    </div>
                  )}

                  <div className="text-end">
                    <div className="text-sm font-bold text-navy-900">{formatMoney(ticket.price)}</div>
                    <div className="text-[10px] text-ink-muted">{isAr ? 'شامل الضمان' : 'Escrow secured'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
