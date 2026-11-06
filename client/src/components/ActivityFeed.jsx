import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PackagePlus,
  CreditCard,
  Truck,
  MapPin,
  PackageCheck,
  BadgeCheck,
  Banknote,
  Star,
  UserPlus,
  UserCheck,
  UserX,
  Pause,
  Play,
  Radio,
} from 'lucide-react';
import { linkTo } from '../lib/links.js';

/**
 * The server logs one activity row per notification fan-out (e.g. payment_received,
 * payment_received_mfr, payment_received_escrow for one payment). We fold those into
 * one human event per (kind, ticket, second).
 */
const KINDS = {
  ticket_created: 'created',
  payment_received: 'paid', payment_received_mfr: 'paid', payment_received_escrow: 'paid',
  driver_accepted: 'accepted', driver_accepted_mfr: 'accepted', driver_accepted_driver: 'accepted',
  driver_arrived: 'arrived', arrived_at_pickup: 'arrived',
  goods_loaded: 'loaded', loaded_mfr: 'loaded', loaded_driver: 'loaded',
  shipment_delivered: 'delivered', delivered_mfr: 'delivered', delivered_driver: 'delivered', delivered_escrow: 'delivered',
  confirmed_mfr: 'confirmed',
  payout_released: 'released', payout_driver: 'released', release_escrow: 'released', masar_income: 'released',
  rating_received: 'rated',
  signup_pending_admin: 'signup', signup_received: 'signup',
  account_approved: 'approved',
  account_rejected: 'rejected',
};

// confirmed + released happen in the same transaction; show both, confirmed first.
const META = {
  created:   { icon: PackagePlus,  tone: 'bg-[#E7ECF1] text-[#475569]', group: 'shipments' },
  paid:      { icon: CreditCard,   tone: 'bg-amber-100 text-[#8A5A00]', group: 'money' },
  accepted:  { icon: Truck,        tone: 'bg-[#DBEAFE] text-[#1D4ED8]', group: 'shipments' },
  arrived:   { icon: MapPin,       tone: 'bg-[#DBEAFE] text-[#1D4ED8]', group: 'shipments' },
  loaded:    { icon: PackageCheck, tone: 'bg-[#CCFBF1] text-[#0F766E]', group: 'shipments' },
  delivered: { icon: PackageCheck, tone: 'bg-[#EDE9FE] text-[#6D28D9]', group: 'shipments' },
  confirmed: { icon: BadgeCheck,   tone: 'bg-[#DCFCE7] text-[#15803D]', group: 'shipments' },
  released:  { icon: Banknote,     tone: 'bg-[#DCFCE7] text-[#15803D]', group: 'money' },
  rated:     { icon: Star,         tone: 'bg-amber-100 text-[#8A5A00]', group: 'shipments' },
  signup:    { icon: UserPlus,     tone: 'bg-navy-100 text-navy-700',    group: 'accounts' },
  approved:  { icon: UserCheck,    tone: 'bg-[#DCFCE7] text-[#15803D]', group: 'accounts' },
  rejected:  { icon: UserX,        tone: 'bg-[#FEE2E2] text-[#B91C1C]', group: 'accounts' },
};

function sentence(kind, e, isAr) {
  const who = e.actor_role === 'driver' ? (isAr ? `السيد ${e.actor_name}` : `Mr. ${e.actor_name}`) : e.actor_name;
  const d = e.details || {};
  const amount = d.amount ? String(d.amount).replace(/ JD$/, '') + ' JD' : null;
  const T = (en, ar) => (isAr ? ar : en);
  switch (kind) {
    case 'created':   return T(`${who || 'A manufacturer'} posted`, `${who || 'مصنع'} أنشأ الشحنة`);
    case 'paid':      return T(`Payment received${amount ? ` · ${amount}` : ''} for`, `تم استلام الدفعة${amount ? ` · ${amount}` : ''} للشحنة`);
    case 'accepted':  return T(`${who || 'A driver'} accepted`, `${who || 'سائق'} قبل الشحنة`);
    case 'arrived':   return T(`${who || 'Driver'} arrived at pickup for`, `${who || 'السائق'} وصل لنقطة التحميل`);
    case 'loaded':    return T('Goods loaded on', 'تم تحميل البضاعة');
    case 'delivered': return T(`${who || 'Driver'} delivered`, `${who || 'السائق'} سلّم الشحنة`);
    case 'confirmed': return T(`${who || 'Manufacturer'} confirmed delivery of`, `${who || 'المصنع'} أكد تسليم`);
    case 'released':  return T(`Escrow released${d.driver_net ? ` ${d.driver_net} JD to the driver` : ' the payout'} for`, `أفرج حساب الضمان عن${d.driver_net ? ` ${d.driver_net} JD للسائق` : ' المستحقات'} عن`);
    case 'rated':     return T(`${d.from || who || 'Someone'} left ${d.stars ? `${d.stars}★` : 'a rating'} on`, `${d.from || who || ''} قيّم ${d.stars ? `${d.stars}★` : ''}`);
    case 'signup':    return T(`${d.name || who || 'A new user'} signed up · awaiting approval`, `${d.name || who || 'مستخدم جديد'} سجّل · بانتظار الاعتماد`);
    case 'approved':  return T(`${d.name || who || 'Account'} was approved`, `تم اعتماد ${d.name || who || 'الحساب'}`);
    case 'rejected':  return T(`${d.name || who || 'Account'} was rejected`, `تم رفض ${d.name || who || 'الحساب'}`);
    default:          return e.action?.replace(/_/g, ' ');
  }
}

function relTime(iso, now, isAr) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return isAr ? 'الآن' : 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return isAr ? `قبل ${m} د` : `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return isAr ? `قبل ${h} س` : `${h} h ago`;
  const d = Math.round(h / 24);
  return isAr ? `قبل ${d} يوم` : `${d} d ago`;
}

function dayBucket(iso, now, isAr) {
  const d = new Date(iso);
  const today = new Date(now);
  const y = new Date(now - 86400000);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return isAr ? 'اليوم' : 'Today';
  if (same(d, y)) return isAr ? 'أمس' : 'Yesterday';
  return d.toLocaleDateString(isAr ? 'ar-JO-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short' });
}

export function foldActivity(items = []) {
  const out = [];
  const seen = new Map();
  for (const e of items) {
    const kind = KINDS[e.action];
    if (!kind) continue;
    const key = `${kind}|${e.ticket_id || e.actor_id || e.id}|${String(e.created_at).slice(0, 19)}`;
    const prev = seen.get(key);
    if (prev) {
      // keep the row that has an actor + richer details
      if (!prev.actor_name && e.actor_name) Object.assign(prev, { actor_name: e.actor_name, actor_role: e.actor_role, actor_id: e.actor_id });
      prev.details = { ...e.details, ...prev.details };
      continue;
    }
    const row = { ...e, kind };
    seen.set(key, row);
    out.push(row);
  }
  return out;
}

/**
 * Props: items (raw /reports/admin/activity rows), onPauseChange(paused), refreshedAt (ms)
 */
export default function ActivityFeed({ items = [], isAr = false, paused = false, onTogglePause, refreshedAt, maxHeight = 520 }) {
  const [filter, setFilter] = useState('all');
  const [now, setNow] = useState(Date.now());
  const knownIds = useRef(null);
  const [freshIds, setFreshIds] = useState(new Set());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => setNow(Date.now()), [refreshedAt]);

  const events = useMemo(() => foldActivity(items), [items]);

  // Flash rows that arrived since the last poll (skip on first load)
  useEffect(() => {
    const ids = new Set(events.map((e) => e.id));
    if (knownIds.current && knownIds.current.size > 0) {
      const fresh = new Set([...ids].filter((id) => !knownIds.current.has(id)));
      if (fresh.size) {
        setFreshIds(fresh);
        const t = setTimeout(() => setFreshIds(new Set()), 2600);
        knownIds.current = ids;
        return () => clearTimeout(t);
      }
    }
    knownIds.current = ids;
  }, [events]);

  const filters = [
    { id: 'all', label: isAr ? 'الكل' : 'All' },
    { id: 'shipments', label: isAr ? 'الشحنات' : 'Shipments' },
    { id: 'money', label: isAr ? 'الأموال' : 'Money' },
    { id: 'accounts', label: isAr ? 'الحسابات' : 'Accounts' },
  ];
  const shown = events.filter((e) => filter === 'all' || META[e.kind]?.group === filter);

  let lastBucket = null;

  return (
    <section className="bg-card rounded-2xl border border-line flex flex-col h-full overflow-hidden">
      <header className="px-5 pt-5 pb-3 border-b border-line">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              {!paused && <span className="absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-60 motion-safe:animate-ping" />}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${paused ? 'bg-slate-400' : 'bg-[#16A34A]'}`} />
            </span>
            <h2 className="text-[15px] font-bold text-navy-900">{isAr ? 'النشاط المباشر' : 'Live activity'}</h2>
          </div>
          <button
            type="button"
            onClick={onTogglePause}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-line text-xs font-bold text-navy-900 hover:bg-surface"
            aria-pressed={paused}
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {paused ? (isAr ? 'استئناف' : 'Resume') : isAr ? 'إيقاف مؤقت' : 'Pause'}
          </button>
        </div>
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`shrink-0 h-7 px-3 rounded-full text-xs font-bold transition ${
                filter === f.id ? 'bg-navy-900 text-white' : 'bg-surface text-ink-muted hover:text-navy-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <ol className="flex-1 overflow-y-auto px-5 py-3" style={{ maxHeight }}>
        {shown.length === 0 && (
          <li className="py-12 text-center">
            <div className="mx-auto mb-3 h-11 w-11 rounded-full bg-surface flex items-center justify-center">
              <Radio className="h-5 w-5 text-ink-muted" />
            </div>
            <p className="text-sm font-bold text-navy-900">{isAr ? 'لا يوجد نشاط بعد' : 'Nothing has happened yet'}</p>
            <p className="text-xs text-ink-muted mt-1">
              {isAr ? 'ستظهر الدفعات والقبول والتسليم هنا لحظة حدوثها.' : 'Payments, acceptances and deliveries appear here as they happen.'}
            </p>
          </li>
        )}

        {shown.map((e, i) => {
          const m = META[e.kind];
          const Icon = m.icon;
          const bucket = dayBucket(e.created_at, now, isAr);
          const showBucket = bucket !== lastBucket;
          lastBucket = bucket;
          const isLast = i === shown.length - 1;
          return (
            <React.Fragment key={e.id}>
              {showBucket && (
                <li className="pt-2 pb-2 text-[11px] font-bold text-ink-muted">{bucket}</li>
              )}
              <li
                className={`relative flex gap-3 pb-4 rounded-xl transition-colors duration-700 ${
                  freshIds.has(e.id) ? 'bg-amber-100/70 -mx-2 px-2 pt-2' : ''
                }`}
              >
                {/* dotted connector — the route motif */}
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className="absolute top-9 bottom-0 start-[15px] w-0 border-s-2 border-dotted border-line"
                  />
                )}
                <span className={`relative z-[1] h-8 w-8 shrink-0 rounded-full flex items-center justify-center ring-4 ring-card ${m.tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[13px] leading-snug text-ink">
                    {sentence(e.kind, e, isAr)}{' '}
                    {e.ticket_number && (
                      <Link
                        to={linkTo('admin', 'ticket', e.ticket_id)}
                        className="font-bold text-navy-900 underline decoration-amber-500 decoration-2 underline-offset-2 hover:decoration-navy-900"
                      >
                        {e.ticket_number}
                      </Link>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-muted" title={new Date(e.created_at).toLocaleString()}>
                    {relTime(e.created_at, now, isAr)}
                  </p>
                </div>
              </li>
            </React.Fragment>
          );
        })}
      </ol>

      <footer className="px-5 py-2.5 border-t border-line text-[11px] text-ink-muted flex items-center justify-between">
        <span>{paused ? (isAr ? 'التحديث متوقف' : 'Updates paused') : isAr ? 'يتحدّث كل 10 ثوانٍ' : 'Updates every 10 seconds'}</span>
        <span className="tabular-nums">{shown.length} {isAr ? 'حدث' : 'events'}</span>
      </footer>
    </section>
  );
}
