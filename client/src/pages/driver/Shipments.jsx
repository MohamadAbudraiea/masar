import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package,
  Truck,
  ArrowRight,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { useAuth } from '../../state/auth.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';

export default function DriverShipments() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const navigate = useNavigate();

  const [availableItems, setAvailableItems] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [availRes, activeRes] = await Promise.all([
        apiClient('/driver/available'),
        apiClient('/driver/active').catch(() => null),
      ]);
      setAvailableItems(availRes.items || []);
      setActiveTicket(activeRes);
    } catch (err) {
      console.error('Failed to load driver shipments:', err);
      setError(err.message || 'Failed to fetch shipments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAccept = async (ticket) => {
    if (!ticket.can_accept) {
      alert(
        isAr
          ? 'لديك شحنة نشطة قيد التنفيذ حالياً. أكمل شحنتك أولاً.'
          : 'You already have an active shipment. Complete it first.'
      );
      return;
    }

    if (
      !window.confirm(
        isAr
          ? `هل ترغب بقبول هذه الشحنة؟ ستحصل على صافي أرباح ${ticket.earnings} د.أ`
          : `Accept this shipment? Your net earnings will be ${ticket.earnings} JD`
      )
    ) {
      return;
    }

    try {
      setAcceptingId(ticket.id);
      await apiClient(`/tickets/${ticket.id}/accept`, { method: 'POST' });
      navigate('/driver/active');
    } catch (err) {
      alert(err.message || 'Failed to accept shipment');
      await loadData();
    } finally {
      setAcceptingId(null);
    }
  };

  const isBusy = !!activeTicket;

  return (
    <div className="space-y-4">
      {/* Driver Status Banner */}
      <div className="p-4 rounded-2xl bg-card border border-line shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
            <Truck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-xs font-bold text-navy-900">
              {isAr ? 'شاحنتك المعتمدة:' : 'Registered Truck:'}
            </div>
            <div className="text-[11px] text-ink-muted">
              {user?.profile?.truck
                ? `${user.profile.truck.type_name} · ${user.profile.truck.body_name} (${user.profile.truck.plate_number})`
                : isAr ? 'نقل متوسط (براد)' : 'Medium / Refrigerated'}
            </div>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
            isBusy
              ? 'bg-amber-100 text-amber-900 border border-amber-200'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
          }`}
        >
          {isBusy
            ? isAr ? 'مشغول بشحنة نشطة' : 'Busy on active trip'
            : isAr ? 'جاهز للشحن' : 'Ready / Free'}
        </span>
      </div>

      {/* Active Trip Notice */}
      {isBusy && (
        <div
          onClick={() => navigate('/driver/active')}
          className="p-4 rounded-2xl bg-blue-50 border border-blue-200 cursor-pointer flex items-center justify-between transition-transform active:scale-98"
        >
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
              {isAr ? 'لديك شحنة قيد التنفيذ حالياً' : 'Active Trip in Progress'}
            </span>
            <div className="text-xs font-black text-navy-900">
              {activeTicket.ticket_number} · {activeTicket.pickup?.city} → {activeTicket.dest?.city}
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-blue-700">
            <span>{isAr ? 'عرض' : 'View'}</span>
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </div>
        </div>
      )}

      {/* Available Shipments Heading */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-sm font-black text-navy-900 flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-600" />
          <span>{isAr ? 'الشحنات المتاحة المطابقة لشاحنتك' : 'Open Matching Shipments'}</span>
        </h2>
        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-700">
          {availableItems.length}
        </span>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <TruckLoader size="md" />
          <span className="text-xs text-ink-muted">{isAr ? 'جاري البحث عن شحنات...' : 'Searching shipments...'}</span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
          <p className="text-xs text-rose-800 font-semibold">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-1.5 rounded-xl bg-navy-900 text-white text-xs font-bold"
          >
            {isAr ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      ) : availableItems.length === 0 ? (
        <div className="p-8 bg-card rounded-2xl border border-line text-center space-y-3">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-navy-900">
            {isAr ? 'لا توجد شحنات مفتوحة حالياً' : 'No open shipments match your truck'}
          </h3>
          <p className="text-xs text-ink-muted leading-relaxed max-w-xs mx-auto">
            {isAr
              ? 'فور أن ينشر أحد المصانع شحنة تطابق مواصفات وحمولة شاحنتك، ستظهر لك هنا مباشرة مع إشعار فوري.'
              : 'New freight requests matching your truck type and payload capacity will automatically appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {availableItems.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-card rounded-2xl border border-line p-5 shadow-xs space-y-4 transition-all"
            >
              {/* Route Banner (High Contrast) */}
              <div className="flex items-start justify-between gap-2 border-b border-line pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 block mb-0.5">
                    {ticket.ticket_number}
                  </span>
                  <div className="text-base font-black text-navy-900 flex items-center gap-2">
                    <span>{ticket.pickup?.city || 'Amman'}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 rtl:rotate-180 shrink-0" />
                    <span>{ticket.dest?.city || 'Zarqa'}</span>
                  </div>
                  <div className="text-xs text-ink-muted mt-0.5">
                    {ticket.pickup?.area ? `${ticket.pickup.area} → ` : ''}
                    {ticket.dest?.area || ''}
                    {ticket.distance_km ? ` (${ticket.distance_km} km)` : ''}
                  </div>
                </div>

                {/* Big Bold Earnings Box (Driver sees earnings ONLY) */}
                <div className="text-end bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl shrink-0">
                  <span className="text-[10px] font-bold text-emerald-800 block uppercase tracking-wider">
                    {isAr ? 'صافي أرباحك' : 'Your Earnings'}
                  </span>
                  <div className="text-lg font-black font-mono text-emerald-700 leading-tight">
                    {formatMoney(ticket.earnings)}
                  </div>
                </div>
              </div>

              {/* Cargo & Pickup Time */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-ink-muted block">{isAr ? 'البضاعة والحمولة' : 'Cargo'}</span>
                  <span className="font-bold text-navy-900">{ticket.goods?.category_name}</span>
                  <span className="text-slate-500 font-mono ms-1">
                    ({ticket.goods?.quantity} {ticket.goods?.unit})
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-ink-muted block">{isAr ? 'موعد التحميل' : 'Pickup Time'}</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {formatDateTime(ticket.pickup_at)}
                  </span>
                </div>
              </div>

              {/* Special Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {ticket.needs_loading && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium">
                    {isAr ? 'تحميل بالمصنع' : 'Loading at pickup'}
                  </span>
                )}
                {ticket.needs_unloading && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium">
                    {isAr ? 'تفريغ بالموقع' : 'Unloading at dest'}
                  </span>
                )}
                {ticket.is_customs && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[10px] font-bold border border-blue-200">
                    {isAr ? 'معاملة جمركية' : 'Customs shipment'}
                  </span>
                )}
                {ticket.is_hazardous && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                    ⚠️ ADR
                  </span>
                )}
              </div>

              {/* Big Green Accept Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={!ticket.can_accept || acceptingId === ticket.id}
                  onClick={() => handleAccept(ticket)}
                  className={`w-full py-3.5 px-4 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-xs ${
                    ticket.can_accept
                      ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white'
                      : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>
                    {acceptingId === ticket.id
                      ? isAr ? 'جاري القبول...' : 'Accepting...'
                      : !ticket.can_accept
                      ? isAr ? 'أكمل شحنتك النشطة أولاً' : 'Finish your active shipment first'
                      : isAr ? 'قبول الشحنة الآن' : 'Accept Shipment'}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
