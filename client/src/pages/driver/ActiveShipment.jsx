import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Navigation,
  MapPin,
  Phone,
  Clock,
  CheckCircle,
  Truck,
  ExternalLink,
  Package,
  AlertCircle,
  ShieldCheck,
  Building2,
  User,
} from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { useToast } from '../../state/toast.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';

export default function ActiveShipment() {
  const navigate = useNavigate();
  const toast = useToast();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDeliveredModal, setShowDeliveredModal] = useState(false);

  const fetchActive = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient('/driver/active');
      setTicket(data);
    } catch (err) {
      console.error('Failed to load active trip:', err);
      setError(err.message || 'Failed to fetch active shipment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActive();
  }, []);

  // Mark arrived at pickup
  const handleArrived = async () => {
    try {
      setActionLoading(true);
      await apiClient(`/tickets/${ticket.id}/arrived`, { method: 'POST' });
      toast.success(isAr ? 'تم تسجيل وصولك إلى موقع التحميل' : 'Arrived at pickup reported');
      await fetchActive();
    } catch (err) {
      toast.error(err.message || 'Failed to report arrival');
    } finally {
      setActionLoading(false);
    }
  };

  // Mark delivered at destination
  const handleConfirmDelivered = async () => {
    try {
      setActionLoading(true);
      await apiClient(`/tickets/${ticket.id}/delivered`, { method: 'POST' });
      toast.success(isAr ? 'تم تسجيل التسليم بنجاح! أحسنت عملاً.' : 'Delivery confirmed! Great work.');
      setShowDeliveredModal(false);
      navigate('/driver');
    } catch (err) {
      toast.error(err.message || 'Failed to report delivery');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <TruckLoader size="md" />
        <span className="text-[15px] text-ink-muted">{isAr ? 'جاري التحقق من الشحنة النشطة...' : 'Checking active trip...'}</span>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-8 bg-card rounded-2xl border border-line text-center space-y-4 my-8">
        <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <Navigation className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-black text-navy-900">
            {isAr ? 'ليس لديك شحنة نشطة حالياً' : 'No Active Shipment Right Now'}
          </h3>
          <p className="text-[15px] text-ink-muted max-w-xs mx-auto leading-relaxed">
            {isAr
              ? 'أنت متاح وجاهز. تصفح الشحنات المفتوحة التي تطابق شاحنتك وابدأ رحلتك القادمة.'
              : 'You are free and ready for trips. Browse available shipments matching your truck.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/driver')}
          className="px-6 py-3 rounded-xl bg-navy-900 text-white font-bold text-[15px] shadow-xs hover:bg-navy-800"
        >
          {isAr ? 'تصفح الشحنات المتاحة' : 'Browse Open Shipments'}
        </button>
      </div>
    );
  }

  const events = ticket.events || [];
  const hasArrived = events.some((e) => e.type === 'arrived_at_pickup');

  return (
    <div className="space-y-4 pb-12">
      {/* Active Trip Header */}
      <div className="bg-navy-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-bold text-amber-400">
            {ticket.ticket_number}
          </span>
          <StatusChip status={ticket.status} roleMode="driver" />
        </div>

        <div className="text-xl font-black text-white flex items-center gap-2">
          <span>{ticket.pickup?.city}</span>
          <Navigation className="w-5 h-5 text-amber-400 shrink-0 rtl:-scale-x-100" />
          <span>{ticket.dest?.city}</span>
        </div>

        <div className="bg-navy-800/80 rounded-xl p-3 flex items-center justify-between">
          <span className="text-[15px] text-slate-300 font-medium">
            {isAr ? 'أرباحك في سيف باي:' : 'Your Escrow Earnings:'}
          </span>
          <span className="text-base font-black text-emerald-400">
            {formatMoney(ticket.earnings)}
          </span>
        </div>
      </div>

      {/* Pickup Section */}
      <div className="bg-card rounded-2xl border border-line p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <h3 className="text-[15px] font-bold text-navy-900 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>{isAr ? 'موقع التحميل (المصنع)' : 'Pickup Location'}</span>
          </h3>
          {hasArrived && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-sm font-bold">
              ✓ {isAr ? 'تم تسجيل الوصول' : 'Arrived'}
            </span>
          )}
        </div>

        <p className="text-[15px] font-bold text-navy-900">{ticket.pickup?.address}</p>
        <div className="text-sm text-ink-muted">
          {ticket.pickup?.city} · {formatDateTime(ticket.pickup_at)}
        </div>

        {/* Factory Contact & Google Maps */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {ticket.pickup?.lat && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${ticket.pickup.lat},${ticket.pickup.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-xl border border-line bg-white hover:bg-slate-50 text-navy-900 text-[15px] font-bold flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{isAr ? 'خريطة جوجل' : 'Open Map'}</span>
            </a>
          )}

          {ticket.manufacturer?.phone && (
            <a
              href={`tel:${ticket.manufacturer.phone}`}
              className="py-2.5 px-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 text-[15px] font-bold flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{isAr ? 'اتصال بالمصنع' : 'Call Factory'}</span>
            </a>
          )}
        </div>
      </div>

      {/* Destination Section */}
      <div className="bg-card rounded-2xl border border-line p-4 space-y-3">
        <h3 className="text-[15px] font-bold text-navy-900 flex items-center gap-1.5 border-b border-line pb-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span>{isAr ? 'موقع التسليم والمستلم' : 'Destination & Receiver'}</span>
        </h3>

        <p className="text-[15px] font-bold text-navy-900">{ticket.dest?.address}</p>
        <div className="text-[15px] text-slate-700">
          <span className="text-ink-muted">{isAr ? 'المستلم:' : 'Receiver:'}</span> {ticket.dest?.dest_name}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          {ticket.dest?.lat && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${ticket.dest.lat},${ticket.dest.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-xl border border-line bg-white hover:bg-slate-50 text-navy-900 text-[15px] font-bold flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{isAr ? 'خريطة جوجل' : 'Open Map'}</span>
            </a>
          )}

          {ticket.dest?.dest_phone && (
            <a
              href={`tel:${ticket.dest.dest_phone}`}
              className="py-2.5 px-3 rounded-xl border border-blue-300 bg-blue-50 text-blue-900 text-[15px] font-bold flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{isAr ? 'اتصال بالمستلم' : 'Call Receiver'}</span>
            </a>
          )}
        </div>
      </div>

      {/* Cargo Quick Info */}
      <div className="bg-card rounded-2xl border border-line p-4 space-y-2 text-[15px]">
        <h3 className="font-bold text-navy-900 flex items-center gap-1.5 border-b border-line pb-2">
          <Package className="w-4 h-4 text-emerald-600" />
          <span>{isAr ? 'تفاصيل الحمولة' : 'Cargo Specs'}</span>
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-ink-muted block text-sm">{isAr ? 'البضاعة' : 'Cargo'}</span>
            <span className="font-bold text-navy-900">{ticket.goods?.category_name}</span>
          </div>
          <div>
            <span className="text-ink-muted block text-sm">{isAr ? 'الكمية' : 'Quantity'}</span>
            <span className="font-bold text-navy-900">
              {ticket.goods?.quantity} {ticket.goods?.unit}
            </span>
          </div>
        </div>
      </div>

      {/* PRIMARY NEXT ACTION BUTTON (Giant, High Contrast) */}
      <div className="pt-2">
        {ticket.status === 'waiting_load' && !hasArrived && (
          <button
            type="button"
            disabled={actionLoading}
            onClick={handleArrived}
            className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-navy-900 text-base font-black shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <MapPin className="w-5 h-5 stroke-[2.5]" />
            <span>
              {actionLoading
                ? isAr ? 'جاري التسجيل...' : 'Logging...'
                : isAr ? 'وصلت إلى موقع التحميل' : "I've Arrived at Pickup"}
            </span>
          </button>
        )}

        {ticket.status === 'waiting_load' && hasArrived && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-1">
            <div className="text-[15px] font-bold text-amber-900">
              ✓ {isAr ? 'تم تسجيل وصولك لموقع التحميل' : 'Arrival logged at pickup'}
            </div>
            <p className="text-sm text-amber-700">
              {isAr
                ? 'بانتظار تأكيد المصنع تحميل البضاعة لبدء رحلة التوصيل...'
                : 'Waiting for factory to confirm goods loaded to start delivery...'}
            </p>
          </div>
        )}

        {ticket.status === 'in_delivery' && (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => setShowDeliveredModal(true)}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-base font-black shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <CheckCircle className="w-5 h-5 stroke-[2.5]" />
            <span>
              {actionLoading
                ? isAr ? 'جاري التسجيل...' : 'Confirming...'
                : isAr ? 'تم تسليم الشحنة بالكامل إلى المستلم' : 'Delivered to Destination'}
            </span>
          </button>
        )}
      </div>

      {/* Delivered Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeliveredModal}
        onClose={() => setShowDeliveredModal(false)}
        onConfirm={handleConfirmDelivered}
        loading={actionLoading}
        variant="primary"
        title={isAr ? 'تأكيد إتمام التسليم' : 'Confirm Full Delivery'}
        description={
          isAr
            ? 'هل تؤكد تسليم كامل الشحنة إلى المستلم بسلامة؟'
            : 'Confirm that goods were delivered to the recipient in good condition?'
        }
        confirmText={isAr ? 'نعم، تأكيد التسليم' : 'Yes, Confirm Delivery'}
        cancelText={isAr ? 'تراجع' : 'Cancel'}
      >
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-line space-y-2 text-[15px]">
            <div className="text-sm font-bold uppercase tracking-wider text-navy-800">
              {isAr ? 'وجهة التسليم والمستلم' : 'Destination & Recipient'}
            </div>
            <div className="font-semibold text-navy-900">{ticket.dest?.address}</div>
            <div className="text-slate-600">
              <span>{ticket.dest?.dest_name}</span>
              {ticket.dest?.dest_phone && (
                <span className="ms-2 text-emerald-700">({ticket.dest?.dest_phone})</span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-[15px] text-emerald-900 leading-relaxed">
            {isAr
              ? 'فور تأكيد التسليم، ستصبح متاحاً لتلقي طلبات جديدة وسيتم تحويل أرباحك فور تأكيد المصنع.'
              : 'You will immediately become available for new jobs, and your earnings will be released upon manufacturer confirmation.'}
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
}

