import React from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Lock,
  ArrowUpRight,
  Building,
  Truck,
  PackageCheck,
  Settings,
} from 'lucide-react';
import AppShell from './AppShell.jsx';

export default function EscrowLayout() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const navItems = [
    { to: '/escrow', label: isAr ? 'نظرة عامة' : 'Overview', icon: ShieldCheck, end: true },
    { to: '/escrow/held', label: isAr ? 'الأموال المحجوزة' : 'Held Funds', icon: Lock },
    { to: '/escrow/releases', label: isAr ? 'سجل الصرف' : 'Releases', icon: ArrowUpRight },
    { to: '/escrow/companies', label: isAr ? 'الشركات المصنّعة' : 'Companies', icon: Building },
    { to: '/escrow/drivers', label: isAr ? 'السائقون وحساباتهم' : 'Drivers & Payouts', icon: Truck },
    { to: '/escrow/shipments', label: isAr ? 'كافة الشحنات' : 'Shipments', icon: PackageCheck },
    { to: '/escrow/settings', label: isAr ? 'الإعدادات' : 'Settings', icon: Settings },
  ];

  return (
    <AppShell
      roleTitle={isAr ? 'حساب الضمان (SafePay)' : 'Escrow Operations'}
      navItems={navItems}
    >
      <Outlet />
    </AppShell>
  );
}

