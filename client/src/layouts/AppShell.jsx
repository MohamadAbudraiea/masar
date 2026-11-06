import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Truck,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  Globe,
  ArrowLeft,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../state/auth.jsx';
import { setLanguage } from '../i18n/index.js';
import NotificationBell from '../components/NotificationBell.jsx';
import GlobalSearch from '../components/GlobalSearch.jsx';
import Logo from '../components/Logo.jsx';

/**
 * Standard Desktop AppShell Layout (264px navy sidebar + 64px topbar).
 *
 * @param {Object} props
 * @param {string} props.roleTitle - e.g. 'Manufacturer Portal', 'Escrow Operations'
 * @param {Array<{to: string, label: string, icon: React.ComponentType, end?: boolean}>} props.navItems
 * @param {React.ReactNode} props.children
 */
export default function AppShell({ roleTitle, navItems = [], children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function toggleLanguage() {
    const next = isAr ? 'en' : 'ar';
    setLanguage(next);
  }

  return (
    <div className="min-h-screen bg-surface flex antialiased">
      {/* 1. Left Navy Sidebar (264px fixed desktop) */}
      <aside
        className={`fixed inset-y-0 start-0 z-40 w-64 bg-navy-900 text-white flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full md:rtl:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-navy-800">
          <NavLink to={navItems[0]?.to || '/'} className="flex flex-col gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg">
            <Logo tone="light" size={22} lang={isAr ? 'ar' : 'en'} />
            <span className="text-[11px] text-slate-300 font-semibold leading-none ps-0.5">{roleTitle}</span>
          </NavLink>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                    isActive
                      ? 'bg-navy-700 text-white before:absolute before:inset-y-2 before:start-0 before:w-1 before:rounded-full before:bg-amber-500 [&_svg]:text-amber-500'
                      : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                  }`
                }
              >
                {Icon && <Icon className="w-4 h-4 shrink-0" />}
                <span className="truncate flex-1">{item.label}</span>
                {item.badge > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-navy-900 text-[11px] font-extrabold flex items-center justify-center tabular-nums">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card in Sidebar Footer */}
        <div className="p-3 border-t border-navy-800 ">
          <div className="flex items-center p-2 rounded-xl bg-navy-800/60">
            <div className="h-9 w-9 shrink-0 rounded-full bg-navy-700 text-amber-500 flex items-center justify-center text-xs font-extrabold me-2.5">
              {(user?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="truncate min-w-0 me-2 flex-1">
              <div className="text-xs font-bold text-white truncate">{user?.name}</div>
              <div className="text-[10px] text-slate-400 capitalize">{user?.role}</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title={isAr ? 'تسجيل الخروج' : 'Log out'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-navy-800 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main Shell Content Container */}
      <div className="flex-1 flex flex-col md:ps-64 min-w-0">
        {/* Topbar (64px) */}
        <header className="h-16 bg-card border-b border-line px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-navy-900 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Bar */}
            <div className="flex items-center">
              <GlobalSearch />
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* Language Switch */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="px-2.5 py-1.5 rounded-xl border border-line hover:bg-surface text-xs font-bold text-navy-900 flex items-center gap-1.5 transition"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>{isAr ? 'English' : 'العربية'}</span>
            </button>

            {/* Notification Bell */}
            <NotificationBell />
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

