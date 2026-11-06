import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  XCircle,
  FileText,
  Truck,
  Building2,
  Phone,
  Mail,
  X,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  ClipboardCheck,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Clock,
  ShieldCheck,
  Snowflake,
  AlertTriangle,
  Landmark,
  Globe2,
  Check,
} from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { formatDateTime } from '../../lib/time.js';
import TruckLoader from '../../components/TruckLoader.jsx';
import { useToast } from '../../state/toast.jsx';

const LICENSE_HINT = {
  4: { en: 'Light & medium trucks', ar: 'شاحنات خفيفة ومتوسطة' },
  5: { en: 'Heavy rigid, service & tankers', ar: 'ثقيلة، خدمات، صهاريج' },
  6: { en: 'Tractor + trailer', ar: 'رأس قاطرة ومقطورة' },
};
const CATEGORY_LABEL = {
  light: ['Light', 'خفيفة'],
  medium: ['Medium', 'متوسطة'],
  heavy: ['Heavy', 'ثقيلة'],
  heavy_rigid: ['Heavy rigid', 'ثقيلة'],
  heavy_service: ['Heavy service', 'خدمات ثقيلة'],
  tractor_trailer: ['Tractor + trailer', 'قاطرة ومقطورة'],
  tanker: ['Tanker', 'صهريج'],
};

function waited(iso, isAr) {
  const h = Math.max(0, (Date.now() - new Date(iso).getTime()) / 36e5);
  if (h < 1) return { text: isAr ? 'أقل من ساعة' : 'less than 1 h', late: false };
  if (h < 24) return { text: isAr ? `${Math.round(h)} ساعة` : `${Math.round(h)} h`, late: false };
  const d = Math.round(h / 24);
  return { text: isAr ? `${d} يوم` : `${d} day${d > 1 ? 's' : ''}`, late: true };
}

function initials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

/** Build the list of documents (PDFs + photos) for an applicant from the real payload. */
function documentsOf(u, isAr) {
  const p = u.profile || {};
  if (u.role === 'manufacturer') {
    return [
      { id: 'cr', kind: 'pdf', label: isAr ? 'السجل التجاري' : 'Commercial registration', url: p.commercial_registration_url, required: true },
      { id: 'pl', kind: 'pdf', label: isAr ? 'رخصة المهن' : 'Professions license', url: p.professions_license_url, required: true },
    ];
  }
  const docs = [
    { id: 'id', kind: 'pdf', label: isAr ? 'الهوية' : 'National ID', url: p.id_doc_url, required: true },
    { id: 'lic', kind: 'pdf', label: isAr ? 'رخصة القيادة' : 'Driving license', url: p.license_doc_url, required: true },
    { id: 'tlic', kind: 'pdf', label: isAr ? 'رخصة الشاحنة' : 'Truck license', url: p.truck_license_doc_url, required: true },
  ];
  if (p.scope === 'external') docs.push({ id: 'pass', kind: 'pdf', label: isAr ? 'جواز السفر' : 'Passport', url: p.passport_doc_url, required: true });
  if (p.adr_certified) docs.push({ id: 'adr', kind: 'pdf', label: isAr ? 'شهادة ADR' : 'ADR certificate', url: p.adr_doc_url, required: true });
  (p.truck_photos || []).forEach((url, i) =>
    docs.push({ id: `ph${i}`, kind: 'image', label: isAr ? `صورة الشاحنة ${i + 1}` : `Truck photo ${i + 1}`, url, required: false })
  );
  return docs;
}

function Field({ label, children, mono = false }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={`mt-0.5 text-sm font-semibold text-navy-900 break-words ${mono ? 'tabular-nums tracking-wide' : ''}`}>{children || '—'}</dd>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="rounded-2xl border border-line p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-navy-900 mb-3">
        <Icon className="h-4 w-4 text-navy-700" />
        {title}
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</dl>
    </section>
  );
}

export default function AdminApprovals() {
  const { i18n } = useTranslation();
  const toast = useToast();
  const isAr = i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState('manufacturer');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);
  const [viewed, setViewed] = useState({}); // { [userId]: Set(docId) }
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient('/admin/approvals');
      setItems(data.items || []);
    } catch (err) {
      setError(err.message || 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const manufacturers = items.filter((u) => u.role === 'manufacturer');
  const drivers = items.filter((u) => u.role === 'driver');
  const list = activeTab === 'manufacturer' ? manufacturers : drivers;
  const selectedIndex = list.findIndex((u) => u.id === selectedId);
  const selected = selectedIndex >= 0 ? list[selectedIndex] : null;
  const docs = useMemo(() => (selected ? documentsOf(selected, isAr) : []), [selected, isAr]);
  const seen = (selected && viewed[selected.id]) || new Set();
  const requiredDocs = docs.filter((d) => d.required);
  const requiredSeen = requiredDocs.filter((d) => seen.has(d.id)).length;
  const missingRequired = requiredDocs.filter((d) => !d.url).length;

  const openDoc = (d) => {
    setActiveDoc(d.id);
    if (!selected) return;
    setViewed((v) => {
      const s = new Set(v[selected.id] || []);
      s.add(d.id);
      return { ...v, [selected.id]: s };
    });
  };

  const openApplicant = (u) => {
    setSelectedId(u.id);
    setRejecting(false);
    setRejectReason('');
    const first = documentsOf(u, isAr).find((d) => d.url);
    if (first) {
      setActiveDoc(first.id);
      setViewed((v) => ({ ...v, [u.id]: new Set([...(v[u.id] || []), first.id]) }));
    } else setActiveDoc(null);
  };

  const step = (dir) => {
    const next = list[selectedIndex + dir];
    if (next) openApplicant(next);
  };

  // Esc closes, ←/→ moves between applicants
  useEffect(() => {
    if (!selected) return undefined;
    const onKey = (e) => {
      if (e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') setSelectedId(null);
      if (e.key === 'ArrowRight') step(isAr ? -1 : 1);
      if (e.key === 'ArrowLeft') step(isAr ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const afterDecision = async () => {
    const nextUp = list[selectedIndex + 1] || list[selectedIndex - 1];
    await fetchApprovals();
    if (nextUp) openApplicant(nextUp);
    else setSelectedId(null);
  };

  const handleApprove = async () => {
    if (!selected) return;
    try {
      setActionLoading(true);
      await apiClient(`/admin/users/${selected.id}/approve`, { method: 'POST' });
      toast.success(isAr ? `تم اعتماد ${selected.name}` : `${selected.name} approved`);
      await afterDecision();
    } catch (err) {
      toast.error(err.message || (isAr ? 'تعذّر الاعتماد' : "Couldn't approve. Try again."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim() || !selected) return;
    try {
      setActionLoading(true);
      await apiClient(`/admin/users/${selected.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      toast.success(isAr ? `تم رفض طلب ${selected.name}` : `${selected.name} rejected`);
      setRejecting(false);
      setRejectReason('');
      await afterDecision();
    } catch (err) {
      toast.error(err.message || (isAr ? 'تعذّر الرفض' : "Couldn't reject. Try again."));
    } finally {
      setActionLoading(false);
    }
  };

  const presetReasons =
    selected?.role === 'driver'
      ? isAr
        ? ['رخصة القيادة غير واضحة أو منتهية', 'فئة الرخصة لا تطابق فئة الشاحنة', 'صور الشاحنة غير واضحة أو اللوحة غير ظاهرة', 'رخصة الشاحنة غير مطابقة لرقم اللوحة']
        : ['Driving license unreadable or expired', 'License class does not match the truck', 'Truck photos unclear or plate not visible', 'Truck license does not match the plate number']
      : isAr
      ? ['السجل التجاري غير واضح أو منتهي', 'رخصة المهن مفقودة أو منتهية', 'اسم الشركة لا يطابق الوثائق']
      : ['Commercial registration unreadable or expired', 'Professions license missing or expired', 'Company name does not match the documents'];

  const current = docs.find((d) => d.id === activeDoc);
  const p = selected?.profile || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-extrabold text-navy-900 tracking-tight leading-tight">{isAr ? 'طلبات الانضمام' : 'Approvals'}</h1>
        <p className="text-sm text-ink-muted mt-1">
          {isAr ? 'راجع وثائق المصانع والسائقين الجدد قبل تفعيل حساباتهم.' : 'Check new manufacturers and drivers against their documents before their accounts go live.'}
        </p>
      </div>

      {/* Tabs as two summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="tablist">
        {[
          { id: 'manufacturer', icon: Building2, label: isAr ? 'مصانع' : 'Manufacturers', count: manufacturers.length },
          { id: 'driver', icon: Truck, label: isAr ? 'سائقون' : 'Drivers', count: drivers.length },
        ].map((tb) => {
          const on = activeTab === tb.id;
          return (
            <button
              key={tb.id}
              role="tab"
              aria-selected={on}
              onClick={() => {
                setActiveTab(tb.id);
                setSelectedId(null);
              }}
              className={`text-start rounded-2xl border p-4 flex items-center gap-4 transition ${
                on ? 'bg-navy-900 border-navy-900 text-white' : 'bg-card border-line hover:border-navy-700/40'
              }`}
            >
              <span className={`h-11 w-11 rounded-xl flex items-center justify-center ${on ? 'bg-amber-500 text-navy-900' : 'bg-navy-100 text-navy-700'}`}>
                <tb.icon className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className={`block text-sm font-bold ${on ? 'text-navy-100' : 'text-ink-muted'}`}>{tb.label}</span>
                <span className={`block text-2xl font-extrabold tabular-nums ${on ? 'text-white' : 'text-navy-900'}`}>
                  {tb.count} <span className={`text-sm font-bold ${on ? 'text-navy-100' : 'text-ink-muted'}`}>{isAr ? 'بانتظار المراجعة' : 'waiting'}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Queue */}
      {loading ? (
        <div className="bg-card rounded-2xl border border-line py-16 flex justify-center">
          <TruckLoader message={isAr ? 'جاري تحميل الطلبات…' : 'Loading applications…'} />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[#FECACA] bg-[#FEE2E2] p-5 flex items-center justify-between gap-4">
          <p className="text-sm text-[#B91C1C]">{isAr ? 'تعذّر تحميل الطلبات. تحقّق من الاتصال وحاول مجدداً.' : "Couldn't load applications. Check your connection and try again."}</p>
          <button onClick={fetchApprovals} className="h-9 px-4 rounded-lg bg-navy-900 text-white text-sm font-bold">
            {isAr ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className="bg-card rounded-2xl border border-line py-16 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center mb-3">
            <UserCheck className="h-6 w-6" />
          </div>
          <p className="text-base font-bold text-navy-900">{isAr ? 'لا طلبات معلّقة' : "You're all caught up"}</p>
          <p className="text-sm text-ink-muted mt-1">
            {activeTab === 'manufacturer'
              ? isAr ? 'المصانع الجديدة التي تسجّل ستظهر هنا.' : 'New manufacturer sign-ups will appear here.'
              : isAr ? 'السائقون الجدد الذين يسجّلون سيظهرون هنا.' : 'New driver sign-ups will appear here.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((u) => {
            const w = waited(u.created_at, isAr);
            const d = documentsOf(u, isAr);
            const req = d.filter((x) => x.required);
            const uploaded = req.filter((x) => x.url).length;
            const pr = u.profile || {};
            return (
              <li key={u.id} className="bg-card rounded-2xl border border-line p-4 flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-center gap-3 min-w-0 lg:w-[30%]">
                  <span className="h-11 w-11 shrink-0 rounded-full bg-navy-100 text-navy-700 text-sm font-extrabold flex items-center justify-center">
                    {initials(u.name)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold text-navy-900 truncate">{u.name}</div>
                    <div className="text-xs text-ink-muted truncate">
                      {u.role === 'manufacturer'
                        ? pr.contact_person || (pr.category_names || []).join(' · ')
                        : `${isAr ? 'رخصة فئة' : 'License class'} ${pr.license_class} · ${isAr ? pr.type_name_ar : pr.type_name_en}`}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-xs text-ink lg:w-[24%] min-w-0" dir="ltr">
                  <span className="inline-flex items-center gap-1.5 truncate"><Phone className="h-3.5 w-3.5 text-ink-muted" />{u.phone || '—'}</span>
                  <span className="inline-flex items-center gap-1.5 truncate"><Mail className="h-3.5 w-3.5 text-ink-muted" />{u.email || '—'}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:flex-1">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                    uploaded === req.length ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEE2E2] text-[#B91C1C]'
                  }`}>
                    <FileText className="h-3.5 w-3.5" />
                    {uploaded}/{req.length} {isAr ? 'وثائق' : 'documents'}
                  </span>
                  {u.role === 'driver' && (pr.truck_photos || []).length > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold bg-navy-100 text-navy-700">
                      <ImageIcon className="h-3.5 w-3.5" />
                      {pr.truck_photos.length} {isAr ? 'صور' : 'photos'}
                    </span>
                  )}
                  <span
                    title={formatDateTime(u.created_at)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                      w.late ? 'bg-amber-100 text-[#8A5A00]' : 'bg-surface text-ink-muted'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {isAr ? `ينتظر منذ ${w.text}` : `Waiting ${w.text}`}
                  </span>
                </div>

                <button
                  onClick={() => openApplicant(u)}
                  className="shrink-0 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                >
                  <ClipboardCheck className="h-4 w-4 text-amber-500" />
                  {isAr ? 'مراجعة الطلب' : 'Review application'}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Review workspace */}
      {selected && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={selected.name}>
          <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-[2px]" onClick={() => setSelectedId(null)} />
          <div className="relative ms-auto h-full w-full max-w-[1180px] bg-surface shadow-2xl flex flex-col">
            {/* Header */}
            <header className="bg-card border-b border-line px-6 py-4 flex items-center gap-4">
              <span className="h-12 w-12 shrink-0 rounded-full bg-navy-900 text-amber-500 text-sm font-extrabold flex items-center justify-center">
                {initials(selected.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-extrabold text-navy-900 truncate">{selected.name}</h2>
                  <span className="rounded-full bg-navy-100 text-navy-700 px-2.5 py-0.5 text-xs font-bold">
                    {selected.role === 'manufacturer' ? (isAr ? 'مصنع' : 'Manufacturer') : isAr ? 'سائق' : 'Driver'}
                  </span>
                </div>
                <p className="text-xs text-ink-muted mt-0.5">
                  {isAr ? 'قدّم الطلب' : 'Applied'} {formatDateTime(selected.created_at)} · {isAr ? 'ينتظر منذ' : 'waiting'} {waited(selected.created_at, isAr).text}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-ink-muted tabular-nums me-2">
                  {selectedIndex + 1} / {list.length}
                </span>
                <button
                  onClick={() => step(-1)}
                  disabled={selectedIndex <= 0}
                  aria-label={isAr ? 'الطلب السابق' : 'Previous application'}
                  className="h-9 w-9 rounded-lg border border-line flex items-center justify-center hover:bg-surface disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
                </button>
                <button
                  onClick={() => step(1)}
                  disabled={selectedIndex >= list.length - 1}
                  aria-label={isAr ? 'الطلب التالي' : 'Next application'}
                  className="h-9 w-9 rounded-lg border border-line flex items-center justify-center hover:bg-surface disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
                </button>
                <button
                  onClick={() => setSelectedId(null)}
                  aria-label={isAr ? 'إغلاق' : 'Close'}
                  className="ms-2 h-9 w-9 rounded-lg flex items-center justify-center text-ink-muted hover:bg-surface hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            {/* Body: details | documents */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[400px_1fr]">
              <div className="overflow-y-auto p-5 space-y-4 border-e border-line bg-card">
                {selected.role === 'manufacturer' ? (
                  <>
                    <Section icon={Building2} title={isAr ? 'الشركة' : 'Company'}>
                      <Field label={isAr ? 'اسم الشركة' : 'Company name'}>{selected.name}</Field>
                      <Field label={isAr ? 'الشخص المسؤول' : 'Contact person'}>{p.contact_person}</Field>
                      <div className="col-span-2">
                        <Field label={isAr ? 'فئات البضائع' : 'Goods categories'}>
                          <span className="flex flex-wrap gap-1.5 mt-1">
                            {(p.category_names || []).map((c) => (
                              <span key={c} className="rounded-full bg-amber-100 text-[#8A5A00] px-2.5 py-0.5 text-xs font-bold">{c}</span>
                            ))}
                          </span>
                        </Field>
                      </div>
                    </Section>
                    <Section icon={Phone} title={isAr ? 'التواصل' : 'Contacts'}>
                      <div className="col-span-2 space-y-2" dir="ltr">
                        {(p.phones?.length ? p.phones : [selected.phone]).filter(Boolean).map((ph) => (
                          <a key={ph} href={`tel:${ph}`} className="flex items-center gap-2 text-sm font-semibold text-navy-900 hover:underline">
                            <Phone className="h-3.5 w-3.5 text-ink-muted" /> {ph}
                          </a>
                        ))}
                        {(p.emails?.length ? p.emails : [selected.email]).filter(Boolean).map((em) => (
                          <a key={em} href={`mailto:${em}`} className="flex items-center gap-2 text-sm font-semibold text-navy-900 hover:underline">
                            <Mail className="h-3.5 w-3.5 text-ink-muted" /> {em}
                          </a>
                        ))}
                      </div>
                    </Section>
                  </>
                ) : (
                  <>
                    <Section icon={UserCheck} title={isAr ? 'السائق' : 'Driver'}>
                      <Field label={isAr ? 'الاسم' : 'Name'}>{selected.name}</Field>
                      <Field label={isAr ? 'الهاتف' : 'Phone'}><span dir="ltr">{selected.phone}</span></Field>
                      <Field label={isAr ? 'فئة الرخصة' : 'License class'}>
                        {p.license_class}
                        {LICENSE_HINT[p.license_class] && (
                          <span className="block text-xs font-medium text-ink-muted">{isAr ? LICENSE_HINT[p.license_class].ar : LICENSE_HINT[p.license_class].en}</span>
                        )}
                      </Field>
                      <Field label={isAr ? 'نطاق العمل' : 'Scope'}>
                        <span className="inline-flex items-center gap-1.5">
                          <Globe2 className="h-3.5 w-3.5 text-ink-muted" />
                          {p.scope === 'external' ? (isAr ? 'داخلي وخارجي' : 'Internal + external') : isAr ? 'داخلي فقط' : 'Internal only'}
                        </span>
                      </Field>
                      {selected.email && <div className="col-span-2"><Field label={isAr ? 'البريد' : 'Email'}><span dir="ltr">{selected.email}</span></Field></div>}
                    </Section>
                    <Section icon={Truck} title={isAr ? 'الشاحنة' : 'Truck'}>
                      <Field label={isAr ? 'رقم اللوحة' : 'Plate number'} mono><span dir="ltr">{p.plate_number}</span></Field>
                      <Field label={isAr ? 'الفئة' : 'Category'}>{CATEGORY_LABEL[p.truck_category]?.[isAr ? 1 : 0] || p.truck_category}</Field>
                      <Field label={isAr ? 'النوع' : 'Type'}>{isAr ? p.type_name_ar : p.type_name_en}</Field>
                      <Field label={isAr ? 'الصندوق' : 'Body'}>{isAr ? p.body_name_ar : p.body_name_en}</Field>
                      <div className="col-span-2 flex flex-wrap gap-1.5">
                        {p.cooling && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#DBEAFE] text-[#1D4ED8] px-2.5 py-0.5 text-xs font-bold">
                            <Snowflake className="h-3 w-3" /> {isAr ? 'تبريد' : 'Cooling'}: {p.cooling}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${p.adr_certified ? 'bg-amber-100 text-[#8A5A00]' : 'bg-surface text-ink-muted'}`}>
                          <AlertTriangle className="h-3 w-3" /> ADR {p.adr_certified ? (isAr ? 'معتمد' : 'certified') : isAr ? 'غير معتمد' : 'not certified'}
                        </span>
                      </div>
                    </Section>
                    <Section icon={Landmark} title={isAr ? 'حساب الصرف' : 'Payout account'}>
                      <div className="col-span-2"><Field label="IBAN" mono><span dir="ltr">{p.iban}</span></Field></div>
                      <Field label={isAr ? 'اسم CliQ' : 'CliQ alias'} mono><span dir="ltr">{p.cliq_alias}</span></Field>
                    </Section>
                  </>
                )}

                {/* Review checklist */}
                <section className="rounded-2xl bg-surface p-4">
                  <h3 className="text-sm font-bold text-navy-900 mb-1">{isAr ? 'قائمة المراجعة' : 'Review checklist'}</h3>
                  <p className="text-xs text-ink-muted mb-3">
                    {isAr ? `فتحت ${requiredSeen} من ${requiredDocs.length} وثائق مطلوبة` : `You've opened ${requiredSeen} of ${requiredDocs.length} required documents`}
                  </p>
                  <div className="h-1.5 rounded-full bg-line overflow-hidden mb-3">
                    <div className="h-full bg-[#16A34A] transition-[width]" style={{ width: `${requiredDocs.length ? (requiredSeen / requiredDocs.length) * 100 : 0}%` }} />
                  </div>
                  <ul className="space-y-1.5">
                    {requiredDocs.map((d) => (
                      <li key={d.id} className="flex items-center gap-2 text-xs">
                        <span className={`h-4 w-4 rounded-full flex items-center justify-center ${seen.has(d.id) ? 'bg-[#16A34A] text-white' : !d.url ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-card border border-line'}`}>
                          {seen.has(d.id) ? <Check className="h-3 w-3" /> : !d.url ? <X className="h-3 w-3" /> : null}
                        </span>
                        <span className={seen.has(d.id) ? 'text-navy-900 font-semibold' : 'text-ink-muted'}>{d.label}</span>
                        {!d.url && <span className="text-[#B91C1C] font-bold">{isAr ? 'مفقودة' : 'missing'}</span>}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              {/* Documents */}
              <div className="min-h-0 flex flex-col p-5 gap-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {docs.map((d) => {
                    const on = d.id === activeDoc;
                    return (
                      <button
                        key={d.id}
                        disabled={!d.url}
                        onClick={() => openDoc(d)}
                        className={`shrink-0 inline-flex items-center gap-2 h-10 px-3 rounded-xl border text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                          on ? 'bg-navy-900 border-navy-900 text-white' : 'bg-card border-line text-navy-900 hover:border-navy-700/40'
                        }`}
                      >
                        {d.kind === 'image' ? <ImageIcon className={`h-4 w-4 ${on ? 'text-amber-500' : 'text-ink-muted'}`} /> : <FileText className={`h-4 w-4 ${on ? 'text-amber-500' : 'text-ink-muted'}`} />}
                        {d.label}
                        {seen.has(d.id) && <CheckCircle2 className={`h-3.5 w-3.5 ${on ? 'text-amber-500' : 'text-[#16A34A]'}`} />}
                      </button>
                    );
                  })}
                </div>
                <div className="flex-1 min-h-[360px] rounded-2xl border border-line bg-card overflow-hidden flex flex-col">
                  {current?.url ? (
                    <>
                      <div className="h-11 px-4 border-b border-line flex items-center justify-between">
                        <span className="text-sm font-bold text-navy-900 truncate">{current.label}</span>
                        <span className="flex items-center gap-1">
                          <a href={current.url} target="_blank" rel="noreferrer" className="h-8 px-2.5 rounded-lg hover:bg-surface text-xs font-bold text-navy-900 inline-flex items-center gap-1.5">
                            <ExternalLink className="h-3.5 w-3.5" /> {isAr ? 'فتح' : 'Open'}
                          </a>
                          <a href={current.url} download className="h-8 px-2.5 rounded-lg hover:bg-surface text-xs font-bold text-navy-900 inline-flex items-center gap-1.5">
                            <Download className="h-3.5 w-3.5" /> {isAr ? 'تنزيل' : 'Download'}
                          </a>
                        </span>
                      </div>
                      {current.kind === 'image' ? (
                        <div className="flex-1 bg-surface flex items-center justify-center p-4">
                          <img src={current.url} alt={current.label} className="max-h-full max-w-full rounded-lg object-contain" />
                        </div>
                      ) : (
                        <iframe key={current.url} src={current.url} title={current.label} className="flex-1 w-full bg-surface" />
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <FileText className="h-8 w-8 text-ink-muted mb-2" />
                      <p className="text-sm font-bold text-navy-900">{isAr ? 'اختر وثيقة لعرضها' : 'Pick a document to view it'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Decision bar */}
            <footer className="bg-card border-t border-line px-6 py-4">
              {rejecting ? (
                <form onSubmit={handleReject} className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {presetReasons.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRejectReason(r)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                          rejectReason === r ? 'bg-[#FEE2E2] border-[#FECACA] text-[#B91C1C]' : 'bg-surface border-line text-ink hover:border-navy-700/30'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col md:flex-row gap-3 md:items-end">
                    <label className="flex-1">
                      <span className="text-xs font-bold text-navy-900">
                        {isAr ? 'سبب الرفض (سيظهر لمقدّم الطلب)' : 'Reason (the applicant will see this)'}
                      </span>
                      <textarea
                        autoFocus
                        required
                        rows={2}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-none focus:border-[#B91C1C]/50 focus:ring-4 focus:ring-[#FEE2E2]"
                      />
                    </label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setRejecting(false)} className="h-11 px-4 rounded-xl border border-line text-sm font-bold text-navy-900 hover:bg-surface">
                        {isAr ? 'رجوع' : 'Back'}
                      </button>
                      <button
                        type="submit"
                        disabled={!rejectReason.trim() || actionLoading}
                        className="h-11 px-5 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm font-bold disabled:opacity-50"
                      >
                        {actionLoading ? '…' : isAr ? 'رفض الطلب' : 'Reject application'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <p className="flex-1 text-xs text-ink-muted flex items-center gap-2">
                    {missingRequired > 0 ? (
                      <>
                        <AlertTriangle className="h-4 w-4 text-[#B91C1C]" />
                        <span className="text-[#B91C1C] font-bold">
                          {isAr ? `${missingRequired} وثيقة مطلوبة مفقودة` : `${missingRequired} required document${missingRequired > 1 ? 's' : ''} missing`}
                        </span>
                      </>
                    ) : requiredSeen < requiredDocs.length ? (
                      <>
                        <ShieldCheck className="h-4 w-4 text-[#8A5A00]" />
                        {isAr ? 'لم تفتح كل الوثائق بعد.' : "You haven't opened every document yet."}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                        <span className="text-[#15803D] font-bold">{isAr ? 'تمت مراجعة كل الوثائق' : 'All documents reviewed'}</span>
                      </>
                    )}
                  </p>
                  <button
                    onClick={() => setRejecting(true)}
                    className="h-11 px-5 rounded-xl border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEE2E2] text-sm font-bold inline-flex items-center justify-center gap-2"
                  >
                    <XCircle className="h-4 w-4" /> {isAr ? 'رفض' : 'Reject'}
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="h-11 px-6 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" /> {actionLoading ? '…' : isAr ? 'اعتماد الحساب' : 'Approve account'}
                  </button>
                </div>
              )}
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
