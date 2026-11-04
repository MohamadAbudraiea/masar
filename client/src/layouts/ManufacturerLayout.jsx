import React from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  CreditCard,
  Users,
  MapPin,
  Building2,
  Settings,
} from 'lucide-react';
import AppShell from './AppShell.jsx';

export default function ManufacturerLayout() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const navItems = [
    { to: '/manufacturer', label: isAr ? 'نظرة عامة' : 'Overview', icon: LayoutDashboard, end: true },
    { to: '/manufacturer/shipments', label: isAr ? 'الشحنات' : 'Shipments', icon: Package },
    { to: '/manufacturer/shipments/new', label: isAr ? 'شحنة جديدة' : 'New Shipment', icon: PlusCircle },
    { to: '/manufacturer/payments', label: isAr ? 'المدفوعات' : 'Payments', icon: CreditCard },
    { to: '/manufacturer/drivers', label: isAr ? 'سائقو شحناتي' : 'My Drivers', icon: Users },
    { to: '/manufacturer/locations', label: isAr ? 'عناويني' : 'Locations', icon: MapPin },
    { to: '/manufacturer/profile', label: isAr ? 'ملف الشركة' : 'Company Profile', icon: Building2 },
    { to: '/manufacturer/settings', label: isAr ? 'الإعدادات' : 'Settings', icon: Settings },
  ];

  return (
    <AppShell
      roleTitle={isAr ? 'بوابة المصنّع' : 'Manufacturer Portal'}
      navItems={navItems}
    >
      <Outlet />
    </AppShell>
  );
}

