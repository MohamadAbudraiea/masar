import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Truck, Plus, Phone, ArrowUpRight, Star, ShieldCheck, Key } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import FilterBar from '../../components/FilterBar.jsx';
import DataTable from '../../components/DataTable.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';
import { linkTo } from '../../lib/links.js';

export default function AdminDrivers() {
  const navigate = useNavigate();
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

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    scope: 'internal',
    license_class: 4,
    plate_number: '',
  });

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      params.set('page', filters.page || '1');
      params.set('page_size', '15');

      const data = await apiClient(`/drivers?${params.toString()}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [filters.q, filters.page]);

  const handleCreateDriver = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;

    try {
      setCreating(true);
      const res = await apiClient('/drivers', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          scope: formData.scope,
          license_class: parseInt(formData.license_class, 10),
          plate_number: formData.plate_number || '12-34567',
        }),
      });
      setCreatedResult(res);
      fetchDrivers();
    } catch (err) {
      alert(err.message || 'Failed to create driver');
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: isAr ? 'السائق' : 'Driver Name',
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
      key: 'truck',
      header: isAr ? 'الشاحنة واللوحة' : 'Truck & Plate',
      render: (val) =>
        val ? (
          <div>
            <div className="font-semibold text-navy-900">
              {val.type_name} · {val.body_name}
            </div>
            <div className="font-mono text-[10px] text-ink-muted">{val.plate_number}</div>
          </div>
        ) : (
          <span className="text-ink-muted italic">{isAr ? 'لم تسجل' : 'Not assigned'}</span>
        ),
    },
    {
      key: 'scope',
      header: isAr ? 'نطاق العمل' : 'Scope',
      render: (val) => (
        <span className="capitalize font-medium text-navy-900">
          {val === 'external' ? (isAr ? 'داخلي وخارجي' : 'External (Intl)') : (isAr ? 'داخلي فقط' : 'Internal')}
        </span>
      ),
    },
    {
      key: 'license_class',
      header: isAr ? 'فئة الرخصة' : 'License Class',
      render: (val) => <span className="font-bold text-navy-900">Class {val}</span>,
    },
    {
      key: 'completed_count',
      header: isAr ? 'الشحنات المكتملة' : 'Completed Trips',
      render: (val) => (
        <span className="font-bold text-navy-900">
          {val || 0} {isAr ? 'شحنة' : 'trips'}
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
    {
      key: 'status',
      header: isAr ? 'الحالة' : 'Status',
      render: (val) => (
        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 capitalize">
          {val}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">
            {isAr ? 'السائقون المعتمدون' : 'Verified Platform Drivers'}
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            {isAr
              ? `إدارة كافة حسابات السائقين وشاحناتهم المعتمدة (${total} سائق)`
              : `Manage approved drivers, commercial transport licenses, and truck specifications (${total} total)`}
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
          <span>{isAr ? 'إضافة سائق جديد' : 'Add Driver'}</span>
        </button>
      </div>

      <FilterBar
        filters={filters}
        onFilterChange={setFilter}
        onReset={resetFilters}
        placeholder={isAr ? 'بحث باسم السائق، الهاتف، أو لوحة الشاحنة...' : 'Search driver, phone, plate...'}
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
        onRowClick={(row) => navigate(linkTo('admin', 'driver', row.id))}
      />

      {/* Add Driver Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-line shadow-xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-base font-bold text-navy-900">
              {isAr ? 'إنشاء حساب سائق جديد (معتمد تلقائياً)' : 'Create New Driver (Auto-Approved)'}
            </h2>

            {createdResult ? (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-3">
                <div className="text-emerald-800 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{isAr ? 'تم إنشاء حساب السائق بنجاح!' : 'Driver created successfully!'}</span>
                </div>
                <div className="space-y-1">
                  <div>
                    <span className="text-ink-muted">{isAr ? 'الهاتف للدخول:' : 'Login Phone:'}</span>{' '}
                    <span className="font-bold text-navy-900" dir="ltr">
                      {createdResult.user?.phone}
                    </span>
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
              <form onSubmit={handleCreateDriver} className="space-y-3 text-xs">
                <div>
                  <label className="block text-ink-muted font-medium mb-1">
                    {isAr ? 'اسم السائق الرباعي *' : 'Driver Full Name *'}
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
                  <div>
                    <label className="block text-ink-muted font-medium mb-1">
                      {isAr ? 'البريد الإلكتروني (اختياري)' : 'Email (Optional)'}
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-surface/50 border border-line rounded-lg text-ink"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-ink-muted font-medium mb-1">
                      {isAr ? 'نطاق العمل' : 'Scope'}
                    </label>
                    <select
                      value={formData.scope}
                      onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                      className="w-full px-2 py-2 bg-surface/50 border border-line rounded-lg text-ink"
                    >
                      <option value="internal">{isAr ? 'داخلي' : 'Internal'}</option>
                      <option value="external">{isAr ? 'خارجي ودولي' : 'External'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-ink-muted font-medium mb-1">
                      {isAr ? 'فئة الرخصة' : 'License'}
                    </label>
                    <select
                      value={formData.license_class}
                      onChange={(e) => setFormData({ ...formData, license_class: e.target.value })}
                      className="w-full px-2 py-2 bg-surface/50 border border-line rounded-lg text-ink"
                    >
                      <option value="4">Class 4</option>
                      <option value="5">Class 5</option>
                      <option value="6">Class 6</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-ink-muted font-medium mb-1">
                      {isAr ? 'لوحة الشاحنة' : 'Plate Number'}
                    </label>
                    <input
                      type="text"
                      value={formData.plate_number}
                      onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                      placeholder="12-34567"
                      className="w-full px-2 py-2 bg-surface/50 border border-line rounded-lg text-ink"
                    />
                  </div>
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
                    {creating ? (isAr ? 'جاري الإنشاء...' : 'Creating...') : (isAr ? 'إنشاء الحساب' : 'Create Driver')}
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

