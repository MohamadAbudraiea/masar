import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Factory, Truck, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function SignupChoice() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-navy-900 mb-2 transition"
          >
            {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
            <span>{isAr ? 'العودة لتسجيل الدخول' : 'Back to Login'}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
            {isAr ? 'انضم إلى شبكة مسار' : 'Join the Masar Network'}
          </h1>
          <p className="text-xs text-ink-muted max-w-sm mx-auto leading-relaxed">
            {isAr
              ? 'اختر نوع الحساب الذي يناسب نشاطك للبدء في نقل البضائع بأمان وضمان مالي.'
              : 'Choose the account type that fits your business to manage shipments with escrow safety.'}
          </p>
        </div>

        {/* 2 Big Choice Cards per 06 §1.3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Manufacturer Choice */}
          <Link
            to="/signup/manufacturer"
            className="group p-6 rounded-3xl bg-card border border-line hover:border-amber-500 hover:shadow-lg transition flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <Factory className="w-6 h-6 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-navy-900 mb-1">
                  {isAr ? 'أنا مصنّع / تاجر' : "I'm a Manufacturer"}
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  {isAr
                    ? 'اطلب شاحنات لنقل بضائعك، ادفع في حساب الضمان بأمان، وتابع شحنتك لحظة بلحظة.'
                    : 'Post shipments, select matching trucks, pay into escrow, and track every movement live.'}
                </p>
              </div>
            </div>

            <div className="flex items-center text-xs font-bold text-amber-600 group-hover:text-amber-700">
              <span>{isAr ? 'تسجيل كمصنّع' : 'Sign up as Manufacturer'}</span>
              <ArrowRight className="w-4 h-4 ms-1.5 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Driver Choice */}
          <Link
            to="/signup/driver"
            className="group p-6 rounded-3xl bg-card border border-line hover:border-amber-500 hover:shadow-lg transition flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-navy-100 text-navy-800 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <Truck className="w-6 h-6 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-navy-900 mb-1">
                  {isAr ? 'أنا سائق شاحنة' : "I'm a Driver"}
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  {isAr
                    ? 'شحنات تطابق شاحنتك وترخيصك، رؤية صافي أرباحك مسبقاً، وصرف مضمون فور التسليم.'
                    : 'Shipments that match your truck, visible net earnings before you accept, and guaranteed payouts.'}
                </p>
              </div>
            </div>

            <div className="flex items-center text-xs font-bold text-navy-900 group-hover:text-amber-600">
              <span>{isAr ? 'تسجيل كسائق' : 'Sign up as Driver'}</span>
              <ArrowRight className="w-4 h-4 ms-1.5 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Footnote */}
        <div className="pt-2 text-center text-xs text-ink-muted flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{isAr ? 'جميع الحسابات تخضع لمراجعة وتدقيق الإدارة' : 'All accounts undergo official document verification'}</span>
        </div>
      </div>
    </div>
  );
}

