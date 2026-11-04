import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Phone, Mail, Star, FileText, Check, Plus, X } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { useAuth } from '../../state/auth.jsx';
import PdfViewer from '../../components/PdfViewer.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';
import { formatDateTime } from '../../lib/time.js';

export default function ManufacturerCompanyProfile() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [profile, setProfile] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const [meData, catsData, ratData] = await Promise.all([
          apiClient('/me'),
          apiClient('/reference/goods-categories'),
          apiClient(`/manufacturers/${user.id}/ratings`).catch(() => ({ items: [] })),
        ]);
        setProfile(meData);
        setAllCategories(Array.isArray(catsData) ? catsData : (catsData?.items || []));
        setRatings(ratData.items || []);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user.id]);

  const toggleCategory = async (catId) => {
    const currentCats = profile?.profile?.goods_categories || [];
    const nextCats = currentCats.includes(catId)
      ? currentCats.filter((id) => id !== catId)
      : [...currentCats, catId];

    try {
      await apiClient('/me', {
        method: 'PATCH',
        body: JSON.stringify({ goods_category_ids: nextCats }),
      });
      setProfile((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          goods_categories: nextCats,
        },
      }));
    } catch (err) {
      console.error('Failed to update goods categories:', err);
    }
  };

  if (loading) {
    return <TruckLoader message={isAr ? 'جاري تحميل ملف الشركة...' : 'Loading company profile...'} />;
  }

  const p = profile?.profile || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-2xl border border-line p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-surface border border-line flex items-center justify-center text-navy-900 font-bold text-xl shadow-xs">
            <Building2 className="h-8 w-8 text-navy-800" />
          </div>
          <div>
            <h1 className="text-xl font-black text-navy-900">{user?.name}</h1>
            <div className="flex items-center gap-3 text-xs text-ink-muted mt-1">
              <span>{p.contact_person || 'General Administration'}</span>
              <span>·</span>
              <span className="capitalize">{user?.status || 'Approved'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-surface/70 rounded-xl px-4 py-2 border border-line/60 text-end">
            <div className="text-[10px] text-ink-muted">{isAr ? 'حساب موثّق' : 'Verified Company'}</div>
            <div className="text-xs font-bold text-navy-900 flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span>{isAr ? 'معتمد رسمياً' : 'Official Partner'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Contacts & Goods Categories */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact Details */}
          <div className="bg-card rounded-2xl border border-line p-6 shadow-xs">
            <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-4">
              {isAr ? 'بيانات الاتصال والتواصل' : 'Contact Channels'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-surface/50 border border-line/60">
                <span className="text-ink-muted flex items-center gap-1.5 mb-1 font-medium">
                  <Phone className="h-3.5 w-3.5" />
                  {isAr ? 'أرقام الهواتف' : 'Phone Numbers'}
                </span>
                <div className="space-y-1 font-mono font-medium text-navy-900">
                  {(p.phones || [user?.phone]).map((ph, idx) => (
                    <div key={idx} dir="ltr">
                      {ph}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface/50 border border-line/60">
                <span className="text-ink-muted flex items-center gap-1.5 mb-1 font-medium">
                  <Mail className="h-3.5 w-3.5" />
                  {isAr ? 'البريد الإلكتروني' : 'Email Addresses'}
                </span>
                <div className="space-y-1 font-medium text-navy-900">
                  {(p.emails || [user?.email]).map((em, idx) => (
                    <div key={idx}>{em}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Registered Goods Categories (Toggle instantly) */}
          <div className="bg-card rounded-2xl border border-line p-6 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                {isAr ? 'فئات البضائع المنتجة / المنقولة' : 'Registered Goods Categories'}
              </h2>
              <span className="text-[11px] text-ink-muted">
                {isAr ? 'انقر لتفعيل أو إلغاء فئة' : 'Click to toggle category'}
              </span>
            </div>
            <p className="text-xs text-ink-muted mb-4">
              {isAr
                ? 'تساعد هذه الفئات في اقتراح الشاحنات المناسبة لنوع بضائعكم تلقائياً'
                : 'Enables automatic truck suggestions calibrated to your cargo profile'}
            </p>

            <div className="flex flex-wrap gap-2">
              {allCategories.map((cat) => {
                const isSelected = (p.goods_categories || []).includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                      isSelected
                        ? 'bg-navy-900 text-amber-400 border border-navy-900 shadow-xs'
                        : 'bg-surface border border-line text-ink-muted hover:border-navy-200'
                    }`}
                  >
                    <span>{isAr ? cat.name_ar : cat.name_en}</span>
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 text-amber-400" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 text-ink-muted" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ratings & Driver Reviews */}
          <div className="bg-card rounded-2xl border border-line p-6 shadow-xs">
            <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-4">
              {isAr ? 'تقييمات السائقين' : 'Driver Reviews & Feedback'}
            </h2>
            <div className="divide-y divide-line/60">
              {ratings.map((r) => (
                <div key={r.id} className="py-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-navy-900">{r.from_name || 'Driver'}</span>
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                      <span>{r.stars}</span>
                    </div>
                  </div>
                  {r.comment && <p className="text-ink mt-1 italic">"{r.comment}"</p>}
                  <div className="text-[10px] text-ink-muted mt-1">
                    {r.ticket_number} · {formatDateTime(r.created_at)}
                  </div>
                </div>
              ))}
              {ratings.length === 0 && (
                <div className="text-xs text-ink-muted text-center py-6">
                  {isAr ? 'لا توجد تقييمات مسجلة بعد' : 'No driver reviews received yet'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Company Documents */}
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-line p-6 shadow-xs">
            <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-4">
              {isAr ? 'الوثائق الرسمية للشركة' : 'Official Company Documents'}
            </h2>
            <p className="text-xs text-ink-muted mb-4">
              {isAr
                ? 'الوثائق المعتمدة في السجل التجاري ورخصة المهن (للقراءة فقط)'
                : 'Commercial registration and licenses verified by Masar administration.'}
            </p>

            <div className="space-y-4">
              <div>
                <span className="block text-xs font-semibold text-navy-900 mb-1.5">
                  {isAr ? 'السجل التجاري' : 'Commercial Registration'}
                </span>
                {p.commercial_registration_url ? (
                  <PdfViewer
                    url={p.commercial_registration_url}
                    title={isAr ? 'السجل التجاري' : 'Commercial Registration'}
                  />
                ) : (
                  <div className="p-3 bg-surface rounded-xl border border-line text-xs text-ink-muted">
                    {isAr ? 'الوثيقة غير متوفرة' : 'Document not available'}
                  </div>
                )}
              </div>

              <div>
                <span className="block text-xs font-semibold text-navy-900 mb-1.5">
                  {isAr ? 'رخصة المهن' : 'Professions License'}
                </span>
                {p.professions_license_url ? (
                  <PdfViewer
                    url={p.professions_license_url}
                    title={isAr ? 'رخصة المهن' : 'Professions License'}
                  />
                ) : (
                  <div className="p-3 bg-surface rounded-xl border border-line text-xs text-ink-muted">
                    {isAr ? 'الوثيقة غير متوفرة' : 'Document not available'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

