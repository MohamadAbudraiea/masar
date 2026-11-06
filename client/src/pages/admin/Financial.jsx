import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  ShieldCheck,
  Box,
  Lock,
  Banknote,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Calendar,
  X,
} from 'lucide-react';
import { apiClient, getApiUrl } from '../../api/client.js';
import StatCard from '../../components/StatCard.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';
import { BarCompare, AreaTrend, ChartCard, SERIES } from '../../components/Charts.jsx';
import { formatMoney } from '../../lib/format.js';
import { formatDateTime } from '../../lib/time.js';
import { linkTo } from '../../lib/links.js';
import { MONEY_COLS } from '../../lib/moneyColors.js';

function isoDay(d) {
  return d.toISOString().slice(0, 10);
}
const PRESETS = [
  { id: 'all', en: 'All time', ar: 'كل الفترات', range: () => ['', ''] },
  { id: '7d', en: '7 days', ar: '7 أيام', range: () => [isoDay(new Date(Date.now() - 6 * 864e5)), ''] },
  { id: '30d', en: '30 days', ar: '30 يوماً', range: () => [isoDay(new Date(Date.now() - 29 * 864e5)), ''] },
  {
    id: 'month',
    en: 'This month',
    ar: 'هذا الشهر',
    range: () => {
      const n = new Date();
      return [isoDay(new Date(n.getFullYear(), n.getMonth(), 1, 12)), ''];
    },
  },
];

const TX_TABS = [
  { id: 'paid', status: 'pending,waiting_load,in_delivery,delivered,audited', en: 'All paid', ar: 'كل المدفوع' },
  { id: 'held', status: 'pending,waiting_load,in_delivery,delivered', en: 'Held in escrow', ar: 'محجوز' },
  { id: 'released', status: 'audited', en: 'Released', ar: 'تم الصرف' },
  { id: 'unpaid', status: 'requested', en: 'Unpaid', ar: 'غير مدفوع' },
];

function MoneyFlowBar({ parts, isAr }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div>
      <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-surface" dir="ltr">
        {parts.map((p) => (
          <div
            key={p.key}
            title={`${p.label}: ${formatMoney(p.value)}`}
            className="h-full first:rounded-s-full last:rounded-e-full transition-[width] duration-500"
            style={{ width: `${(p.value / total) * 100}%`, background: p.color }}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {parts.map((p) => (
          <div key={p.key} className="flex items-start gap-2">
            <span className="mt-1 h-2.5 w-2.5 rounded-full shrink-0" style={{ background: p.color }} />
            <div className="min-w-0">
              <div className="text-xs text-ink-muted">{p.label}</div>
              <div className="text-sm font-bold text-navy-900 tabular-nums">{formatMoney(p.value)}</div>
              <div className="text-[11px] text-ink-muted tabular-nums">
                {((p.value / total) * 100).toFixed(1)}% {isAr ? 'من المصروف' : 'of released'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminFinancial() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const navigate = useNavigate();

  const [group, setGroup] = useState('week');
  const [preset, setPreset] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // transactions
  const [txTab, setTxTab] = useState('paid');
  const [txQuery, setTxQuery] = useState('');
  const [txPage, setTxPage] = useState(1);
  const [tx, setTx] = useState({ items: [], total: 0 });
  const [txLoading, setTxLoading] = useState(true);
  const PAGE = 10;

  const fetchFinancial = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ group });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      setData(await apiClient(`/reports/admin/financial?${params.toString()}`));
    } catch (err) {
      setError(err.message || 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancial();
  }, [group, from, to]);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      setTxLoading(true);
      try {
        const params = new URLSearchParams({
          status: TX_TABS.find((x) => x.id === txTab).status,
          page: String(txPage),
          page_size: String(PAGE),
        });
        if (txQuery.trim()) params.set('q', txQuery.trim());
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const r = await apiClient(`/tickets?${params.toString()}`);
        if (alive) setTx({ items: r.items || [], total: r.total || 0 });
      } catch {
        if (alive) setTx({ items: [], total: 0 });
      } finally {
        if (alive) setTxLoading(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [txTab, txQuery, txPage, from, to]);

  const applyPreset = (p) => {
    setPreset(p.id);
    const [f, t] = p.range();
    setFrom(f);
    setTo(t);
    setTxPage(1);
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams({ group, format: 'csv' });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    window.open(getApiUrl(`/reports/admin/financial?${params.toString()}`), '_blank');
  };

  const exportTransactions = () => {
    const head = ['Shipment', 'Manufacturer', 'Driver', 'Status', 'Paid at', 'Released at', 'Total price', 'Escrow fee', 'Masar fee', 'Driver net'];
    const rows = tx.items.map((t) => [
      t.ticket_number,
      t.manufacturer?.name || '',
      t.driver?.name || '',
      t.status,
      t.status_history?.pending || '',
      t.status_history?.audited || '',
      t.price,
      t.escrow_fee,
      t.masar_fee,
      t.driver_net,
    ]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `masar-transactions-${txTab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const k = data?.kpis || { masar_income: 0, escrow_commissions: 0, volume: 0, held: 0, released: 0 };
  const series = data?.income_series || [];
  const n = (v) => Number(v) || 0;
  const releasedNet = Math.max(0, n(k.released) - n(k.masar_income) - n(k.escrow_commissions));
  const heldShare = n(k.volume) ? n(k.held) / n(k.volume) : 0;
  const take = n(k.volume) ? ((n(k.masar_income) / n(k.volume)) * 100).toFixed(1) : '0.0';

  const byMfr = useMemo(
    () => (data?.by_manufacturer || []).slice(0, 8).map((m) => ({ ...m, period: m.name, volume: n(m.volume), masar_revenue: n(m.masar_revenue) })),
    [data]
  );
  const byDriver = data?.by_driver || [];
  const maxDriverNet = Math.max(1, ...byDriver.map((d) => n(d.driver_net)));

  const pages = Math.max(1, Math.ceil(tx.total / PAGE));
  const L = (pair) => (isAr ? pair[1] : pair[0]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold text-navy-900 tracking-tight leading-tight">{isAr ? 'المالية' : 'Financial'}</h1>
          <p className="text-sm text-ink-muted mt-1">
            {isAr ? 'إيرادات مسار، عمولات الضمان، وكل حركة مالية على المنصة.' : 'Masar income, escrow commissions, and every money movement on the platform.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-card border border-line p-1 rounded-xl">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className={`h-8 px-3 rounded-lg text-xs font-bold transition ${
                  preset === p.id ? 'bg-navy-900 text-white' : 'text-ink-muted hover:text-navy-900'
                }`}
              >
                {isAr ? p.ar : p.en}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 h-10 px-3 bg-card border border-line rounded-xl text-xs">
            <Calendar className="h-4 w-4 text-ink-muted" />
            <input
              type="date"
              value={from}
              aria-label={isAr ? 'من' : 'From'}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset('custom');
              }}
              className="bg-transparent focus:outline-none text-ink"
            />
            <span className="text-ink-muted">–</span>
            <input
              type="date"
              value={to}
              aria-label={isAr ? 'إلى' : 'To'}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset('custom');
              }}
              className="bg-transparent focus:outline-none text-ink"
            />
            {(from || to) && (
              <button onClick={() => applyPreset(PRESETS[0])} aria-label={isAr ? 'مسح' : 'Clear'} className="text-ink-muted hover:text-ink">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-line bg-card hover:bg-surface text-xs font-bold text-navy-900"
          >
            <Download className="h-4 w-4" />
            {isAr ? 'تصدير التقرير' : 'Export report'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-[#FECACA] bg-[#FEE2E2] p-4 text-sm text-[#B91C1C] flex items-center justify-between">
          <span>{isAr ? 'تعذّر تحميل التقرير المالي. تحقّق من الاتصال وحاول مجدداً.' : "Couldn't load the financial report. Check your connection and try again."}</span>
          <button onClick={fetchFinancial} className="h-8 px-3 rounded-lg bg-navy-900 text-white text-xs font-bold">
            {isAr ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          featured
          title={isAr ? 'دخل مسار' : 'Masar income'}
          value={formatMoney(k.masar_income)}
          icon={TrendingUp}
          spark={series.map((s) => s.masar_income)}
          subtitle={isAr ? `${take}% من حجم التداول` : `${take}% of volume`}
        />
        <StatCard
          tone="teal"
          title={isAr ? 'عمولات الضمان' : 'Escrow commissions'}
          value={formatMoney(k.escrow_commissions)}
          icon={ShieldCheck}
          spark={series.map((s) => s.escrow_commissions)}
          subtitle={isAr ? 'حصة SafePay' : 'SafePay share'}
        />
        <StatCard
          tone="blue"
          title={isAr ? 'حجم التداول' : 'Total volume'}
          value={formatMoney(k.volume)}
          icon={Box}
          spark={series.map((s) => s.volume)}
          subtitle={isAr ? 'كل ما دفعته المصانع' : 'Everything manufacturers paid in'}
        />
        <StatCard
          tone="amber"
          title={isAr ? 'محجوز في الضمان' : 'Held in escrow'}
          value={formatMoney(k.held)}
          icon={Lock}
          share={{ value: heldShare, label: isAr ? `${Math.round(heldShare * 100)}% من الحجم لم يُصرف بعد` : `${Math.round(heldShare * 100)}% of volume not released yet` }}
          alert={heldShare > 0.5 ? { level: 'warn', text: isAr ? 'أكثر من نصف الحجم محجوز' : 'Over half of volume is held' } : undefined}
          onClick={() => {
            setTxTab('held');
            setTxPage(1);
            document.getElementById('transactions')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
        <StatCard
          tone="green"
          title={isAr ? 'تم صرفه' : 'Released'}
          value={formatMoney(k.released)}
          icon={Banknote}
          share={{ value: 1 - heldShare, label: isAr ? 'للسائقين ومسار والضمان' : 'To drivers, Masar and escrow' }}
          onClick={() => {
            setTxTab('released');
            setTxPage(1);
            document.getElementById('transactions')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      </div>

      {/* Where released money went */}
      <ChartCard
        title={isAr ? 'أين ذهبت الأموال المصروفة' : 'Where released money went'}
        subtitle={isAr ? 'تقسيم كل دينار تم صرفه بعد تأكيد التسليم' : 'How every released dinar was split after delivery was confirmed'}
      >
        <MoneyFlowBar
          isAr={isAr}
          parts={[
            { key: 'driver', label: L(MONEY_COLS.driver.label), value: releasedNet, color: MONEY_COLS.driver.dot },
            { key: 'masar', label: L(MONEY_COLS.masar.label), value: n(k.masar_income), color: MONEY_COLS.masar.dot },
            { key: 'escrow', label: L(MONEY_COLS.escrow.label), value: n(k.escrow_commissions), color: MONEY_COLS.escrow.dot },
          ]}
        />
      </ChartCard>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard
          title={isAr ? 'دخل المنصة' : 'Platform income'}
          subtitle={isAr ? 'عمولة مسار وعمولة الضمان لكل فترة' : 'Masar fee and escrow fee per period'}
          action={
            <div className="flex items-center gap-1 bg-surface p-1 rounded-lg">
              {[
                ['day', isAr ? 'يومي' : 'Day'],
                ['week', isAr ? 'أسبوعي' : 'Week'],
                ['month', isAr ? 'شهري' : 'Month'],
              ].map(([g, lbl]) => (
                <button
                  key={g}
                  onClick={() => setGroup(g)}
                  className={`h-7 px-2.5 rounded-md text-xs font-bold ${group === g ? 'bg-card text-navy-900 shadow-[0_1px_2px_rgba(7,30,51,0.12)]' : 'text-ink-muted'}`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          }
        >
          {loading ? (
            <div className="h-[260px] flex items-center justify-center"><TruckLoader /></div>
          ) : (
            <BarCompare
              data={series}
              stacked
              series={[
                { key: 'masar_income', name: isAr ? 'عمولة مسار' : 'Masar fee', color: SERIES.amber },
                { key: 'escrow_commissions', name: isAr ? 'عمولة الضمان' : 'Escrow fee', color: SERIES.teal },
              ]}
            />
          )}
        </ChartCard>
        <ChartCard title={isAr ? 'حجم الشحن' : 'Freight volume'} subtitle={isAr ? 'قيمة الشحنات المدفوعة لكل فترة' : 'Value of paid shipments per period'}>
          {loading ? (
            <div className="h-[260px] flex items-center justify-center"><TruckLoader /></div>
          ) : (
            <AreaTrend data={series} series={[{ key: 'volume', name: isAr ? 'الحجم' : 'Volume', color: SERIES.navy }]} />
          )}
        </ChartCard>
      </div>

      {/* Transactions */}
      <section id="transactions" className="bg-card rounded-2xl border border-line scroll-mt-24">
        <header className="px-5 pt-5 pb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-navy-900">{isAr ? 'المعاملات' : 'Transactions'}</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              {isAr ? 'كل شحنة مع تقسيم أموالها. اضغط على صف لفتح الشحنة.' : 'Every shipment with its money split. Click a row to open the shipment.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <input
                value={txQuery}
                onChange={(e) => {
                  setTxQuery(e.target.value);
                  setTxPage(1);
                }}
                placeholder={isAr ? 'رقم الشحنة…' : 'Shipment number…'}
                className="h-9 w-48 ps-9 pe-3 rounded-lg border border-line bg-surface text-sm focus:outline-none focus:border-navy-700/40 focus:bg-card"
              />
            </div>
            <button
              onClick={exportTransactions}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-line hover:bg-surface text-xs font-bold text-navy-900"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          </div>
        </header>

        <div className="px-5 flex items-center gap-1 border-b border-line overflow-x-auto">
          {TX_TABS.map((tb) => (
            <button
              key={tb.id}
              onClick={() => {
                setTxTab(tb.id);
                setTxPage(1);
              }}
              className={`relative shrink-0 h-10 px-3 text-sm font-bold transition ${
                txTab === tb.id ? 'text-navy-900' : 'text-ink-muted hover:text-navy-900'
              }`}
            >
              {isAr ? tb.ar : tb.en}
              {txTab === tb.id && <span className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-amber-500" />}
            </button>
          ))}
        </div>

        {/* colour legend for money columns */}
        <div className="px-5 py-2.5 flex flex-wrap items-center gap-4 text-[11px] font-semibold text-ink-muted bg-surface/50 border-b border-line">
          {Object.values(MONEY_COLS).map((c) => (
            <span key={c.dot} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: c.dot }} />
              {L(c.label)}
            </span>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-muted border-b border-line">
                <th className="text-start font-semibold px-5 py-2.5">{isAr ? 'الشحنة' : 'Shipment'}</th>
                <th className="text-start font-semibold px-3 py-2.5">{isAr ? 'من ← إلى' : 'From → to'}</th>
                <th className="text-start font-semibold px-3 py-2.5">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="text-end font-semibold px-3 py-2.5">{L(MONEY_COLS.price.label)}</th>
                <th className="text-end font-semibold px-3 py-2.5">{L(MONEY_COLS.escrow.label)}</th>
                <th className="text-end font-semibold px-3 py-2.5">{L(MONEY_COLS.masar.label)}</th>
                <th className="text-end font-semibold px-5 py-2.5">{L(MONEY_COLS.driver.label)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {txLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`s${i}`}>
                    <td colSpan={7} className="px-5 py-3.5">
                      <div className="h-4 rounded bg-surface animate-pulse" style={{ width: `${60 + ((i * 13) % 35)}%` }} />
                    </td>
                  </tr>
                ))}
              {!txLoading &&
                tx.items.map((t) => {
                  const released = t.status === 'audited';
                  const paidAt = t.status_history?.pending;
                  return (
                    <tr key={t.id} onClick={() => navigate(linkTo('admin', 'ticket', t.id))} className="hover:bg-surface/70 cursor-pointer">
                      <td className="px-5 py-3 align-top">
                        <div className="font-bold text-navy-900">{t.ticket_number}</div>
                        <div className="text-[11px] text-ink-muted">
                          {released
                            ? `${isAr ? 'صُرف' : 'Released'} ${formatDateTime(t.status_history?.audited)}`
                            : paidAt && t.status !== 'requested'
                            ? `${isAr ? 'دُفع' : 'Paid'} ${formatDateTime(paidAt)}`
                            : `${isAr ? 'أُنشئ' : 'Created'} ${formatDateTime(t.created_at)}`}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex items-center gap-1.5 text-ink">
                          <span className="font-semibold truncate max-w-[150px]">{t.manufacturer?.name}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-ink-muted shrink-0 rtl:-scale-x-100" />
                          <span className={`truncate max-w-[130px] ${t.driver ? 'font-semibold' : 'text-ink-muted italic'}`}>
                            {t.driver?.name || (isAr ? 'لم يُسند' : 'No driver yet')}
                          </span>
                        </div>
                        <div className="text-[11px] text-ink-muted">
                          {t.pickup?.city} → {t.dest?.city}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <StatusChip status={t.status} />
                      </td>
                      <td className={`px-3 py-3 align-top text-end tabular-nums font-extrabold whitespace-nowrap ${MONEY_COLS.price.text}`}>{formatMoney(t.price)}</td>
                      <td className={`px-3 py-3 align-top text-end tabular-nums font-semibold whitespace-nowrap ${MONEY_COLS.escrow.text}`}>{formatMoney(t.escrow_fee)}</td>
                      <td className={`px-3 py-3 align-top text-end tabular-nums font-semibold whitespace-nowrap ${MONEY_COLS.masar.text}`}>{formatMoney(t.masar_fee)}</td>
                      <td className={`px-5 py-3 align-top text-end tabular-nums font-bold whitespace-nowrap ${MONEY_COLS.driver.text}`}>
                        {formatMoney(t.driver_net)}
                        <div className="text-[11px] font-semibold text-ink-muted">
                          {released ? (isAr ? 'تم التحويل' : 'Transferred') : t.status === 'requested' ? (isAr ? 'لم يُدفع' : 'Not paid') : isAr ? 'محجوز' : 'Held'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              {!txLoading && tx.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <p className="text-sm font-bold text-navy-900">{isAr ? 'لا معاملات هنا' : 'No transactions here'}</p>
                    <p className="text-xs text-ink-muted mt-1">{isAr ? 'جرّب تبويباً أو فترة أخرى.' : 'Try another tab or date range.'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="px-5 py-3 border-t border-line flex items-center justify-between text-xs text-ink-muted">
          <span className="tabular-nums">
            {tx.total === 0
              ? isAr ? 'لا نتائج' : 'No results'
              : isAr
              ? `${(txPage - 1) * PAGE + 1}–${Math.min(txPage * PAGE, tx.total)} من ${tx.total}`
              : `${(txPage - 1) * PAGE + 1}–${Math.min(txPage * PAGE, tx.total)} of ${tx.total}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={txPage <= 1}
              onClick={() => setTxPage((p) => p - 1)}
              aria-label={isAr ? 'السابق' : 'Previous'}
              className="h-8 w-8 rounded-lg border border-line flex items-center justify-center disabled:opacity-40 hover:bg-surface"
            >
              <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
            </button>
            <span className="px-2 font-bold text-navy-900 tabular-nums">
              {txPage} / {pages}
            </span>
            <button
              disabled={txPage >= pages}
              onClick={() => setTxPage((p) => p + 1)}
              aria-label={isAr ? 'التالي' : 'Next'}
              className="h-8 w-8 rounded-lg border border-line flex items-center justify-center disabled:opacity-40 hover:bg-surface"
            >
              <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
            </button>
          </div>
        </footer>
      </section>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard title={isAr ? 'الحجم حسب المصنع' : 'Volume by manufacturer'} subtitle={isAr ? 'قيمة الشحنات المدفوعة لكل مصنع' : 'Value of paid shipments per manufacturer'}>
          <BarCompare
            data={byMfr}
            horizontal
            height={Math.max(220, byMfr.length * 40)}
            series={[
              { key: 'volume', name: isAr ? 'الحجم' : 'Volume', color: SERIES.navy },
            ]}
          />
        </ChartCard>

        <ChartCard title={isAr ? 'مستحقات السائقين' : 'Driver payouts'} subtitle={isAr ? 'صافي ما صُرف لكل سائق' : 'Net amount released to each driver'}>
          <ul className="divide-y divide-line">
            {byDriver.map((d) => (
              <li key={d.driver_id}>
                <button
                  type="button"
                  onClick={() => navigate(linkTo('admin', 'driver', d.driver_id))}
                  className="w-full text-start py-3 flex items-center gap-3 hover:bg-surface/60 rounded-lg px-2 -mx-2"
                >
                  <span className="h-9 w-9 rounded-full bg-[#DCFCE7] text-[#15803D] text-xs font-extrabold flex items-center justify-center shrink-0">
                    {d.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-bold text-navy-900 truncate">{d.name}</span>
                      <span className={`text-sm font-bold tabular-nums ${MONEY_COLS.driver.text}`}>{formatMoney(d.driver_net)}</span>
                    </span>
                    <span className="mt-1.5 block h-1.5 rounded-full bg-surface overflow-hidden">
                      <span className="block h-full rounded-full bg-[#16A34A]" style={{ width: `${(n(d.driver_net) / maxDriverNet) * 100}%` }} />
                    </span>
                    <span className="mt-1 flex items-center justify-between text-[11px] text-ink-muted">
                      <span>
                        {d.count} {isAr ? 'شحنة مكتملة' : 'completed'}
                      </span>
                      <span className="tabular-nums">
                        {isAr ? 'الحجم' : 'Volume'} {formatMoney(d.volume)}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {byDriver.length === 0 && <li className="py-8 text-center text-sm text-ink-muted">{isAr ? 'لا مستحقات بعد' : 'No payouts yet'}</li>}
          </ul>
        </ChartCard>
      </div>
    </div>
  );
}
