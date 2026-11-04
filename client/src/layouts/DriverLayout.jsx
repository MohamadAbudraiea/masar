import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package,
  Navigation,
  Wallet,
  User,
  Bell,
  Globe,
  Truck,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../state/auth.jsx';
import { setLanguage } from '../i18n/index.js';
import PhoneFrame from '../components/PhoneFrame.jsx';
import NotificationBell from '../components/NotificationBell.jsx';

export default function DriverLayout() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const navigate = useNavigate();

  function toggleLanguage() {
    setLanguage(isAr ? 'en' : 'ar');
  }

  // Address driver as Mr. {name} (00 §4, 05 §8)
  const driverGreeting = isAr
    ? `السيد ${user?.name || ''}`
    : `Mr. ${user?.name || ''}`;

  return (
    <PhoneFrame>
      {/* 1. Driver App Header (Large, High Contrast) */}
      <header className="px-5 py-4 bg-navy-900 text-white shrink-0 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs text-amber-500 font-bold block uppercase tracking-wider">
            {isAr ? 'تطبيق السائق' : 'Driver App'}
          </span>
          <h2 className="text-xl font-black text-white truncate max-w-[200px]">
            {driverGreeting}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Language Toggle */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="p-2 rounded-xl bg-navy-800 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1"
          >
            <Globe className="w-4 h-4" />
            <span>{isAr ? 'EN' : 'عربي'}</span>
          </button>

          {/* Bell */}
          <NotificationBell />
        </div>
      </header>

      {/* 2. Scrollable Body Viewport */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <Outlet />
      </main>

      {/* 3. Driver 4 Bottom Tabs (28px icons, 15-16px labels, 05 §8) */}
      <nav className="h-20 bg-card border-t border-line shrink-0 grid grid-cols-4 px-2 shadow-lg">
        {[
          { to: '/driver', label: isAr ? 'الشحنات' : 'Shipments', icon: Package, end: true },
          { to: '/driver/active', label: isAr ? 'شحنتي' : 'My shipment', icon: Navigation },
          { to: '/driver/earnings', label: isAr ? 'أرباحي' : 'Earnings', icon: Wallet },
          { to: '/driver/me', label: isAr ? 'حسابي' : 'Me', icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 transition-all relative ${
                  isActive
                    ? 'text-navy-900 font-black'
                    : 'text-slate-400 hover:text-ink-muted font-semibold'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 inset-x-6 h-1 bg-amber-500 rounded-b-full" />
                  )}
                  <Icon className="w-7 h-7 stroke-[2.2]" />
                  <span className="text-[13px] leading-tight truncate">{tab.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </PhoneFrame>
  );
}

