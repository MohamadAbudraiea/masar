import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  categoryNames,
  typeNames,
  bodyNames,
  gross,
  truckRows,
} from '../constants/truckTypes.js';

/**
 * Sequential Truck Cascade Selector:
 * Category -> Type -> Body -> Gross weight (auto/choice) -> Cooling (if refrigerated)
 *
 * @param {Object} props
 * @param {Object} props.value - { category, type_code, body_code, gross_weight_code, cooling }
 * @param {Function} props.onChange - returns updated value
 * @param {number} [props.licenseClass] - 4 | 5 | 6 filter for drivers
 * @param {boolean} [props.isShipmentForm] - true if on shipment form (skips gross weight)
 */
export default function TruckSelector({
  value = {},
  onChange,
  licenseClass,
  isShipmentForm = false,
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  // 1. Available categories (filtered by license class if driver)
  // License rules from 00 §9: light and medium need 4, heavy rigid/service need 5, tractor+trailer needs 6, tankers need 5.
  const availableCategories = useMemo(() => {
    let cats = ['light', 'medium', 'heavy', 'tanker'];
    if (licenseClass === 4) cats = ['light', 'medium'];
    else if (licenseClass === 5) cats = ['heavy', 'tanker'];
    else if (licenseClass === 6) cats = ['heavy'];
    return cats;
  }, [licenseClass]);

  // 2. Types available for selected category
  const availableTypes = useMemo(() => {
    if (!value.category) return [];
    const rows = truckRows.filter((r) => r[0] === value.category);

    // If driver license is 5, exclude tractor_trailer (needs 6)
    const filteredRows = rows.filter((r) => {
      if (licenseClass && r[6] > licenseClass) return false;
      return true;
    });

    const uniqueTypes = [...new Set(filteredRows.map((r) => r[1]))];
    return uniqueTypes;
  }, [value.category, licenseClass]);

  // 3. Bodies available for selected type
  const availableBodies = useMemo(() => {
    if (!value.category || !value.type_code) return [];
    const rows = truckRows.filter(
      (r) => r[0] === value.category && r[1] === value.type_code
    );
    const uniqueBodies = [...new Set(rows.map((r) => r[2]))];
    return uniqueBodies;
  }, [value.category, value.type_code]);

  // Active catalog row matching current category, type, body
  const selectedRow = useMemo(() => {
    if (!value.category || !value.type_code || !value.body_code) return null;
    return truckRows.find(
      (r) =>
        r[0] === value.category &&
        r[1] === value.type_code &&
        r[2] === value.body_code
    );
  }, [value.category, value.type_code, value.body_code]);

  // Gross options config
  const grossConfig = useMemo(() => {
    if (!value.category) return null;
    if (value.category === 'light') return gross.light;
    if (value.category === 'medium') return gross.medium;
    if (value.type_code === 'rigid') return gross.rigid;
    if (value.type_code === 'tractor_trailer') return gross.tractor_trailer;
    return gross.by_vehicle;
  }, [value.category, value.type_code]);

  // Use ref to keep latest onChange without triggering re-effects
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Reset category if not in availableCategories
  useEffect(() => {
    if (value?.category && !availableCategories.includes(value.category)) {
      onChangeRef.current?.({
        ...value,
        category: '',
        type_code: '',
        body_code: '',
        cooling: '',
        gross_weight_code: '',
      });
    }
  }, [availableCategories, value?.category]);

  // Handle auto-body selection if only 1 body exists
  useEffect(() => {
      if (availableBodies.length === 1 && value?.body_code !== availableBodies[0]) {
        onChangeRef.current?.({ ...value, body_code: availableBodies[0] });
      }
}, [availableBodies, value?.body_code]);

// Handle auto gross selection if mode is 'fixed'
useEffect(() => {
  if (!isShipmentForm && grossConfig && grossConfig.mode === 'fixed') {
      const code = grossConfig.options?.[0]?.code;
      if (code && value?.gross_weight_code !== code) {
        onChangeRef.current?.({ ...value, gross_weight_code: code });
      }
    }
  }, [grossConfig, isShipmentForm, value?.gross_weight_code]);

return (
  <div className="space-y-4">
    {/* 1. Category */}
    <div>
      <label className="block text-sm font-semibold text-navy-900 mb-1.5">
        {isAr ? 'فئة النقل' : 'Transport Category'}
      </label>
      <select
        value={value.category || ''}
        onChange={(e) => {
          const cat = e.target.value;
          onChange({
            category: cat,
            type_code: '',
            body_code: '',
            cooling: '',
            gross_weight_code: '',
          });
        }}
        className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
      >
        <option value="">{isAr ? 'اختر فئة...' : 'Select category...'}</option>
        {availableCategories.map((cat) => (
          <option key={cat} value={cat}>
            {isAr ? categoryNames[cat]?.ar : categoryNames[cat]?.en}
          </option>
        ))}
      </select>
    </div>

    {/* 2. Type */}
    {value.category && availableTypes.length > 0 && (
      <div>
        <label className="block text-sm font-semibold text-navy-900 mb-1.5">
          {isAr ? 'نوع المركبة' : 'Vehicle Type'}
        </label>
        <select
          value={value.type_code || ''}
          onChange={(e) => {
            const typeCode = e.target.value;
            onChange({
              ...value,
              type_code: typeCode,
              body_code: '',
              cooling: '',
            });
          }}
          className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">{isAr ? 'اختر النوع...' : 'Select vehicle type...'}</option>
          {availableTypes.map((type) => (
            <option key={type} value={type}>
              {isAr ? typeNames[type]?.ar : typeNames[type]?.en}
            </option>
          ))}
        </select>
      </div>
    )}

    {/* 3. Body (only shown if type has more than 1 body row) */}
    {value.type_code && availableBodies.length > 1 && (
      <div>
        <label className="block text-sm font-semibold text-navy-900 mb-1.5">
          {isAr ? 'جسم المركبة / الهيكل' : 'Body Style'}
        </label>
        <select
          value={value.body_code || ''}
          onChange={(e) => {
            const bodyCode = e.target.value;
            onChange({ ...value, body_code: bodyCode, cooling: '' });
          }}
          className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">{isAr ? 'اختر الجسم...' : 'Select body style...'}</option>
          {availableBodies.map((body) => (
            <option key={body} value={body}>
              {isAr ? bodyNames[body]?.ar : bodyNames[body]?.en}
            </option>
          ))}
        </select>
      </div>
    )}

    {/* Payload Guidance */}
    {selectedRow && (
      <div className="p-3 bg-navy-100/60 rounded-xl text-xs text-navy-800 flex justify-between items-center">
        <span className="font-medium">
          {isAr ? 'الحمولة المسموحة للمركبة:' : 'Payload Capacity:'}
        </span>
        <span className="font-bold">
          {selectedRow[3]} – {selectedRow[4]} {selectedRow[5]}
        </span>
      </div>
    )}

    {/* 4. Gross Weight (Only on truck setup, not shipment form) */}
    {!isShipmentForm && grossConfig && value.body_code && (
      <div>
        <label className="block text-sm font-semibold text-navy-900 mb-1.5">
          {isAr ? 'الوزن الإجمالي' : 'Gross Weight'}
        </label>
        {grossConfig.mode === 'fixed' ? (
          <input
            type="text"
            readOnly
            value={
              isAr
                ? grossConfig.options[0]?.label_ar
                : grossConfig.options[0]?.label_en
            }
            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-slate-100 text-ink-muted text-sm cursor-not-allowed"
          />
        ) : (
          <select
            value={value.gross_weight_code || ''}
            onChange={(e) =>
              onChange({ ...value, gross_weight_code: e.target.value })
            }
            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">
              {isAr ? 'اختر الوزن الإجمالي...' : 'Select gross weight...'}
            </option>
            {grossConfig.options.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {isAr ? opt.label_ar : opt.label_en}
              </option>
            ))}
          </select>
        )}
      </div>
    )}

    {/* 5. Cooling (Only for refrigerated bodies) */}
    {value.body_code === 'refrigerated' && (
      <div>
        <label className="block text-sm font-semibold text-navy-900 mb-1.5">
          {isAr ? 'نظام التبريد' : 'Cooling Mode'}
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { code: 'chilled', labelEn: 'Chilled (مبرّد)', labelAr: 'مبرّد' },
            { code: 'frozen', labelEn: 'Frozen (مجمّد)', labelAr: 'مجمّد' },
          ].map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => onChange({ ...value, cooling: c.code })}
              className={`py-2.5 px-4 text-sm font-semibold rounded-xl border transition ${value.cooling === c.code
                  ? 'border-amber-500 bg-amber-50 text-navy-900 ring-2 ring-amber-200'
                  : 'border-line bg-white text-ink hover:bg-slate-50'
                }`}
            >
              {isAr ? c.labelAr : c.labelEn}
            </button>
          ))}
        </div>
      </div>
    )}
  </div>
);
}

