import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package,
  PlusCircle,
  CheckCircle2,
  Clock,
  Truck,
  ArrowRight,
  MapPin,
  Calendar,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { useAuth } from '../../state/auth.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';

export default function ManufacturerOverview() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchShipments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient('/tickets');
      setTickets(data.items || []);
    } catch (err) {
      console.error('Failed to load manufacturer shipments:', err);
      setError(err.message || 'Failed to load shipments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const requestedCount = tickets.filter((t) => t.status === 'requested').length;
  const activeCount = tickets.filter((t) => ['waiting_load', 'in_delivery'].includes(t.status)).length;
  const deliveredCount = tickets.filter((t) => t.status === 'delivered').length;
  const auditedCount = tickets.filter((t) => t.status === 'audited').length;

  const filteredTickets =
    statusFilter === 'all'
      ? tickets
      : statusFilter === 'active'
      ? tickets.filter((t) => ['waiting_load', 'in_delivery'].includes(t.status))
      : tickets.filter((t) => t.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">
            {isAr ? 'لوحة تحكم المصنع' : 'Manufacturer Dashboard'}
          </h1>
          <p className="text-xs text-ink-muted">
            {isAr ? `مرحباً بك، ${user?.name}` : `Welcome back, ${user?.name}`}
          </p>
        </div>
        <Link
          to="/manufacturer/shipments/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-navy-900 font-bold text-xs shadow-xs transition"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>{isAr ? 'طلب شحنة جديدة' : 'Post New Shipment'}</span>
        </Link>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('all')}
          className={`bg-card rounded-2xl border p-4 cursor-pointer transition-all ${
            statusFilter === 'all' ? 'border-navy-900 ring-1 ring-navy-900' : 'border-line'
          }`}
        >
          <div className="text-xs font-semibold text-ink-muted">{isAr ? 'إجمالي الشحنات' : 'Total Shipments'}</div>
          <div className="text-2xl font-black text-navy-900 mt-1">{tickets.length}</div>
        </div>

        <div
          onClick={() => setStatusFilter('requested')}
          className={`bg-card rounded-2xl border p-4 cursor-pointer transition-all ${
            statusFilter === 'requested' ? 'border-amber-500 ring-1 ring-amber-500' : 'border-line'
          }`}
        >
          <div className="text-xs font-semibold text-ink-muted">{isAr ? 'بانتظار الدفع' : 'Awaiting Payment'}</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{requestedCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('active')}
          className={`bg-card rounded-2xl border p-4 cursor-pointer transition-all ${
            statusFilter === 'active' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-line'
          }`}
        >
          <div className="text-xs font-semibold text-ink-muted">{isAr ? 'قيد التحميل والتوصيل' : 'In Transit'}</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{activeCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('delivered')}
          className={`bg-card rounded-2xl border p-4 cursor-pointer transition-all ${
            statusFilter === 'delivered' ? 'border-purple-500 ring-1 ring-purple-500' : 'border-line'
          }`}
        >
          <div className="text-xs font-semibold text-ink-muted">{isAr ? 'بانتظار تأكيدك' : 'Needs Confirmation'}</div>
          <div className="text-2xl font-black text-purple-700 mt-1">{deliveredCount}</div>
        </div>
      </div>

      {/* Action alert banner if any delivered shipments need confirmation */}
      {deliveredCount > 0 && (
        <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-purple-950">
                {isAr
                  ? `لديك ${deliveredCount} شحنة تم تسليمها وتنتظر تأكيدك لصرف مستحقات السائق!`
                  : `You have ${deliveredCount} delivered shipment awaiting your confirmation to release payout!`}
              </div>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('delivered')}
            className="px-3.5 py-1.5 rounded-lg bg-purple-700 text-white text-xs font-bold hover:bg-purple-800"
          >
            {isAr ? 'عرض الشحنات' : 'Review'}
          </button>
        </div>
      )}

      {/* Shipments List Table */}
      <div className="bg-card rounded-2xl border border-line shadow-xs overflow-hidden">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            <span>{isAr ? 'سجل الشحنات' : 'Shipments'}</span>
          </h2>

          {/* Quick filter pills */}
          <div className="flex items-center gap-1.5">
            {[
              { key: 'all', label: isAr ? 'الكل' : 'All' },
              { key: 'requested', label: isAr ? 'غير مدفوعة' : 'Awaiting Pay' },
              { key: 'pending', label: isAr ? 'مفتوحة' : 'Open' },
              { key: 'active', label: isAr ? 'نشطة' : 'In Transit' },
              { key: 'delivered', label: isAr ? 'تم التسليم' : 'Delivered' },
              { key: 'audited', label: isAr ? 'مؤكدة' : 'Confirmed' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  statusFilter === f.key
                    ? 'bg-navy-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <TruckLoader size="md" />
            <span className="text-xs text-ink-muted">{isAr ? 'جاري التحميل...' : 'Loading shipments...'}</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600">
            {error}
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-xs font-bold text-navy-900">
              {isAr ? 'لا توجد شحنات في هذه القائمة' : 'No shipments found'}
            </h3>
            <p className="text-[11px] text-ink-muted max-w-xs mx-auto">
              {isAr
                ? 'أنشئ شحنتك الأولى وسيتم ترشيح الشاحنات وتأمين النقل عبر حساب الضمان.'
                : 'Create your first freight request and get matched with verified trucks.'}
            </p>
            <Link
              to="/manufacturer/shipments/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy-900 text-white text-xs font-bold hover:bg-navy-800"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isAr ? 'طلب شحنة جديدة' : 'Post Shipment'}</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-line text-ink-muted font-semibold">
                  <th className="py-3 px-4 text-start">{isAr ? 'رقم الشحنة' : 'Shipment #'}</th>
                  <th className="py-3 px-4 text-start">{isAr ? 'المسار' : 'Route'}</th>
                  <th className="py-3 px-4 text-start">{isAr ? 'البضاعة والحمولة' : 'Cargo'}</th>
                  <th className="py-3 px-4 text-start">{isAr ? 'موعد التحميل' : 'Pickup Time'}</th>
                  <th className="py-3 px-4 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="py-3 px-4 text-end">{isAr ? 'السعر' : 'Price'}</th>
                  <th className="py-3 px-4 text-end">{isAr ? 'عرض' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredTickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/manufacturer/shipments/${t.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-navy-900">
                      {t.ticket_number}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-navy-900 flex items-center gap-1">
                        <span>{t.pickup?.city || 'Amman'}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400 rtl:rotate-180" />
                        <span>{t.dest?.city || 'Zarqa'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {t.distance_km ? `${t.distance_km} km` : ''}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{t.goods?.category_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {t.goods?.quantity} {t.goods?.unit}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {formatDateTime(t.pickup_at)}
                    </td>

                    <td className="py-3 px-4">
                      <StatusChip status={t.status} />
                    </td>

                    <td className="py-3 px-4 text-end font-mono font-bold text-navy-900">
                      {formatMoney(t.price)}
                    </td>

                    <td className="py-3 px-4 text-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/manufacturer/shipments/${t.id}`);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-line bg-white hover:bg-slate-50 text-navy-900 text-xs font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
