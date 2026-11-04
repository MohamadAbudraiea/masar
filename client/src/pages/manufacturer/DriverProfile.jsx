import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, Truck, Phone, ArrowLeft, Package, CheckCircle, ShieldCheck } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import TruckLoader from '../../components/TruckLoader.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';
import { linkTo } from '../../lib/links.js';

export default function ManufacturerDriverProfile() {
  const { id } = useParams();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [profile, setProfile] = useState(null);
  const [completedList, setCompletedList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [pData, cData] = await Promise.all([
          apiClient(`/drivers/${id}`),
          apiClient(`/drivers/${id}/completed`),
        ]);
        setProfile(pData);
        setCompletedList(cData.items || []);
      } catch (err) {
        console.error('Failed to load driver profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return <TruckLoader message={isAr ? 'جاري تحميل ملف السائق...' : 'Loading driver profile...'} />;
  }

  if (!profile) {
    return (
      <div className="p-8 text-center text-xs text-ink-muted">
        {isAr ? 'السائق غير موجود' : 'Driver not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/manufacturer/drivers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-navy-900 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
          <span>{isAr ? 'العودة إلى قائمة السائقين' : 'Back to Drivers'}</span>
        </Link>
      </div>

      {/* Driver Header Card */}
      <div className="bg-card rounded-2xl border border-line p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-surface border border-line flex items-center justify-center text-navy-900 font-bold text-xl shadow-xs">
            {profile.name?.charAt(0) || 'D'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-navy-900">{profile.name}</h1>
              <span className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded-lg font-bold">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                {profile.avg_stars || '5.0'} ({profile.ratings_count || 0})
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-ink-muted mt-1">
              <a
                href={`tel:${profile.phone}`}
                className="flex items-center gap-1.5 text-navy-900 font-semibold hover:underline"
              >
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                <span dir="ltr">{profile.phone}</span>
              </a>
              <span>·</span>
              <span>
                {profile.completed_count || 0} {isAr ? 'شحنة مكتملة على المنصة' : 'completed platform deliveries'}
              </span>
            </div>
          </div>
        </div>

        {/* Truck Specs */}
        {profile.truck && (
          <div className="bg-surface/60 rounded-xl p-3.5 border border-line/60 text-xs text-start md:text-end">
            <div className="font-bold text-navy-900 flex items-center gap-1.5 md:justify-end">
              <Truck className="h-4 w-4 text-navy-700" />
              <span>
                {profile.truck.type_name} · {profile.truck.body_name}
              </span>
            </div>
            <div className="text-[11px] font-mono text-ink-muted mt-1">
              {isAr ? 'لوحة الشاحنة:' : 'Plate:'} {profile.truck.plate_number}
            </div>
          </div>
        )}
      </div>

      {/* Photos Gallery */}
      {profile.truck?.photos?.length > 0 && (
        <div className="bg-card rounded-2xl border border-line p-5 shadow-xs">
          <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-3">
            {isAr ? 'صور الشاحنة والمعدات' : 'Truck Photos'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {profile.truck.photos.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt="Truck"
                className="w-full h-32 object-cover rounded-xl border border-line shadow-2xs hover:scale-[1.02] transition"
              />
            ))}
          </div>
        </div>
      )}

      {/* Own Shipments with this Driver */}
      {profile.own_shipments?.length > 0 && (
        <div className="bg-card rounded-2xl border border-line p-6 shadow-xs">
          <h2 className="text-sm font-bold text-navy-900 mb-3">
            {isAr ? 'شحنات شركتك مع هذا السائق' : 'Your Shipments with this Driver'}
          </h2>
          <div className="divide-y divide-line/60">
            {profile.own_shipments.map((t) => (
              <div
                key={t.id}
                className="py-3 flex items-center justify-between text-xs hover:bg-surface/50 px-2 rounded-lg transition"
              >
                <div>
                  <Link
                    to={linkTo('manufacturer', 'ticket', t.id)}
                    className="font-bold text-navy-900 hover:underline"
                  >
                    {t.ticket_number}
                  </Link>
                  <div className="text-ink-muted mt-0.5">
                    {t.pickup_city} → {t.dest_city} · {formatDateTime(t.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusChip status={t.status} />
                  <span className="font-bold text-navy-900">{formatMoney(t.price)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Shipments List (Privacy rule per 01 §11) */}
      <div className="bg-card rounded-2xl border border-line p-6 shadow-xs">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-navy-900">
            {isAr ? 'سجل رحلات السائق السابقة' : 'Delivery Track Record'}
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            {isAr
              ? 'تاريخ الرحلات المكتملة عبر مسار وتقييمات العملاء'
              : 'Verified delivery history across the Masar platform'}
          </p>
        </div>

        <div className="divide-y divide-line/60">
          {completedList.map((c, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-navy-900">
                  {c.pickup_city} → {c.dest_city}
                </span>
                <div className="text-[11px] text-ink-muted mt-0.5">
                  {formatDateTime(c.date)} ·{' '}
                  <span className="font-medium text-slate-600">{c.manufacturer_name}</span>
                  {c.ticket_number && (
                    <span className="ms-2 font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-line/60">
                      {c.ticket_number}
                    </span>
                  )}
                </div>
              </div>

              {c.rating && (
                <div className="flex items-center gap-1 font-bold text-navy-900">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                  <span>{c.rating}</span>
                </div>
              )}
            </div>
          ))}

          {completedList.length === 0 && (
            <div className="py-6 text-center text-xs text-ink-muted">
              {isAr ? 'لا توجد رحلات مكتملة مسجلة' : 'No recorded completed trips'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

