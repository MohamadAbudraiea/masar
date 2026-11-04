import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  ShieldCheck,
  DollarSign,
  Box,
  Calendar,
  Download,
  Building2,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { apiClient } from '../../api/client.js';
import StatCard from '../../components/StatCard.jsx';
import DataTable from '../../components/DataTable.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';
import { formatMoney } from '../../lib/format.js';

export default function AdminFinancial() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [group, setGroup] = useState('day'); // 'day' | 'week' | 'month'
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchFinancial = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('group', group);
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const res = await apiClient(`/reports/admin/financial?${params.toString()}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load financial report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancial();
  }, [group, from, to]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    params.set('group', group);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('format', 'csv');
    window.open(`/api/reports/admin/financial?${params.toString()}`, '_blank');
  };

  const kpis = data?.kpis || {
    masar_income: '0.000',
    escrow_commissions: '0.000',
    volume: '0.000',
    held: '0.000',
    released: '0.000',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">
            {isAr ? 'التقارير المالية والعمولات' : 'Financial Reports & Platform Revenue'}
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            {isAr
              ? 'تحليل إيرادات مسار، عمولات SafePay، وحجم تداول الشحن عبر الفترات'
              : 'Detailed breakdown of Masar 4% fee, SafePay commissions, and gross freight volume'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Group Interval Toggle */}
          <div className="flex items-center gap-1 bg-surface border border-line p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setGroup('day')}
              className={`px-3 py-1 rounded-lg transition ${
                group === 'day' ? 'bg-navy-900 text-white shadow-xs' : 'text-ink-muted hover:text-navy-900'
              }`}
            >
              {isAr ? 'يومي' : 'Daily'}
            </button>
            <button
              onClick={() => setGroup('week')}
              className={`px-3 py-1 rounded-lg transition ${
                group === 'week' ? 'bg-navy-900 text-white shadow-xs' : 'text-ink-muted hover:text-navy-900'
              }`}
            >
              {isAr ? 'أسبوعي' : 'Weekly'}
            </button>
            <button
              onClick={() => setGroup('month')}
              className={`px-3 py-1 rounded-lg transition ${
                group === 'month' ? 'bg-navy-900 text-white shadow-xs' : 'text-ink-muted hover:text-navy-900'
              }`}
            >
              {isAr ? 'شهري' : 'Monthly'}
            </button>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 text-xs bg-card border border-line px-2.5 py-1.5 rounded-xl shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-ink-muted" />
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-transparent focus:outline-none text-ink text-xs"
            />
            <span className="text-ink-muted">→</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-transparent focus:outline-none text-ink text-xs"
            />
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-line bg-card hover:bg-surface text-xs font-bold text-navy-900 shadow-2xs transition"
          >
            <Download className="h-3.5 w-3.5 text-amber-500" />
            <span>{isAr ? 'تصدير CSV' : 'Export'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          title={isAr ? 'إيرادات مسار (4%)' : 'Masar Income'}
          value={formatMoney(kpis.masar_income)}
          icon={TrendingUp}
        />
        <StatCard
          title={isAr ? 'عمولات SafePay' : 'Escrow Commission'}
          value={formatMoney(kpis.escrow_commissions)}
          icon={ShieldCheck}
        />
        <StatCard
          title={isAr ? 'إجمالي حجم التداول' : 'Total Volume'}
          value={formatMoney(kpis.volume)}
          icon={Box}
        />
        <StatCard
          title={isAr ? 'المحجوز حالياً' : 'Held in Escrow'}
          value={formatMoney(kpis.held)}
          icon={DollarSign}
        />
        <StatCard
          title={isAr ? 'المصروف للسائقين' : 'Released Payouts'}
          value={formatMoney(kpis.released)}
          icon={DollarSign}
        />
      </div>

      {/* Revenue Over Time Trend */}
      <div className="bg-card rounded-2xl border border-line p-6 shadow-xs">
        <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-4">
          {isAr ? 'سجل الإيرادات عبر الفترات' : 'Periodic Revenue Series'}
        </h2>

        {loading ? (
          <TruckLoader message={isAr ? 'جاري إعداد التقرير المالي...' : 'Calculating financial metrics...'} />
        ) : (
          <div className="divide-y divide-line/60 text-xs">
            {(data?.income_series || []).map((s) => (
              <div key={s.period} className="py-3 flex items-center justify-between">
                <span className="font-mono font-bold text-navy-900">{s.period}</span>
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[10px] text-ink-muted block">{isAr ? 'حجم الشحن' : 'Volume'}</span>
                    <span className="font-mono font-semibold text-navy-900">{formatMoney(s.volume)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-muted block">{isAr ? 'عمولة SafePay' : 'Escrow Fee'}</span>
                    <span className="font-mono font-semibold text-navy-700">{formatMoney(s.escrow_commissions)}</span>
                  </div>
                  <div className="text-end">
                    <span className="text-[10px] text-ink-muted block">{isAr ? 'دخل مسار' : 'Masar Income'}</span>
                    <span className="font-mono font-black text-amber-600 text-sm">+{formatMoney(s.masar_income)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Breakdowns by Manufacturer and Driver */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Manufacturer */}
        <div className="bg-card rounded-2xl border border-line p-6 shadow-xs">
          <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-navy-700" />
            <span>{isAr ? 'حجم التداول حسب المصنع' : 'Freight Volume by Manufacturer'}</span>
          </h2>

          <div className="space-y-3">
            {(data?.by_manufacturer || []).map((m) => (
              <div key={m.manufacturer_id} className="flex items-center justify-between text-xs py-1.5 border-b border-line/40">
                <div>
                  <span className="font-bold text-navy-900">{m.name}</span>
                  <div className="text-[10px] text-ink-muted">
                    {m.count} {isAr ? 'شحنة' : 'shipments'}
                  </div>
                </div>
                <div className="text-end">
                  <span className="font-mono font-bold text-navy-900">{formatMoney(m.volume)}</span>
                  <div className="text-[10px] text-amber-600 font-semibold">
                    Fee: +{formatMoney(m.masar_revenue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Driver */}
        <div className="bg-card rounded-2xl border border-line p-6 shadow-xs">
          <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Truck className="h-4 w-4 text-emerald-600" />
            <span>{isAr ? 'أرباح السائقين حسب السائق' : 'Driver Net Payouts by Driver'}</span>
          </h2>

          <div className="space-y-3">
            {(data?.by_driver || []).map((d) => (
              <div key={d.driver_id} className="flex items-center justify-between text-xs py-1.5 border-b border-line/40">
                <div>
                  <span className="font-bold text-navy-900">{d.name}</span>
                  <div className="text-[10px] text-ink-muted">
                    {d.count} {isAr ? 'شحنة مكتملة' : 'completed shipments'}
                  </div>
                </div>
                <div className="text-end">
                  <span className="font-mono font-bold text-emerald-600">{formatMoney(d.driver_net)}</span>
                  <div className="text-[10px] text-ink-muted">
                    Volume: {formatMoney(d.volume)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

