import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/auth.jsx';
import { Activity, Users, Box, TrendingUp, ShieldAlert } from 'lucide-react';

export default function AdminOverview() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy-900 tracking-tight">
          {isAr ? 'لوحة تحكم الإدارة' : 'Platform Administration'}
        </h1>
        <p className="text-xs text-ink-muted">
          {isAr ? 'نظرة شاملة على الشحنات، السائقين، المصانع، والعمليات الحية' : 'Platform oversight, user verification, and active shipment feed'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-line p-4 space-y-1">
          <div className="text-xs font-semibold text-ink-muted">{isAr ? 'المستخدمون' : 'Total Users'}</div>
          <div className="text-xl font-black text-navy-900">4</div>
          <div className="text-[10px] text-emerald-600 font-medium">✓ {isAr ? 'حسابات تجريبية موثقة' : 'Verified accounts'}</div>
        </div>

        <div className="bg-card rounded-2xl border border-line p-4 space-y-1">
          <div className="text-xs font-semibold text-ink-muted">{isAr ? 'الشحنات النشطة' : 'Active Shipments'}</div>
          <div className="text-xl font-black text-navy-900">0</div>
          <div className="text-[10px] text-slate-400">{isAr ? 'في الطريق أو قيد التحميل' : 'Live on roads'}</div>
        </div>

        <div className="bg-card rounded-2xl border border-line p-4 space-y-1">
          <div className="text-xs font-semibold text-ink-muted">{isAr ? 'طلبات بانتظار الاعتماد' : 'Pending Approvals'}</div>
          <div className="text-xl font-black text-amber-600">0</div>
          <div className="text-[10px] text-slate-400">{isAr ? 'مصانع وسائقون جدد' : 'New signups'}</div>
        </div>

        <div className="bg-card rounded-2xl border border-line p-4 space-y-1">
          <div className="text-xs font-semibold text-ink-muted">{isAr ? 'إيراد مسار (4%)' : 'Masar Revenue (4%)'}</div>
          <div className="text-xl font-black text-navy-900 font-mono">0.000 JD</div>
          <div className="text-[10px] text-emerald-600 font-medium">{isAr ? 'أرباح مؤكدة' : 'Audited earnings'}</div>
        </div>
      </div>
    </div>
  );
}

