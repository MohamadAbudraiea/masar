import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Box, Truck, TrendingUp, ShieldAlert, Star, ArrowRight, Trophy } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import StatCard from '../../components/StatCard.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import ActivityFeed from '../../components/ActivityFeed.jsx';
import { Donut, ChartCard } from '../../components/Charts.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';
import { linkTo } from '../../lib/links.js';
import AdminLiveMap from '../../components/AdminLiveMap.jsx';

const STATUS_COLORS = {
  requested: '#94A3B8',
  pending: '#F5A82A',
  waiting_load: '#2563EB',
  in_delivery: '#0D9488',
  delivered: '#7C3AED',
  audited: '#16A34A',
};
const STATUS_ORDER = ['requested', 'pending', 'waiting_load', 'in_delivery', 'delivered', 'audited'];

function RankList({ items, valueOf, render, max, onOpen, barColor = '#143B5E' }) {
  return (
    <ol className="space-y-1">
      {items.map((it, i) => {
        const v = Number(valueOf(it)) || 0;
        return (
          <li key={it.id}>
            <button
              type="button"
              onClick={() => onOpen(it)}
              className="w-full text-start flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface transition"
            >
              <span
                className={`h-6 w-6 shrink-0 rounded-full text-[11px] font-extrabold flex items-center justify-center ${
                  i === 0 ? 'bg-amber-500 text-navy-900' : 'bg-surface text-ink-muted'
                }`}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-bold text-navy-900 truncate">{it.name}</span>
                  {render(it)}
                </span>
                <span className="mt-1 block h-1.5 rounded-full bg-surface overflow-hidden">
                  <span className="block h-full rounded-full" style={{ width: `${max ? (v / max) * 100 : 0}%`, background: barColor }} />
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default function AdminOverview() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [overview, setOverview] = useState(null);
  const [series, setSeries] = useState([]);
  const [activity, setActivity] = useState([]);
  const [refreshedAt, setRefreshedAt] = useState(Date.now());
  const [paused, setPaused] = useState(false);
  const [newestTab, setNewestTab] = useState('pending');
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    try {
      setOverview(await apiClient('/reports/admin/overview'));
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const act = await apiClient('/reports/admin/activity?limit=40');
      setActivity(act.items || []);
      setRefreshedAt(Date.now());
    } catch (err) {
      console.error('Failed to load admin activity:', err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchOverview(),
      fetchActivity(),
      apiClient('/reports/admin/financial?group=week')
        .then((r) => setSeries(r?.income_series || []))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [fetchOverview, fetchActivity]);

  // Live polling every 10 s (06 §5.1) — pausable
  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => {
      fetchActivity();
      fetchOverview();
    }, 10000);
    return () => clearInterval(timer);
  }, [paused, fetchActivity, fetchOverview]);

  const kpis = overview?.kpis || { users: 0, active_shipments: 0, pending_approvals: 0, masar_revenue: '0.000', volume: '0.000' };
  const dist = overview?.status_distribution || [];
  const byStatus = Object.fromEntries(dist.map((d) => [d.status, d]));
  const totalShipments = dist.reduce((s, d) => s + Number(d.count), 0);
  const awaitingConfirm = Number(byStatus.delivered?.count || 0);
  const awaitingPayment = Number(byStatus.requested?.count || 0);
  const newestShipments = overview?.newest?.[newestTab] || [];

  const topMfr = overview?.top_by_count?.manufacturers || [];
  const topDrivers = overview?.top_rated?.drivers || [];

  const tabs = [
    { id: 'requested', label: isAr ? 'بانتظار الدفع' : 'Awaiting payment' },
    { id: 'pending', label: isAr ? 'متاحة للسائقين' : 'Open for drivers' },
    { id: 'audited', label: isAr ? 'مكتملة' : 'Confirmed' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold text-navy-900 tracking-tight leading-tight">
            {isAr ? 'مركز التحكم' : 'Control center'}
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {isAr ? 'كل ما يحدث على مسار الآن: الحسابات، الشحنات على الطريق، والإيرادات.' : 'Everything happening on Masar right now: accounts, trucks on the road, and revenue.'}
          </p>
        </div>
        {kpis.pending_approvals > 0 && (
          <Link
            to="/admin/approvals"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-navy-900 text-sm font-bold transition self-start sm:self-auto"
          >
            {isAr ? `مراجعة ${kpis.pending_approvals} طلبات` : `Review ${kpis.pending_approvals} sign-ups`}
            <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
          </Link>
        )}
      </div>

      {/* KPIs — lead with revenue, then volume, then operational counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          featured
          title={isAr ? 'إيرادات مسار' : 'Masar revenue'}
          value={formatMoney(kpis.masar_revenue)}
          icon={TrendingUp}
          spark={series.map((s) => s.masar_income)}
          subtitle={isAr ? 'عمولة 4% من الشحنات المؤكدة' : '4% fee on confirmed shipments'}
          onClick={() => navigate('/admin/financial')}
        />
        <StatCard
          tone="blue"
          title={isAr ? 'حجم التداول' : 'Total volume'}
          value={formatMoney(kpis.volume)}
          icon={Box}
          spark={series.map((s) => s.volume)}
          subtitle={isAr ? 'قيمة كل الشحنات المدفوعة' : 'Value of all paid shipments'}
          onClick={() => navigate('/admin/financial')}
        />
        <StatCard
          tone="teal"
          title={isAr ? 'شحنات نشطة' : 'Active shipments'}
          value={String(kpis.active_shipments)}
          icon={Truck}
          share={totalShipments ? { value: kpis.active_shipments / totalShipments, label: isAr ? `من أصل ${totalShipments} شحنة` : `of ${totalShipments} shipments` } : undefined}
          alert={
            awaitingConfirm > 0
              ? { level: 'warn', text: isAr ? `${awaitingConfirm} بانتظار تأكيد التسليم` : `${awaitingConfirm} awaiting delivery confirmation` }
              : undefined
          }
          onClick={() => navigate('/admin/shipments?status=waiting_load,in_delivery')}
        />
        <StatCard
          tone={kpis.pending_approvals > 0 ? 'amber' : 'green'}
          title={isAr ? 'طلبات الاعتماد' : 'Pending approvals'}
          value={String(kpis.pending_approvals)}
          icon={ShieldAlert}
          alert={
            kpis.pending_approvals > 0
              ? { level: 'warn', text: isAr ? 'تحتاج مراجعتك' : 'Needs your review' }
              : { level: 'ok', text: isAr ? 'لا شيء معلّق' : 'All caught up' }
          }
          onClick={() => navigate('/admin/approvals')}
        />
        <StatCard
          tone="violet"
          title={isAr ? 'المستخدمون' : 'Users'}
          value={String(kpis.users)}
          icon={Users}
          subtitle={isAr ? 'مصانع وسائقون معتمدون' : 'Approved manufacturers & drivers'}
          alert={
            awaitingPayment > 0
              ? { level: 'info', text: isAr ? `${awaitingPayment} شحنات غير مدفوعة` : `${awaitingPayment} shipments unpaid` }
              : undefined
          }
          onClick={() => navigate('/admin/manufacturers')}
        />
      </div>

      {/* Map + live activity side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
        <div className="xl:col-span-2">
          <AdminLiveMap />
        </div>
        <ActivityFeed
          items={activity}
          isAr={isAr}
          paused={paused}
          onTogglePause={() => setPaused((p) => !p)}
          refreshedAt={refreshedAt}
          maxHeight={430}
        />
      </div>

      {/* Recent shipments + status split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 bg-card rounded-2xl border border-line">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-5 pt-5 pb-4">
            <div>
              <h2 className="text-[15px] font-bold text-navy-900">{isAr ? 'أحدث الشحنات' : 'Recent shipments'}</h2>
              <p className="text-xs text-ink-muted mt-0.5">{isAr ? 'آخر 5 شحنات في كل مرحلة' : 'The newest 5 in each stage'}</p>
            </div>
            <div role="tablist" className="flex items-center gap-1 bg-surface p-1 rounded-xl">
              {tabs.map((tb) => (
                <button
                  key={tb.id}
                  role="tab"
                  aria-selected={newestTab === tb.id}
                  onClick={() => setNewestTab(tb.id)}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition ${
                    newestTab === tb.id ? 'bg-card text-navy-900 shadow-[0_1px_2px_rgba(7,30,51,0.12)]' : 'text-ink-muted hover:text-navy-900'
                  }`}
                >
                  {tb.label}
                  <span className="ms-1.5 tabular-nums text-ink-muted">{overview?.newest?.[tb.id]?.length ?? 0}</span>
                </button>
              ))}
            </div>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-muted border-y border-line bg-surface/60">
                  <th className="text-start font-semibold px-5 py-2.5">{isAr ? 'الشحنة' : 'Shipment'}</th>
                  <th className="text-start font-semibold px-3 py-2.5">{isAr ? 'المصنع' : 'Manufacturer'}</th>
                  <th className="text-start font-semibold px-3 py-2.5">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="text-end font-semibold px-5 py-2.5">{isAr ? 'السعر' : 'Price'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {newestShipments.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(linkTo('admin', 'ticket', s.id))}
                    className="hover:bg-surface/70 cursor-pointer transition"
                  >
                    <td className="px-5 py-3">
                      <div className="font-bold text-navy-900">{s.ticket_number}</div>
                      <div className="text-[11px] text-ink-muted">{formatDateTime(s.created_at || s.audited_at)}</div>
                    </td>
                    <td className="px-3 py-3 text-ink">
                      {s.manufacturer_name}
                      {s.driver_name && <div className="text-[11px] text-ink-muted">{isAr ? 'السائق' : 'Driver'}: {s.driver_name}</div>}
                    </td>
                    <td className="px-3 py-3"><StatusChip status={s.status} /></td>
                    <td className="px-5 py-3 text-end font-bold text-navy-900 tabular-nums whitespace-nowrap">{formatMoney(s.price)}</td>
                  </tr>
                ))}
                {newestShipments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-sm text-ink-muted">
                      {loading ? (isAr ? 'جاري التحميل…' : 'Loading…') : isAr ? 'لا شحنات في هذه المرحلة.' : 'No shipments in this stage.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-line">
            <Link to="/admin/shipments" className="text-xs font-bold text-navy-900 hover:underline inline-flex items-center gap-1">
              {isAr ? 'كل الشحنات' : 'All shipments'} <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
            </Link>
          </div>
        </section>

        <ChartCard title={isAr ? 'الشحنات حسب الحالة' : 'Shipments by status'} subtitle={isAr ? 'اضغط على حالة لفتح القائمة' : 'Click a status to open the list'}>
          <Donut
            data={STATUS_ORDER.filter((s) => byStatus[s]).map((s) => ({ name: t(`status.${s}`), value: Number(byStatus[s].count), color: STATUS_COLORS[s] }))}
            centerValue={totalShipments}
            centerLabel={isAr ? 'شحنة' : 'shipments'}
            height={180}
          />
          <ul className="mt-4 space-y-1">
            {STATUS_ORDER.filter((s) => byStatus[s]).map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/shipments?status=${s}`)}
                  className="w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-surface text-xs"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[s] }} />
                    <span className="text-ink truncate">{t(`status.${s}`)}</span>
                  </span>
                  <span className="font-bold text-navy-900 tabular-nums">{byStatus[s].count}</span>
                </button>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard
          title={isAr ? 'أكثر المصانع شحناً' : 'Most active manufacturers'}
          subtitle={isAr ? 'حسب عدد الشحنات' : 'By number of shipments'}
          action={<Trophy className="h-5 w-5 text-[#E39413]" />}
        >
          <RankList
            items={topMfr}
            valueOf={(m) => m.count}
            max={Math.max(1, ...topMfr.map((m) => Number(m.count)))}
            onOpen={(m) => navigate(linkTo('admin', 'manufacturer', m.id))}
            render={(m) => (
              <span className="text-xs font-bold text-ink-muted tabular-nums shrink-0">
                {m.count} {isAr ? 'شحنة' : 'shipments'}
              </span>
            )}
          />
        </ChartCard>
        <ChartCard
          title={isAr ? 'أعلى السائقين تقييماً' : 'Top-rated drivers'}
          subtitle={isAr ? 'متوسط التقييم من المصانع' : 'Average rating from manufacturers'}
          action={<Star className="h-5 w-5 text-[#E39413] fill-amber-500" />}
        >
          <RankList
            items={topDrivers}
            valueOf={(d) => d.avg_stars}
            max={5}
            barColor="#F5A82A"
            onOpen={(d) => navigate(linkTo('admin', 'driver', d.id))}
            render={(d) => (
              <span className="text-xs font-bold text-navy-900 tabular-nums shrink-0 inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                {Number(d.avg_stars).toFixed(1)}
                {d.ratings_count && <span className="font-medium text-ink-muted">({d.ratings_count})</span>}
              </span>
            )}
          />
        </ChartCard>
      </div>
    </div>
  );
}
