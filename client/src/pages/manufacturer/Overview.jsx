import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/auth.jsx';
import { Package, PlusCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ManufacturerOverview() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">
            {isAr ? 'لوحة تحكم المصنع' : 'Manufacturer Dashboard'}
          </h1>
          <p className="text-xs text-ink-muted">
            {isAr ? `مرحباً بك، ${user?.name}` : `Welcome back, ${user?.name}`}
          </p>
        </div>
        <Link
          to="/manufacturer/shipments/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-navy-900 font-bold text-xs shadow-xs transition"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>{isAr ? 'طلب شحنة جديدة' : 'Post New Shipment'}</span>
        </Link>
      </div>

      {/* Needs Your Action Strip */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-navy-900 flex items-center justify-center font-bold">
            0
          </div>
          <div>
            <div className="text-xs font-bold text-navy-900">
              {isAr ? 'أنت جاهز تماماً!' : "You're all caught up"}
            </div>
            <div className="text-[11px] text-ink-muted">
              {isAr ? 'لا توجد شحنات معلقة تحتاج إلى إجراء حالياً.' : 'No shipments currently pending action.'}
            </div>
          </div>
        </div>
        <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
          <CheckCircle2 className="w-4 h-4" />
          {isAr ? 'كل شيء محدّث' : 'Up to date'}
        </span>
      </div>

      {/* Placeholder Overview Card */}
      <div className="bg-card rounded-2xl border border-line p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-navy-100 text-navy-800 flex items-center justify-center mx-auto">
          <Package className="w-6 h-6 stroke-[2]" />
        </div>
        <h3 className="text-base font-bold text-navy-900">
          {isAr ? 'بوابة الشحن المالي لحساب الضمان' : 'Freight & Escrow System Ready'}
        </h3>
        <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
          {isAr
            ? 'تم إعداد الحساب وقاعدة البيانات بنجاح. يمكنك إنشاء شحنة جديدة لتجربة حسابات الضمان وترشيح الشاحنات المناسبة.'
            : 'Account authenticated and database connected. You can start creating shipments to test truck suggestions and escrow workflows.'}
        </p>
      </div>
    </div>
  );
}

