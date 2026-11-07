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
  Navigation,
} from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { useAuth } from '../../state/auth.jsx';
import { useToast } from '../../state/toast.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';

export default function DriverShipments() {
  const { user } = useAuth();
  const toast = useToast();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const navigate = useNavigate();

  const [availableItems, setAvailableItems] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);
  const [acceptModalTicket, setAcceptModalTicket] = useState(null);
  const [busyModalOpen, setBusyModalOpen] = useState(false);

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

  const handleAcceptClick = (ticket) => {
    if (!ticket.can_accept) {
      setBusyModalOpen(true);
      return;
    }
    setAcceptModalTicket(ticket);
  };

  const handleConfirmAccept = async () => {
    if (!acceptModalTicket) return;
    const ticketId = acceptModalTicket.id;
    try {
      setAcceptingId(ticketId);
      await apiClient(`/tickets/${ticketId}/accept`, { method: 'POST' });
      toast.success(
        isAr
          ? 'تم قبول الشحنة بنجاح! انتقلت الشحنة إلى قائمة مهامك.'
          : 'Shipment accepted successfully! Added to your active trip.'
      );
      setAcceptModalTicket(null);
      navigate('/driver/active');
    } catch (err) {
      toast.error(err.message || 'Failed to accept shipment');
      setAcceptModalTicket(null);
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
            <div className="text-[15px] font-bold text-navy-900">
              {isAr ? 'شاحنتك المعتمدة:' : 'Registered Truck:'}
            </div>
            <div className="text-sm text-ink-muted">
              {user?.profile?.truck
                ? `${user.profile.truck.type_name || user.profile.truck.type || ''} · ${user.profile.truck.body_name || user.profile.truck.body || ''} (${user.profile.truck.plate_number})`
                : isAr ? 'نقل متوسط (براد)' : 'Medium / Refrigerated'}
            </div>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-[15px] font-bold shrink-0 ${
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

      {/* Available Shipments or Active Trip View */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <TruckLoader size="md" />
          <span className="text-[15px] text-ink-muted">{isAr ? 'جاري البحث عن شحنات...' : 'Searching shipments...'}</span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
          <p className="text-[15px] text-rose-800 font-semibold">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-1.5 rounded-xl bg-navy-900 text-white text-[15px] font-bold"
          >
            {isAr ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      ) : isBusy ? (
        /* Driver is busy on an active trip - hide available shipments and show active trip view */
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border-2 border-primary/30 p-6 shadow-sm space-y-5">
            {/* Header / Notice */}
            <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Navigation className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {activeTicket.status === 'in_delivery'
                        ? isAr ? 'على الطريق (قيد النقل)' : 'In Transit'
                        : isAr ? 'بانتظار التحميل' : 'Waiting at Loading'}
                    </span>
                    <span className="text-xs font-mono font-bold text-ink-muted">
                      {activeTicket.ticket_number}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-navy-900 mt-1">
                    {isAr ? 'لديك رحلة نشطة قيد التنفيذ' : 'You Have an Active Shipment in Progress'}
                  </h3>
                </div>
              </div>

              <div className="text-end bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl shrink-0">
                <span className="text-xs font-bold text-emerald-800 block uppercase tracking-wider">
                  {isAr ? 'أرباح الرحلة' : 'Earnings'}
                </span>
                <span className="text-base font-black text-emerald-700">
                  {formatMoney(activeTicket.earnings)}
                </span>
              </div>
            </div>

            {/* Route & Cargo details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface/50 p-4 rounded-xl border border-line/60">
              <div className="space-y-1">
                <span className="text-xs text-ink-muted block font-semibold">{isAr ? 'خط السير' : 'Route'}</span>
                <div className="text-base font-black text-navy-900 flex items-center gap-2">
                  <span>{activeTicket.pickup?.city || 'Amman'}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 rtl:rotate-180 shrink-0" />
                  <span>{activeTicket.dest?.city || 'Zarqa'}</span>
                </div>
                <div className="text-xs text-ink-muted">
                  {activeTicket.pickup?.area ? `${activeTicket.pickup.area} → ` : ''}
                  {activeTicket.dest?.area || ''}
                  {activeTicket.distance_km ? ` (${activeTicket.distance_km} km)` : ''}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-ink-muted block font-semibold">{isAr ? 'البضاعة والحمولة' : 'Cargo'}</span>
                <div className="text-base font-black text-navy-900">
                  {activeTicket.goods?.category_name || activeTicket.goods?.category}
                </div>
                <div className="text-xs text-slate-500">
                  {activeTicket.goods?.quantity} {activeTicket.goods?.unit}
                </div>
              </div>
            </div>

            {/* Explanation Message */}
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900 leading-relaxed">
                <span className="font-bold block mb-0.5">
                  {isAr ? 'أكمل رحلتك الحالية للاطلاع على الشحنات المتاحة' : 'Complete your trip to see other shipments'}
                </span>
                {isAr
                  ? 'تلتزم منصة مسار بمبدأ (شحنة واحدة لكل سائق) لضمان الدقة والأمان والتسليم في الموعد. يتم إخفاء قائمة الشحنات المفتوحة حتى تنتهي من تسليم شحنتك الحالية بالكامل، وستظهر فوراً عند إتمامها.'
                  : 'Masar enforces the 1-shipment-per-driver policy to ensure punctuality and cargo safety. Other available shipments are hidden until you finish your current trip, and will unlock immediately upon delivery.'}
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={() => navigate('/driver/active')}
              className="w-full py-3.5 px-5 rounded-xl bg-primary hover:bg-primary-hover active:scale-98 text-white text-[15px] font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Navigation className="w-5 h-5 stroke-[2.2]" />
              <span>{isAr ? 'الانتقال إلى شاشة الرحلة ومتابعة التسليم' : 'Open Active Trip & Delivery Screen'}</span>
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Available Shipments Heading */}
          <div className="flex items-center justify-between pt-1">
            <h2 className="text-sm font-black text-navy-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>{isAr ? 'الشحنات المتاحة المطابقة لشاحنتك' : 'Open Matching Shipments'}</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-sm font-bold bg-slate-100 text-slate-700">
              {availableItems.length}
            </span>
          </div>

          {availableItems.length === 0 ? (
            <div className="p-8 bg-card rounded-2xl border border-line text-center space-y-3">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-navy-900">
                {isAr ? 'لا توجد شحنات مفتوحة حالياً' : 'No open shipments match your truck'}
              </h3>
              <p className="text-[15px] text-ink-muted leading-relaxed max-w-xs mx-auto">
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
                      <span className="text-sm font-bold text-slate-400 block mb-0.5">
                        {ticket.ticket_number}
                      </span>
                      <div className="text-base font-black text-navy-900 flex items-center gap-2">
                        <span>{ticket.pickup?.city || 'Amman'}</span>
                        <ArrowRight className="w-4 h-4 text-slate-400 rtl:rotate-180 shrink-0" />
                        <span>{ticket.dest?.city || 'Zarqa'}</span>
                      </div>
                      <div className="text-[15px] text-ink-muted mt-0.5">
                        {ticket.pickup?.area ? `${ticket.pickup.area} → ` : ''}
                        {ticket.dest?.area || ''}
                        {ticket.distance_km ? ` (${ticket.distance_km} km)` : ''}
                      </div>
                    </div>

                    {/* Big Bold Earnings Box (Driver sees earnings ONLY) */}
                    <div className="text-end bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl shrink-0">
                      <span className="text-sm font-bold text-emerald-800 block uppercase tracking-wider">
                        {isAr ? 'صافي أرباحك' : 'Your Earnings'}
                      </span>
                      <div className="text-lg font-black text-emerald-700 leading-tight">
                        {formatMoney(ticket.earnings)}
                      </div>
                    </div>
                  </div>

                  {/* Cargo & Pickup Time */}
                  <div className="grid grid-cols-2 gap-3 text-[15px]">
                    <div>
                      <span className="text-sm text-ink-muted block">{isAr ? 'البضاعة والحمولة' : 'Cargo'}</span>
                      <span className="font-bold text-navy-900">{ticket.goods?.category_name}</span>
                      <span className="text-slate-500 ms-1">
                        ({ticket.goods?.quantity} {ticket.goods?.unit})
                      </span>
                    </div>

                    <div>
                      <span className="text-sm text-ink-muted block">{isAr ? 'موعد التحميل' : 'Pickup Time'}</span>
                      <span className="font-semibold text-slate-800">
                        {formatDateTime(ticket.pickup_at)}
                      </span>
                    </div>
                  </div>

                  {/* Special Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {ticket.needs_loading && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-sm font-medium">
                        {isAr ? 'تحميل بالمصنع' : 'Loading at pickup'}
                      </span>
                    )}
                    {ticket.needs_unloading && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-sm font-medium">
                        {isAr ? 'تفريغ بالموقع' : 'Unloading at dest'}
                      </span>
                    )}
                    {ticket.is_customs && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-sm font-bold border border-blue-200">
                        {isAr ? 'معاملة جمركية' : 'Customs shipment'}
                      </span>
                    )}
                    {ticket.is_hazardous && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-sm font-bold border border-amber-200">
                        ⚠️ ADR
                      </span>
                    )}
                  </div>

                  {/* Big Green Accept Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={acceptingId === ticket.id}
                      onClick={() => handleAcceptClick(ticket)}
                      className={`w-full py-3.5 px-4 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-xs ${
                        ticket.can_accept
                          ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white'
                          : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
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
        </>
      )}

      {/* Accept Shipment Confirmation Modal Popup */}
      <ConfirmModal
        isOpen={!!acceptModalTicket}
        onClose={() => setAcceptModalTicket(null)}
        onConfirm={handleConfirmAccept}
        loading={acceptingId === acceptModalTicket?.id}
        variant="primary"
        title={isAr ? 'تأكيد قبول الشحنة' : 'Confirm Accept Shipment'}
        description={
          isAr
            ? `يرجى مراجعة تفاصيل الشحنة قبل تأكيد استلام أمر النقل.`
            : `Review shipment details before accepting the freight order.`
        }
        confirmText={isAr ? 'تأكيد وقبول الشحنة' : 'Confirm & Accept'}
        cancelText={isAr ? 'تراجع' : 'Cancel'}
      >
        {acceptModalTicket && (
          <div className="space-y-3">
            {/* Route & Cargo Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-line space-y-2 text-[15px]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-400 text-sm">
                  {acceptModalTicket.ticket_number}
                </span>
                {acceptModalTicket.distance_km && (
                  <span className="font-semibold text-slate-600 text-sm">
                    {acceptModalTicket.distance_km} km
                  </span>
                )}
              </div>

              <div className="text-sm font-black text-navy-900 flex items-center gap-2">
                <span>{acceptModalTicket.pickup?.city || 'Amman'}</span>
                <ArrowRight className="w-4 h-4 text-slate-400 rtl:rotate-180 shrink-0" />
                <span>{acceptModalTicket.dest?.city || 'Zarqa'}</span>
              </div>

              <div className="text-sm text-ink-muted flex items-center justify-between pt-1 border-t border-line/60">
                <span>{acceptModalTicket.goods?.category_name}</span>
                <span className="font-bold text-navy-900">
                  {acceptModalTicket.goods?.quantity} {acceptModalTicket.goods?.unit}
                </span>
              </div>
            </div>

            {/* Guaranteed Earnings Box */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
              <span className="text-sm font-bold uppercase tracking-wider text-emerald-800 block">
                {isAr ? 'صافي أرباحك المضمونة' : 'Your Guaranteed Net Earnings'}
              </span>
              <div className="text-2xl font-black text-emerald-700">
                {formatMoney(acceptModalTicket.earnings)}
              </div>
              <p className="text-sm text-emerald-900 font-medium pt-1">
                {isAr
                  ? 'المبلغ مودع مسبقاً في حساب سيف باي وسيتم تحويله لحسابك البنكي فور التسليم.'
                  : 'Funds are secured in SafePay Escrow and automatically released to your bank upon delivery.'}
              </p>
            </div>
          </div>
        )}
      </ConfirmModal>

      {/* Driver Busy Notice Modal Popup */}
      <ConfirmModal
        isOpen={busyModalOpen}
        onClose={() => setBusyModalOpen(false)}
        onConfirm={() => {
          setBusyModalOpen(false);
          navigate('/driver/active');
        }}
        variant="warning"
        title={isAr ? 'لديك شحنة نشطة قيد التنفيذ' : 'Active Shipment in Progress'}
        description={
          isAr
            ? 'تلتزم منصة مسار بقاعدة (شحنة واحدة لكل سائق) لضمان أعلى مستويات الالتزام بالمواعيد. يرجى إتمام وتأكيد تسليم شحنتك الحالية قبل قبول شحنة جديدة.'
            : 'Masar enforces one active trip per driver to ensure maximum punctuality. Please complete your current shipment before accepting a new one.'
        }
        confirmText={isAr ? 'عرض الشحنة النشطة' : 'View Active Shipment'}
        cancelText={isAr ? 'إغلاق' : 'Close'}
      />
    </div>
  );
}
