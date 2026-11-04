import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Truck,
  Phone,
  Mail,
  ArrowLeft,
  Key,
  ShieldCheck,
  Star,
  Package,
  Edit2,
  Save,
  Check,
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

export default function AdminDriverDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [driver, setDriver] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  // Edit truck state (admin-only privilege per 01 §13 / 00 §6)
  const [isEditingTruck, setIsEditingTruck] = useState(false);
  const [truckForm, setTruckForm] = useState({
    plate_number: '',
    cooling: 'none',
    adr_certified: false,
  });
  const [savingTruck, setSavingTruck] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dData, tData] = await Promise.all([
        apiClient(`/drivers/${id}`),
        apiClient(`/drivers/${id}/tickets?page_size=20`),
      ]);
      setDriver(dData);
      setTickets(tData.items || []);
      if (dData.truck) {
        setTruckForm({
          plate_number: dData.truck.plate_number || '',
          cooling: dData.truck.cooling || 'none',
          adr_certified: Boolean(dData.truck.adr_certified),
        });
      }
    } catch (err) {
      console.error('Failed to load driver detail:', err);
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

  const handleSaveTruck = async () => {
    try {
      setSavingTruck(true);
      await apiClient(`/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          truck: {
            plate_number: truckForm.plate_number,
            cooling: truckForm.cooling,
            adr_certified: truckForm.adr_certified,
          },
        }),
      });
      setIsEditingTruck(false);
      toast.success(isAr ? 'تم تحديث بيانات الشاحنة بنجاح' : 'Truck updated successfully');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update truck');
    } finally {
      setSavingTruck(false);
    }
  };

  if (loading) {
    return <TruckLoader message={isAr ? 'جاري تحميل ملف السائق...' : 'Loading driver...'} />;
  }

  if (!driver) {
    return (
      <div className="p-8 text-center text-xs text-ink-muted">
        {isAr ? 'السائق غير موجود' : 'Driver not found'}
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
      key: 'company',
      header: isAr ? 'الشركة' : 'Shipper',
      render: (_, row) => (
        <Link
          to={`/admin/manufacturers/${row.manufacturer_id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-bold text-navy-900 hover:underline"
        >
          {row.manufacturer_name}
        </Link>
      ),
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
      key: 'price',
      header: isAr ? 'السعر الكلي' : 'Total Price',
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
          to="/admin/drivers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-navy-900 mb-3"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          <span>{isAr ? 'العودة للسائقين' : 'Back to Drivers'}</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-surface border border-line flex items-center justify-center text-navy-900 font-bold text-xl">
              <Truck className="h-7 w-7 text-navy-800" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-navy-900">{driver.name}</h1>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold capitalize">
                  {driver.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-ink-muted mt-0.5">
                <span dir="ltr">{driver.phone}</span>
                <span>·</span>
                <span>Class {driver.license_class}</span>
                <span>·</span>
                <span className="capitalize">{driver.scope} Scope</span>
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

      {/* Truck Specifications Card (Editable by Admin Only) */}
      <div className="bg-card rounded-2xl border border-line p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-emerald-600" />
            <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
              {isAr ? 'مواصفات الشاحنة (تعديل الإدارة فقط)' : 'Registered Truck (Admin Edit)'}
            </h2>
          </div>
          {!isEditingTruck ? (
            <button
              onClick={() => setIsEditingTruck(true)}
              className="text-xs font-bold text-navy-900 hover:text-amber-600 flex items-center gap-1"
            >
              <Edit2 className="h-3 w-3" />
              <span>{isAr ? 'تعديل الشاحنة' : 'Edit Truck'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingTruck(false)}
                className="text-xs text-ink-muted hover:text-navy-900 px-2 py-1"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveTruck}
                disabled={savingTruck}
                className="px-3 py-1 bg-amber-500 text-navy-900 font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs"
              >
                <Save className="h-3 w-3" />
                <span>{savingTruck ? (isAr ? 'حفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}</span>
              </button>
            </div>
          )}
        </div>

        {isEditingTruck ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-ink-muted font-medium mb-1">
                {isAr ? 'رقم اللوحة' : 'Plate Number'}
              </label>
              <input
                type="text"
                value={truckForm.plate_number}
                onChange={(e) => setTruckForm({ ...truckForm, plate_number: e.target.value })}
                className="w-full px-3 py-2 bg-surface/50 border border-line rounded-lg text-ink"
              />
            </div>
            <div>
              <label className="block text-ink-muted font-medium mb-1">
                {isAr ? 'نظام التبريد' : 'Cooling'}
              </label>
              <select
                value={truckForm.cooling}
                onChange={(e) => setTruckForm({ ...truckForm, cooling: e.target.value })}
                className="w-full px-3 py-2 bg-surface/50 border border-line rounded-lg text-ink"
              >
                <option value="none">{isAr ? 'بدون تبريد' : 'None'}</option>
                <option value="chilled">{isAr ? 'مبرّد (Chilled)' : 'Chilled'}</option>
                <option value="frozen">{isAr ? 'مجمّد (Frozen)' : 'Frozen'}</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="adr"
                checked={truckForm.adr_certified}
                onChange={(e) => setTruckForm({ ...truckForm, adr_certified: e.target.checked })}
                className="rounded border-line text-amber-500 focus:ring-amber-500 h-4 w-4"
              />
              <label htmlFor="adr" className="text-xs font-semibold text-navy-900">
                {isAr ? 'شهادة المواد الخطرة (ADR Certified)' : 'ADR Hazardous Materials Certified'}
              </label>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-ink-muted block text-[11px] mb-0.5">{isAr ? 'النوع والهيكل' : 'Type & Body'}</span>
              <span className="font-bold text-navy-900">
                {driver.truck ? `${driver.truck.type_name} · ${driver.truck.body_name}` : '—'}
              </span>
            </div>
            <div>
              <span className="text-ink-muted block text-[11px] mb-0.5">{isAr ? 'رقم اللوحة' : 'Plate'}</span>
              <span className="font-mono font-bold text-navy-900 bg-surface px-2 py-0.5 rounded border border-line/60">
                {driver.truck?.plate_number || '—'}
              </span>
            </div>
            <div>
              <span className="text-ink-muted block text-[11px] mb-0.5">{isAr ? 'التبريد' : 'Cooling'}</span>
              <span className="font-semibold text-emerald-700 capitalize">
                {driver.truck?.cooling || 'None'}
              </span>
            </div>
            <div>
              <span className="text-ink-muted block text-[11px] mb-0.5">{isAr ? 'ADR' : 'ADR Hazardous'}</span>
              <span className="font-semibold text-navy-900">
                {driver.truck?.adr_certified ? '✓ ADR Certified' : '✕ No'}
              </span>
            </div>
          </div>
        )}

        {/* Photos */}
        {driver.truck?.photos?.length > 0 && (
          <div className="pt-3 border-t border-line/60">
            <span className="block text-xs font-semibold text-navy-900 mb-2">
              {isAr ? 'صور الشاحنة' : 'Truck Photos'}
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {driver.truck.photos.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt="Truck"
                  className="w-full h-28 object-cover rounded-xl border border-line"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Driver Documents Section */}
      <div className="bg-card rounded-2xl border border-line p-6 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
          {isAr ? 'وثائق ورخص السائق' : 'Driver Licenses & Documents'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="block text-xs font-semibold text-navy-900 mb-1.5">
              {isAr ? 'رخصة القيادة' : 'Driving License'}
            </span>
            {driver.documents?.license_doc_url ? (
              <PdfViewer url={driver.documents.license_doc_url} title="Driver License" />
            ) : (
              <div className="p-3 bg-surface rounded-xl border border-line text-xs text-ink-muted">
                {isAr ? 'غير متوفر' : 'Not uploaded'}
              </div>
            )}
          </div>

          <div>
            <span className="block text-xs font-semibold text-navy-900 mb-1.5">
              {isAr ? 'رخصة الشاحنة (اقتناء)' : 'Truck Registration (Mulkia)'}
            </span>
            {driver.documents?.truck_license_doc_url ? (
              <PdfViewer url={driver.documents.truck_license_doc_url} title="Truck Registration" />
            ) : (
              <div className="p-3 bg-surface rounded-xl border border-line text-xs text-ink-muted">
                {isAr ? 'غير متوفر' : 'Not uploaded'}
              </div>
            )}
          </div>

          <div>
            <span className="block text-xs font-semibold text-navy-900 mb-1.5">
              {isAr ? 'الهوية الوطنية / الجواز' : 'National ID / Passport'}
            </span>
            {driver.documents?.id_doc_url || driver.documents?.passport_doc_url ? (
              <PdfViewer
                url={driver.documents.id_doc_url || driver.documents.passport_doc_url}
                title="ID Document"
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
          {isAr ? 'شحنات السائق على المنصة' : 'Driver Shipments'}
        </h2>

        <DataTable
          columns={columns}
          data={tickets}
          loading={loading}
          total={tickets.length}
          onRowClick={(row) => navigate(linkTo('admin', 'ticket', row.id))}
          emptyMessage={isAr ? 'لا توجد شحنات مسجلة لهذا السائق' : 'No shipments handled by this driver.'}
        />
      </div>
      {/* Reset Password Modal */}
      <ConfirmModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleConfirmResetPassword}
        loading={resetting}
        variant="warning"
        title={isAr ? 'إعادة تعيين كلمة المرور' : 'Reset Driver Password'}
        description={
          isAr
            ? `هل أنت متأكد من رغبتك في توليد كلمة مرور مؤقتة للسائق ${driver?.name}؟`
            : `Are you sure you want to generate a new temporary password for driver ${driver?.name}?`
        }
        confirmText={isAr ? 'تأكيد التعيين' : 'Confirm Reset'}
        cancelText={isAr ? 'إلغاء' : 'Cancel'}
      />
    </div>
  );
}

