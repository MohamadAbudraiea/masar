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
        <div className="h-16 px-6 flex items-center justify-between border-b border-navy-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-navy-900 flex items-center justify-center font-black shadow-xs">
              <Truck className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white block leading-none">
                {isAr ? 'مَسَار' : 'masar'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-none">
                {roleTitle}
              </span>
            </div>
          </div>
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
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-navy-800 text-amber-500 border-s-4 border-amber-500 ps-2.5 shadow-xs'
                      : 'text-slate-300 hover:bg-navy-800/60 hover:text-white'
                  }`
                }
              >
                {Icon && <Icon className="w-4 h-4 shrink-0" />}
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card in Sidebar Footer */}
        <div className="p-3 border-t border-navy-800 bg-navy-950/40">
          <div className="flex items-center justify-between p-2 rounded-xl bg-navy-900">
            <div className="truncate min-w-0 me-2">
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
        <header className="h-16 bg-card border-b border-line px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-navy-900 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Bar Placeholder */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-line text-ink-muted text-xs w-64 md:w-80 cursor-pointer hover:border-slate-300">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>{isAr ? 'بحث سريع... (Ctrl+K)' : 'Search shipments... (Ctrl+K)'}</span>
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

            {/* Notification Bell Placeholder */}
            <button
              type="button"
              className="p-2 rounded-xl border border-line hover:bg-surface text-navy-900 relative transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-amber-500" />
            </button>
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

