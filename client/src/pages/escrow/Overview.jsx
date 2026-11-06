import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Lock, Banknote, Clock, Calendar, RotateCcw, ArrowRight, Hourglass } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import StatCard from '../../components/StatCard.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';
import { BarCompare, AreaTrend, ChartCard, SERIES } from '../../components/Charts.jsx';
import { formatMoney } from '../../lib/format.js';
import { formatDateTime } from '../../lib/time.js';

function ageHours(iso) {
  if (!iso) return null;
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 36e5);
}
function ageLabel(h, isAr) {
  if (h < 1) return isAr ? 'أقل من ساعة' : '< 1 h';
  if (h < 48) return isAr ? `${Math.round(h)} ساعة` : `${Math.round(h)} h`;
  return isAr ? `${Math.round(h / 24)} يوم` : `${Math.round(h / 24)} days`;
}

export default function EscrowOverview() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [data, setData] = useState(null);
  const [held, setHeld] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(false);
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const [res, h] = await Promise.all([apiClient(`/reports/escrow/overview${qs}`), apiClient('/reports/escrow/held')]);
      setData(res);
      setHeld(h?.items || []);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [from, to]);

  const kpis = data?.kpis || { held: 0, released_in_period: 0, commission_earned: 0, awaiting_release_count: 0 };
  const flow = data?.held_vs_released_series || [];
  const comm = data?.commission_series || [];
  const awaiting = Number(kpis.awaiting_release_count) || 0;

  const oldest = useMemo(
    () => [...held].filter((h) => h.held_since).sort((a, b) => new Date(a.held_since) - new Date(b.held_since)).slice(0, 6),
    [held]
  );
  const stale = held.filter((h) => (ageHours(h.held_since) ?? 0) > 72).length;
  const total = Number(kpis.held) + Number(kpis.released_in_period);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold text-navy-900 tracking-tight leading-tight">{isAr ? 'نظرة عامة على الضمان' : 'Escrow overview'}</h1>
          <p className="text-sm text-ink-muted mt-1">
            {isAr ? 'الأموال المحجوزة لدى SafePay، وما تم الإفراج عنه للسائقين.' : 'Money SafePay is holding, and what has been released to drivers.'}
          </p>
        </div>
        <label className="flex items-center gap-1.5 h-10 px-3 bg-card border border-line rounded-xl text-xs self-start sm:self-auto">
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
      </div>

      {error && (
        <div className="rounded-2xl border border-[#FECACA] bg-[#FEE2E2] p-4 text-sm text-[#B91C1C] flex items-center justify-between">
          <span>{isAr ? 'تعذّر تحميل البيانات. تحقّق من الاتصال وحاول مجدداً.' : "Couldn't load escrow data. Check your connection and try again."}</span>
          <button onClick={fetchOverview} className="h-8 px-3 rounded-lg bg-navy-900 text-white text-xs font-bold">{isAr ? 'إعادة المحاولة' : 'Retry'}</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          featured
          title={isAr ? 'محجوز حالياً' : 'Funds held now'}
          value={formatMoney(kpis.held)}
          icon={Lock}
          subtitle={isAr ? `${held.length} شحنة لم تُسلَّم بعد` : `${held.length} shipments not delivered yet`}
          share={total ? { value: Number(kpis.held) / total, label: isAr ? 'من إجمالي الودائع' : 'of all deposits' } : undefined}
          onClick={() => navigate('/escrow/held')}
        />
        <StatCard
          tone="green"
          title={isAr ? 'تم الإفراج في الفترة' : 'Released in period'}
          value={formatMoney(kpis.released_in_period)}
          icon={Banknote}
          spark={flow.map((f) => f.released)}
          subtitle={isAr ? 'للسائقين ومسار' : 'To drivers and Masar'}
          onClick={() => navigate('/escrow/releases')}
        />
        <StatCard
          tone="teal"
          title={isAr ? 'عمولة SafePay' : 'SafePay commission'}
          value={formatMoney(kpis.commission_earned)}
          icon={ShieldCheck}
          spark={comm.map((c) => c.amount)}
          subtitle={isAr ? 'المكتسبة في الفترة' : 'Earned in this period'}
        />
        <StatCard
          tone={awaiting > 0 ? 'amber' : 'slate'}
          title={isAr ? 'بانتظار الإفراج' : 'Awaiting release'}
          value={String(awaiting)}
          icon={Clock}
          subtitle={isAr ? 'سُلّمت وتنتظر تأكيد المصنع' : 'Delivered, waiting for the manufacturer to confirm'}
          alert={
            awaiting > 0
              ? { level: 'warn', text: isAr ? 'ستُفرج تلقائياً بعد التأكيد' : 'Releases automatically on confirmation' }
              : { level: 'ok', text: isAr ? 'لا شيء معلّق' : 'Nothing waiting' }
          }
          onClick={() => navigate('/escrow/shipments?status=delivered')}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ChartCard
          className="xl:col-span-2"
          title={isAr ? 'المحجوز مقابل المُفرج عنه' : 'Held vs released'}
          subtitle={isAr ? 'الودائع الجديدة المحجوزة والمبالغ المُفرج عنها لكل يوم' : 'New deposits held and amounts released, per day'}
        >
          {loading ? (
            <div className="h-[260px] flex items-center justify-center"><TruckLoader /></div>
          ) : (
            <BarCompare
              data={flow}
              xKey="date"
              series={[
                { key: 'held', name: isAr ? 'محجوز' : 'Held', color: SERIES.amber },
                { key: 'released', name: isAr ? 'مُفرج عنه' : 'Released', color: SERIES.green },
              ]}
            />
          )}
        </ChartCard>

        <ChartCard title={isAr ? 'العمولة عبر الزمن' : 'Commission over time'} subtitle={isAr ? 'حصة SafePay من كل إفراج' : "SafePay's share of each release"}>
          {loading ? (
            <div className="h-[260px] flex items-center justify-center"><TruckLoader /></div>
          ) : (
            <AreaTrend data={comm} xKey="date" series={[{ key: 'amount', name: isAr ? 'العمولة' : 'Commission', color: SERIES.teal }]} />
          )}
        </ChartCard>
      </div>

      {/* Oldest held deposits */}
      <section className="bg-card rounded-2xl border border-line">
        <header className="px-5 pt-5 pb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-navy-900">{isAr ? 'أقدم الودائع المحجوزة' : 'Longest-held deposits'}</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              {stale > 0
                ? isAr ? `${stale} وديعة محجوزة لأكثر من 3 أيام` : `${stale} deposit${stale > 1 ? 's' : ''} held for more than 3 days`
                : isAr ? 'كل الودائع ضمن المدة المعتادة' : 'All deposits are within the usual time'}
            </p>
          </div>
          <Link to="/escrow/held" className="text-xs font-bold text-navy-900 hover:underline inline-flex items-center gap-1">
            {isAr ? 'كل المحجوز' : 'All held funds'} <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
          </Link>
        </header>
        <ul className="divide-y divide-line border-t border-line">
          {oldest.map((h) => {
            const age = ageHours(h.held_since);
            const tone = age > 72 ? 'bg-[#FEE2E2] text-[#B91C1C]' : age > 24 ? 'bg-amber-100 text-[#8A5A00]' : 'bg-surface text-ink-muted';
            return (
              <li key={h.ticket.id}>
                <button
                  onClick={() => navigate(`/escrow/shipments/${h.ticket.id}`)}
                  className="w-full text-start px-5 py-3 flex items-center gap-4 hover:bg-surface/70"
                >
                  <span className="h-9 w-9 rounded-xl bg-amber-100 text-[#8A5A00] flex items-center justify-center shrink-0">
                    <Hourglass className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-navy-900">{h.ticket.ticket_number}</span>
                    <span className="block text-xs text-ink-muted truncate">{h.manufacturer.name} · {isAr ? 'منذ' : 'since'} {formatDateTime(h.held_since)}</span>
                  </span>
                  <StatusChip status={h.status} className="hidden md:inline-flex" />
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${tone}`}>{ageLabel(age, isAr)}</span>
                  <span className="w-32 text-end text-sm font-extrabold text-navy-900 tabular-nums">{formatMoney(h.amount)}</span>
                </button>
              </li>
            );
          })}
          {!loading && oldest.length === 0 && (
            <li className="py-10 text-center text-sm text-ink-muted">{isAr ? 'لا أموال محجوزة حالياً.' : 'No funds are held right now.'}</li>
          )}
        </ul>
      </section>
    </div>
  );
}
