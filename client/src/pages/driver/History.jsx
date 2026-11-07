import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, Search, Calendar, Star, ArrowLeft, X, Building2, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { useToast } from '../../state/toast.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';

export default function DriverHistory() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const toast = useToast();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Rating Modal state
  const [ratingModalTicket, setRatingModalTicket] = useState(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await apiClient(`/driver/history${qs}`);
      setTickets(res.items || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [search, from, to]);

  const openRatingModal = (ticket) => {
    setRatingModalTicket(ticket);
    setRatingStars(5);
    setRatingComment('');
  };

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    if (!ratingModalTicket) return;

    try {
      setSubmittingRating(true);
      await apiClient(`/tickets/${ratingModalTicket.id}/rating`, {
        method: 'POST',
        body: JSON.stringify({
          stars: ratingStars,
          comment: ratingComment.trim() || undefined,
        }),
      });

      toast.success(isAr ? 'تم إرسال تقييمك للمصنع بنجاح!' : 'Shipper rated successfully! Thank you.');
      setRatingModalTicket(null);
      await fetchHistory();
    } catch (err) {
      toast.error(err.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/driver/me"
          className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-ink-muted hover:text-navy-900"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          <span>{isAr ? 'العودة للملف الشخصي' : 'Back to Profile'}</span>
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-black text-navy-900">
          {isAr ? 'سجل الشحنات السابقة' : 'Shipment History'}
        </h1>
        <p className="text-[15px] text-ink-muted">
          {isAr ? 'كافة الشحنات المسلمة والمكتملة وتقييم المصانع' : 'All delivered trips and shipper feedback'}
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-card rounded-xl border border-line p-3 space-y-2 text-[15px]">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? 'بحث برقم الشحنة...' : 'Search by shipment #...'}
            className="w-full ps-8 pe-3 py-1.5 bg-surface/50 border border-line rounded-lg text-[15px] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-ink-muted" />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-surface/50 border border-line px-2 py-1 rounded text-sm"
          />
          <span>→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-surface/50 border border-line px-2 py-1 rounded text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-card rounded-2xl border border-line p-4">
        {loading ? (
          <TruckLoader message={isAr ? 'جاري تحميل السجل...' : 'Loading history...'} />
        ) : tickets.length === 0 ? (
          <div className="text-center py-8 text-[15px] text-ink-muted">
            {isAr ? 'لا توجد شحنات مطابقة في السجل' : 'No matching historical shipments'}
          </div>
        ) : (
          <div className="divide-y divide-line/60">
            {tickets.map((t) => (
              <div key={t.id} className="py-3.5 text-[15px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-navy-900 tracking-tight">{t.ticket_number}</span>
                  <StatusChip status={t.status} />
                </div>

                <div className="flex items-center justify-between text-ink-muted text-sm">
                  <span>{t.pickup?.city || t.pickup_city} → {t.dest?.city || t.dest_city}</span>
                  {t.manufacturer?.name && (
                    <span className="font-medium text-navy-900/80 truncate max-w-[140px]">
                      {t.manufacturer.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-ink-muted">
                    {formatDateTime(t.created_at)}
                  </span>
                  <span className="font-black text-emerald-600">
                    +{formatMoney(t.earnings)}
                  </span>
                </div>

                {/* Rating Action for Driver */}
                {['delivered', 'audited'].includes(t.status) && (
                  <div className="pt-1 flex items-center justify-between border-t border-line/40">
                    {t.rating?.mine ? (
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        <div className="flex items-center text-amber-500">
                          {[...Array(t.rating.mine.stars || 5)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-current" />
                          ))}
                        </div>
                        <span className="font-semibold">{isAr ? 'تم تقييم المصنع' : 'Shipper Rated'}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openRatingModal(t)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs"
                      >
                        <Star className="w-3.5 h-3.5 fill-white" />
                        <span>{isAr ? 'تقييم المصنع' : 'Rate Shipper'}</span>
                      </button>
                    )}

                    {t.rating?.theirs && (
                      <span className="text-[11px] text-ink-muted italic">
                        {isAr ? `قيّمك المصنع: ${t.rating.theirs.stars}★` : `Shipper gave you: ${t.rating.theirs.stars}★`}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Driver Rating Modal */}
      {ratingModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-card rounded-2xl border border-line shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <Star className="w-4 h-4 fill-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-navy-900">
                    {isAr ? 'تقييم تجربة الشحن' : 'Rate Your Shipper'}
                  </h3>
                  <p className="text-[11px] text-ink-muted">
                    {ratingModalTicket.ticket_number} · {ratingModalTicket.manufacturer?.name || 'Shipper'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRatingModalTicket(null)}
                className="p-1 rounded-lg hover:bg-surface text-ink-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRatingSubmit} className="space-y-4">
              <div className="text-center space-y-1">
                <span className="text-xs text-ink-muted block">
                  {isAr ? 'ما مدى رضاك عن التعامل مع المصنع وتسهيل التحميل؟' : 'How was your loading and communication experience?'}
                </span>
                {/* 5-Star Picker */}
                <div className="flex items-center justify-center gap-2 py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingStars(star)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= ratingStars
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold text-amber-600">
                  {ratingStars === 5 ? (isAr ? 'ممتاز (5 نجوم)' : 'Excellent (5 Stars)') :
                   ratingStars === 4 ? (isAr ? 'جيد جداً (4 نجوم)' : 'Very Good (4 Stars)') :
                   ratingStars === 3 ? (isAr ? 'جيد (3 نجوم)' : 'Good (3 Stars)') :
                   ratingStars === 2 ? (isAr ? 'مقبول (نجمتان)' : 'Fair (2 Stars)') :
                   (isAr ? 'ضعيف (نجمة واحدة)' : 'Poor (1 Star)')}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">
                  {isAr ? 'ملاحظاتك للمصنع (اختياري)' : 'Comment (Optional)'}
                </label>
                <textarea
                  rows={2}
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder={isAr ? 'تحميل سريع وفريق متعاون في المصنع...' : 'Quick loading at warehouse and helpful staff...'}
                  className="w-full px-3 py-2 rounded-xl border border-line bg-surface/40 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRatingModalTicket(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-line text-xs font-semibold text-ink-muted hover:bg-surface"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submittingRating}
                  className="px-4 py-1.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{submittingRating ? (isAr ? 'جاري الإرسال...' : 'Submitting...') : (isAr ? 'تأكيد التقييم' : 'Submit Rating')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
