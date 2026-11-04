import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package,
  Truck,
  MapPin,
  Calendar,
  CreditCard,
  ShieldCheck,
  Info,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Thermometer,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { useAuth } from '../../state/auth.jsx';
import LocationPicker from '../../components/LocationPicker.jsx';
import TruckSelector from '../../components/TruckSelector.jsx';
import FileUpload from '../../components/FileUpload.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';
import { formatMoney } from '../../lib/format.js';

export default function NewShipment() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const navigate = useNavigate();

  // Reference data
  const [categories, setCategories] = useState([]);
  const [savedPickups, setSavedPickups] = useState([]);
  const [savedDestinations, setSavedDestinations] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form State
  const [pickupAt, setPickupAt] = useState('');
  const [pickupLocation, setPickupLocation] = useState(null);
  const [needsLoading, setNeedsLoading] = useState(false);
  const [destLocation, setDestLocation] = useState(null);
  const [needsUnloading, setNeedsUnloading] = useState(false);
  const [destName, setDestName] = useState('');
  const [destPhone, setDestPhone] = useState('+9627');

  // Cargo
  const [goodsCategoryId, setGoodsCategoryId] = useState('');
  const [goodsDescription, setGoodsDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('ton');
  const [tripType, setTripType] = useState('local');
  const [destCountry, setDestCountry] = useState('Saudi Arabia');
  const [notes, setNotes] = useState('');

  // Required Truck
  const [requiredCategory, setRequiredCategory] = useState('heavy');
  const [requiredBody, setRequiredBody] = useState('closed_box');
  const [requiredCooling, setRequiredCooling] = useState('');

  // Conditional Fields
  const [isHazardous, setIsHazardous] = useState(false);
  const [adrClass, setAdrClass] = useState('3');
  const [safetyCertKey, setSafetyCertKey] = useState('');
  const [tempMin, setTempMin] = useState('2');
  const [tempMax, setTempMax] = useState('6');
  const [liquidType, setLiquidType] = useState('');
  const [customsEnabled, setCustomsEnabled] = useState(false);
  const [customsDecNumber, setCustomsDecNumber] = useState('');
  const [customsPermitType, setCustomsPermitType] = useState('export');
  const [customsDetails, setCustomsDetails] = useState('');
  const [customsDocKey, setCustomsDocKey] = useState('');

  // Price & Escrow
  const [price, setPrice] = useState(750);
  const [payNow, setPayNow] = useState(false);

  // Suggestions & Routing
  const [suggestions, setSuggestions] = useState([]);
  const [distanceKm, setDistanceKm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingInitial(true);
        const [catsRes, pickupsRes, destsRes] = await Promise.all([
          apiClient('/reference/goods-categories'),
          apiClient('/locations?kind=pickup'),
          apiClient('/locations?kind=destination'),
        ]);

        // Filter categories to manufacturer's permitted categories if present
        const mCats = user?.profile?.goods_categories || [];
        const allCats = catsRes.items || [];
        const availableCats =
          mCats.length > 0
            ? allCats.filter((c) => mCats.includes(c.id))
            : allCats;

        setCategories(availableCats);
        if (availableCats.length > 0) {
          setGoodsCategoryId(availableCats[0].id);
        }

        const pickups = pickupsRes.items || [];
        setSavedPickups(pickups);
        if (pickups.length > 0) {
          const defaultPickup = pickups.find((p) => p.is_default) || pickups[0];
          setPickupLocation(defaultPickup);
        }

        setSavedDestinations(destsRes.items || []);

        // Default pickup date to tomorrow 09:00 AM
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        // format for datetime-local
        const pad = (n) => String(n).padStart(2, '0');
        const dtLocal = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(
          tomorrow.getDate()
        )}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;
        setPickupAt(dtLocal);
      } catch (err) {
        console.error('Failed to load form data:', err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, [user]);

  // Truck suggestion auto-fetch
  useEffect(() => {
    if (!goodsCategoryId || !quantity || Number(quantity) <= 0) return;

    let cancel = false;
    async function fetchSuggestion() {
      try {
        const data = await apiClient('/reference/suggest-truck', {
          method: 'POST',
          body: JSON.stringify({
            goods_category_id: Number(goodsCategoryId),
            quantity: Number(quantity),
            liquid_type: liquidType || undefined,
          }),
        });

        if (!cancel && data.suggestions?.length > 0) {
          setSuggestions(data.suggestions);
          const top = data.suggestions[0];
          setRequiredCategory(top.category);
          setRequiredBody(top.body);
          if (top.cooling) {
            setRequiredCooling(top.cooling);
          }
          if (data.unit) {
            setUnit(data.unit);
          }
        }
      } catch (e) {
        console.warn('Auto suggestion fetch failed:', e.message);
      }
    }

    const timer = setTimeout(fetchSuggestion, 350);
    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [goodsCategoryId, quantity, liquidType]);

  // Auto-calculate distance
  useEffect(() => {
    if (pickupLocation?.lat && destLocation?.lat) {
      apiClient(
        `/geo/route?from=${pickupLocation.lat},${pickupLocation.lng}&to=${destLocation.lat},${destLocation.lng}`
      )
        .then((res) => setDistanceKm(res.distance_km))
        .catch(() => {});
    }
  }, [pickupLocation, destLocation]);

  const selectedCategory = categories.find((c) => c.id === Number(goodsCategoryId));
  const isChilledOrFrozen =
    selectedCategory?.suggested_body === 'refrigerated' ||
    requiredBody === 'refrigerated' ||
    requiredCooling;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!pickupLocation) {
      setError(isAr ? 'يرجى تحديد موقع التحميل' : 'Please select a pickup location');
      return;
    }
    if (!destLocation) {
      setError(isAr ? 'يرجى تحديد موقع التسليم' : 'Please select a destination location');
      return;
    }
    if (!destName || !destPhone) {
      setError(isAr ? 'يرجى إدخال اسم المستلم وهاتفه' : 'Please enter receiver name and phone');
      return;
    }
    if (Number(price) < 500) {
      setError(isAr ? 'الحد الأدنى لقيمة الشحنة 500 دينار' : 'Minimum shipment price is 500 JD');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        pickup_at: new Date(pickupAt).toISOString(),
        pickup: {
          location_id: pickupLocation.id || undefined,
          label: pickupLocation.label,
          address: pickupLocation.address,
          lat: pickupLocation.lat,
          lng: pickupLocation.lng,
          city: pickupLocation.city,
          area: pickupLocation.area,
        },
        needs_loading: needsLoading,
        needs_unloading: needsUnloading,
        destination: {
          location_id: destLocation.id || undefined,
          address: destLocation.address,
          lat: destLocation.lat,
          lng: destLocation.lng,
          city: destLocation.city,
          area: destLocation.area,
          dest_name: destName.trim(),
          dest_phone: destPhone.trim(),
        },
        cargo: {
          goods_category_id: Number(goodsCategoryId),
          goods_description: goodsDescription.trim() || undefined,
          quantity: Number(quantity),
          unit,
          trip_type: tripType,
          destination_country: tripType === 'international' ? destCountry : undefined,
          notes: notes.trim() || undefined,
        },
        required_truck: {
          category: requiredCategory,
          body: requiredBody,
          cooling: requiredCooling || undefined,
        },
        conditional: {
          is_hazardous: isHazardous,
          adr_class: isHazardous ? adrClass : undefined,
          safety_certificate_key: isHazardous ? safetyCertKey : undefined,
          temp_min: isChilledOrFrozen ? Number(tempMin) : undefined,
          temp_max: isChilledOrFrozen ? Number(tempMax) : undefined,
          liquid_type: liquidType || undefined,
          customs_enabled: customsEnabled || tripType === 'international',
          customs_declaration_number: customsDecNumber || undefined,
          customs_permit_type: customsPermitType || undefined,
          customs_permit_details: customsDetails || undefined,
          customs_docs_key: customsDocKey || undefined,
        },
        price: Number(price),
        pay_now: payNow,
      };

      const created = await apiClient('/tickets', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      navigate(`/manufacturer/shipments/${created.id}`);
    } catch (err) {
      console.error('Shipment creation error:', err);
      setError(err.message || 'Failed to create shipment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <TruckLoader size="md" />
        <span className="text-xs text-ink-muted">{isAr ? 'جاري التحميل...' : 'Loading...'}</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-black text-navy-900 tracking-tight flex items-center gap-2">
          <Package className="w-6 h-6 text-emerald-600" />
          {isAr ? 'إنشاء شحنة جديدة' : 'Create New Shipment'}
        </h1>
        <p className="text-xs text-ink-muted mt-1">
          {isAr
            ? 'حدد تفاصيل البضاعة ومسار النقل ليتم اقتراح الشاحنة المناسبة ونشرها للسائقين المعتمدين.'
            : 'Enter cargo specifications and route to find qualified trucks and escrow backing.'}
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Cargo Specifications */}
        <div className="bg-card rounded-2xl border border-line p-6 space-y-4">
          <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2 border-b border-line pb-3">
            <Package className="w-4 h-4 text-emerald-600" />
            {isAr ? '1. مواصفات البضاعة والحمولة' : '1. Cargo Specifications'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1">
                {isAr ? 'نوع / تصنيف البضاعة' : 'Goods Category'} *
              </label>
              <select
                value={goodsCategoryId}
                onChange={(e) => setGoodsCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-line text-xs bg-white focus:outline-hidden focus:border-navy-900"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {isAr ? c.name_ar : c.name_en}
                  </option>
                ))}
              </select>
            </div>

            {/* Trip Type */}
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1">
                {isAr ? 'نطاق الرحلة' : 'Trip Scope'} *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTripType('local')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    tripType === 'local'
                      ? 'border-navy-900 bg-navy-900 text-white'
                      : 'border-line bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {isAr ? 'نقل محلي (داخل الأردن)' : 'Local (Jordan)'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTripType('international');
                    setCustomsEnabled(true);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    tripType === 'international'
                      ? 'border-navy-900 bg-navy-900 text-white'
                      : 'border-line bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {isAr ? 'نقل دولي (تصدير)' : 'International'}
                </button>
              </div>
            </div>

            {/* Quantity & Unit */}
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1">
                {isAr ? 'الكمية والوزن' : 'Quantity & Unit'} *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 15"
                  className="w-2/3 px-3 py-2 rounded-xl border border-line text-xs focus:outline-hidden focus:border-navy-900"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-1/3 px-3 py-2 rounded-xl border border-line text-xs bg-white focus:outline-hidden"
                >
                  <option value="ton">{isAr ? 'طن (Tons)' : 'ton'}</option>
                  <option value="liter">{isAr ? 'لتر (Liters)' : 'liter'}</option>
                  <option value="m3">{isAr ? 'متر مكعب (m³)' : 'm3'}</option>
                </select>
              </div>
            </div>

            {/* Goods Description */}
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1">
                {isAr ? 'وصف دقيق للبضاعة' : 'Goods Description'}
              </label>
              <input
                type="text"
                value={goodsDescription}
                onChange={(e) => setGoodsDescription(e.target.value)}
                placeholder={isAr ? 'مثال: مواد غذائية معبأة بكراتين' : 'e.g. Canned food in pallets'}
                className="w-full px-3 py-2 rounded-xl border border-line text-xs focus:outline-hidden focus:border-navy-900"
              />
            </div>
          </div>

          {/* Conditional Temperature Controls */}
          {isChilledOrFrozen && (
            <div className="p-4 rounded-xl bg-cyan-50/70 border border-cyan-200 space-y-2">
              <div className="flex items-center gap-2 text-cyan-950 font-bold text-xs">
                <Thermometer className="w-4 h-4 text-cyan-600" />
                <span>{isAr ? 'التحكم بدرجة حرارة التبريد (°C)' : 'Temperature Controls (°C)'}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    {isAr ? 'درجة الحرارة الدنيا' : 'Min Temp (°C)'}
                  </label>
                  <input
                    type="number"
                    value={tempMin}
                    onChange={(e) => setTempMin(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-line bg-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    {isAr ? 'درجة الحرارة القصوى' : 'Max Temp (°C)'}
                  </label>
                  <input
                    type="number"
                    value={tempMax}
                    onChange={(e) => setTempMax(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-line bg-white text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Hazardous toggle */}
          <div className="pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isHazardous}
                onChange={(e) => setIsHazardous(e.target.checked)}
                className="rounded border-line text-amber-600 focus:ring-0"
              />
              <span className="text-xs font-semibold text-navy-900">
                {isAr
                  ? 'بضائع خطرة تتطلب شهادة نقل خاصة (ADR)'
                  : 'Hazardous cargo requiring ADR certified truck & driver'}
              </span>
            </label>
          </div>
        </div>

        {/* Section 2: Truck Recommendation */}
        <div className="bg-card rounded-2xl border border-line p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              {isAr ? '2. الشاحنة المطلوبة' : '2. Required Truck'}
            </h2>
            {suggestions.length > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                ✓ {isAr ? 'تم اقتراح الشاحنة المناسبة آلياً' : 'Auto-suggested for cargo'}
              </span>
            )}
          </div>

          {/* Suggestions Pill Carousel */}
          {suggestions.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-[11px] font-bold text-ink-muted shrink-0">
                {isAr ? 'الاقتراحات:' : 'Suggested:'}
              </span>
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setRequiredCategory(s.category);
                    setRequiredBody(s.body);
                    if (s.cooling) setRequiredCooling(s.cooling);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all ${
                    requiredCategory === s.category && requiredBody === s.body
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                      : 'border-line bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {s.category} · {s.body} {s.cooling ? `(${s.cooling})` : ''}
                </button>
              ))}
            </div>
          )}

          <TruckSelector
            value={{
              category: requiredCategory,
              body: requiredBody,
              cooling: requiredCooling,
            }}
            onChange={(val) => {
              setRequiredCategory(val.category);
              setRequiredBody(val.body);
              setRequiredCooling(val.cooling || '');
            }}
          />
        </div>

        {/* Section 3: Pickup & Destination Locations */}
        <div className="bg-card rounded-2xl border border-line p-6 space-y-4">
          <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2 border-b border-line pb-3">
            <MapPin className="w-4 h-4 text-emerald-600" />
            {isAr ? '3. مسار النقل والمواقع' : '3. Route & Locations'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pickup Location */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-navy-900">
                {isAr ? 'موقع التحميل (المصنع / المستودع)' : 'Pickup Location'} *
              </label>

              {/* Saved Locations Select */}
              {savedPickups.length > 0 && (
                <select
                  value={pickupLocation?.id || ''}
                  onChange={(e) => {
                    const found = savedPickups.find((p) => p.id === e.target.value);
                    if (found) setPickupLocation(found);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-line text-xs bg-white mb-2"
                >
                  <option value="">{isAr ? '— اختر من المواقع المحفوظة —' : '— Select from saved locations —'}</option>
                  {savedPickups.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.city})
                    </option>
                  ))}
                </select>
              )}

              <LocationPicker
                value={pickupLocation}
                onChange={setPickupLocation}
                title={isAr ? 'تحديد موقع التحميل على الخريطة' : 'Set Pickup Location'}
              />

              <div className="grid grid-cols-1 gap-2 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isAr ? 'تاريخ ووقت التحميل المطلوب' : 'Scheduled Pickup Date & Time'} *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={pickupAt}
                    onChange={(e) => setPickupAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-line text-xs font-mono"
                  />
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={needsLoading}
                    onChange={(e) => setNeedsLoading(e.target.checked)}
                    className="rounded border-line text-emerald-600 focus:ring-0"
                  />
                  <span className="text-xs text-slate-700">
                    {isAr ? 'يتطلب عمال تحميل في المصنع' : 'Requires loading assistance'}
                  </span>
                </label>
              </div>
            </div>

            {/* Destination Location */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-navy-900">
                {isAr ? 'موقع التسليم وبيانات المستلم' : 'Destination & Receiver'} *
              </label>

              {savedDestinations.length > 0 && (
                <select
                  value={destLocation?.id || ''}
                  onChange={(e) => {
                    const found = savedDestinations.find((d) => d.id === e.target.value);
                    if (found) {
                      setDestLocation(found);
                      if (found.contact_name) setDestName(found.contact_name);
                      if (found.contact_phone) setDestPhone(found.contact_phone);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-line text-xs bg-white mb-2"
                >
                  <option value="">{isAr ? '— اختر من الوجهات المحفوظة —' : '— Select from saved destinations —'}</option>
                  {savedDestinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label} ({d.city})
                    </option>
                  ))}
                </select>
              )}

              <LocationPicker
                value={destLocation}
                onChange={setDestLocation}
                title={isAr ? 'تحديد موقع التسليم' : 'Set Destination Location'}
              />

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isAr ? 'اسم المستلم' : 'Receiver Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={destName}
                    onChange={(e) => setDestName(e.target.value)}
                    placeholder="Mahmoud Al-Hajj"
                    className="w-full px-3 py-2 rounded-xl border border-line text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isAr ? 'هاتف المستلم' : 'Receiver Phone'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={destPhone}
                    onChange={(e) => setDestPhone(e.target.value)}
                    placeholder="+962790000000"
                    className="w-full px-3 py-2 rounded-xl border border-line text-xs font-mono"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={needsUnloading}
                  onChange={(e) => setNeedsUnloading(e.target.checked)}
                  className="rounded border-line text-emerald-600 focus:ring-0"
                />
                <span className="text-xs text-slate-700">
                  {isAr ? 'يتطلب عمال تفريغ عند الوصول' : 'Requires unloading assistance'}
                </span>
              </label>
            </div>
          </div>

          {/* Distance Preview */}
          {distanceKm && (
            <div className="p-3 bg-slate-50 rounded-xl border border-line flex items-center justify-between text-xs">
              <span className="text-ink-muted">
                {isAr ? 'المسافة المقدرة عبر الطريق المعتمد:' : 'Calculated Route Distance:'}
              </span>
              <span className="font-mono font-bold text-navy-900">{distanceKm} km</span>
            </div>
          )}
        </div>

        {/* Section 4: Price & Escrow */}
        <div className="bg-card rounded-2xl border border-line p-6 space-y-4">
          <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2 border-b border-line pb-3">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            {isAr ? '4. قيمة الشحنة والضمان المالي (سيف باي)' : '4. Shipment Pricing & Escrow'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1">
                {isAr ? 'السعر الإجمالي للشحنة (دينار أردني)' : 'Total Shipment Price (JD)'} *
              </label>
              <input
                type="number"
                min="500"
                step="25"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-line text-base font-bold font-mono text-navy-900 focus:outline-hidden focus:border-navy-900"
              />
              <p className="text-[11px] text-ink-muted mt-1">
                {isAr ? 'الحد الأدنى لقيمة الشحنة 500.000 د.أ' : 'Minimum acceptable amount is 500.000 JD'}
              </p>
            </div>

            {/* Escrow Guarantee Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-line space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-navy-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{isAr ? 'محمي بضمان سيف باي SafePay Escrow' : 'Protected by SafePay Escrow'}</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                {isAr
                  ? 'يتم إيداع كامل المبلغ في حساب وسيط آمن، ولا يتم تحويل الأرباح للسائق إلا بعد استلام البضاعة وتأكيدك التام.'
                  : 'Funds remain secured in an audited escrow account and are only released upon confirmed delivery.'}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-line">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={payNow}
                onChange={(e) => setPayNow(e.target.checked)}
                className="rounded border-line text-emerald-600 focus:ring-0"
              />
              <span className="text-xs font-bold text-navy-900">
                {isAr
                  ? 'إيداع المبلغ فوراً في سيف باي ونشر الشحنة للسائقين الآن'
                  : 'Deposit funds into Escrow immediately and open for qualified drivers'}
              </span>
            </label>
          </div>
        </div>

        {/* Submit Action Bar */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => navigate('/manufacturer')}
            className="px-4 py-2.5 rounded-xl border border-line text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <span>{isAr ? 'جاري الإنشاء...' : 'Creating shipment...'}</span>
            ) : (
              <>
                <span>{payNow ? (isAr ? 'دفع ونشر الشحنة' : 'Deposit & Publish') : (isAr ? 'إنشاء الشحنة (حفظ)' : 'Create Shipment')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

