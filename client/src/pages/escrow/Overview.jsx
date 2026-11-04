import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/auth.jsx';
import { ShieldCheck, Lock, ArrowUpRight } from 'lucide-react';

export default function EscrowOverview() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy-900 tracking-tight">
          {isAr ? 'لوحة حساب الضمان (SafePay)' : 'Escrow Operations'}
        </h1>
        <p className="text-xs text-ink-muted">
          {isAr ? 'متابعة الأموال المحجوزة والإفراج التلقائي للأرباح' : 'Monitor held deposits and verified delivery releases'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-line p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
            <span>{isAr ? 'الأموال المحجوزة' : 'Funds Held'}</span>
            <Lock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-navy-900 font-mono">0.000 JD</div>
          <div className="text-[10px] text-slate-400">
            {isAr ? 'شحنات قيد التحميل والتوصيل' : 'In loading & delivery stages'}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-line p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
            <span>{isAr ? 'المصروف هذا الشهر' : 'Released This Month'}</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-navy-900 font-mono">0.000 JD</div>
          <div className="text-[10px] text-slate-400">
            {isAr ? 'أرباح السائقين وعمولات المنصة' : 'Driver payouts & commissions'}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-line p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
            <span>{isAr ? 'عمولة حساب الضمان (SafePay)' : 'Escrow Commission'}</span>
            <ShieldCheck className="w-4 h-4 text-navy-700" />
          </div>
          <div className="text-2xl font-black text-navy-900 font-mono">0.000 JD</div>
          <div className="text-[10px] text-slate-400">
            {isAr ? 'تتراوح بين 2% إلى 5%' : 'Scaled 2% – 5% by price'}
          </div>
        </div>
      </div>
    </div>
  );
}

