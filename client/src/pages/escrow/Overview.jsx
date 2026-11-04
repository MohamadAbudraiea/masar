import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Lock,
  ArrowUpRight,
  Clock,
  Calendar,
  Building2,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import { apiClient } from '../../api/client.js';
import StatCard from '../../components/StatCard.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';
import { formatMoney } from '../../lib/format.js';

export default function EscrowOverview() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await apiClient(`/reports/escrow/overview${qs}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load escrow overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [from, to]);

  const kpis = data?.kpis || {
    held: '0.000',
    released_in_period: '0.000',
    commission_earned: '0.000',
    awaiting_release_count: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">
            {isAr ? 'لوحة حساب الضمان (SafePay)' : 'SafePay Escrow Operations'}
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            {isAr
              ? 'مراقبة الودائع المحجوزة والإفراجات المالية للسائقين'
              : 'Real-time monitoring of freight deposits held in escrow and automated release settlements'}
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1.5 text-xs bg-card border border-line px-2.5 py-1.5 rounded-xl shadow-2xs">
          <Calendar className="h-3.5 w-3.5 text-ink-muted" />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-transparent focus:outline-none text-ink text-xs"
            title={isAr ? 'من تاريخ' : 'From date'}
          />
          <span className="text-ink-muted">→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-transparent focus:outline-none text-ink text-xs"
            title={isAr ? 'إلى تاريخ' : 'To date'}
          />
          {(from || to) && (
            <button
              onClick={() => {
                setFrom('');
                setTo('');
              }}
              className="text-ink-muted hover:text-navy-900 ms-1"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={isAr ? 'الأموال المحجوزة حالياً' : 'Funds Currently Held'}
          value={formatMoney(kpis.held)}
          icon={Lock}
          subtitle={isAr ? 'بانتظار اكتمال التوصيل' : 'Secured deposits'}
          onClick={() => navigate('/escrow/held')}
        />
        <StatCard
          title={isAr ? 'تم صرفه في الفترة' : 'Released in Period'}
          value={formatMoney(kpis.released_in_period)}
          icon={ArrowUpRight}
          subtitle={isAr ? 'سائقين ومصانع' : 'To drivers and Masar'}
          onClick={() => navigate('/escrow/releases')}
        />
        <StatCard
          title={isAr ? 'عمولة SafePay المكتسبة' : 'Escrow Commission Earned'}
          value={formatMoney(kpis.commission_earned)}
          icon={ShieldCheck}
          subtitle={isAr ? 'دخل الضمان الصافي' : 'Platform fee share'}
        />
        <StatCard
          title={isAr ? 'بانتظار تأكيد الاستلام' : 'Delivered Awaiting Release'}
          value={`${kpis.awaiting_release_count} ${isAr ? 'شحنة' : 'shipments'}`}
          icon={Clock}
          subtitle={isAr ? 'وصلت وبانتظار المصنع' : 'Delivered by drivers'}
          onClick={() => navigate('/escrow/shipments?status=delivered')}
        />
      </div>

      {/* Visual Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Held vs Released Daily Trend */}
        <div className="bg-card rounded-2xl border border-line p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
              {isAr ? 'سجل حركة الأموال اليومي' : 'Held vs Released Cashflow'}
            </h2>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>

          <div className="space-y-3">
            {(data?.held_vs_released_series || []).map((s) => (
              <div key={s.date} className="flex items-center justify-between text-xs py-1 border-b border-line/40">
                <span className="font-mono text-ink-muted">{s.date}</span>
                <div className="flex items-center gap-4">
                  <span className="text-amber-600 font-medium">
                    {isAr ? 'حجز:' : 'Held:'} {formatMoney(s.held)}
                  </span>
                  <span className="text-emerald-600 font-bold">
                    {isAr ? 'صرف:' : 'Released:'} {formatMoney(s.released)}
                  </span>
                </div>
              </div>
            ))}
            {(!data?.held_vs_released_series || data.held_vs_released_series.length === 0) && (
              <div className="text-center py-8 text-xs text-ink-muted">
                {isAr ? 'لا توجد حركات مالية مسجلة' : 'No recorded transactions in this timeframe'}
              </div>
            )}
          </div>
        </div>

        {/* Commission Series */}
        <div className="bg-card rounded-2xl border border-line p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
              {isAr ? 'عوائد SafePay اليومية' : 'Daily Commission Revenue'}
            </h2>
            <ShieldCheck className="h-4 w-4 text-navy-700" />
          </div>

          <div className="space-y-3">
            {(data?.commission_series || []).map((s) => (
              <div key={s.date} className="flex items-center justify-between text-xs py-1 border-b border-line/40">
                <span className="font-mono text-ink-muted">{s.date}</span>
                <span className="font-bold text-navy-900">+{formatMoney(s.amount)}</span>
              </div>
            ))}
            {(!data?.commission_series || data.commission_series.length === 0) && (
              <div className="text-center py-8 text-xs text-ink-muted">
                {isAr ? 'لا توجد عوائد مسجلة في الفترة' : 'No commission records in this period'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
