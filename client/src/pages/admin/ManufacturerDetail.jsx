import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Phone,
  Mail,
  ArrowLeft,
  Key,
  ShieldCheck,
  Star,
  MapPin,
  Package,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { apiClient } from '../../api/client.js';
import PdfViewer from '../../components/PdfViewer.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import DataTable from '../../components/DataTable.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { useToast } from '../../state/toast.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';
import { linkTo } from '../../lib/links.js';

export default function AdminManufacturerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [company, setCompany] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cData, tData, rData] = await Promise.all([
        apiClient(`/manufacturers/${id}`),
        apiClient(`/manufacturers/${id}/tickets?page_size=20`),
        apiClient(`/manufacturers/${id}/ratings`).catch(() => ({ items: [] })),
      ]);
      setCompany(cData);
      setTickets(tData.items || []);
      setRatings(rData.items || []);
    } catch (err) {
      console.error('Failed to load manufacturer detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleConfirmResetPassword = async () => {
    try {
      setResetting(true);
      const res = await apiClient(`/admin/users/${id}/reset-password`, { method: 'POST' });
      setResetResult(res.temp_password);
      setShowResetModal(false);
      toast.success(isAr ? 'تم إنشاء كلمة مرور مؤقتة بنجاح' : 'Temporary password generated');
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return <TruckLoader message={isAr ? 'جاري تحميل ملف المصنع...' : 'Loading manufacturer...'} />;
  }

  if (!company) {
    return (
      <div className="p-8 text-center text-xs text-ink-muted">
        {isAr ? 'المصنع غير موجود' : 'Manufacturer not found'}
      </div>
    );
  }

  const columns = [
    {
      key: 'ticket_number',
      header: isAr ? 'رقم الشحنة' : 'Shipment #',
      render: (val) => <span className="font-mono font-bold text-navy-900">{val}</span>,
    },
    {
      key: 'route',
      header: isAr ? 'المسار' : 'Route',
      render: (_, row) => (
        <span className="font-medium text-navy-900">
          {row.pickup_city} → {row.dest_city}
        </span>
      ),
    },
    {
      key: 'driver',
      header: isAr ? 'السائق' : 'Driver',
      render: (_, row) =>
        row.driver_id ? (
          <Link
            to={`/admin/drivers/${row.driver_id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-navy-900 font-semibold hover:underline"
          >
            {row.driver_name}
          </Link>
        ) : (
          <span className="text-ink-muted italic">{isAr ? 'غير معيّن' : 'Unassigned'}</span>
        ),
    },
    {
      key: 'price',
      header: isAr ? 'السعر' : 'Price',
      render: (val) => <span className="font-bold text-navy-900">{formatMoney(val)}</span>,
    },
    {
      key: 'status',
      header: isAr ? 'الحالة' : 'Status',
      render: (val) => <StatusChip status={val} />,
    },
    {
      key: 'created_at',
      header: isAr ? 'تاريخ الإنشاء' : 'Date',
      render: (val) => formatDateTime(val),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/manufacturers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-navy-900 mb-3"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          <span>{isAr ? 'العودة للمصانع' : 'Back to Manufacturers'}</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-surface border border-line flex items-center justify-center text-navy-900 font-bold text-xl">
              <Building2 className="h-7 w-7 text-navy-800" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-navy-900">{company.name}</h1>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold capitalize">
                  {company.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-ink-muted mt-0.5">
                <span>{company.contact_person || 'Management'}</span>
                <span>·</span>
                <span dir="ltr">{company.phone}</span>
                <span>·</span>
                <span>{company.email}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowResetModal(true)}
              disabled={resetting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-line bg-card hover:bg-surface text-xs font-bold text-navy-900 shadow-2xs transition"
            >
              <Key className="h-3.5 w-3.5 text-amber-500" />
              <span>{resetting ? (isAr ? 'جاري التعيين...' : 'Resetting...') : (isAr ? 'إعادة تعيين كلمة المرور' : 'Reset Password')}</span>
            </button>
          </div>
        </div>

        {/* Temporary password banner */}
        {resetResult && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs flex items-center justify-between">
            <div>
              <span className="font-bold text-navy-900">
                {isAr ? 'كلمة المرور المؤقتة الجديدة:' : 'New Temporary Password:'}
              </span>{' '}
              <span className="font-mono font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded">
                {resetResult}
              </span>
            </div>
            <button
              onClick={() => setResetResult(null)}
              className="text-ink-muted hover:text-navy-900 text-[11px]"
            >
              {isAr ? 'إغلاق' : 'Dismiss'}
            </button>
          </div>
        )}
      </div>

      {/* Documents Section */}
      <div className="bg-card rounded-2xl border border-line p-6 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
          {isAr ? 'الوثائق الرسمية للشركة' : 'Official Shipper Documents'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="block text-xs font-semibold text-navy-900 mb-1.5">
              {isAr ? 'السجل التجاري' : 'Commercial Registration'}
            </span>
            {company.documents?.commercial_registration_url ? (
              <PdfViewer
                url={company.documents.commercial_registration_url}
                title={isAr ? 'السجل التجاري' : 'Commercial Registration'}
              />
            ) : (
              <div className="p-3 bg-surface rounded-xl border border-line text-xs text-ink-muted">
                {isAr ? 'غير متوفر' : 'Not uploaded'}
              </div>
            )}
          </div>

          <div>
            <span className="block text-xs font-semibold text-navy-900 mb-1.5">
              {isAr ? 'رخصة المهن' : 'Professions License'}
            </span>
            {company.documents?.professions_license_url ? (
              <PdfViewer
                url={company.documents.professions_license_url}
                title={isAr ? 'رخصة المهن' : 'Professions License'}
              />
            ) : (
              <div className="p-3 bg-surface rounded-xl border border-line text-xs text-ink-muted">
                {isAr ? 'غير متوفر' : 'Not uploaded'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shipments List */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-navy-900">
          {isAr ? 'شحنات الشركة' : 'Company Shipments'}
        </h2>

        <DataTable
          columns={columns}
          data={tickets}
          loading={loading}
          total={tickets.length}
          onRowClick={(row) => navigate(linkTo('admin', 'ticket', row.id))}
          emptyMessage={isAr ? 'لا توجد شحنات مسجلة لهذا المصنع' : 'No shipments created by this manufacturer.'}
        />
      </div>
      {/* Reset Password Modal */}
      <ConfirmModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleConfirmResetPassword}
        loading={resetting}
        variant="warning"
        title={isAr ? 'إعادة تعيين كلمة المرور' : 'Reset Manufacturer Password'}
        description={
          isAr
            ? `هل أنت متأكد من رغبتك في توليد كلمة مرور مؤقتة للمصنع ${company?.name}؟`
            : `Are you sure you want to generate a new temporary password for manufacturer ${company?.name}?`
        }
        confirmText={isAr ? 'تأكيد التعيين' : 'Confirm Reset'}
        cancelText={isAr ? 'إلغاء' : 'Cancel'}
      />
    </div>
  );
}

