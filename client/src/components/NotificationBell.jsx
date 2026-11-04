import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, Check, Clock, ExternalLink } from 'lucide-react';
import { apiClient } from '../api/client.js';
import { useAuth } from '../state/auth.jsx';

/**
 * Helper to render localized notification message based on type and params
 */
export function formatNotificationText(type, params = {}, isAr = false) {
  switch (type) {
    case 'signup_pending_admin':
      return isAr
        ? `طلب تسجيل جديد بانتظار الموافقة: ${params.name || ''} (${params.role === 'driver' ? 'سائق' : 'مصنّع'})`
        : `New ${params.role || 'user'} awaiting approval: ${params.name || ''}`;

    case 'signup_received':
      return isAr
        ? 'تم استلام طلب التسجيل الخاص بك وهو قيد المراجعة والتدقيق'
        : 'Your registration was received and is under review';

    case 'account_approved':
      return isAr
        ? 'تمت الموافقة على حسابك وتفعيله بنجاح! مرحباً بك في مسار'
        : 'Your account is approved! Welcome to Masar';

    case 'account_rejected':
      return isAr
        ? `تحديث بخصوص طلب التسجيل: ${params.reason || 'يرجى مراجعة الوثائق'}`
        : `Update on your signup: ${params.reason || 'Please review documents'}`;

    case 'ticket_created':
      return isAr
        ? `تم إنشاء الشحنة ${params.n || ''}. يرجى إتمام الدفع لنشرها للسائقين`
        : `Shipment ${params.n || ''} created. Pay to publish it`;

    case 'payment_received_mfr':
      return isAr
        ? `تم استلام الدفعة بنجاح. الشحنة ${params.n || ''} متاحة الآن للسائقين`
        : `Payment received. ${params.n || ''} is now open for drivers`;

    case 'payment_received_escrow':
      return isAr
        ? `تم إيداع ${params.amount || ''} في حساب الضمان للشحنة ${params.n || ''} من ${params.company || ''}`
        : `${params.amount || ''} received for ${params.n || ''} from ${params.company || ''}`;

    case 'new_match':
      return isAr
        ? `شحنة جديدة مطابقة: من ${params.from || ''} إلى ${params.to || ''}، أرباحك: ${params.earnings || ''}`
        : `New shipment: ${params.from || ''} to ${params.to || ''}, your earnings ${params.earnings || ''}`;

    case 'driver_accepted_mfr':
      return isAr
        ? `السيد ${params.driver || ''} قبل شحنتك ${params.n || ''}`
        : `Mr. ${params.driver || ''} accepted ${params.n || ''}`;

    case 'driver_accepted_driver':
      return isAr
        ? `لقد قبلت الشحنة ${params.n || ''}. راجع تفاصيل التحميل وموقع الاستلام`
        : `You accepted ${params.n || ''}. See pickup details`;

    case 'driver_arrived':
      return isAr
        ? `وصل السائق ${params.driver || ''} إلى موقع التحميل (${params.early_late || 'في الموعد'})`
        : `Mr. ${params.driver || ''} arrived at pickup (${params.early_late || 'on-time'})`;

    case 'loaded_mfr':
      return isAr
        ? `تم تأكيد التحميل. الشحنة ${params.n || ''} في طريقها للوجهة`
        : `${params.n || ''} is on its way`;

    case 'loaded_driver':
      return isAr
        ? 'تم تأكيد التحميل من المصنع. نتمنى لك رحلة آمنة وموفقة'
        : 'Loading confirmed. Safe trip';

    case 'delivered_mfr':
      return isAr
        ? `تم تسليم الشحنة ${params.n || ''}. يرجى التحقق من المستلم وتأكيد الاستلام`
        : `${params.n || ''} was delivered. Verify with the receiver and confirm`;

    case 'delivered_driver':
      return isAr
        ? `تم التسليم بنجاح. أرباحك (${params.earnings || ''}) معلقة بانتظار تأكيد المصنع`
        : `Delivered. Your earnings ${params.earnings || ''} are pending release`;

    case 'delivered_escrow':
      return isAr
        ? `تم تسليم الشحنة ${params.n || ''} وهي بانتظار تأكيد المصنع للإفراج`
        : `${params.n || ''} delivered, awaiting confirmation`;

    case 'payout_driver':
      return isAr
        ? `تم تحويل ${params.amount || ''} بنجاح إلى حسابك ${params.iban || ''}`
        : `${params.amount || ''} transferred successfully to your account ${params.iban || ''}`;

    case 'confirmed_mfr':
      return isAr
        ? `تم تأكيد تسليم الشحنة ${params.n || ''}. يرجى تقييم السائق ${params.driver || ''}`
        : `Delivery of ${params.n || ''} confirmed. Please rate Mr. ${params.driver || ''}`;

    case 'release_escrow':
      return isAr
        ? `تم الإفراج عن مستحقات الشحنة ${params.n || ''}: تم تنفيذ القيود المالية`
        : `${params.n || ''} released: full SafePay breakdown executed`;

    case 'masar_income':
      return isAr
        ? `عمولة مسار +${params.amount || ''} من الشحنة ${params.n || ''}`
        : `Masar commission +${params.amount || ''} from ${params.n || ''}`;

    case 'rating_received':
      return isAr
        ? `قام ${params.from || 'طرف آخر'} بتقييمك بـ ${params.stars || 5}★`
        : `${params.from || 'A user'} rated you ${params.stars || 5}★`;

    default:
      return type.replace(/_/g, ' ');
  }
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const notificationsUrl = user?.role ? `/${user.role}/notifications` : '/notifications';

  // Load latest notifications
  async function loadNotifications() {
    try {
      const data = await apiClient('/notifications?limit=6');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      // Background poll silently fails without error alert
    }
  }

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 15000); // 15s refresh
    return () => clearInterval(timer);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleMarkAsRead(notif, e) {
    e?.stopPropagation();
    try {
      if (!notif.is_read) {
        await apiClient(`/notifications/${notif.id}/read`, { method: 'PATCH' });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      if (notif.link) {
        setIsOpen(false);
        navigate(notif.link);
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  }

  async function handleMarkAllRead() {
    try {
      await apiClient('/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-navy-900 hover:bg-slate-100 transition cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Drawer */}
      {isOpen && (
        <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-line shadow-xl z-50 overflow-hidden animate-fadeIn">
          {/* Dropdown Header */}
          <div className="p-3.5 border-b border-line flex items-center justify-between bg-surface/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-navy-900">
                {isAr ? 'الإشعارات' : 'Notifications'}
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-navy-900 text-[10px] font-bold">
                  {unreadCount} {isAr ? 'جديد' : 'new'}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-amber-600 hover:text-amber-700 transition"
              >
                {isAr ? 'تحديد الكل كمقروء' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-line/60">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-muted">
                {isAr ? 'لا توجد إشعارات حالياً' : 'No notifications yet'}
              </div>
            ) : (
              notifications.map((notif) => {
                const message = formatNotificationText(notif.type, notif.params, isAr);
                const timeAgo = formatTimeAgo(notif.created_at, isAr);

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleMarkAsRead(notif)}
                    className={`p-3.5 text-xs transition cursor-pointer flex gap-3 items-start ${
                      notif.is_read
                        ? 'bg-white hover:bg-slate-50'
                        : 'bg-amber-50/50 hover:bg-amber-50 font-medium'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          notif.is_read ? 'bg-transparent' : 'bg-amber-500'
                        }`}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className={`text-xs text-navy-900 leading-snug ${notif.is_read ? 'font-normal' : 'font-bold'}`}>
                        {message}
                      </p>
                      <span className="text-[10px] text-ink-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{timeAgo}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Dropdown Footer Link */}
          <Link
            to={notificationsUrl}
            onClick={() => setIsOpen(false)}
            className="block p-2.5 text-center text-xs font-bold text-navy-900 bg-surface/60 hover:bg-slate-100 transition border-t border-line"
          >
            {isAr ? 'عرض كافة الإشعارات' : 'View all notifications'} &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateString, isAr) {
  if (!dateString) return '';
  const diffSec = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diffSec < 60) return isAr ? 'الآن' : 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return isAr ? `منذ ${diffMin} دقيقة` : `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return isAr ? `منذ ${diffHrs} ساعة` : `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return isAr ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
}

