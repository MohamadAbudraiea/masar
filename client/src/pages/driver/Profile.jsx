import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User,
  Truck,
  Building2,
  Globe,
  LogOut,
  ShieldCheck,
  Phone,
  Mail,
  Award,
} from 'lucide-react';
import { useAuth } from '../../state/auth.jsx';
import { setLanguage } from '../../i18n/index.js';

export default function DriverProfile() {
  const { user, logout } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const navigate = useNavigate();

  const profile = user?.profile || {};
  const truck = profile.truck || {};

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Driver Identity Card */}
      <div className="bg-card rounded-2xl border border-line p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-navy-900 flex items-center justify-center font-black text-xl shrink-0">
            {user?.name ? user.name.charAt(0) : 'D'}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">
              {isAr ? 'سائق شحن معتمد' : 'Verified Freight Driver'}
            </span>
            <h2 className="text-base font-black text-navy-900">
              {isAr ? `السيد ${user?.name || ''}` : `Mr. ${user?.name || ''}`}
            </h2>
            <div className="text-xs text-ink-muted flex items-center gap-2 mt-0.5">
              <span>{user?.phone}</span>
              {user?.email && <span>· {user.email}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line text-xs">
          <div>
            <span className="text-ink-muted block text-[11px]">{isAr ? 'الجنسية' : 'Nationality'}</span>
            <span className="font-bold text-navy-900">{profile.nationality || 'Jordanian'}</span>
          </div>
          <div>
            <span className="text-ink-muted block text-[11px]">{isAr ? 'الرقم الوطني / الإقامة' : 'National ID'}</span>
            <span className="font-mono font-bold text-navy-900">{profile.national_id || profile.passport_number || '—'}</span>
          </div>
        </div>
      </div>

      {/* Truck Info Card */}
      <div className="bg-card rounded-2xl border border-line p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-navy-900 flex items-center gap-1.5 border-b border-line pb-2">
          <Truck className="w-4 h-4 text-emerald-600" />
          <span>{isAr ? 'بيانات الشاحنة المعتمدة' : 'Registered Truck'}</span>
        </h3>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-ink-muted block text-[11px]">{isAr ? 'رقم اللوحة' : 'Plate Number'}</span>
            <span className="font-mono font-black text-navy-900 text-sm">
              {truck.plate_number || '44-12345'}
            </span>
          </div>
          <div>
            <span className="text-ink-muted block text-[11px]">{isAr ? 'فئة الشاحنة' : 'Category / Body'}</span>
            <span className="font-bold text-navy-900">
              {truck.type_name || 'Medium'} ({truck.body_name || 'Refrigerated'})
            </span>
          </div>
          <div>
            <span className="text-ink-muted block text-[11px]">{isAr ? 'نظام التبريد' : 'Cooling'}</span>
            <span className="font-semibold text-emerald-700">
              {truck.cooling ? `❄️ ${truck.cooling}` : '✕ None'}
            </span>
          </div>
          <div>
            <span className="text-ink-muted block text-[11px]">{isAr ? 'شهادة المواد الخطرة' : 'ADR Certified'}</span>
            <span className="font-semibold text-slate-700">
              {truck.adr_certified ? '⚠️ ADR Certified' : '✕ No'}
            </span>
          </div>
        </div>
      </div>

      {/* Language & Settings */}
      <div className="bg-card rounded-2xl border border-line p-4 space-y-2">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-navy-900">{isAr ? 'لغة التطبيق' : 'App Language'}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLanguage('ar')}
              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                isAr ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              عربي
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                !isAr ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              English
            </button>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <button
        type="button"
        onClick={handleLogout}
        className="w-full py-3.5 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition"
      >
        <LogOut className="w-4 h-4" />
        <span>{isAr ? 'تسجيل الخروج' : 'Log Out'}</span>
      </button>
    </div>
  );
}

