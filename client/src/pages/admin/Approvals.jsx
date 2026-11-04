import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
  Truck,
  Building2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ShieldAlert,
  X,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { formatDateTime } from '../../lib/time.js';
import PdfViewer from '../../components/PdfViewer.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';
import { useToast } from '../../state/toast.jsx';

export default function AdminApprovals() {
  const { i18n } = useTranslation();
  const toast = useToast();
  const isAr = i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState('manufacturer'); // 'manufacturer' | 'driver'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inspection Drawer State
  const [selectedUser, setSelectedUser] = useState(null);

  // Reject Modal State
  const [rejectingUser, setRejectingUser] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Photo preview modal
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient('/admin/approvals');
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to load approvals:', err);
      setError(err.message || 'Failed to fetch pending approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const manufacturers = items.filter((u) => u.role === 'manufacturer');
  const drivers = items.filter((u) => u.role === 'driver');
  const currentList = activeTab === 'manufacturer' ? manufacturers : drivers;

  const handleApprove = async (user) => {
    try {
      setActionLoading(true);
      await apiClient(`/admin/users/${user.id}/approve`, {
        method: 'POST',
      });
      setNotification({
        type: 'success',
        message: isAr
          ? `تم اعتماد ${user.name} بنجاح`
          : `Successfully approved ${user.name}`,
      });
      setSelectedUser(null);
      await fetchApprovals();
    } catch (err) {
      toast.error(err.message || 'Failed to approve application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toast.error(isAr ? 'يرجى كتابة سبب الرفض' : 'Please provide a rejection reason');
      return;
    }
    try {
      setActionLoading(true);
      await apiClient(`/admin/users/${rejectingUser.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      setNotification({
        type: 'warning',
        message: isAr
          ? `تم رفض طلب ${rejectingUser.name}`
          : `Application rejected for ${rejectingUser.name}`,
      });
      setRejectingUser(null);
      setRejectReason('');
      setSelectedUser(null);
      await fetchApprovals();
    } catch (err) {
      toast.error(err.message || 'Failed to reject application');
    } finally {
      setActionLoading(false);
    }
  };

  const presetReasons = isAr
    ? [
        'وثائق السجل التجاري غير واضحة أو منتهية الصلاحية',
        'رخصة القيادة غير مطابقة لفئة الشاحنة المسجلة',
        'صور الشاحنة غير مكتملة أو لوحة الأرقام غير واضحة',
        'الرقم الضريبي أو الرقم الوطني غير مطابق',
      ]
    : [
        'Registration documents unreadable or expired',
        'Driver license class does not match truck category',
        'Truck photos incomplete or plate not visible',
        'Tax ID or National ID mismatch with official registry',
      ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-emerald-600" />
            {isAr ? 'طلبات الانضمام والاعتماد' : 'Pending Approvals'}
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            {isAr
              ? 'مراجعة وتدقيق وثائق المصانع والسائقين الجدد قبل تفعيل حساباتهم'
              : 'Review and verify new manufacturer and driver profiles before activation'}
          </p>
        </div>

        {notification && (
          <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ms-2 text-slate-400 hover:text-navy-900"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Role Tabs */}
      <div className="flex items-center gap-2 border-b border-line">
        <button
          onClick={() => setActiveTab('manufacturer')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeTab === 'manufacturer'
              ? 'text-navy-900 border-b-2 border-emerald-600'
              : 'text-ink-muted hover:text-navy-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{isAr ? 'المصانع' : 'Manufacturers'}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              manufacturers.length > 0
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {manufacturers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('driver')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeTab === 'driver'
              ? 'text-navy-900 border-b-2 border-emerald-600'
              : 'text-ink-muted hover:text-navy-900'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>{isAr ? 'السائقون' : 'Drivers'}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              drivers.length > 0
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {drivers.length}
          </span>
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <TruckLoader size="md" />
          <span className="text-xs text-ink-muted font-medium">
            {isAr ? 'جاري تحميل الطلبات...' : 'Loading pending requests...'}
          </span>
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-xs text-rose-700 font-semibold">{error}</p>
          <button
            onClick={fetchApprovals}
            className="px-4 py-2 rounded-xl bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800"
          >
            {isAr ? 'إعادة المحاولة' : 'Try Again'}
          </button>
        </div>
      ) : currentList.length === 0 ? (
        <div className="bg-card rounded-2xl border border-line p-12 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto opacity-70" />
          <h3 className="text-sm font-bold text-navy-900">
            {isAr ? 'لا توجد طلبات معلقة حالياً' : 'All caught up! No pending requests'}
          </h3>
          <p className="text-xs text-ink-muted max-w-sm mx-auto">
            {isAr
              ? 'تمت مراجعة جميع طلبات التسجيل المقدمة بالكامل.'
              : 'All registration submissions have been audited and resolved.'}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-line shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-line text-ink-muted font-semibold">
                  <th className="py-3 px-4 text-start">{isAr ? 'مقدم الطلب' : 'Applicant'}</th>
                  <th className="py-3 px-4 text-start">{isAr ? 'معلومات الاتصال' : 'Contact'}</th>
                  <th className="py-3 px-4 text-start">
                    {activeTab === 'manufacturer'
                      ? isAr ? 'السجل / الضريبة' : 'Reg / Tax #'
                      : isAr ? 'فئة الشاحنة واللوحة' : 'Truck & Plate'}
                  </th>
                  <th className="py-3 px-4 text-start">{isAr ? 'تاريخ التقديم' : 'Submitted'}</th>
                  <th className="py-3 px-4 text-end">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {currentList.map((u) => {
                  const p = u.profile || {};
                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-navy-900 group-hover:text-emerald-700 transition-colors flex items-center gap-2">
                          {u.name}
                          {p.trade_name && (
                            <span className="text-[10px] text-ink-muted font-normal">
                              ({p.trade_name})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{p.city || p.location?.city || 'Jordan'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="text-slate-700 font-mono text-[11px] flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{u.phone}</span>
                        </div>
                        {u.email && (
                          <div className="text-slate-500 text-[11px] flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[140px]">{u.email}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {activeTab === 'manufacturer' ? (
                          <div className="space-y-0.5">
                            <div className="font-mono text-slate-700">
                              <span className="text-[10px] text-slate-400 me-1">CR:</span>
                              {p.registration_number || '—'}
                            </div>
                            <div className="font-mono text-slate-500 text-[10px]">
                              <span className="text-[10px] text-slate-400 me-1">TAX:</span>
                              {p.tax_number || '—'}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="font-bold text-navy-900">
                              {isAr ? p.body_name_ar || p.type_name_ar : p.body_name_en || p.type_name_en || 'Truck'}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {p.plate_number ? `Plate: ${p.plate_number}` : '—'}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {formatDateTime(u.created_at)}
                      </td>

                      <td className="py-3.5 px-4 text-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(u);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-line bg-white hover:bg-slate-50 text-navy-900 text-xs font-semibold shadow-2xs inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>{isAr ? 'فحص الوثائق' : 'Inspect'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Side Inspection Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-navy-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedUser(null)}
          />

          {/* Drawer Container */}
          <div className="relative w-full max-w-2xl bg-card h-full shadow-2xl flex flex-col z-10 animate-slide-in">
            {/* Drawer Header */}
            <div className="p-5 border-b border-line bg-slate-50/90 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wide bg-amber-100 text-amber-800">
                    {selectedUser.role}
                  </span>
                  <h2 className="text-base font-black text-navy-900">{selectedUser.name}</h2>
                </div>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  {isAr ? 'تاريخ التقديم:' : 'Applied on:'} {formatDateTime(selectedUser.created_at)}
                </p>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-navy-900 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Manufacturer Details */}
              {selectedUser.role === 'manufacturer' && (
                <div className="space-y-6">
                  {/* Basic & Commercial Info */}
                  <div className="rounded-2xl border border-line p-4 space-y-3 bg-white">
                    <h3 className="text-xs font-bold text-navy-900 border-b border-line pb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      {isAr ? 'البيانات التجارية والقانونية' : 'Commercial & Legal Details'}
                    </h3>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-ink-muted block text-[11px]">
                          {isAr ? 'اسم الشركة الرسمي' : 'Official Name'}
                        </span>
                        <span className="font-bold text-navy-900">{selectedUser.name}</span>
                      </div>
                      <div>
                        <span className="text-ink-muted block text-[11px]">
                          {isAr ? 'الاسم التجاري' : 'Trade Name'}
                        </span>
                        <span className="font-semibold text-navy-900">
                          {selectedUser.profile?.trade_name || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-muted block text-[11px]">
                          {isAr ? 'رقم السجل التجاري' : 'Registration Number'}
                        </span>
                        <span className="font-mono font-bold text-navy-900">
                          {selectedUser.profile?.registration_number || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-muted block text-[11px]">
                          {isAr ? 'الرقم الضريبي' : 'Tax / VAT Number'}
                        </span>
                        <span className="font-mono font-bold text-navy-900">
                          {selectedUser.profile?.tax_number || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-muted block text-[11px]">
                          {isAr ? 'المدينة والمنطقة الصناعية' : 'City & Industrial Area'}
                        </span>
                        <span className="font-medium text-navy-900">
                          {selectedUser.profile?.city || '—'}
                          {selectedUser.profile?.industrial_area
                            ? ` (${selectedUser.profile.industrial_area})`
                            : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-muted block text-[11px]">
                          {isAr ? 'الموقع الإلكتروني' : 'Website'}
                        </span>
                        {selectedUser.profile?.website ? (
                          <a
                            href={selectedUser.profile.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-700 hover:underline flex items-center gap-1 font-mono text-[11px]"
                          >
                            <span>{selectedUser.profile.website}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          '—'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Goods Categories */}
                  {selectedUser.profile?.category_names?.length > 0 && (
                    <div className="rounded-2xl border border-line p-4 space-y-2 bg-white">
                      <h4 className="text-xs font-bold text-navy-900">
                        {isAr ? 'فئات البضائع المنتجة' : 'Goods Categories Produced'}
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedUser.profile.category_names.map((cat, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documents Section */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-navy-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      {isAr ? 'الوثائق الرسمية المرفقة' : 'Submitted Documents (PDF)'}
                    </h3>

                    {/* Commercial Registration PDF */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700">
                        {isAr ? 'شهادة السجل التجاري' : 'Commercial Registration'}
                      </label>
                      <PdfViewer
                        url={selectedUser.profile?.commercial_registration_url}
                        title={`${selectedUser.name}-CR.pdf`}
                      />
                    </div>

                    {/* Professions License PDF */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700">
                        {isAr ? 'رخصة المهن سارية المفعول' : 'Professions License'}
                      </label>
                      <PdfViewer
                        url={selectedUser.profile?.professions_license_url}
                        title={`${selectedUser.name}-ProfessionsLicense.pdf`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Driver Details */}
              {selectedUser.role === 'driver' && (
                <div className="space-y-6">
                  {/* Personal & License Info */}
                  <div className="rounded-2xl border border-line p-4 space-y-3 bg-white">
                    <h3 className="text-xs font-bold text-navy-900 border-b border-line pb-2 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-600" />
                      {isAr ? 'البيانات الشخصية ورخصة القيادة' : 'Driver & License Details'}
                    </h3>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-ink-muted block text-[11px]">
                          {isAr ? 'الاسم الكامل' : 'Full Name'}
                        </span>
                        <span className="font-bold text-navy-900">{selectedUser.name}</span>
                      </div>
                      <div>
                        <span className="text-ink-muted block text-[11px]">
                          {isAr ? 'الجنسية' : 'Nationality'}
                        </span>
                        <span className="font-semibold text-navy-900">
                          {selectedUser.profile?.nationality || 'Jordanian'}
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-muted block text-[11px]">
                          {isAr ? 'الرقم الوطني / الإقامة' : 'National ID / Residency #'}
                        </span>
                        <span className="font-mono font-bold text-navy-900">
                          {selectedUser.profile?.national_id || selectedUser.profile?.passport_number || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-muted block text-[11px]">
                          {isAr ? 'رقم رخصة القيادة' : 'Driver License #'}
                        </span>
                        <span className="font-mono font-bold text-navy-900">
                          {selectedUser.profile?.license_number || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-muted block text-[11px]">
                          {isAr ? 'فئة الرخصة' : 'License Class'}
                        </span>
                        <span className="font-semibold text-navy-900">
                          {selectedUser.profile?.license_class || 'Class 6 (Trailer / قاطرة ومقطورة)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-muted block text-[11px]">
                          {isAr ? 'انتهاء الرخصة' : 'License Expiry'}
                        </span>
                        <span className="font-mono text-navy-900">
                          {selectedUser.profile?.license_expiry_date || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payout Account */}
                  <div className="rounded-2xl border border-line p-4 space-y-2 bg-white">
                    <h4 className="text-xs font-bold text-navy-900">
                      {isAr ? 'حساب تحويل المستحقات المالية' : 'Payout Account'}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-ink-muted block text-[10px]">
                          {isAr ? 'طريقة التحويل' : 'Method'}
                        </span>
                        <span className="font-bold uppercase text-navy-900">
                          {selectedUser.profile?.payout_method || 'IBAN'}
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-muted block text-[10px]">
                          {isAr ? 'البنك أو المعرف' : 'Bank / Alias'}
                        </span>
                        <span className="font-medium text-navy-900">
                          {selectedUser.profile?.bank_name || selectedUser.profile?.cliq_alias || '—'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-ink-muted block text-[10px]">
                          {isAr ? 'رقم الآيبان / الحساب' : 'IBAN'}
                        </span>
                        <span className="font-mono font-bold text-navy-900">
                          {selectedUser.profile?.iban || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Truck Specifications */}
                  <div className="rounded-2xl border border-line p-4 space-y-3 bg-white">
                    <h3 className="text-xs font-bold text-navy-900 border-b border-line pb-2 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-600" />
                      {isAr ? 'مواصفات الشاحنة المسجلة' : 'Registered Truck Details'}
                    </h3>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-ink-muted block text-[11px]">
                          {isAr ? 'رقم اللوحة' : 'Plate Number'}
                        </span>
                        <span className="font-mono font-bold text-navy-900">
                          {selectedUser.profile?.plate_number || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-muted block text-[11px]">
                          {isAr ? 'فئة الهيكل' : 'Body Type'}
                        </span>
                        <span className="font-semibold text-navy-900">
                          {isAr
                            ? selectedUser.profile?.body_name_ar || selectedUser.profile?.type_name_ar
                            : selectedUser.profile?.body_name_en || selectedUser.profile?.type_name_en || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-muted block text-[11px]">
                          {isAr ? 'نظام التبريد' : 'Cooling / Refrigerator'}
                        </span>
                        <span className="font-semibold">
                          {selectedUser.profile?.cooling ? '❄️ Active' : '✕ None'}
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-muted block text-[11px]">
                          {isAr ? 'شهادة نقل المواد الخطرة (ADR)' : 'ADR Certified'}
                        </span>
                        <span className="font-semibold">
                          {selectedUser.profile?.adr_certified ? '⚠️ Certified' : '✕ No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Truck Photos Gallery */}
                  {selectedUser.profile?.truck_photos?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-navy-900">
                        {isAr ? 'صور الشاحنة' : 'Truck Inspection Photos'}
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedUser.profile.truck_photos.map((url, idx) => (
                          <div
                            key={idx}
                            onClick={() => setPreviewPhoto(url)}
                            className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-line cursor-pointer hover:opacity-90 transition-opacity"
                          >
                            <img
                              src={url}
                              alt={`Truck ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documents Section */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-navy-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      {isAr ? 'الوثائق الرسمية المرفقة' : 'Attached Documents'}
                    </h3>

                    {/* Driver License PDF */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700">
                        {isAr ? 'رخصة القيادة' : "Driver's License"}
                      </label>
                      <PdfViewer
                        url={selectedUser.profile?.license_doc_url}
                        title={`${selectedUser.name}-DriverLicense.pdf`}
                      />
                    </div>

                    {/* Truck License PDF */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700">
                        {isAr ? 'رخصة اقتناء الشاحنة' : 'Truck Registration Document'}
                      </label>
                      <PdfViewer
                        url={selectedUser.profile?.truck_license_doc_url}
                        title={`${selectedUser.name}-TruckRegistration.pdf`}
                      />
                    </div>

                    {/* ADR Certificate PDF */}
                    {selectedUser.profile?.adr_doc_url && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-amber-800">
                          {isAr ? 'شهادة نقل المواد الخطرة (ADR Certificate)' : 'ADR Safety Certificate'}
                        </label>
                        <PdfViewer
                          url={selectedUser.profile.adr_doc_url}
                          title={`${selectedUser.name}-ADR-Certificate.pdf`}
                        />
                      </div>
                    )}

                    {/* ID / Passport PDF */}
                    {(selectedUser.profile?.id_doc_url || selectedUser.profile?.passport_doc_url) && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700">
                          {isAr ? 'الهوية الوطنية / الجواز' : 'National ID / Passport'}
                        </label>
                        <PdfViewer
                          url={
                            selectedUser.profile?.id_doc_url ||
                            selectedUser.profile?.passport_doc_url
                          }
                          title={`${selectedUser.name}-Identity.pdf`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Bottom Action Bar */}
            <div className="p-4 border-t border-line bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setRejectingUser(selectedUser)}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>{isAr ? 'رفض الطلب' : 'Reject Application'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleApprove(selectedUser)}
                disabled={actionLoading}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>
                  {actionLoading
                    ? isAr ? 'جاري الاعتماد...' : 'Approving...'
                    : isAr ? 'اعتماد وتفعيل الحساب' : 'Approve & Activate'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal with Reason requirement */}
      {rejectingUser && (
        <div className="fixed inset-0 z-60 overflow-y-auto flex items-center justify-center p-4 bg-navy-900/50 backdrop-blur-xs">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-line shadow-2xl p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-navy-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                {isAr ? 'تأكيد رفض طلب الانضمام' : 'Reject Application'}
              </h3>
              <button
                onClick={() => setRejectingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-navy-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-ink-muted">
              {isAr
                ? `يرجى تحديد سبب رفض طلب ${rejectingUser.name}. سيتم إشعار المستخدم بالسبب لتصحيحه.`
                : `Please specify the reason for rejecting ${rejectingUser.name}'s application. This will be shown to the applicant.`}
            </p>

            {/* Quick preset reasons */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">
                {isAr ? 'أسباب شائعة جاهزة:' : 'Common reasons:'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {presetReasons.map((reason, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectReason(reason)}
                    className="text-start px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] transition-colors"
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleReject} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy-900">
                  {isAr ? 'سبب الرفض (إلزامي)' : 'Rejection Reason (Required)'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={
                    isAr
                      ? 'مثال: صورة رخصة القيادة غير واضحة وتاريخ الانتهاء غير مقروء...'
                      : 'E.g., Driver license document photo is blurry and expiry date cannot be verified...'
                  }
                  className="w-full rounded-xl border border-line p-3 text-xs focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingUser(null)}
                  className="px-4 py-2 rounded-xl border border-line text-xs font-semibold hover:bg-slate-50"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !rejectReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  {actionLoading
                    ? isAr ? 'جاري الرفض...' : 'Rejecting...'
                    : isAr ? 'تأكيد الرفض' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-70 bg-navy-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden bg-black shadow-2xl">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewPhoto}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

