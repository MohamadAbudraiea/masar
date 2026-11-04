import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/auth.jsx';
import { Package, Truck, Compass, CheckCircle } from 'lucide-react';

export default function DriverShipments() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  return (
    <div className="space-y-4">
      {/* Truck Info Banner */}
      <div className="p-4 rounded-2xl bg-white border border-line shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
            <Truck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-sm font-black text-navy-900">
              {isAr ? 'شاحنتك المعتمدة:' : 'Registered Truck:'}
            </div>
            <div className="text-xs text-ink-muted">
              {user?.profile?.truck
                ? `${user.profile.truck.type_name} · ${user.profile.truck.body_name} (${user.profile.truck.plate_number})`
                : isAr ? 'نقل متوسط (براد)' : 'Medium / Refrigerated'}
            </div>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold shrink-0">
          {isAr ? 'جاهز' : 'Free'}
        </span>
      </div>

      {/* Empty State per 06 §3.1 */}
      <div className="p-8 bg-card rounded-2xl border border-line text-center space-y-3 mt-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <Package className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-navy-900">
          {isAr ? 'لا توجد شحنات متاحة حالياً' : 'No open shipments match your truck'}
        </h3>
        <p className="text-xs text-ink-muted leading-relaxed max-w-xs mx-auto">
          {isAr
            ? 'فور أن ينشر أحد المصانع شحنة تطابق حمولة ومواصفات شاحنتك، ستظهر هنا فوراً وسنرسل لك إشعاراً.'
            : 'New shipments matching your truck category and payload capacity will automatically appear here with notifications.'}
        </p>
      </div>
    </div>
  );
}

