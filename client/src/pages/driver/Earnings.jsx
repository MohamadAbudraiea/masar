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

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true);
        const data = await apiClient('/driver/history');
        setHistory(data.items || []);
      } catch (err) {
        console.error('Failed to load driver history:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const totalEarnings = history
    .filter((t) => t.status === 'audited')
    .reduce((sum, t) => sum + (Number(t.earnings) || 0), 0);

  const pendingEarnings = history
    .filter((t) => t.status === 'delivered')
    .reduce((sum, t) => sum + (Number(t.earnings) || 0), 0);

  const profile = user?.profile || {};

  return (
    <div className="space-y-4 pb-12">
      {/* Earnings Overview Card */}
      <div className="bg-navy-900 text-white rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {isAr ? 'محفظة الأرباح والمستحقات' : 'Earnings Wallet'}
            </span>
          </div>
          <span className="text-xs text-emerald-400 font-bold">
            ✓ {isAr ? 'ضمان سيف باي' : 'SafePay Guaranteed'}
          </span>
        </div>

        <div>
          <span className="text-xs text-slate-400 block mb-0.5">
            {isAr ? 'إجمالي الأرباح المستلمة' : 'Total Released Earnings'}
          </span>
          <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
            {formatMoney(totalEarnings)}
          </div>
        </div>

        {pendingEarnings > 0 && (
          <div className="bg-navy-800/80 rounded-xl p-3 flex items-center justify-between text-xs">
            <span className="text-slate-300">
              {isAr ? 'أرباح بانتظار تأكيد المصنع:' : 'Pending Release:'}
            </span>
            <span className="font-mono font-bold text-amber-400">
              {formatMoney(pendingEarnings)}
            </span>
          </div>
        )}
      </div>

      {/* Payout Account Snapshot Card */}
      <div className="bg-card rounded-2xl border border-line p-4 space-y-2 text-xs">
        <h3 className="font-bold text-navy-900 flex items-center gap-1.5 border-b border-line pb-2">
          <Building2 className="w-4 h-4 text-emerald-600" />
          <span>{isAr ? 'حساب تحويل المستحقات المعتمد' : 'Registered Payout Account'}</span>
        </h3>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <span className="text-[11px] text-ink-muted block">{isAr ? 'طريقة التحويل' : 'Method'}</span>
            <span className="font-bold text-navy-900 uppercase">{profile.payout_method || 'IBAN'}</span>
          </div>
          <div>
            <span className="text-[11px] text-ink-muted block">{isAr ? 'البنك أو المعرف' : 'Bank / Alias'}</span>
            <span className="font-medium text-navy-900">{profile.bank_name || profile.cliq_alias || 'Jordan Commercial Bank'}</span>
          </div>
          <div className="col-span-2">
            <span className="text-[11px] text-ink-muted block">{isAr ? 'رقم الآيبان' : 'IBAN'}</span>
            <span className="font-mono font-bold text-navy-900">{profile.iban || 'JO94CBJO0010000000000131000001'}</span>
          </div>
        </div>
      </div>

      {/* Completed Shipments List */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-navy-900 flex items-center justify-between">
          <span>{isAr ? 'سجل الرحلات المنفذة' : 'Completed Trips'}</span>
          <span className="text-[11px] text-ink-muted">({history.length})</span>
        </h3>

        {loading ? (
          <div className="py-12 flex justify-center">
            <TruckLoader size="sm" />
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 bg-card rounded-2xl border border-line text-center text-xs text-ink-muted">
            {isAr ? 'لم تسجل أي شحنات مكتملة بعد' : 'No completed shipments yet'}
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.map((t) => (
              <div
                key={t.id}
                className="bg-card rounded-2xl border border-line p-4 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {t.ticket_number}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.status === 'audited'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {t.status === 'audited'
                      ? isAr ? 'تم التحويل لحسابك' : 'Paid'
                      : isAr ? 'بانتظار التأكيد' : 'Delivered'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                    <span>{t.pickup?.city || 'Amman'}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 rtl:rotate-180" />
                    <span>{t.dest?.city || 'Zarqa'}</span>
                  </div>

                  <div className="font-mono font-black text-emerald-600 text-sm">
                    +{formatMoney(t.earnings)}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-line">
                  <span>{formatDateTime(t.created_at)}</span>
                  {t.rating?.mine && (
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3 h-3 fill-amber-500" />
                      <span>{t.rating.mine.stars}★</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

