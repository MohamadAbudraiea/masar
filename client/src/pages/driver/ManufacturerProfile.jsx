import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Phone, MapPin, Star, ArrowLeft, ExternalLink } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import TruckLoader from '../../components/TruckLoader.jsx';

export default function DriverManufacturerProfile() {
  const { id } = useParams();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [company, setCompany] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [cData, rData] = await Promise.all([
          apiClient(`/manufacturers/${id}`),
          apiClient(`/manufacturers/${id}/ratings`).catch(() => ({ items: [] })),
        ]);
        setCompany(cData);
        setRatings(rData.items || []);
      } catch (err) {
        console.error('Failed to load manufacturer profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return <TruckLoader message={isAr ? 'جاري تحميل ملف الشركة...' : 'Loading company profile...'} />;
  }

  if (!company) {
    return (
      <div className="p-8 text-center text-xs text-ink-muted">
        {isAr ? 'الشركة غير موجودة أو ليس لديك إذن بعرضها' : 'Company not found or access restricted'}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Back button */}
      <div>
        <Link
          to="/driver"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-navy-900"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          <span>{isAr ? 'العودة للشحنات' : 'Back to Shipments'}</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="bg-card rounded-2xl border border-line p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-surface border border-line flex items-center justify-center text-navy-900 font-bold text-xl">
            <Building2 className="h-7 w-7 text-navy-800" />
          </div>
          <div>
            <h1 className="text-lg font-black text-navy-900">{company.name}</h1>
            <div className="flex items-center gap-1.5 text-xs text-amber-600 font-bold mt-0.5">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              <span>
                {company.avg_stars || '5.0'} ({company.ratings_count || 0})
              </span>
            </div>
          </div>
        </div>

        {/* Direct Call Button */}
        <a
          href={`tel:${company.phone}`}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
        >
          <Phone className="h-4 w-4" />
          <span>{isAr ? 'الاتصال بالمصنع:' : 'Call Factory:'}</span>
          <span dir="ltr">{company.phone}</span>
        </a>
      </div>

      {/* Locations */}
      {company.locations?.length > 0 && (
        <div className="bg-card rounded-2xl border border-line p-4 space-y-2 text-xs">
          <h3 className="font-bold text-navy-900 flex items-center gap-1.5 border-b border-line pb-2">
            <MapPin className="h-4 w-4 text-navy-700" />
            <span>{isAr ? 'مواقع المصنع والمستودعات' : 'Factory Locations'}</span>
          </h3>

          <div className="divide-y divide-line/60">
            {company.locations.map((loc, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-navy-900">
                    {loc.city} {loc.area ? `· ${loc.area}` : ''}
                  </div>
                  <div className="text-[11px] text-ink-muted">{loc.address}</div>
                </div>

                {loc.lat && loc.lng && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg border border-line text-ink-muted hover:text-navy-900 flex items-center gap-1"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ratings and Reviews */}
      <div className="bg-card rounded-2xl border border-line p-4 space-y-2 text-xs">
        <h3 className="font-bold text-navy-900 flex items-center gap-1.5 border-b border-line pb-2">
          <Star className="h-4 w-4 text-amber-500" />
          <span>{isAr ? 'تقييمات السائقين للمصنع' : 'Driver Reviews'}</span>
        </h3>

        <div className="divide-y divide-line/60">
          {ratings.map((r) => (
            <div key={r.id} className="py-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-navy-900">{r.from_name || 'Driver'}</span>
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                  <span>{r.stars}</span>
                </div>
              </div>
              {r.comment && <p className="text-ink mt-0.5 italic">"{r.comment}"</p>}
            </div>
          ))}

          {ratings.length === 0 && (
            <div className="py-6 text-center text-xs text-ink-muted">
              {isAr ? 'لا توجد مراجعات مسجلة' : 'No driver reviews yet'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

