import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Plus, Phone, ArrowUpRight, Star, ShieldCheck, Mail, Key } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import FilterBar from '../../components/FilterBar.jsx';
import DataTable from '../../components/DataTable.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';
import { linkTo } from '../../lib/links.js';
import { useToast } from '../../state/toast.jsx';

export default function AdminManufacturers() {
  const navigate = useNavigate();
  const toast = useToast();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const { filters, setFilter, resetFilters } = useUrlFilters({
    q: '',
    page: '1',
  });

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdResult, setCreatedResult] = useState(null);

  // Form state for creating a new manufacturer
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    contact_person: '',
    address: '',
    city: 'Amman',
  });

  const fetchManufacturers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      params.set('page', filters.page || '1');
      params.set('page_size', '15');

      const data = await apiClient(`/manufacturers?${params.toString()}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load manufacturers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManufacturers();
  }, [filters.q, filters.page]);

  const handleCreateManufacturer = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) return;

    try {
      setCreating(true);
      const res = await apiClient('/manufacturers', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          emails: [formData.email],
          phones: [formData.phone],
          contact_person: formData.contact_person,
          location: {
            address: formData.address || 'Amman Industrial Zone',
            city: formData.city || 'Amman',
            label: 'Main Warehouse',
          },
        }),
      });
      setCreatedResult(res);
      toast.success(isAr ? 'تم إنشاء حساب المصنع بنجاح' : 'Manufacturer created successfully');
      fetchManufacturers();
    } catch (err) {
      toast.error(err.message || 'Failed to create manufacturer');
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: isAr ? 'اسم الشركة المصنّعة' : 'Company Name',
      render: (val, row) => (
        <div>
          <span className="font-bold text-navy-900 hover:text-amber-600 transition flex items-center gap-1">
            {val}
            <ArrowUpRight className="h-3 w-3 text-ink-muted" />
          </span>
          <span className="text-[11px] text-ink-muted" dir="ltr">
            {row.phone}
          </span>
        </div>
      ),
    },
    {
      key: 'contact_person',
      header: isAr ? 'المسؤول' : 'Contact Person',
      render: (val) => val || '—',
    },
    {
      key: 'tickets_count',
      header: isAr ? 'عدد الشحنات' : 'Shipments',
      render: (val) => (
        <span className="font-bold text-navy-900">
          {val || 0} {isAr ? 'شحنة' : 'trips'}
        </span>
      ),
    },
    {
      key: 'total_volume',
      header: isAr ? 'حجم التداول' : 'Total Volume',
      render: (val) => <span className="font-mono font-bold text-navy-900">{formatMoney(val)}</span>,
    },
    {
      key: 'status',
      header: isAr ? 'الحالة' : 'Status',
      render: (val) => (
        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 capitalize">
          {val}
        </span>
      ),
    },
    {
      key: 'avg_stars',
      header: isAr ? 'التقييم' : 'Rating',
      render: (val, row) => (
        <div className="flex items-center gap-1 text-amber-500 font-bold">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
          <span>{val || '5.0'}</span>
          <span className="text-[10px] text-ink-muted">({row.ratings_count || 0})</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">
            {isAr ? 'الشركات المصنّعة' : 'Manufacturers & Shippers'}
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            {isAr
              ? `إدارة كافة حسابات المصانع والشركات الشاحنة (${total} شركة)`
              : `Manage verified corporate shipper accounts and documents (${total} total)`}
          </p>
        </div>

        <button
          onClick={() => {
            setCreatedResult(null);
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-navy-900 font-bold text-xs shadow-xs transition"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{isAr ? 'إضافة مصنع جديد' : 'Add Manufacturer'}</span>
        </button>
      </div>

      <FilterBar
        filters={filters}
        onFilterChange={setFilter}
        onReset={resetFilters}
        placeholder={isAr ? 'بحث باسم المصنع، الهاتف، أو البريد...' : 'Search company name, phone, or email...'}
        showDateRange={false}
      />

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        total={total}
        page={parseInt(filters.page || '1', 10)}
        pageSize={15}
        onPageChange={(p) => setFilter('page', p)}
        onRowClick={(row) => navigate(linkTo('admin', 'manufacturer', row.id))}
      />

      {/* Add Manufacturer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-line shadow-xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-base font-bold text-navy-900">
              {isAr ? 'إنشاء حساب مصنع جديد (معتمد تلقائياً)' : 'Create New Manufacturer (Auto-Approved)'}
            </h2>

            {createdResult ? (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-3">
                <div className="text-emerald-800 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{isAr ? 'تم إنشاء الحساب بنجاح!' : 'Manufacturer created successfully!'}</span>
                </div>
                <div className="space-y-1">
                  <div>
                    <span className="text-ink-muted">{isAr ? 'اسم الدخول:' : 'Login:'}</span>{' '}
                    <span className="font-bold text-navy-900">{createdResult.user?.email}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted">{isAr ? 'كلمة المرور المؤقتة:' : 'Temporary Password:'}</span>{' '}
                    <span className="font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                      {createdResult.temp_password}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-full py-2 bg-navy-900 text-white font-bold rounded-xl text-xs mt-2"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateManufacturer} className="space-y-3 text-xs">
                <div>
                  <label className="block text-ink-muted font-medium mb-1">
                    {isAr ? 'اسم الشركة المصنّعة *' : 'Company Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-surface/50 border border-line rounded-lg text-ink"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-ink-muted font-medium mb-1">
                      {isAr ? 'البريد الإلكتروني *' : 'Email *'}
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-surface/50 border border-line rounded-lg text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-ink-muted font-medium mb-1">
                      {isAr ? 'رقم الهاتف *' : 'Phone *'}
                    </label>
                    <input
                      type="text"
                      required
                      dir="ltr"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+962..."
                      className="w-full px-3 py-2 bg-surface/50 border border-line rounded-lg text-ink"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-ink-muted font-medium mb-1">
                      {isAr ? 'الشخص المسؤول' : 'Contact Person'}
                    </label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="w-full px-3 py-2 bg-surface/50 border border-line rounded-lg text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-ink-muted font-medium mb-1">
                      {isAr ? 'المدينة' : 'City'}
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 bg-surface/50 border border-line rounded-lg text-ink"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-ink-muted font-medium mb-1">
                    {isAr ? 'عنوان المستودع الرئيسي' : 'Main Warehouse Address'}
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Sahab Industrial City..."
                    className="w-full px-3 py-2 bg-surface/50 border border-line rounded-lg text-ink"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl border border-line text-ink-muted hover:bg-surface font-semibold"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-navy-900 font-bold shadow-xs transition"
                  >
                    {creating ? (isAr ? 'جاري الإنشاء...' : 'Creating...') : (isAr ? 'إنشاء المصنع' : 'Create Account')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

