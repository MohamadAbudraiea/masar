import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass, ArrowLeft, Home, Truck } from 'lucide-react';

export default function NotFound() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-card border border-line rounded-3xl p-8 shadow-xs space-y-6 animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 mb-2">
          <Truck className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-4xl font-black text-navy-900 tracking-tight font-mono block">
            404
          </span>
          <h1 className="text-xl font-black text-navy-900">
            {isAr ? 'الصفحة غير موجودة' : 'Page Not Found'}
          </h1>
          <p className="text-xs text-ink-muted leading-relaxed">
            {isAr
              ? 'يبدو أن الشحنة أو الرابط الذي تبحث عنه قد تم نقله أو لم يعد متاحاً على مسار.'
              : 'The link or resource you requested could not be found or may have been relocated.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-line bg-white hover:bg-slate-50 text-xs font-bold text-navy-900 transition flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span>{isAr ? 'الرجوع للخلف' : 'Go Back'}</span>
          </button>

          <Link
            to="/"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-xs font-bold text-white transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Home className="w-4 h-4" />
            <span>{isAr ? 'الرئيسية' : 'Platform Home'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

