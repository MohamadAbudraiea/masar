import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, Search, Calendar, Star, ArrowLeft } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import TruckLoader from '../../components/TruckLoader.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';

export default function DriverHistory() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    async function fetchHistory() {
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
    }
    fetchHistory();
  }, [search, from, to]);

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
          {isAr ? 'كافة الشحنات المسلمة والمكتملة' : 'All delivered and completed freight trips'}
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
              <div key={t.id} className="py-3 text-[15px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-navy-900">{t.ticket_number}</span>
                  <StatusChip status={t.status} />
                </div>
                <div className="text-ink-muted">
                  {t.pickup?.city || t.pickup_city} → {t.dest?.city || t.dest_city}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm text-ink-muted">
                    {formatDateTime(t.created_at)}
                  </span>
                  <span className="font-black text-emerald-600">
                    +{formatMoney(t.earnings)}
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

