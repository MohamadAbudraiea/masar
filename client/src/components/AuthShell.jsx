import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Globe, ShieldCheck, Truck, BadgeCheck } from 'lucide-react';
import Logo from './Logo.jsx';
import { setLanguage } from '../i18n/index.js';

/**
 * Frame for every public auth screen: logo (→ landing), "Back to home", language switch.
 * variant 'split' adds the navy brand panel on wide screens (used by Login).
 */
export default function AuthShell({ children, variant = 'center', maxWidth = 'max-w-xl' }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const top = (
    <header className="flex items-center justify-between gap-3">
      <Link to="/" aria-label={isAr ? 'الصفحة الرئيسية' : 'Home'} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
        <Logo tone="dark" size={22} lang={isAr ? 'ar' : 'en'} />
      </Link>
      <div className="flex items-center gap-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-bold text-navy-900 hover:bg-card border border-transparent hover:border-line transition"
        >
          <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
          {isAr ? 'العودة للرئيسية' : 'Back to home'}
        </Link>
        <button
          type="button"
          onClick={() => setLanguage(isAr ? 'en' : 'ar')}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-line bg-card text-sm font-bold text-navy-900 hover:bg-surface"
        >
          <Globe className="h-4 w-4 text-ink-muted" />
          {isAr ? 'English' : 'العربية'}
        </button>
      </div>
    </header>
  );

  if (variant === 'split') {
    return (
      <div className="min-h-screen bg-surface grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <aside className="hidden lg:flex relative overflow-hidden bg-navy-900 text-white p-12 flex-col justify-between">
          <Link to="/" aria-label={isAr ? 'الصفحة الرئيسية' : 'Home'}>
            <Logo tone="light" size={30} lang={isAr ? 'ar' : 'en'} />
          </Link>
          <div className="relative z-[1] max-w-md">
            <h2 className="text-[34px] leading-[1.15] font-extrabold tracking-tight">
              {isAr ? 'كل شحنة، من بوابة المصنع حتى المستلم.' : 'Every shipment, from the factory gate to the receiver.'}
            </h2>
            <ul className="mt-8 space-y-4 text-navy-100">
              {[
                { icon: ShieldCheck, en: 'Payment held in escrow until delivery is confirmed', ar: 'الدفع محفوظ في حساب ضمان حتى تأكيد التسليم' },
                { icon: BadgeCheck, en: 'Verified drivers matched to the right truck', ar: 'سائقون موثّقون بالشاحنة المناسبة' },
                { icon: Truck, en: 'Every step on one live timeline', ar: 'كل خطوة على خط زمني مباشر' },
              ].map((x) => (
                <li key={x.en} className="flex items-start gap-3">
                  <span className="h-9 w-9 shrink-0 rounded-xl bg-navy-700 text-amber-500 flex items-center justify-center">
                    <x.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="pt-1.5 text-[15px]">{isAr ? x.ar : x.en}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* the dotted route motif */}
          <svg aria-hidden="true" className="absolute -bottom-6 inset-x-0 w-full h-48 opacity-90" viewBox="0 0 600 200" preserveAspectRatio="none">
            <path d="M-10 170 C 120 170, 160 90, 290 100 S 470 40, 620 60" fill="none" stroke="#F5A82A" strokeWidth="5" strokeLinecap="round" strokeDasharray="0.1 16" />
          </svg>
          <p className="relative z-[1] text-xs text-navy-100/70">© {new Date().getFullYear()} Masar</p>
        </aside>
        <main className="flex flex-col p-5 sm:p-8">
          <div className="lg:[&_header>a:first-child]:invisible">{top}</div>
          <div className="flex-1 flex items-center justify-center py-8">
            <div className={`w-full ${maxWidth}`}>{children}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col p-5 sm:p-8">
      <div className="w-full max-w-6xl mx-auto">{top}</div>
      <main className="flex-1 flex items-start sm:items-center justify-center py-8">
        <div className={`w-full ${maxWidth}`}>{children}</div>
      </main>
    </div>
  );
}
