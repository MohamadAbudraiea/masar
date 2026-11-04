import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck, Clock, ExternalLink, Filter } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { formatNotificationText } from '../../components/NotificationBell.jsx';

export default function NotificationsPage() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    setIsLoading(true);
    try {
      const data = await apiClient(`/notifications?limit=100${filter === 'unread' ? '&unread=true' : ''}`);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [filter]);

  async function handleMarkRead(id) {
    try {
      await apiClient(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-navy-900 flex items-center justify-center font-black">
            <Bell className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-navy-900">
              {isAr ? 'مركز الإشعارات' : 'Notifications Center'}
            </h1>
            <p className="text-xs text-ink-muted">
              {isAr
                ? 'تنبيهات الشحنات والمدفوعات وحالة الحساب الحية'
                : 'Live alerts for shipments, escrow releases, and account updates'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white border border-line text-xs font-bold text-navy-900 hover:bg-slate-50 transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            <span>{isAr ? 'تحديد الكل كمقروء' : 'Mark all as read'}</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            filter === 'all'
              ? 'bg-navy-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-line hover:bg-slate-50'
          }`}
        >
          {isAr ? 'كافة الإشعارات' : 'All Notifications'}
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            filter === 'unread'
              ? 'bg-navy-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-line hover:bg-slate-50'
          }`}
        >
          <span>{isAr ? 'غير المقروءة فقط' : 'Unread only'}</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-navy-900 text-[10px] font-black">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-card rounded-2xl border border-line shadow-xs overflow-hidden divide-y divide-line/60">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-ink-muted space-y-3">
            <div className="w-6 h-6 border-2 border-navy-900 border-t-transparent rounded-full animate-spin mx-auto" />
            <span>{isAr ? 'جاري تحميل الإشعارات...' : 'Loading notifications...'}</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-ink-muted space-y-2">
            <Bell className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-navy-900">
              {filter === 'unread'
                ? isAr ? 'لا توجد إشعارات غير مقروءة' : 'No unread notifications'
                : isAr ? 'سجل الإشعارات فارغ' : 'Your notifications list is empty'}
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            const message = formatNotificationText(notif.type, notif.params, isAr);
            const dateStr = notif.created_at
              ? new Date(notif.created_at).toLocaleString(isAr ? 'ar-JO' : 'en-GB', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'Asia/Amman',
                })
              : '';

            return (
              <div
                key={notif.id}
                className={`p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  notif.is_read ? 'bg-white hover:bg-slate-50/70' : 'bg-amber-50/40 hover:bg-amber-50/70 font-medium'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      notif.is_read ? 'bg-transparent' : 'bg-amber-500 ring-4 ring-amber-100'
                    }`}
                  />
                  <div className="space-y-1">
                    <p className={`text-sm text-navy-900 ${notif.is_read ? 'font-normal' : 'font-bold'}`}>
                      {message}
                    </p>
                    <span className="text-[11px] text-ink-muted flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{dateStr} (Asia/Amman)</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {notif.link && (
                    <Link
                      to={notif.link}
                      onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                      className="px-3 py-1.5 rounded-xl border border-line bg-white hover:bg-slate-100 text-xs font-bold text-navy-900 flex items-center gap-1.5 transition"
                    >
                      <span>{isAr ? 'عرض' : 'View'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  {!notif.is_read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(notif.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900 hover:bg-slate-100 transition cursor-pointer"
                      title={isAr ? 'تحديد كمقروء' : 'Mark as read'}
                    >
                      <CheckCheck className="w-4 h-4 text-emerald-600" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

