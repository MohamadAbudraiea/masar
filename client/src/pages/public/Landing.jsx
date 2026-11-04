import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Truck,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Building2,
  Navigation,
  Lock,
  Globe,
  Clock,
  Star,
  Package,
  Layers,
  MapPin,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { setLanguage } from '../../i18n/index.js';
import PhoneFrame from '../../components/PhoneFrame.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import { statsData, testimonials, truckCoverage } from './landingContent.js';

export default function Landing() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const navigate = useNavigate();

  // Hero Station Route Animation (6 Stations)
  const stations = [
    { key: 'requested', en: '1. Requested', ar: '1. طلب الشحنة', time: '09:00 AM' },
    { key: 'pending', en: '2. SafePay Deposited', ar: '2. إيداع الضمان', time: '09:12 AM' },
    { key: 'accepted', en: '3. Driver Accepted', ar: '3. قبول السائق', time: '09:25 AM' },
    { key: 'waiting_load', en: '4. Goods Loaded', ar: '4. تحميل البضاعة', time: '10:45 AM' },
    { key: 'in_delivery', en: '5. Delivered', ar: '5. تسليم المستلم', time: '01:30 PM' },
    { key: 'audited', en: '6. Payout Released', ar: '6. صرف المستحقات', time: '01:50 PM' },
  ];

  const [activeStationIdx, setActiveStationIdx] = useState(0);

  useEffect(() => {
    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setActiveStationIdx(5); // Show completed state
      return;
    }

    const timer = setInterval(() => {
      setActiveStationIdx((prev) => (prev < 5 ? prev + 1 : 0));
    }, 2400);

    return () => clearInterval(timer);
  }, []);

  const toggleLang = () => {
    setLanguage(isAr ? 'en' : 'ar');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans selection:bg-amber-500 selection:text-navy-900">
      {/* 1. Header */}
      <header className="sticky top-0 z-50 bg-navy-900/95 backdrop-blur-md border-b border-navy-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-navy-900 flex items-center justify-center font-black shadow-sm group-hover:scale-105 transition-transform">
              <Truck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight block leading-none">
                {isAr ? 'مـسـار' : 'MASAR'}
              </span>
              <span className="text-[10px] text-amber-400 font-bold tracking-widest uppercase">
                {isAr ? 'شحن موثوق بضمان مالي' : 'SafePay Freight Escrow'}
              </span>
            </div>
          </Link>

          {/* Nav Actions */}
          <div className="flex items-center gap-3">
            {/* Language Switch */}
            <button
              onClick={toggleLang}
              className="px-3 py-1.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 border border-navy-700"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{isAr ? 'English' : 'عربي'}</span>
            </button>

            {/* Login */}
            <Link
              to="/login"
              className="text-xs font-bold text-slate-200 hover:text-white px-3 py-1.5 rounded-xl hover:bg-navy-800 transition"
            >
              {isAr ? 'تسجيل الدخول' : 'Log In'}
            </Link>

            {/* Sign Up */}
            <Link
              to="/signup"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-navy-900 text-xs font-black transition shadow-sm"
            >
              {isAr ? 'إنشاء حساب جديد' : 'Sign Up'}
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section (Navy Band with Animated Route) */}
      <section className="bg-navy-900 text-white pt-16 pb-24 border-b border-navy-800 relative overflow-hidden">
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Headline & CTAs */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-start">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAr ? 'المنصة اللوجستية الأولى في الأردن بحساب ضمان SafePay' : 'Jordan’s #1 Escrow Freight Platform'}</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15]">
                {isAr
                  ? 'كل شحنة، من بوابة المصنع حتى المستلم، تحت المتابعة.'
                  : 'Every shipment, tracked from the factory gate to the receiver.'}
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                {isAr
                  ? 'مسار يربط المصانع بسائقين موثّقين، ويحتفظ بالمبلغ في حساب ضمان SafePay حتى تؤكد فحص واستلام البضاعة.'
                  : 'Masar connects manufacturers with verified freight drivers and holds the payment in escrow until you inspect and confirm the delivery.'}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link
                  to="/signup/manufacturer"
                  className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-navy-900 font-black text-sm transition shadow-lg flex items-center justify-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  <span>{isAr ? 'اشحن مع مسار' : 'Ship with Masar'}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </Link>

                <Link
                  to="/signup/driver"
                  className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-navy-800 hover:bg-navy-700 text-white font-bold text-sm border border-slate-700 transition flex items-center justify-center gap-2"
                >
                  <Truck className="w-4 h-4 text-emerald-400" />
                  <span>{isAr ? 'اعمل سائقاً مع مسار' : 'Drive with Masar'}</span>
                </Link>
              </div>
            </div>

            {/* Right: Signature Animated Dotted Route */}
            <div className="lg:col-span-5 bg-navy-950/80 rounded-3xl border border-navy-800 p-6 shadow-2xl relative">
              <div className="flex items-center justify-between mb-4 border-b border-navy-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-300 font-mono">MSR-000018</span>
                </div>
                <span className="text-[11px] font-mono text-amber-400 font-bold">
                  {isAr ? 'محاكاة رحلة الشحنة المباشرة' : 'Live Shipment Lifecycle'}
                </span>
              </div>

              {/* Interactive Station Progression */}
              <div className="space-y-4">
                {stations.map((st, i) => {
                  const isDone = i <= activeStationIdx;
                  const isCurrent = i === activeStationIdx;

                  return (
                    <div
                      key={st.key}
                      className={`flex items-center justify-between p-3 rounded-2xl transition-all duration-300 ${
                        isCurrent
                          ? 'bg-amber-500/15 border border-amber-500/50 shadow-md translate-x-1'
                          : isDone
                          ? 'bg-navy-900/60 border border-navy-800 text-slate-300'
                          : 'opacity-40 border border-transparent text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                            isCurrent
                              ? 'bg-amber-500 text-navy-900 scale-110 shadow-sm'
                              : isDone
                              ? 'bg-emerald-600 text-white'
                              : 'bg-navy-800 text-slate-400'
                          }`}
                        >
                          {isDone && !isCurrent ? '✓' : i + 1}
                        </div>
                        <div>
                          <span
                            className={`text-xs font-bold block ${
                              isCurrent ? 'text-amber-400' : isDone ? 'text-white' : 'text-slate-400'
                            }`}
                          >
                            {isAr ? st.ar : st.en}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCurrent && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 px-2 py-0.5 rounded bg-amber-500/20">
                            {isAr ? 'الآن' : 'Active'}
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-slate-400">{st.time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Floating Moving Truck Badge */}
              <div className="mt-4 pt-4 border-t border-navy-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Truck className="w-4 h-4 animate-bounce" />
                  <span>
                    {isAr
                      ? 'الشاحنة المعتمدة: 44-12345 (براد ثقيل)'
                      : 'Truck: 44-12345 (Heavy Refrigerated)'}
                  </span>
                </div>
                <span className="font-mono text-amber-400 font-bold">Amman → Aqaba</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Section 1: How It Works */}
      <section className="py-20 bg-card border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block">
              {isAr ? 'دورة العمل المبسطة' : 'Simple, Transparent Process'}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-navy-900 tracking-tight">
              {isAr ? 'كيف يعمل مسار في 6 خطوات محكمة؟' : 'How Masar Works in 6 Clear Steps'}
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              {isAr
                ? 'تطلب الشحنة · يُحفظ دفعك بأمان · يقبل الشحنة سائق مناسب · تُحمَّل البضاعة · يسلّم السائق الشحنة · تؤكد التسليم، ويُصرف مستحق السائق.'
                : 'You post the shipment · Your payment is held safely · A matching driver accepts · The goods are loaded · The driver delivers · You confirm, and the driver is paid.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                titleEn: '1. Post Cargo & Route',
                titleAr: '1. إنشاء الشحنة وتحديد المسار',
                descEn: 'Enter cargo specifications and route. Automatic engine suggests the ideal truck.',
                descAr: 'أدخل مواصفات البضاعة ونقاط التحميل والتسليم. يقترح النظام الشاحنة المناسبة آلياً.',
              },
              {
                num: '02',
                titleEn: '2. SafePay Deposit Held',
                titleAr: '2. إيداع الضمان المالي',
                descEn: 'Deposit payment securely in escrow. Money is locked safely and not released yet.',
                descAr: 'يودع المصنع المبلغ في حساب الضمان الآمن، ويبقى محجوزاً ولا يُصرف لأي طرف.',
              },
              {
                num: '03',
                titleEn: '3. Matching Driver Accepts',
                titleAr: '3. قبول سائق مؤهل',
                descEn: 'Only verified drivers with matching truck licenses and body types can accept.',
                descAr: 'تظهر الشحنة للسائقين المطابقين فقط بفئات رخصهم وتجهيزات شاحناتهم.',
              },
              {
                num: '04',
                titleEn: '4. Loading at Factory',
                titleAr: '4. التحميل في المصنع',
                descEn: 'Driver arrives at scheduled time. Factory confirms cargo loaded and dispatches.',
                descAr: 'يصل السائق في الموعد المحدد، ويوثق المصنع اكتمال التحميل وانطلاق الرحلة.',
              },
              {
                num: '05',
                titleEn: '5. Safe Delivery & Handover',
                titleAr: '5. الوصول والتسليم',
                descEn: 'Driver delivers cargo to the receiver. Driver is immediately free for their next trip.',
                descAr: 'يسلّم السائق البضاعة للمستلم، ويتحرر السائق فوراً ليتمكن من قبول شحنة جديدة.',
              },
              {
                num: '06',
                titleEn: '6. Receipt Confirmation & Release',
                titleAr: '6. تأكيد الاستلام وصرف الأرباح',
                descEn: 'Manufacturer inspects and confirms receipt. Escrow instantly releases driver earnings.',
                descAr: 'يؤكد المصنع سلامة الاستلام، فيقوم حساب الضمان فوراً بتحويل الأرباح لحساب السائق.',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="bg-surface/50 border border-line rounded-3xl p-6 hover:border-navy-900 transition hover:shadow-xs space-y-3"
              >
                <span className="text-2xl font-black font-mono text-amber-500 block">
                  {step.num}
                </span>
                <h3 className="text-base font-bold text-navy-900">
                  {isAr ? step.titleAr : step.titleEn}
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  {isAr ? step.descAr : step.descEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Section 2: For Manufacturers (Live Component Mock) */}
      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Narrative */}
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block">
                {isAr ? 'للشركات والمصانع' : 'For Manufacturers & Shippers'}
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-navy-900 tracking-tight">
                {isAr
                  ? 'انشر شحنتك بدقائق، وادفع فقط بعد معاينة التسليم.'
                  : 'Post a shipment in minutes. Pay only after you confirm.'}
              </h2>
              <div className="space-y-3 text-xs sm:text-sm text-ink-muted leading-relaxed">
                <p>
                  {isAr
                    ? 'اختر الشاحنة المناسبة من قائمة موجهة ذكية تقترح الأبعاد والنوع حسب وزن البضاعة.'
                    : 'Choose the truck from a guided list calibrated to your cargo weight and cooling requirements.'}
                </p>
                <p>
                  {isAr
                    ? 'تابع كل خطوة مباشرة على الخط الزمني، وتواصل مع السائق مباشرة دون وسطاء.'
                    : 'Follow every milestone live on an audited timeline, with direct driver phone access.'}
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/signup/manufacturer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-navy-900 text-white font-bold text-xs hover:bg-navy-800 transition shadow-sm"
                >
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>{isAr ? 'سجّل مصنعك الآن' : 'Register Your Company'}</span>
                </Link>
              </div>
            </div>

            {/* Right: Mock Shipment Detail Component */}
            <div className="lg:col-span-7 bg-card border border-line rounded-3xl p-6 shadow-md space-y-5">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-navy-900">MSR-000018</span>
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                      ✓ {isAr ? 'على الطريق (In Delivery)' : 'In Delivery'}
                    </span>
                  </div>
                  <span className="text-xs text-ink-muted">
                    {isAr ? 'شركة النور للأغذية · ألبان مبردة' : 'Al-Nour Foods Co. · Chilled Dairy'}
                  </span>
                </div>
                <div className="text-end">
                  <span className="text-xs text-ink-muted block">{isAr ? 'القيمة الإجمالية' : 'Total Price'}</span>
                  <span className="text-lg font-black text-navy-900 font-mono">750.000 JD</span>
                </div>
              </div>

              {/* Route */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-surface p-4 rounded-2xl border border-line">
                <div>
                  <span className="text-[10px] text-ink-muted font-bold block">{isAr ? 'موقع التحميل' : 'Pickup'}</span>
                  <span className="font-bold text-navy-900">Sahab Industrial City</span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-muted font-bold block">{isAr ? 'وجهة التسليم' : 'Destination'}</span>
                  <span className="font-bold text-navy-900">Aqaba Port Area</span>
                </div>
              </div>

              {/* Assigned Driver Card */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold">
                    O
                  </div>
                  <div>
                    <span className="font-bold text-navy-900 block">Mr. Omar Saleh</span>
                    <span className="text-[11px] text-emerald-800">44-12345 · Heavy Refrigerated (Chilled)</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-bold hover:bg-emerald-50 transition shadow-2xs"
                >
                  📞 {isAr ? 'اتصال' : 'Call'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section 3: For Drivers (Phone Frame Mock) */}
      <section className="py-20 bg-card border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left: Driver Phone Frame Mock */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-sm">
                <PhoneFrame>
                  <div className="bg-navy-900 text-white p-4 shrink-0 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-amber-400 font-bold uppercase">
                        {isAr ? 'تطبيق السائق' : 'Driver App'}
                      </span>
                      <h4 className="text-sm font-black">{isAr ? 'السيد عمر صالح' : 'Mr. Omar Saleh'}</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      ● {isAr ? 'متاح للشحن' : 'Online'}
                    </span>
                  </div>

                  <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                    <div className="text-[11px] font-bold text-ink-muted">
                      {isAr ? 'شحنة مطابقة لشاحنتك:' : 'Matching Available Cargo:'}
                    </div>

                    <div className="bg-card rounded-2xl border border-line p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-navy-900 text-xs">MSR-000021</span>
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200">
                          {isAr ? 'متاحة للقبول' : 'Available'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-surface text-xs space-y-1">
                        <div className="font-bold text-navy-900">Amman → Irbid (85 km)</div>
                        <div className="text-[11px] text-ink-muted">14 tons · Refrigerated Chilled</div>
                      </div>

                      {/* Driver Net (Strict earnings visibility!) */}
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                        <span className="text-xs text-emerald-900 font-bold">
                          {isAr ? 'مستحقاتك الصافية:' : 'Your Net Earnings:'}
                        </span>
                        <span className="text-base font-black text-emerald-700 font-mono">
                          264.000 JD
                        </span>
                      </div>

                      <button
                        type="button"
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition"
                      >
                        {isAr ? 'قبول الشحنة فوراً' : 'Accept Shipment'}
                      </button>
                    </div>
                  </div>
                </PhoneFrame>
              </div>
            </div>

            {/* Right Narrative */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block">
                {isAr ? 'لسائقي الشحن الأردنيين' : 'For Verified Freight Drivers'}
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-navy-900 tracking-tight">
                {isAr
                  ? 'شحنات تطابق شاحنتك. تعرف أرباحك الصافية قبل القبول.'
                  : 'Shipments that fit your truck. See your earnings before you accept.'}
              </h2>
              <div className="space-y-3 text-xs sm:text-sm text-ink-muted leading-relaxed">
                <p>
                  {isAr
                    ? 'لا داعي للمساومة أو الانتظار في الساحات. يطابق مسار الشحنات مع فئة رخصتك ونوع شاحنتك آلياً.'
                    : 'No haggling or idle waiting. Masar matches loads directly to your license class and body configuration.'}
                </p>
                <p>
                  {isAr
                    ? 'تطبيق فائق الوضوح صُمم خصيصاً لظروف الطريق: أرقام كبيرة، تواصل بلمسة واحدة، وضمان دفع فوري عبر حسابك البنكي أو كليك.'
                    : 'A clean, high-contrast mobile app designed for long days on the road with guaranteed instant CliQ/IBAN payouts.'}
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/signup/driver"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition shadow-sm"
                >
                  <Truck className="w-4 h-4 text-amber-400" />
                  <span>{isAr ? 'انضم كأسطول سائقين' : 'Join as a Verified Driver'}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Section 4: SafePay Escrow Protection */}
      <section className="py-20 bg-navy-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>SafePay Freight Escrow</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              {isAr ? 'أموالك ومستحقاتك محمية في حساب ضمان مستقل' : 'Your Money is Protected with SafePay'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isAr
                ? 'نظام ضمان مالي يعزل مبالغ الشحن ويحمي الطرفين حتى اكتمال المعاينة والتسليم.'
                : 'Neutral financial escrow that protects both shipper and driver until safe delivery is confirmed.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 rounded-3xl bg-navy-950 border border-navy-800 space-y-3 text-center sm:text-start">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black mx-auto sm:mx-0">
                1
              </div>
              <h3 className="text-base font-bold text-white">
                {isAr ? '1. إيداع مؤمَّن مسبقاً' : '1. Advance Secured Deposit'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? 'يودع المصنع قيمة الشحنة قبل بدء الرحلة. يعلم السائق أن أتعابه متوفرة ومحجوزة بأمان.'
                  : 'Shipper deposits freight payment before truck dispatch. Driver knows money is guaranteed.'}
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-navy-950 border border-navy-800 space-y-3 text-center sm:text-start">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black mx-auto sm:mx-0">
                2
              </div>
              <h3 className="text-base font-bold text-white">
                {isAr ? '2. حفظ المبلغ في الحساب المستقل' : '2. Neutral Escrow Custody'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? 'يظل المبلغ محجوزاً في حساب الضمان طوال فترة النقل. لا يستطيع أي طرف سحبه أو التصرف به.'
                  : 'Funds remain frozen in escrow throughout transit. Neither party can unilaterally touch the funds.'}
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-navy-950 border border-navy-800 space-y-3 text-center sm:text-start">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-black mx-auto sm:mx-0">
                3
              </div>
              <h3 className="text-base font-bold text-white">
                {isAr ? '3. صرف فوري بعد التأكيد' : '3. Instant Release Upon Confirmation'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? 'بمجرد فحص وتأكيد التسليم من المصنع، يقوم النظام تلقائياً بتحويل الأرباح لحساب السائق.'
                  : 'Once receiver inspects and confirms receipt, escrow immediately settles earnings to the driver.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Section 5: Trucks We Cover */}
      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block">
              {isAr ? 'أسطول الشاحنات' : 'Full Spectrum Vehicle Coverage'}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-navy-900 tracking-tight">
              {isAr ? 'شاحنات وتجهيزات تغطي كافة الاحتياجات الصناعية' : 'Trucks & Bodies Covered by Masar'}
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted">
              {isAr
                ? 'من شاحنات التوزيع الخفيفة حتى التريلات والصهاريج المتخصصة في المواد الخطرة'
                : 'From light distribution vans to heavy tractor-trailers and ADR-certified tankers.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {truckCoverage.map((tk) => (
              <div
                key={tk.id}
                className="bg-card border border-line rounded-3xl p-6 hover:border-navy-900 transition hover:shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block mb-2">
                    {tk.badge}
                  </span>
                  <h3 className="text-base font-bold text-navy-900">
                    {isAr ? tk.nameAr : tk.nameEn}
                  </h3>
                  <span className="text-xs font-mono text-emerald-700 font-bold block mt-1">
                    {isAr ? tk.weightAr : tk.weightEn}
                  </span>
                  <p className="text-xs text-ink-muted mt-2 leading-relaxed">
                    {isAr ? tk.bodiesAr : tk.bodiesEn}
                  </p>
                </div>

                <div className="pt-4 border-t border-line text-xs font-bold text-navy-900 flex items-center justify-between">
                  <span>{isAr ? 'معتمد على مسار' : 'Fully Supported'}</span>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Section 6: Trust Strip & Testimonials */}
      <section className="py-20 bg-card border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-16">
          {/* Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center border-b border-line pb-12">
            <div>
              <span className="text-3xl sm:text-4xl font-black text-navy-900 font-mono block">
                {statsData.shipments}
              </span>
              <span className="text-xs text-ink-muted mt-1 block">
                {isAr ? 'شحنة نُفذت بنجاح' : 'Delivered Shipments'}
              </span>
            </div>
            <div>
              <span className="text-3xl sm:text-4xl font-black text-emerald-700 font-mono block">
                {statsData.escrowProtected}
              </span>
              <span className="text-xs text-ink-muted mt-1 block">
                {isAr ? 'أموال محمية بالضمان' : 'Secured Escrow Volume'}
              </span>
            </div>
            <div>
              <span className="text-3xl sm:text-4xl font-black text-navy-900 font-mono block">
                {statsData.drivers}
              </span>
              <span className="text-xs text-ink-muted mt-1 block">
                {isAr ? 'سائق شحن معتمد' : 'Verified Freight Drivers'}
              </span>
            </div>
            <div>
              <span className="text-3xl sm:text-4xl font-black text-amber-500 font-mono flex items-center justify-center gap-1">
                <span>{statsData.rating}</span>
                <Star className="w-5 h-5 fill-amber-500" />
              </span>
              <span className="text-xs text-ink-muted mt-1 block">
                {isAr ? 'متوسط تقييم الشحنات' : 'Average Platform Rating'}
              </span>
            </div>
          </div>

          {/* Testimonials */}
          <div>
            <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-navy-900">
                {isAr ? 'ماذا يقول شركاء مسار؟' : 'Trusted by Shippers and Drivers Alike'}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  className="bg-surface/50 border border-line rounded-3xl p-6 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex text-amber-500">
                      {[...Array(t.stars)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-500" />
                      ))}
                    </div>
                    <p className="text-xs text-navy-900 italic leading-relaxed">
                      "{isAr ? t.quoteAr : t.quoteEn}"
                    </p>
                  </div>

                  <div className="pt-4 border-t border-line">
                    <span className="font-bold text-navy-900 text-xs block">
                      {isAr ? t.nameAr : t.nameEn}
                    </span>
                    <span className="text-[11px] text-ink-muted block mt-0.5">
                      {isAr ? t.roleAr : t.roleEn}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 9. Final CTA */}
      <section className="py-20 bg-navy-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            {isAr
              ? 'جاهز لتجربة أسرع وأأمن شحن لبضائعك؟'
              : 'Ready to Experience Seamless, SafePay Freight?'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            {isAr
              ? 'انضم إلى شبكة مسار اليوم. لا رسوم خفية، وأموالك محمية حتى الاستلام.'
              : 'Join Masar today. No hidden fees, zero risk, and complete escrow protection.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <Link
              to="/signup/manufacturer"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-navy-900 font-black text-sm transition shadow-lg"
            >
              {isAr ? 'اشحن بضاعتك الآن' : 'Ship with Masar'}
            </Link>

            <Link
              to="/signup/driver"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-navy-800 hover:bg-navy-700 text-white font-bold text-sm border border-slate-700 transition"
            >
              {isAr ? 'سجّل كسائق معتمد' : 'Register as Driver'}
            </Link>
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="bg-navy-950 text-slate-400 py-12 border-t border-navy-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-navy-900 flex items-center justify-center font-black">
              <Truck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="font-black text-white text-base">MASAR (مسار)</span>
            <span className="text-[11px] text-slate-500">© 2026 Masar Freight & Escrow Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="mailto:support@masar.jo"
              className="hover:text-white transition"
            >
              support@masar.jo
            </a>
            <Link to="/login" className="hover:text-white transition">
              {isAr ? 'تسجيل الدخول' : 'Sign In'}
            </Link>
            <Link to="/signup" className="hover:text-white transition">
              {isAr ? 'حساب جديد' : 'Sign Up'}
            </Link>
            <button
              onClick={toggleLang}
              className="text-amber-400 hover:underline font-bold"
            >
              {isAr ? 'English' : 'عربي'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

