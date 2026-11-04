import React from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  UserCheck,
  Factory,
  Truck,
  Boxes,
  LineChart,
  Star,
  Settings,
} from 'lucide-react';
import AppShell from './AppShell.jsx';

export default function AdminLayout() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const navItems = [
    { to: '/admin', label: isAr ? 'لوحة التحكم' : 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/approvals', label: isAr ? 'طلبات الانضمام' : 'Approvals', icon: UserCheck },
    { to: '/admin/manufacturers', label: isAr ? 'المصانع' : 'Manufacturers', icon: Factory },
    { to: '/admin/drivers', label: isAr ? 'السائقون' : 'Drivers', icon: Truck },
    { to: '/admin/shipments', label: isAr ? 'الشحنات' : 'Shipments', icon: Boxes },
    { to: '/admin/financial', label: isAr ? 'التقارير المالية' : 'Financial', icon: LineChart },
    { to: '/admin/ratings', label: isAr ? 'التقييمات' : 'Ratings', icon: Star },
    { to: '/admin/settings', label: isAr ? 'الإعدادات' : 'Settings', icon: Settings },
  ];

  return (
    <AppShell
      roleTitle={isAr ? 'إدارة المنصة' : 'Masar Administration'}
      navItems={navItems}
    >
      <Outlet />
    </AppShell>
  );
}

