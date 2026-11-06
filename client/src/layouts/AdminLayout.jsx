import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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
import { apiClient } from '../api/client.js';

export default function AdminLayout() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  // Approvals badge (06 §5: "Approvals (with count badge)")
  useEffect(() => {
    let alive = true;
    apiClient('/admin/approvals')
      .then((r) => alive && setPendingCount((r?.items || []).length))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [location.pathname]);

  const navItems = [
    { to: '/admin', label: isAr ? 'لوحة التحكم' : 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/approvals', label: isAr ? 'طلبات الانضمام' : 'Approvals', icon: UserCheck, badge: pendingCount },
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

