import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Plus, Trash2, Check, Star, Navigation } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import LocationPicker from '../../components/LocationPicker.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';

export default function ManufacturerLocations() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [kind, setKind] = useState('pickup'); // 'pickup' | 'destination'
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLocation, setNewLocation] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const res = await apiClient(`/locations?kind=${kind}`);
      setLocations(res.items || []);
    } catch (err) {
      console.error('Failed to load locations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [kind]);

  const handleSetDefault = async (id) => {
    try {
      await apiClient(`/locations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_default: true }),
      });
      fetchLocations();
    } catch (err) {
      console.error('Failed to set default location:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(isAr ? 'هل أنت متأكد من حذف هذا العنوان؟' : 'Are you sure you want to delete this location?')) {
      return;
    }
    try {
      await apiClient(`/locations/${id}`, { method: 'DELETE' });
      fetchLocations();
    } catch (err) {
      console.error('Failed to delete location:', err);
    }
  };

  const handleSaveLocation = async () => {
    if (!newLocation || !newLocation.address) return;
    try {
      setSaving(true);
      await apiClient('/locations', {
        method: 'POST',
        body: JSON.stringify({
          kind,
          label: newLocation.label || (kind === 'pickup' ? 'Warehouse' : 'Destination Point'),
          address: newLocation.address,
          lat: newLocation.lat,
          lng: newLocation.lng,
          city: newLocation.city,
          area: newLocation.area,
          contact_name: newLocation.contact_name,
          contact_phone: newLocation.contact_phone,
          is_default: locations.length === 0,
        }),
      });
      setShowAddModal(false);
      setNewLocation(null);
      fetchLocations();
    } catch (err) {
      console.error('Failed to save location:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">
            {isAr ? 'العناوين المحفوظة' : 'Saved Locations'}
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            {isAr
              ? 'إدارة مواقع التحميل والتسليم لسرعة ملء طلبات الشحن'
              : 'Save warehouse and client destination addresses for rapid shipment creation'}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-navy-900 font-bold text-xs shadow-xs transition"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{isAr ? 'إضافة عنوان جديد' : 'Add New Location'}</span>
        </button>
      </div>

      {/* Tabs: Pickup / Destination */}
      <div className="flex items-center gap-2 border-b border-line text-xs font-bold">
        <button
          onClick={() => setKind('pickup')}
          className={`pb-3 px-3 transition-colors border-b-2 ${
            kind === 'pickup'
              ? 'border-amber-500 text-navy-900'
              : 'border-transparent text-ink-muted hover:text-navy-900'
          }`}
        >
          {isAr ? 'مواقع التحميل (المصانع والمستودعات)' : 'Pickup Locations (Warehouses)'}
        </button>
        <button
          onClick={() => setKind('destination')}
          className={`pb-3 px-3 transition-colors border-b-2 ${
            kind === 'destination'
              ? 'border-amber-500 text-navy-900'
              : 'border-transparent text-ink-muted hover:text-navy-900'
          }`}
        >
          {isAr ? 'وجهات التسليم المتكررة' : 'Frequent Destinations'}
        </button>
      </div>

      {/* Locations List */}
      {loading ? (
        <TruckLoader message={isAr ? 'جاري تحميل العناوين...' : 'Loading locations...'} />
      ) : locations.length === 0 ? (
        <div className="bg-card rounded-2xl border border-line p-12 text-center">
          <MapPin className="h-8 w-8 text-ink-muted mx-auto mb-2" />
          <p className="text-xs text-ink-muted">
            {isAr
              ? 'لا توجد عناوين محفوظة في هذا القسم'
              : 'No saved locations in this category yet'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-3 text-xs font-bold text-navy-900 hover:underline"
          >
            {isAr ? '+ إضافة أول عنوان' : '+ Add your first location'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className={`bg-card rounded-2xl border p-5 shadow-xs transition-all relative ${
                loc.is_default ? 'border-amber-500/80 bg-amber-500/5' : 'border-line hover:border-navy-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-surface flex items-center justify-center text-navy-900 shrink-0 font-bold">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-navy-900">{loc.label}</h3>
                    <div className="text-[11px] font-medium text-ink-muted">
                      {loc.city} {loc.area ? `· ${loc.area}` : ''}
                    </div>
                  </div>
                </div>

                {loc.is_default && (
                  <span className="text-[10px] bg-amber-500 text-navy-900 font-bold px-2 py-0.5 rounded-full shadow-2xs">
                    {isAr ? 'افتراضي' : 'Default'}
                  </span>
                )}
              </div>

              <p className="text-xs text-ink line-clamp-2 mt-2 leading-relaxed">{loc.address}</p>

              {(loc.contact_name || loc.contact_phone) && (
                <div className="mt-3 pt-2 border-t border-line/60 text-[11px] text-ink-muted">
                  {loc.contact_name && <span className="font-medium text-navy-900 me-2">{loc.contact_name}</span>}
                  {loc.contact_phone && <span dir="ltr">{loc.contact_phone}</span>}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs">
                {!loc.is_default ? (
                  <button
                    onClick={() => handleSetDefault(loc.id)}
                    className="text-ink-muted hover:text-navy-900 font-medium flex items-center gap-1"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>{isAr ? 'تعيين كافتراضي' : 'Set as default'}</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    <span>{isAr ? 'العنوان الافتراضي' : 'Primary address'}</span>
                  </span>
                )}

                <button
                  onClick={() => handleDelete(loc.id)}
                  className="text-rose-500 hover:text-rose-700 p-1 rounded transition"
                  title={isAr ? 'حذف' : 'Delete'}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Location Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-line shadow-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-navy-900">
              {isAr
                ? kind === 'pickup'
                  ? 'إضافة موقع تحميل (مستودع)'
                  : 'إضافة وجهة تسليم جديدة'
                : kind === 'pickup'
                ? 'Add Pickup Location (Warehouse)'
                : 'Add Frequent Destination'}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">
                  {isAr ? 'تسمية الموقع' : 'Location Label'}
                </label>
                <input
                  type="text"
                  placeholder={kind === 'pickup' ? 'Main Factory / Warehouse #3' : 'Reseller Zarqa Store'}
                  onChange={(e) =>
                    setNewLocation((prev) => ({ ...prev, label: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs bg-surface/50 border border-line rounded-lg text-ink focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Location Picker */}
              <LocationPicker
                value={newLocation}
                onChange={(val) => setNewLocation((prev) => ({ ...prev, ...val }))}
              />

              {kind === 'destination' && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1">
                      {isAr ? 'اسم المستلم' : 'Contact Person'}
                    </label>
                    <input
                      type="text"
                      placeholder="Mr. Ahmad"
                      onChange={(e) =>
                        setNewLocation((prev) => ({ ...prev, contact_name: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs bg-surface/50 border border-line rounded-lg text-ink focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1">
                      {isAr ? 'رقم هاتف المستلم' : 'Contact Phone'}
                    </label>
                    <input
                      type="text"
                      placeholder="+96279..."
                      dir="ltr"
                      onChange={(e) =>
                        setNewLocation((prev) => ({ ...prev, contact_phone: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs bg-surface/50 border border-line rounded-lg text-ink focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setNewLocation(null);
                }}
                className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-ink-muted hover:bg-surface"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={!newLocation || !newLocation.address || saving}
                onClick={handleSaveLocation}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-navy-900 text-xs font-bold shadow-xs transition"
              >
                {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ العنوان' : 'Save Location')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

