import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Wallet,
  CheckCircle,
  Truck,
  ArrowRight,
  Star,
  Building2,
  Calendar,
  AlertCircle,
  Clock,
  Download,
} from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { useAuth } from '../../state/auth.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';

export default function DriverEarnings() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [earningsData, setEarningsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient(`/reports/driver/earnings${qs}`);
      setEarningsData(data);
    } catch (err) {
      console.error('Failed to load driver earnings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, [from, to]);

  const kpis = earningsData?.kpis || {
    pending_release: '0.000',
    paid_out: '0.000',
    this_month: '0.000',
    completed_count: 0,
  };

  const payoutAccount = earningsData?.payout_account || {};
  const items = earningsData?.items || [];

  return (
    <div className="space-y-4 pb-12">
      {/* Earnings Wallet Hero Card */}
      <div className="bg-navy-900 text-white rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {isAr ? 'محفظة الأرباح والمستحقات' : 'Earnings Wallet'}
            </span>
          </div>
          <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
            ✓ {isAr ? 'ضمان SafePay' : 'SafePay Guaranteed'}
          </span>
        </div>

        <div>
          <span className="text-xs text-slate-400 block mb-0.5">
            {isAr ? 'إجمالي الأرباح المصروفة' : 'Total Paid Out Earnings'}
          </span>
          <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
            {formatMoney(kpis.paid_out)}
          </div>
        </div>

        {/* 4 KPIs Grid */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-navy-800 text-xs">
          <div className="bg-navy-800/60 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-400 block">{isAr ? 'بانتظار الصرف' : 'Pending Release'}</span>
            <span className="font-bold text-amber-400 font-mono text-sm">
              {formatMoney(kpis.pending_release)}
            </span>
          </div>

          <div className="bg-navy-800/60 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-400 block">{isAr ? 'أرباح هذا الشهر' : 'This Month'}</span>
            <span className="font-bold text-white font-mono text-sm">
              {formatMoney(kpis.this_month)}
            </span>
          </div>
        </div>
      </div>

      {/* Payout Account Info Card */}
      <div className="bg-card rounded-2xl border border-line p-4 space-y-2 text-xs">
        <h3 className="font-bold text-navy-900 flex items-center gap-1.5 border-b border-line pb-2">
          <Building2 className="w-4 h-4 text-emerald-600" />
          <span>{isAr ? 'حساب تحويل المستحقات المعتمد' : 'Payout Account'}</span>
        </h3>

        <div className="space-y-1.5 pt-1">
          <div>
            <span className="text-[10px] text-ink-muted block">{isAr ? 'رقم الآيبان (IBAN)' : 'IBAN Account'}</span>
            <span className="font-mono font-bold text-navy-900 block" dir="ltr">
              {payoutAccount.iban || 'JO0000000000000000000000000000'}
            </span>
          </div>
          {payoutAccount.cliq_alias && (
            <div>
              <span className="text-[10px] text-ink-muted block">{isAr ? 'معرّف كليك (CliQ Alias)' : 'CliQ Alias'}</span>
              <span className="font-mono font-medium text-navy-900" dir="ltr">
                {payoutAccount.cliq_alias}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Date Filter & Export */}
      <div className="bg-card rounded-xl border border-line p-3 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-ink-muted" />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-surface/50 border border-line px-1.5 py-1 rounded text-[11px]"
          />
          <span className="text-ink-muted">→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-surface/50 border border-line px-1.5 py-1 rounded text-[11px]"
          />
        </div>

        <button
          onClick={() => {
            const qs = new URLSearchParams();
            if (from) qs.set('from', from);
            if (to) qs.set('to', to);
            qs.set('format', 'csv');
            window.open(`/api/reports/driver/earnings?${qs.toString()}`, '_blank');
          }}
          className="p-1.5 rounded-lg border border-line bg-surface hover:bg-slate-200 text-ink-muted"
          title={isAr ? 'تصدير CSV' : 'Export CSV'}
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Earnings Records List */}
      <div className="bg-card rounded-2xl border border-line p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <h3 className="font-bold text-xs text-navy-900">
            {isAr ? 'سجل مستحقات الشحنات' : 'Shipment Payouts History'}
          </h3>
          <span className="text-[10px] text-ink-muted">
            {kpis.completed_count} {isAr ? 'شحنة مكتملة' : 'completed shipments'}
          </span>
        </div>

        {loading ? (
          <TruckLoader message={isAr ? 'جاري تحميل السجل...' : 'Loading payouts...'} />
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-xs text-ink-muted">
            {isAr ? 'لا توجد أرباح مسجلة في هذه الفترة' : 'No payout records found for this period'}
          </div>
        ) : (
          <div className="divide-y divide-line/60">
            {items.map((item) => (
              <div key={item.ticket_id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-navy-900">{item.ticket_number}</div>
                  <div className="text-[11px] text-ink-muted">
                    {item.pickup_city} → {item.dest_city}
                  </div>
                  <div className="text-[10px] text-ink-muted mt-0.5">
                    {formatDateTime(item.completed_at || item.created_at)}
                  </div>
                </div>

                <div className="text-end">
                  <div className="font-black font-mono text-sm text-emerald-600">
                    +{formatMoney(item.earnings)}
                  </div>
                  <span
                    className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold mt-0.5 ${
                      item.status === 'audited'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.status === 'audited'
                      ? isAr
                        ? 'تم التحويل'
                        : 'Transferred'
                      : isAr
                      ? 'بانتظار الصرف'
                      : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
