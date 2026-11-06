import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Globe,
  Factory,
  MapPin,
  ShieldCheck,
  Lock,
  Banknote,
  CreditCard,
  Star,
  Phone,
  Snowflake,
  PackageCheck,
  Truck,
  Menu,
  X,
  Route,
  Wallet,
  Eye,
} from 'lucide-react';
import { setLanguage } from '../../i18n/index.js';
import Logo, { LogoTruck } from '../../components/Logo.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import Timeline from '../../components/Timeline.jsx';
import { statsData, testimonials, truckCoverage } from './landingContent.js';

const STATIONS = [
  { en: 'Requested', ar: 'طُلبت', time: '08:12' },
  { en: 'Paid', ar: 'دُفعت', time: '08:15' },
  { en: 'Accepted', ar: 'قُبلت', time: '08:41' },
  { en: 'Loaded', ar: 'حُمّلت', time: '10:05' },
  { en: 'Delivered', ar: 'سُلّمت', time: '13:20' },
  { en: 'Confirmed', ar: 'أُكّدت', time: '13:34' },
];
// where each station sits along the hero route (0..1 of path length)
const STOP_AT = [0.02, 0.2, 0.38, 0.56, 0.78, 0.98];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return undefined;
    setReduced(mq.matches);
    const on = (e) => setReduced(e.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

/** The one memorable moment (06 §1.1): a truck drives the dotted route once; six stations light up in turn. */
function HeroRoute({ isAr }) {
  const pathRef = useRef(null);
  const reduced = usePrefersReducedMotion();
  const [progress, setProgress] = useState(0); // 0..1
  const [pts, setPts] = useState([]);

  useLayoutEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const L = p.getTotalLength();
    setPts(STOP_AT.map((f) => p.getPointAtLength(f * L)));
  }, []);

  useEffect(() => {
    if (reduced) {
      setProgress(1);
      return undefined;
    }
    let raf;
    let start;
    const DURATION = 5200;
    const tick = (ts) => {
      if (!start) start = ts + 500;
      const t = Math.min(1, Math.max(0, (ts - start) / DURATION));
      // ease-in-out
      setProgress(t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  let truck = { x: 0, y: 0, a: 0 };
  const p = pathRef.current;
  if (p) {
    const L = p.getTotalLength();
    const at = Math.min(0.985, Math.max(0.015, progress)) * L;
    const a = p.getPointAtLength(at);
    const b = p.getPointAtLength(Math.min(L, at + 1));
    truck = { x: a.x, y: a.y, a: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI };
  }
  const reachedIdx = STOP_AT.reduce((acc, f, i) => (progress >= f - 0.005 ? i : acc), 0);

  return (
    <div className="relative" dir="ltr">
      <svg viewBox="0 0 560 360" className="w-full h-auto" role="img" aria-label={isAr ? 'شاحنة تسير على مسار منقّط من المصنع إلى المستلم' : 'A truck driving a dotted route from the factory to the receiver'}>
        {/* faint grid of dots = the map */}
        <defs>
          <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="#143B5E" />
          </pattern>
        </defs>
        <rect width="560" height="360" fill="url(#dots)" opacity="0.8" />

        {/* route: upcoming (slate) underneath, travelled (amber) on top via mask-ish dash offset */}
        <path
          ref={pathRef}
          id="hero-route"
          d="M52 290 C 120 290, 130 200, 200 196 S 300 250, 350 190 S 420 70, 508 80"
          fill="none"
          stroke="#2A4E73"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="0.1 15"
        />
        <path
          d="M52 290 C 120 290, 130 200, 200 196 S 300 250, 350 190 S 420 70, 508 80"
          fill="none"
          stroke="#F5A82A"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="0.1 15"
          mask="url(#travelled)"
        />
        <mask id="travelled">
          <path
            d="M52 290 C 120 290, 130 200, 200 196 S 300 250, 350 190 S 420 70, 508 80"
            fill="none"
            stroke="#fff"
            strokeWidth="14"
            pathLength="1"
            strokeDasharray={`${progress} 1`}
          />
        </mask>

        {/* factory + destination pins */}
        <g transform="translate(30 300)">
          <rect x="0" y="0" width="44" height="44" rx="12" fill="#F5A82A" />
          <path d="M10 33V20l7 4v-4l7 4v-4l7 4v9z" fill="#071E33" />
        </g>
        <g transform="translate(486 30)">
          <circle cx="22" cy="22" r="22" fill="#FFFFFF" />
          <path d="M22 10c-5 0-9 4-9 9 0 7 9 15 9 15s9-8 9-15c0-5-4-9-9-9zm0 12a3 3 0 110-6 3 3 0 010 6z" fill="#071E33" />
        </g>

        {/* stations */}
        {pts.map((pt, i) => {
          const done = i < reachedIdx || (i === reachedIdx && progress >= STOP_AT[i]);
          const current = i === reachedIdx && progress < 1;
          if (i === 0 || i === pts.length - 1) return null;
          return (
            <g key={i}>
              {current && !reduced && (
                <circle cx={pt.x} cy={pt.y} r="15" fill="#F5A82A" opacity="0.25">
                  <animate attributeName="r" values="10;18;10" dur="1.6s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={pt.x} cy={pt.y} r="9" fill={done ? '#F5A82A' : '#0C2B47'} stroke={done ? '#F5A82A' : '#4A6A8A'} strokeWidth="2.5" />
              {done && <path d={`M${pt.x - 4} ${pt.y}l3 3 5-6`} stroke="#071E33" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
            </g>
          );
        })}

        {/* truck */}
        <g transform={`translate(${truck.x} ${truck.y}) rotate(${Math.max(-30, Math.min(30, truck.a))}) scale(1.5) translate(-13 -16)`}>
          <rect x="-4" y="-4" width="34" height="24" rx="8" fill="#071E33" opacity="0.6" />
          <LogoTruck x={0} y={0} scale={1.1} body="#FFFFFF" cab="#FFFFFF" wheel="#071E33" />
        </g>
      </svg>

      {/* station labels */}
      <ol className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2" dir={isAr ? 'rtl' : 'ltr'}>
        {STATIONS.map((s, i) => {
          const lit = progress >= STOP_AT[i] - 0.005;
          return (
            <li
              key={s.en}
              className={`rounded-xl px-2.5 py-2 border transition-colors duration-300 ${
                lit ? 'bg-navy-800 border-amber-500/60' : 'bg-transparent border-navy-700'
              }`}
            >
              <span className={`block text-xs font-bold ${lit ? 'text-white' : 'text-navy-100/50'}`}>{isAr ? s.ar : s.en}</span>
              <span className={`block text-[11px] tabular-nums ${lit ? 'text-amber-500' : 'text-navy-100/40'}`} dir="ltr">
                {lit ? s.time : '--:--'}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SectionTitle({ kicker, title, sub, light = false, center = false }) {
  return (
    <div className={center ? 'text-center max-w-2xl mx-auto' : 'max-w-2xl'}>
      {kicker && (
        <p className={`text-sm font-bold ${light ? 'text-amber-500' : 'text-[#8A5A00]'}`}>{kicker}</p>
      )}
      <h2 className={`mt-2 text-3xl sm:text-[40px] leading-[1.1] font-extrabold tracking-tight ${light ? 'text-white' : 'text-navy-900'}`}>{title}</h2>
      {sub && <p className={`mt-4 text-base sm:text-lg leading-relaxed ${light ? 'text-navy-100' : 'text-ink-muted'}`}>{sub}</p>}
    </div>
  );
}

export default function Landing() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [menu, setMenu] = useState(false);
  const T = (en, ar) => (isAr ? ar : en);

  const nav = [
    { href: '#how', label: T('How it works', 'كيف يعمل') },
    { href: '#manufacturers', label: T('Manufacturers', 'للمصانع') },
    { href: '#drivers', label: T('Drivers', 'للسائقين') },
    { href: '#escrow', label: T('Escrow', 'حساب الضمان') },
  ];

  const how = [
    { icon: Factory, en: 'You post the shipment', ar: 'تطلب الشحنة' },
    { icon: Lock, en: 'Your payment is held safely', ar: 'يُحفظ دفعك بأمان' },
    { icon: Truck, en: 'A matching driver accepts', ar: 'يقبل الشحنة سائق مناسب' },
    { icon: PackageCheck, en: 'The goods are loaded', ar: 'تُحمَّل البضاعة' },
    { icon: MapPin, en: 'The driver delivers', ar: 'يسلّم السائق الشحنة' },
    { icon: Banknote, en: 'You confirm, and the driver is paid', ar: 'تؤكد التسليم، ويُصرف مستحق السائق' },
  ];

  const now = Date.now();
  const sampleHistory = {
    requested: new Date(now - 6 * 36e5).toISOString(),
    pending: new Date(now - 5.9 * 36e5).toISOString(),
    waiting_load: new Date(now - 5.2 * 36e5).toISOString(),
    in_delivery: new Date(now - 3.8 * 36e5).toISOString(),
  };

  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-navy-900/95 backdrop-blur border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between gap-6">
          <Link to="/" aria-label="Masar">
            <Logo tone="light" size={22} lang={isAr ? 'ar' : 'en'} />
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="h-9 px-3 rounded-lg inline-flex items-center text-sm font-semibold text-navy-100 hover:text-white hover:bg-navy-800">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="hidden sm:flex items-center gap-2">
            <button onClick={() => setLanguage(isAr ? 'en' : 'ar')} className="h-9 px-3 rounded-lg inline-flex items-center gap-1.5 text-sm font-bold text-navy-100 hover:text-white hover:bg-navy-800">
              <Globe className="h-4 w-4" /> {isAr ? 'English' : 'العربية'}
            </button>
            <Link to="/login" className="h-9 px-4 rounded-lg inline-flex items-center text-sm font-bold text-white border border-navy-700 hover:bg-navy-800">
              {T('Log in', 'دخول')}
            </Link>
            <Link to="/signup" className="h-9 px-4 rounded-lg inline-flex items-center text-sm font-bold bg-amber-500 hover:bg-amber-600 text-navy-900">
              {T('Sign up', 'إنشاء حساب')}
            </Link>
          </div>
          <button className="sm:hidden h-10 w-10 rounded-lg text-white flex items-center justify-center" onClick={() => setMenu((m) => !m)} aria-label={T('Menu', 'القائمة')} aria-expanded={menu}>
            {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menu && (
          <div className="sm:hidden border-t border-navy-800 px-5 py-4 space-y-2">
            {nav.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setMenu(false)} className="block py-2 text-base font-semibold text-white">{n.label}</a>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link to="/login" className="h-11 rounded-xl border border-navy-700 text-white font-bold flex items-center justify-center">{T('Log in', 'دخول')}</Link>
              <Link to="/signup" className="h-11 rounded-xl bg-amber-500 text-navy-900 font-bold flex items-center justify-center">{T('Sign up', 'إنشاء حساب')}</Link>
            </div>
            <button onClick={() => setLanguage(isAr ? 'en' : 'ar')} className="w-full h-11 rounded-xl text-navy-100 font-bold">{isAr ? 'English' : 'العربية'}</button>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="bg-navy-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-14 pb-20 lg:pt-20 lg:pb-28 grid lg:grid-cols-[1fr_1.05fr] gap-12 items-center">
          <div>
            <h1 className="text-[40px] sm:text-[52px] leading-[1.05] font-extrabold tracking-[-0.02em]">
              {T('Every shipment, tracked from the factory gate to the receiver.', 'كل شحنة، من بوابة المصنع حتى المستلم، تحت المتابعة.')}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-navy-100 max-w-xl">
              {T(
                'Masar connects manufacturers with verified drivers and holds the payment in escrow until you confirm the delivery.',
                'مسار يربط المصانع بسائقين موثّقين، ويحتفظ بالمبلغ في حساب ضمان حتى تؤكد التسليم.'
              )}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/signup/manufacturer" className="h-14 px-7 rounded-2xl bg-amber-500 hover:bg-amber-600 text-navy-900 text-base font-extrabold inline-flex items-center gap-2 transition">
                {T('Ship with Masar', 'اشحن مع مسار')}
                <ArrowRight className="h-5 w-5 rtl:-scale-x-100" />
              </Link>
              <Link to="/signup/driver" className="h-14 px-7 rounded-2xl border-2 border-navy-700 hover:border-amber-500 text-white text-base font-bold inline-flex items-center gap-2 transition">
                <Truck className="h-5 w-5" />
                {T('Drive with Masar', 'اعمل سائقًا مع مسار')}
              </Link>
            </div>
          </div>
          <HeroRoute isAr={isAr} />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <SectionTitle
            center
            kicker={T('How it works', 'كيف يعمل')}
            title={T('Six stations. One shipment.', 'ست محطات. شحنة واحدة.')}
            sub={T('The same timeline you will follow on every shipment.', 'نفس الخط الزمني الذي ستتابعه في كل شحنة.')}
          />
          <ol className="mt-14 relative grid grid-cols-1 md:grid-cols-6 gap-8 md:gap-4">
            <span aria-hidden="true" className="hidden md:block absolute top-7 start-[8%] end-[8%] border-t-[4px] border-dotted border-amber-500" />
            {how.map((h) => (
              <li key={h.en} className="relative flex md:flex-col items-center md:text-center gap-4 md:gap-3">
                <span className="relative z-[1] h-14 w-14 shrink-0 rounded-full bg-navy-900 text-amber-500 ring-8 ring-surface flex items-center justify-center">
                  <h.icon className="h-6 w-6" />
                </span>
                <span className="text-[15px] font-bold text-navy-900 leading-snug max-w-[180px]">{isAr ? h.ar : h.en}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* For manufacturers */}
      <section id="manufacturers" className="scroll-mt-20 bg-card border-y border-line py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <SectionTitle
              kicker={T('For manufacturers', 'للمصانع')}
              title={T('Post a shipment in minutes. Pay only after you confirm.', 'اطلب شحنة خلال دقائق. ولا يُصرف المبلغ إلا بعد تأكيدك.')}
            />
            <ul className="mt-8 space-y-5">
              {[
                { icon: Route, en: 'Pick your saved factory and destination in two taps.', ar: 'اختر مصنعك ووجهتك المحفوظة بلمستين.' },
                { icon: Truck, en: 'Choose the truck from a guided list — we suggest the right one for your cargo.', ar: 'اختر الشاحنة من قائمة موجّهة، ونقترح عليك المناسبة لبضاعتك.' },
                { icon: Eye, en: 'Follow every step live on one timeline, with the driver a call away.', ar: 'تابع كل خطوة مباشرة على خط زمني واحد، والسائق على بعد اتصال.' },
              ].map((x) => (
                <li key={x.en} className="flex gap-4">
                  <span className="h-11 w-11 shrink-0 rounded-xl bg-amber-100 text-[#8A5A00] flex items-center justify-center">
                    <x.icon className="h-5 w-5" />
                  </span>
                  <span className="pt-2 text-base text-ink leading-relaxed">{isAr ? x.ar : x.en}</span>
                </li>
              ))}
            </ul>
            <Link to="/signup/manufacturer" className="mt-10 h-12 px-6 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold inline-flex items-center gap-2">
              {T('Create a company account', 'أنشئ حساب شركة')} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          </div>

          {/* real components with sample data */}
          <div className="rounded-3xl border border-line bg-surface p-3 sm:p-5" aria-hidden="true">
            <div className="rounded-2xl border border-line bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-extrabold text-navy-900">MSR-000124</span>
                    <StatusChip status="in_delivery" />
                  </div>
                  <p className="text-sm text-ink-muted mt-1">{T('Zarqa → Aqaba · Chilled dairy, 6 t', 'الزرقاء ← العقبة · ألبان مبرّدة، 6 طن')}</p>
                </div>
                <div className="text-end">
                  <p className="text-xs text-ink-muted">{T('Price', 'السعر')}</p>
                  <p className="text-xl font-extrabold text-navy-900 tabular-nums" dir="ltr">752.000 JD</p>
                </div>
              </div>
              <div className="mt-6 overflow-x-auto">
                <Timeline status="in_delivery" statusHistory={sampleHistory} variant="desktop" />
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-line p-3">
                <span className="h-10 w-10 rounded-full bg-navy-900 text-amber-500 text-sm font-extrabold flex items-center justify-center">OS</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-navy-900">{T('Mr. Omar Saleh', 'السيد عمر صالح')}</p>
                  <p className="text-xs text-ink-muted flex items-center gap-1.5">
                    <Snowflake className="h-3.5 w-3.5" /> {T('Refrigerated · 44-12345', 'مبرّدة · 44-12345')}
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500 ms-1" /> 5.0
                  </p>
                </div>
                <span className="h-9 px-3 rounded-lg border border-line text-sm font-bold text-navy-900 inline-flex items-center gap-1.5">
                  <Phone className="h-4 w-4" /> {T('Call', 'اتصال')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For drivers */}
      <section id="drivers" className="scroll-mt-20 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-14 items-center">
          {/* phone mock with an available-shipment card */}
          <div className="order-2 lg:order-1 flex justify-center" aria-hidden="true">
            <div className="w-[320px] rounded-[40px] bg-navy-900 p-3 shadow-[0_30px_60px_-20px_rgba(7,30,51,0.5)]">
              <div className="rounded-[30px] bg-surface overflow-hidden">
                <div className="bg-navy-900 px-5 pt-6 pb-5 text-white">
                  <p className="text-sm text-navy-100">{T('Good morning', 'صباح الخير')}</p>
                  <p className="text-2xl font-extrabold">{T('Mr. Omar', 'السيد عمر')}</p>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-base font-bold text-navy-900">{T('Shipments for your truck', 'شحنات تناسب شاحنتك')}</p>
                  <div className="rounded-2xl bg-card border border-line p-4">
                    <p className="text-xl font-extrabold text-navy-900">{T('Amman → Irbid', 'عمّان ← إربد')}</p>
                    <p className="text-sm text-ink-muted mt-1">{T('85 km · Tomorrow 08:00', '85 كم · غداً 08:00')}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-[#DBEAFE] text-[#1D4ED8] px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1"><Snowflake className="h-3 w-3" />{T('Chilled', 'مبرّد')}</span>
                      <span className="rounded-full bg-surface text-ink px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1"><PackageCheck className="h-3 w-3" />{T('You load', 'تحمّل بنفسك')}</span>
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                      <span className="text-sm text-ink-muted">{T('Your earnings', 'أرباحك')}</span>
                      <span className="text-2xl font-extrabold text-navy-900 tabular-nums" dir="ltr">264.000 JD</span>
                    </div>
                    <div className="mt-4 h-14 rounded-2xl bg-[#15803D] text-white text-lg font-bold flex items-center justify-center">
                      {T('Accept shipment', 'قبول الشحنة')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <SectionTitle
              kicker={T('For drivers', 'للسائقين')}
              title={T('Shipments that fit your truck. Your earnings before you accept.', 'شحنات تناسب شاحنتك. وأرباحك واضحة قبل القبول.')}
            />
            <ul className="mt-8 space-y-5">
              {[
                { icon: Truck, en: 'Only shipments your truck and license can carry.', ar: 'فقط الشحنات التي تناسب شاحنتك ورخصتك.' },
                { icon: Wallet, en: 'You see exactly what you will earn — before you say yes.', ar: 'ترى أرباحك بالضبط قبل أن توافق.' },
                { icon: ShieldCheck, en: 'Big buttons, plain words. Made for long days on the road.', ar: 'أزرار كبيرة وكلمات واضحة. مصمم لأيام الطريق الطويلة.' },
              ].map((x) => (
                <li key={x.en} className="flex gap-4">
                  <span className="h-11 w-11 shrink-0 rounded-xl bg-navy-100 text-navy-700 flex items-center justify-center">
                    <x.icon className="h-5 w-5" />
                  </span>
                  <span className="pt-2 text-base text-ink leading-relaxed">{isAr ? x.ar : x.en}</span>
                </li>
              ))}
            </ul>
            <Link to="/signup/driver" className="mt-10 h-12 px-6 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold inline-flex items-center gap-2">
              {T('Join as a driver', 'انضم كسائق')} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          </div>
        </div>
      </section>

      {/* Escrow */}
      <section id="escrow" className="scroll-mt-20 bg-navy-900 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <SectionTitle
            light
            kicker={T('Your money is protected', 'أموالك محمية')}
            title={T('Nobody touches the money until the goods arrive.', 'لا أحد يلمس المبلغ قبل وصول البضاعة.')}
          />
          <div className="mt-12 grid md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-4">
            {[
              { icon: CreditCard, en: ['Paid in', 'You pay the shipment price into escrow when you post it.'], ar: ['يُدفع', 'تدفع سعر الشحنة في حساب الضمان عند طلبها.'] },
              { icon: Lock, en: ['Held', 'The escrow company keeps it safe while the truck is on the road.'], ar: ['يُحفظ', 'تحتفظ شركة الضمان بالمبلغ والشاحنة على الطريق.'] },
              { icon: Banknote, en: ['Released', 'When you confirm delivery, the driver is paid automatically.'], ar: ['يُصرف', 'عند تأكيدك للتسليم، يُصرف للسائق تلقائياً.'] },
            ].map((x, i, arr) => (
              <React.Fragment key={x.en[0]}>
                <div className="rounded-2xl bg-navy-800 border border-navy-700 p-6">
                  <span className="h-12 w-12 rounded-xl bg-amber-500 text-navy-900 flex items-center justify-center">
                    <x.icon className="h-6 w-6" />
                  </span>
                  <p className="mt-5 text-xl font-extrabold text-white">{isAr ? x.ar[0] : x.en[0]}</p>
                  <p className="mt-2 text-navy-100 leading-relaxed">{isAr ? x.ar[1] : x.en[1]}</p>
                </div>
                {i < arr.length - 1 && (
                  <span aria-hidden="true" className="hidden md:flex items-center">
                    <span className="w-10 border-t-[4px] border-dotted border-amber-500" />
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Trucks we cover */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <SectionTitle kicker={T('Trucks we cover', 'الشاحنات التي نغطيها')} title={T('From a pickup to a tanker.', 'من البيك أب حتى الصهريج.')} />
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 border border-line rounded-3xl overflow-hidden bg-card divide-y sm:divide-y-0 sm:divide-x rtl:divide-x-reverse divide-line">
            {truckCoverage.map((tc) => (
              <div key={tc.id} className="p-6">
                <p className="text-sm font-bold text-[#8A5A00]">{isAr ? tc.weightAr : tc.weightEn}</p>
                <p className="mt-1 text-xl font-extrabold text-navy-900">{isAr ? tc.nameAr : tc.nameEn}</p>
                <p className="mt-3 text-sm text-ink-muted leading-relaxed">{isAr ? tc.bodiesAr : tc.bodiesEn}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="bg-card border-y border-line py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              [statsData.shipments, T('Shipments delivered', 'شحنة مُسلّمة')],
              [statsData.drivers, T('Verified drivers', 'سائق موثّق')],
              [statsData.manufacturers, T('Manufacturers', 'مصنع')],
              [`${statsData.rating}`, T('Average rating', 'متوسط التقييم'), true],
            ].map(([v, l, star]) => (
              <div key={l}>
                <dt className="text-sm text-ink-muted">{l}</dt>
                <dd className="mt-1 text-4xl font-extrabold text-navy-900 tabular-nums flex items-center gap-2" dir="ltr">
                  {v}
                  {star && <Star className="h-7 w-7 fill-amber-500 text-amber-500" />}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            {testimonials.map((tm) => (
              <figure key={tm.id} className="rounded-2xl bg-surface p-6 flex flex-col">
                <div className="flex gap-0.5" aria-label={`${tm.stars} / 5`}>
                  {Array.from({ length: tm.stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <blockquote className="mt-4 text-[15px] leading-relaxed text-ink flex-1">“{isAr ? tm.quoteAr : tm.quoteEn}”</blockquote>
                <figcaption className="mt-5 pt-4 border-t border-line">
                  <p className="text-sm font-bold text-navy-900">{isAr ? tm.nameAr : tm.nameEn}</p>
                  <p className="text-xs text-ink-muted">{isAr ? tm.roleAr : tm.roleEn}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-24">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-[32px] bg-navy-900 px-8 py-14 sm:px-14 text-center">
            <svg aria-hidden="true" className="absolute inset-x-0 bottom-0 w-full h-24" viewBox="0 0 800 100" preserveAspectRatio="none">
              <path d="M0 80 C 200 80, 260 30, 400 40 S 640 80, 800 30" fill="none" stroke="#F5A82A" strokeWidth="5" strokeLinecap="round" strokeDasharray="0.1 16" opacity="0.7" />
            </svg>
            <h2 className="relative text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{T('Your next shipment starts here.', 'شحنتك القادمة تبدأ هنا.')}</h2>
            <p className="relative mt-3 text-navy-100 text-lg">{T('Create an account in a few minutes. We review it the same day.', 'أنشئ حساباً خلال دقائق، ونراجعه في نفس اليوم.')}</p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/signup/manufacturer" className="h-14 px-7 rounded-2xl bg-amber-500 hover:bg-amber-600 text-navy-900 font-extrabold inline-flex items-center gap-2">
                {T('Ship with Masar', 'اشحن مع مسار')} <ArrowRight className="h-5 w-5 rtl:-scale-x-100" />
              </Link>
              <Link to="/signup/driver" className="h-14 px-7 rounded-2xl border-2 border-navy-700 hover:border-amber-500 text-white font-bold inline-flex items-center gap-2">
                {T('Drive with Masar', 'اعمل سائقًا مع مسار')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-card">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <Logo tone="dark" size={20} lang={isAr ? 'ar' : 'en'} />
            <span className="text-sm text-ink-muted">© {new Date().getFullYear()} Masar</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-navy-900">
            <a href="mailto:support@masar.jo" className="hover:underline" dir="ltr">support@masar.jo</a>
            <Link to="/login" className="hover:underline">{T('Log in', 'دخول')}</Link>
            <Link to="/signup" className="hover:underline">{T('Sign up', 'إنشاء حساب')}</Link>
            <button onClick={() => setLanguage(isAr ? 'en' : 'ar')} className="inline-flex items-center gap-1.5 hover:underline">
              <Globe className="h-4 w-4" /> {isAr ? 'English' : 'العربية'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
