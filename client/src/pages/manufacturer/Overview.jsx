import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package,
  PlusCircle,
  Truck,
  Calendar,
  CreditCard,
  Lock,
  CheckCheck,
  Hourglass,
  PackageCheck,
  BadgeCheck,
  Star,
  RotateCcw,
  ArrowRight,
  PartyPopper,
} from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { useAuth } from '../../state/auth.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import StatCard from '../../components/StatCard.jsx';
import Timeline from '../../components/Timeline.jsx';
import { AreaTrend, Donut, ChartCard, SERIES } from '../../components/Charts.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';
import { linkTo } from '../../lib/links.js';

const STATUS_COLORS = {
  requested: '#94A3B8',
  pending: '#F5A82A',
  waiting_load: '#2563EB',
  in_delivery: '#0D9488',
  delivered: '#7C3AED',
  audited: '#16A34A',
};

function ActionTile({ count, icon: Icon, title, hint, cta, to, tone }) {
  const tones = {
    amber: 'bg-amber-100 text-[#8A5A00]',
    blue: 'bg-[#DBEAFE] text-[#1D4ED8]',
    violet: 'bg-[#EDE9FE] text-[#6D28D9]',
  };
  if (!count) return null;
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl border border-line bg-card p-4 hover:border-navy-700/40 hover:-translate-y-0.5 transition"
    >
      <span className={`h-12 w-12 shrink-0 rounded-xl flex items-center justify-center ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-navy-900">
          <span className="tabular-nums">{count}</span> {title}
        </span>
        <span className="block text-xs text-ink-muted">{hint}</span>
      </span>
      <span className="shrink-0 inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-navy-900 text-white text-xs font-bold group-hover:bg-navy-800">
        {cta} <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
      </span>
    </Link>
  );
}

export default function ManufacturerOverview() {
  const { user } = useAuth();
  const { i18n, t } = useTranslation();
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
      const qs = params.toString() ? `?${params.toString()}` : '';
      setData(await apiClient(`/reports/manufacturer/overview${qs}`));
    } catch (err) {
      setError(err.message || 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [from, to]);

  const kpis = data?.kpis || { total: 0, active: 0, total_paid: 0, held: 0, released: 0, awaiting_payment: 0 };
  const na = data?.needs_action || { unpaid: 0, to_mark_loaded: 0, to_confirm: 0 };
  const hasActions = na.unpaid > 0 || na.to_mark_loaded > 0 || na.to_confirm > 0;
  const paid = Number(kpis.total_paid) || 0;
  const firstName = (user?.name || '').split(' ')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink-muted">{isAr ? `أهلاً، ${user?.name}` : `Hello, ${user?.name}`}</p>
          <h1 className="text-[28px] font-extrabold text-navy-900 tracking-tight leading-tight">{isAr ? 'نظرة عامة' : 'Overview'}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 h-10 px-3 bg-card border border-line rounded-xl text-xs">
            <Calendar className="h-4 w-4 text-ink-muted" />
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={isAr ? 'من' : 'From'} className="bg-transparent focus:outline-none text-ink" />
            <span className="text-ink-muted">–</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label={isAr ? 'إلى' : 'To'} className="bg-transparent focus:outline-none text-ink" />
            {(from || to) && (
              <button onClick={() => { setFrom(''); setTo(''); }} aria-label={isAr ? 'مسح' : 'Clear'} className="text-ink-muted hover:text-navy-900">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
          <Link
            to="/manufacturer/shipments/new"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-navy-900 font-bold text-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            {isAr ? 'شحنة جديدة' : 'New shipment'}
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-[#FECACA] bg-[#FEE2E2] p-4 text-sm text-[#B91C1C] flex items-center justify-between">
          <span>{isAr ? 'تعذّر تحميل لوحة التحكم. تحقّق من الاتصال وحاول مجدداً.' : "Couldn't load your dashboard. Check your connection and try again."}</span>
          <button onClick={fetchOverview} className="h-8 px-3 rounded-lg bg-navy-900 text-white text-xs font-bold">{isAr ? 'إعادة المحاولة' : 'Retry'}</button>
        </div>
      )}

      {/* Needs your action */}
      {!loading && (hasActions ? (
        <section>
          <h2 className="text-sm font-bold text-navy-900 mb-2.5">{isAr ? 'بانتظارك' : 'Needs your action'}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <ActionTile
              count={na.unpaid}
              tone="amber"
              icon={CreditCard}
              title={isAr ? 'شحنات غير مدفوعة' : na.unpaid === 1 ? 'shipment to pay' : 'shipments to pay'}
              hint={isAr ? 'لن يراها السائقون قبل الدفع' : "Drivers can't see them until you pay"}
              cta={isAr ? 'ادفع الآن' : 'Pay now'}
              to="/manufacturer/shipments?status=requested"
            />
            <ActionTile
              count={na.to_mark_loaded}
              tone="blue"
              icon={PackageCheck}
              title={isAr ? 'بانتظار تأكيد التحميل' : 'waiting to be marked loaded'}
              hint={isAr ? 'السائق في موقع التحميل' : 'The driver is at your pickup'}
              cta={isAr ? 'تم التحميل' : 'Goods loaded'}
              to="/manufacturer/shipments?status=waiting_load"
            />
            <ActionTile
              count={na.to_confirm}
              tone="violet"
              icon={BadgeCheck}
              title={isAr ? 'تسليم بانتظار تأكيدك' : na.to_confirm === 1 ? 'delivery to confirm' : 'deliveries to confirm'}
              hint={isAr ? 'يُصرف للسائق بعد تأكيدك' : 'The driver is paid once you confirm'}
              cta={isAr ? 'تأكيد التسليم' : 'Confirm delivery'}
              to="/manufacturer/shipments?status=delivered"
            />
          </div>
        </section>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3">
          <PartyPopper className="h-5 w-5 text-[#15803D]" />
          <p className="text-sm text-[#15803D] font-semibold">
            {isAr ? 'لا شيء بانتظارك. كل شحناتك تسير كما يجب.' : `You're all caught up${firstName ? `, ${firstName}` : ''}. Every shipment is moving as it should.`}
          </p>
        </div>
      ))}

      {/* KPIs — price only, never commissions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          featured
          title={isAr ? 'إجمالي ما دفعته' : 'Total paid'}
          value={formatMoney(kpis.total_paid)}
          icon={CreditCard}
          spark={(data?.spending_series || []).map((s) => s.amount)}
          subtitle={isAr ? `على ${kpis.total} شحنة` : `Across ${kpis.total} shipments`}
          onClick={() => navigate('/manufacturer/payments')}
        />
        <StatCard
          tone="amber"
          title={isAr ? 'محفوظ في حساب الضمان' : 'Held in escrow'}
          value={formatMoney(kpis.held)}
          icon={Lock}
          share={paid ? { value: Number(kpis.held) / paid, label: isAr ? 'يُصرف للسائق بعد تأكيدك' : 'Released to the driver after you confirm' } : undefined}
          onClick={() => navigate('/manufacturer/payments')}
        />
        <StatCard
          tone="green"
          title={isAr ? 'تم صرفه للسائقين' : 'Released to drivers'}
          value={formatMoney(kpis.released)}
          icon={CheckCheck}
          share={paid ? { value: Number(kpis.released) / paid, label: isAr ? 'شحنات مؤكدة' : 'For confirmed deliveries' } : undefined}
          onClick={() => navigate('/manufacturer/shipments?status=audited')}
        />
        <StatCard
          tone="navy"
          title={isAr ? 'كل الشحنات' : 'All shipments'}
          value={String(kpis.total)}
          icon={Package}
          onClick={() => navigate('/manufacturer/shipments')}
        />
        <StatCard
          tone="teal"
          title={isAr ? 'شحنات نشطة' : 'Active now'}
          value={String(kpis.active)}
          icon={Truck}
          subtitle={isAr ? 'متاحة، قيد التحميل أو على الطريق' : 'Open, loading or on the road'}
          onClick={() => navigate('/manufacturer/shipments?status=pending,waiting_load,in_delivery')}
        />
        <StatCard
          tone={Number(kpis.awaiting_payment) > 0 ? 'red' : 'slate'}
          title={isAr ? 'بانتظار الدفع' : 'Awaiting payment'}
          value={formatMoney(kpis.awaiting_payment)}
          icon={Hourglass}
          alert={
            Number(kpis.awaiting_payment) > 0
              ? { level: 'danger', text: isAr ? 'ادفع لتظهر للسائقين' : 'Pay so drivers can see them' }
              : { level: 'ok', text: isAr ? 'لا مبالغ مستحقة' : 'Nothing to pay' }
          }
          onClick={() => navigate('/manufacturer/shipments?status=requested')}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ChartCard className="xl:col-span-2" title={isAr ? 'الإنفاق عبر الزمن' : 'Spending over time'} subtitle={isAr ? 'ما دفعته للشحنات في كل فترة' : 'What you paid for shipments in each period'}>
          <AreaTrend data={data?.spending_series || []} xKey="date" series={[{ key: 'amount', name: isAr ? 'المدفوع' : 'Paid', color: SERIES.navy }]} height={240} />
        </ChartCard>
        <ChartCard title={isAr ? 'حسب الحالة' : 'By status'}>
          <Donut
            data={(data?.by_status || []).map((s) => ({ name: t(`status.${s.status}`), value: Number(s.count), color: STATUS_COLORS[s.status] }))}
            centerValue={kpis.total}
            centerLabel={isAr ? 'شحنة' : 'shipments'}
            height={160}
          />
          <ul className="mt-3 space-y-1">
            {(data?.by_status || []).map((s) => (
              <li key={s.status}>
                <button onClick={() => navigate(`/manufacturer/shipments?status=${s.status}`)} className="w-full flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-surface text-xs">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[s.status] }} />
                    {t(`status.${s.status}`)}
                  </span>
                  <span className="font-bold text-navy-900 tabular-nums">{s.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent shipments */}
        <section className="xl:col-span-2 bg-card rounded-2xl border border-line">
          <header className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-navy-900">{isAr ? 'أحدث الشحنات' : 'Recent shipments'}</h2>
              <p className="text-xs text-ink-muted mt-0.5">{isAr ? 'تتبع كل شحنة من البوابة حتى المستلم' : 'Track each one from your gate to the receiver'}</p>
            </div>
            <Link to="/manufacturer/shipments" className="text-xs font-bold text-navy-900 hover:underline inline-flex items-center gap-1">
              {isAr ? 'الكل' : 'View all'} <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
            </Link>
          </header>
          {!loading && !(data?.recent || []).length ? (
            <div className="py-12 text-center border-t border-line">
              <Package className="w-8 h-8 text-ink-muted mx-auto mb-2" />
              <p className="text-sm font-bold text-navy-900">{isAr ? 'لا شحنات بعد' : 'No shipments yet'}</p>
              <Link to="/manufacturer/shipments/new" className="mt-3 inline-flex h-9 px-4 items-center rounded-lg bg-amber-500 text-navy-900 text-sm font-bold">
                {isAr ? 'أنشئ أول شحنة' : 'Create your first shipment'}
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {(data?.recent || []).map((tk) => (
                <li key={tk.id}>
                  <button onClick={() => navigate(linkTo('manufacturer', 'ticket', tk.id))} className="w-full text-start px-5 py-3.5 grid grid-cols-[1fr_auto] md:grid-cols-[1.3fr_1fr_auto] items-center gap-4 hover:bg-surface/70">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-navy-900">{tk.ticket_number}</span>
                        <StatusChip status={tk.status} />
                      </span>
                      <span className="block text-xs text-ink-muted mt-0.5 truncate">
                        {tk.pickup?.city} → {tk.dest?.city} · {formatDateTime(tk.pickup_at || tk.created_at)}
                      </span>
                    </span>
                    <span className="hidden md:block">
                      <Timeline variant="compact" status={tk.status} statusHistory={tk.status_history} />
                      <span className="block text-[11px] text-ink-muted mt-1 truncate">
                        {tk.driver ? `${isAr ? 'السائق' : 'Driver'}: ${tk.driver.name}` : isAr ? 'بانتظار سائق' : 'Waiting for a driver'}
                      </span>
                    </span>
                    <span className="text-end text-sm font-extrabold text-navy-900 tabular-nums whitespace-nowrap">{formatMoney(tk.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Top drivers + categories */}
        <div className="space-y-6">
          <ChartCard
            title={isAr ? 'سائقوك المفضلون' : 'Your top drivers'}
            action={<Link to="/manufacturer/drivers" className="text-xs font-bold text-navy-900 hover:underline">{isAr ? 'الكل' : 'View all'}</Link>}
          >
            <ul className="space-y-1">
              {(data?.top_drivers || []).map((d) => (
                <li key={d.driver_id}>
                  <button onClick={() => navigate(linkTo('manufacturer', 'driver', d.driver_id))} className="w-full flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface text-start">
                    <span className="h-9 w-9 rounded-full bg-navy-100 text-navy-700 text-xs font-extrabold flex items-center justify-center">
                      {d.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-navy-900 truncate">{d.name}</span>
                      <span className="block text-xs text-ink-muted">{d.count} {isAr ? 'رحلات معك' : 'trips with you'}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-navy-900">
                      <Star className="h-4 w-4 fill-amber-500 text-amber-500" /> {d.avg_rating}
                    </span>
                  </button>
                </li>
              ))}
              {!(data?.top_drivers || []).length && <li className="py-6 text-center text-xs text-ink-muted">{isAr ? 'سيظهر سائقوك هنا بعد أول شحنة.' : 'Your drivers appear here after your first delivery.'}</li>}
            </ul>
          </ChartCard>

          <ChartCard title={isAr ? 'حسب نوع البضاعة' : 'By goods category'}>
            {(() => {
              const cats = data?.by_category || [];
              const max = Math.max(1, ...cats.map((c) => Number(c.amount)));
              return (
                <ul className="space-y-3">
                  {cats.map((c) => (
                    <li key={c.category_name}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-navy-900">{c.category_name}</span>
                        <span className="text-ink-muted tabular-nums">
                          {c.count} {isAr ? 'شحنة' : 'trips'} · <b className="text-navy-900">{formatMoney(c.amount)}</b>
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-surface overflow-hidden">
                        <div className="h-full rounded-full bg-[#F5A82A]" style={{ width: `${(Number(c.amount) / max) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
