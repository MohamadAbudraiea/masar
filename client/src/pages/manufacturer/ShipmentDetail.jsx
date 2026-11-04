import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package,
  Truck,
  MapPin,
  Calendar,
  CreditCard,
  ShieldCheck,
  Phone,
  User,
  Star,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Trash2,
  DollarSign,
} from 'lucide-react';
import { apiClient } from '../../api/client.js';
import Timeline from '../../components/Timeline.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [showPayModal, setShowPayModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  const fetchTicket = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient(`/tickets/${id}`);
      setTicket(data);
    } catch (err) {
      console.error('Failed to load shipment:', err);
      setError(err.message || 'Failed to load shipment details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  // Payment Handler
  const handlePay = async () => {
    try {
      setActionLoading(true);
      await apiClient(`/tickets/${id}/pay`, { method: 'POST' });
      setShowPayModal(false);
      await fetchTicket();
    } catch (err) {
      alert(err.message || 'Payment failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Goods Loaded Handler
  const handleLoaded = async () => {
    try {
      setActionLoading(true);
      await apiClient(`/tickets/${id}/loaded`, { method: 'POST' });
      await fetchTicket();
    } catch (err) {
      alert(err.message || 'Failed to confirm loading');
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm Delivery & Release Escrow Handler
  const handleConfirm = async () => {
    if (
      !window.confirm(
        isAr
          ? 'هل تؤكد استلام الشحنة بسلامة؟ سيتم تحويل مستحقات السائق من حساب سيف باي فوراً.'
          : 'Confirm that shipment was received in good order? Escrow payout will be released to driver.'
      )
    ) {
      return;
    }
    try {
      setActionLoading(true);
      await apiClient(`/tickets/${id}/confirm`, { method: 'POST' });
      await fetchTicket();
      setShowRatingModal(true);
    } catch (err) {
      alert(err.message || 'Failed to confirm delivery');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Rating Handler
  const handleRating = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await apiClient(`/tickets/${id}/rating`, {
        method: 'POST',
        body: JSON.stringify({
          stars: ratingStars,
          comment: ratingComment.trim() || undefined,
        }),
      });
      setShowRatingModal(false);
      await fetchTicket();
    } catch (err) {
      alert(err.message || 'Failed to submit rating');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Shipment
  const handleDelete = async () => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذه الشحنة؟' : 'Delete this shipment?')) return;
    try {
      setActionLoading(true);
      await apiClient(`/tickets/${id}`, { method: 'DELETE' });
      navigate('/manufacturer');
    } catch (err) {
      alert(err.message || 'Failed to delete');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <TruckLoader size="md" />
        <span className="text-xs text-ink-muted">{isAr ? 'جاري تحميل تفاصيل الشحنة...' : 'Loading shipment...'}</span>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-8 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3 max-w-lg mx-auto">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-sm font-bold text-rose-900">{error || 'Shipment not found'}</h3>
        <button
          onClick={() => navigate('/manufacturer')}
          className="px-4 py-2 rounded-xl bg-navy-900 text-white text-xs font-semibold"
        >
          {isAr ? 'العودة لقائمة الشحنات' : 'Back to Shipments'}
        </button>
      </div>
    );
  }

  const driver = ticket.driver;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/manufacturer')}
            className="text-xs text-ink-muted hover:text-navy-900 flex items-center gap-1 mb-1 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isAr ? 'لوحة التحكم والشحنات' : 'Overview & Shipments'}</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-navy-900 tracking-tight font-mono">
              {ticket.ticket_number}
            </h1>
            <StatusChip status={ticket.status} />
          </div>
          <p className="text-xs text-ink-muted">
            {isAr ? 'تاريخ الإنشاء:' : 'Created on:'} {formatDateTime(ticket.created_at)}
          </p>
        </div>

        {/* Action Button Strip */}
        <div className="flex items-center gap-2">
          {ticket.status === 'requested' && (
            <>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold"
              >
                <Trash2 className="w-4 h-4 inline me-1" />
                {isAr ? 'حذف' : 'Delete'}
              </button>
              <button
                onClick={() => setShowPayModal(true)}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <CreditCard className="w-4 h-4" />
                <span>{isAr ? 'إيداع المبلغ في سيف باي' : 'Deposit into Escrow'}</span>
              </button>
            </>
          )}

          {ticket.status === 'waiting_load' && (
            <button
              onClick={handleLoaded}
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'تأكيد تحميل البضاعة' : 'Confirm Goods Loaded'}</span>
            </button>
          )}

          {ticket.status === 'delivered' && (
            <button
              onClick={handleConfirm}
              disabled={actionLoading}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isAr ? 'تأكيد الاستلام وتحويل الأرباح' : 'Confirm Delivery & Release Payout'}</span>
            </button>
          )}

          {ticket.status === 'audited' && !ticket.rating?.mine && (
            <button
              onClick={() => setShowRatingModal(true)}
              className="px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5"
            >
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>{isAr ? 'تقييم السائق' : 'Rate Driver'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Dotted-Route Signature Timeline */}
      <div className="bg-card rounded-2xl border border-line p-6 shadow-xs">
        <Timeline
          status={ticket.status}
          statusHistory={ticket.status_history}
          events={ticket.events}
          pickupAt={ticket.pickup_at}
          variant="desktop"
        />
      </div>

      {/* Status Notice Banners */}
      {ticket.status === 'requested' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                {isAr ? 'الشحنة بانتظار الإيداع المالي' : 'Awaiting Escrow Deposit'}
              </h4>
              <p className="text-[11px] text-amber-700">
                {isAr
                  ? 'لن تظهر الشحنة للسائقين المؤهلين حتى يتم إيداع قيمتها في حساب سيف باي الآمن.'
                  : 'This shipment is hidden from drivers until deposit is funded in SafePay Escrow.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPayModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 shadow-2xs"
          >
            {isAr ? 'إيداع الآن' : 'Deposit Now'}
          </button>
        </div>
      )}

      {ticket.status === 'pending' && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-emerald-950">
              {isAr ? 'الشحنة معروضة للسائقين المؤهلين' : 'Open for Qualified Drivers'}
            </h4>
            <p className="text-[11px] text-emerald-800">
              {isAr
                ? 'تم إيداع المبلغ في سيف باي بنجاح. ستتلقى إشعاراً فور قبول أحد السائقين المعتمدين للشحنة.'
                : 'Funds are securely held in escrow. You will be notified the moment a qualified driver accepts.'}
            </p>
          </div>
        </div>
      )}

      {/* Assigned Driver Card (when assigned) */}
      {driver && (
        <div className="bg-card rounded-2xl border border-line p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <h3 className="text-xs font-bold text-navy-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              {isAr ? 'بيانات السائق المعتمد' : 'Assigned Driver'}
            </h3>
            {ticket.arrival && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                ✓ {ticket.arrival.label}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-ink-muted block text-[11px]">{isAr ? 'السائق' : 'Driver'}</span>
              <span className="font-bold text-navy-900 text-sm">{driver.name}</span>
              {driver.rating != null && (
                <div className="flex items-center gap-1 text-[11px] text-amber-600 font-bold mt-0.5">
                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                  <span>{driver.rating.toFixed(1)}</span>
                  <span className="text-slate-400 font-normal">({driver.ratings_count || 0})</span>
                </div>
              )}
            </div>

            <div>
              <span className="text-ink-muted block text-[11px]">{isAr ? 'الهاتف المباشر' : 'Direct Phone'}</span>
              <a
                href={`tel:${driver.phone}`}
                className="font-mono font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{driver.phone}</span>
              </a>
            </div>

            <div>
              <span className="text-ink-muted block text-[11px]">{isAr ? 'الشاحنة واللوحة' : 'Truck & Plate'}</span>
              <span className="font-bold text-navy-900">
                {driver.truck?.type} ({driver.truck?.body})
              </span>
              <div className="font-mono text-slate-500 text-[11px]">
                Plate: {driver.truck?.plate || '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Route Card */}
        <div className="bg-card rounded-2xl border border-line p-5 space-y-4">
          <h3 className="text-xs font-bold text-navy-900 flex items-center gap-2 border-b border-line pb-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            {isAr ? 'مسار الشحنة والمواقع' : 'Route & Locations'}
          </h3>

          <div className="space-y-3 text-xs">
            {/* Pickup */}
            <div className="p-3 rounded-xl bg-slate-50 border border-line space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                {isAr ? 'موقع التحميل' : 'Pickup'}
              </span>
              <p className="font-semibold text-navy-900">{ticket.pickup?.address}</p>
              <div className="text-[11px] text-ink-muted">
                {ticket.pickup?.city} · {formatDateTime(ticket.pickup_at)}
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${ticket.pickup?.lat},${ticket.pickup?.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:underline font-semibold pt-1"
              >
                <span>{isAr ? 'فتح في خرائط Google' : 'Open in Google Maps'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Destination */}
            <div className="p-3 rounded-xl bg-slate-50 border border-line space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-navy-800 block">
                {isAr ? 'موقع التسليم والمستلم' : 'Destination & Receiver'}
              </span>
              <p className="font-semibold text-navy-900">{ticket.dest?.address}</p>
              <div className="text-[11px] text-ink-muted">{ticket.dest?.city}</div>
              <div className="pt-1 text-slate-700 font-medium">
                <span>{isAr ? 'المستلم:' : 'Receiver:'} {ticket.dest?.dest_name} </span>
                <a
                  href={`tel:${ticket.dest?.dest_phone}`}
                  className="font-mono text-emerald-700 hover:underline ms-2 inline-flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  <span>{ticket.dest?.dest_phone}</span>
                </a>
              </div>
            </div>

            {ticket.distance_km && (
              <div className="text-[11px] text-ink-muted flex items-center justify-between pt-1">
                <span>{isAr ? 'المسافة المحسوبة:' : 'Calculated Distance:'}</span>
                <span className="font-mono font-bold text-navy-900">{ticket.distance_km} km</span>
              </div>
            )}
          </div>
        </div>

        {/* Cargo & Truck Card */}
        <div className="bg-card rounded-2xl border border-line p-5 space-y-4">
          <h3 className="text-xs font-bold text-navy-900 flex items-center gap-2 border-b border-line pb-2">
            <Package className="w-4 h-4 text-emerald-600" />
            {isAr ? 'بيانات البضاعة والشاحنة' : 'Cargo & Required Truck'}
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-ink-muted block text-[11px]">{isAr ? 'تصنيف البضاعة' : 'Cargo Category'}</span>
              <span className="font-bold text-navy-900">{ticket.goods?.category_name}</span>
            </div>
            <div>
              <span className="text-ink-muted block text-[11px]">{isAr ? 'الكمية والوزن' : 'Quantity'}</span>
              <span className="font-mono font-bold text-navy-900">
                {ticket.goods?.quantity} {ticket.goods?.unit}
              </span>
            </div>
            <div>
              <span className="text-ink-muted block text-[11px]">{isAr ? 'فئة الشاحنة' : 'Truck Category'}</span>
              <span className="font-semibold text-navy-900 uppercase">
                {ticket.required_truck?.category} · {ticket.required_truck?.body}
              </span>
            </div>
            <div>
              <span className="text-ink-muted block text-[11px]">{isAr ? 'نظام التبريد' : 'Cooling'}</span>
              <span className="font-medium text-navy-900">
                {ticket.required_truck?.cooling || '✕ None'}
              </span>
            </div>
            {ticket.notes && (
              <div className="col-span-2 pt-2 border-t border-line">
                <span className="text-ink-muted block text-[11px]">{isAr ? 'ملاحظات المصنع' : 'Notes'}</span>
                <p className="text-slate-700 italic">{ticket.notes}</p>
              </div>
            )}
          </div>

          {/* Price Card (Manufacturer sees price only per 01 §11) */}
          <div className="p-4 rounded-xl bg-slate-100 border border-line flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-ink-muted block">
                {isAr ? 'القيمة الإجمالية للشحنة' : 'Total Shipment Price'}
              </span>
              <span className="text-xl font-black font-mono text-navy-900">
                {formatMoney(ticket.price)}
              </span>
            </div>
            <div className="text-end">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                ✓ {isAr ? 'ضمان سيف باي' : 'SafePay Backed'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Escrow Payment Sheet Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-xs">
          <div className="bg-card w-full max-w-md rounded-2xl border border-line shadow-2xl p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-navy-900">
                  {isAr ? 'إيداع الضمان في سيف باي' : 'Deposit into SafePay Escrow'}
                </h3>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="text-slate-400 hover:text-navy-900 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">
              {isAr
                ? `سيتم حجز مبلغ ${formatMoney(ticket.price)} في حساب الضمان الوسيط (SafePay). لن يُصرف أي مبلغ حتى تؤكد استلام الشحنة.`
                : `Amount of ${formatMoney(ticket.price)} will be held in audited escrow. No payout is released until you confirm receipt.`}
            </p>

            {/* Payment Summary */}
            <div className="p-4 rounded-xl bg-slate-50 border border-line space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-muted">{isAr ? 'رقم الشحنة' : 'Shipment #'}</span>
                <span className="font-mono font-bold text-navy-900">{ticket.ticket_number}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-sm font-bold">
                <span className="text-navy-900">{isAr ? 'المبلغ المطلوب إيداعه' : 'Amount to Deposit'}</span>
                <span className="font-mono text-emerald-700">{formatMoney(ticket.price)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="px-4 py-2 rounded-xl border border-line text-xs font-semibold hover:bg-slate-50"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handlePay}
                disabled={actionLoading}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {actionLoading ? (isAr ? 'جاري الإيداع...' : 'Processing...') : (isAr ? 'تأكيد الإيداع الآن' : 'Confirm Escrow Deposit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-xs">
          <div className="bg-card w-full max-w-md rounded-2xl border border-line shadow-2xl p-6 space-y-4 animate-scale-in">
            <h3 className="text-base font-black text-navy-900 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              {isAr ? `تقييم السائق ${driver?.name || ''}` : `Rate Driver ${driver?.name || ''}`}
            </h3>

            <p className="text-xs text-ink-muted">
              {isAr ? 'كيف كانت تجربة التوصيل والالتزام بالمواعيد؟' : 'How was the delivery experience and timeliness?'}
            </p>

            <form onSubmit={handleRating} className="space-y-4">
              {/* Star Selector */}
              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingStars(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= ratingStars
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">
                  {isAr ? 'تعليق إضافي (اختياري)' : 'Comment (Optional)'}
                </label>
                <textarea
                  rows={2}
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder={isAr ? 'سائق ممتاز وملتزم...' : 'Punctual and careful with goods...'}
                  className="w-full px-3 py-2 rounded-xl border border-line text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRatingModal(false)}
                  className="px-4 py-2 rounded-xl border border-line text-xs font-semibold"
                >
                  {isAr ? 'تخطي' : 'Skip'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-navy-900 text-white text-xs font-bold hover:bg-navy-800"
                >
                  {isAr ? 'إرسال التقييم' : 'Submit Rating'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

