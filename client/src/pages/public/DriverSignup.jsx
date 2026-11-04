import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User,
  Truck,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import TruckSelector from '../../components/TruckSelector.jsx';
import FileUpload from '../../components/FileUpload.jsx';
import ErrorBoundary from '../../components/ErrorBoundary.jsx';
import { apiClient } from '../../api/client.js';
import { useAuth } from '../../state/auth.jsx';

const STEPS = [
  { id: 1, labelEn: 'Personal Info & Scope', labelAr: 'البيانات الشخصية ونطاق العمل', icon: User },
  { id: 2, labelEn: 'License, Docs & Truck', labelAr: 'رخصة القيادة ومواصفات الشاحنة', icon: Truck },
  { id: 3, labelEn: 'Payout Details', labelAr: 'الحساب البنكي وسيف باي', icon: CreditCard },
];

export default function DriverSignup() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [catalogRows, setCatalogRows] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    scope: 'internal', // 'internal' | 'external'
    license_class: 4, // 4 | 5 | 6 (chosen in Step 2)
    id_doc_key: '',
    license_doc_key: '',
    passport_doc_key: '', // uploaded in Step 1 if external
    truck: {
      category: '',
      type_code: '',
      body_code: '',
      cooling: '',
      gross_weight_code: '',
      plate_number: '',
      adr_certified: false,
      adr_doc_key: '', // uploaded in Step 2 if ADR certified
      license_doc_key: '',
      photo_keys: [],
    },
    iban: '',
    cliq_alias: '',
  });

  // Load truck catalog to resolve truck_type_id
  useEffect(() => {
    async function loadTruckTypes() {
      try {
        const rows = await apiClient('/reference/truck-types');
        setCatalogRows(rows || []);
      } catch (err) {
        console.error('Failed to load truck types:', err);
      }
    }
    loadTruckTypes();
  }, []);

  function validateStep(step) {
    setError(null);
    if (step === 1) {
      if (!formData.name.trim() || !formData.phone.trim() || !formData.password.trim()) {
        setError(
          isAr
            ? 'يرجى إدخال الاسم الكامل، رقم الهاتف، وكلمة المرور'
            : 'Name, phone, and password are required'
        );
        return false;
      }
      if (!formData.phone.trim().startsWith('+')) {
        setError(
          isAr
            ? 'يرجى كتابة رقم الهاتف مع رمز الدولة (مثال: +96279...)'
            : 'Phone must include the country code (e.g. +96279...)'
        );
        return false;
      }
      if (formData.password.length < 6) {
        setError(
          isAr
            ? 'كلمة المرور يجب أن لا تقل عن 6 خانات'
            : 'Password must be at least 6 characters'
        );
        return false;
      }
      if (formData.scope === 'external' && !formData.passport_doc_key) {
        setError(
          isAr
            ? 'يرجى رفع صورة جواز السفر لاختيار نطاق العمل الخارجي (الدولي)'
            : 'Passport document is required for international scope'
        );
        return false;
      }
    } else if (step === 2) {
      // Driver License & Documents
      if (!formData.license_class) {
        setError(
          isAr ? 'يرجى تحديد فئة رخصة القيادة' : 'Driver license class is required'
        );
        return false;
      }
      if (!formData.id_doc_key) {
        setError(
          isAr
            ? 'يرجى رفع صورة الهوية الشخصية (National ID) بصيغة PDF'
            : 'National ID PDF is required'
        );
        return false;
      }
      if (!formData.license_doc_key) {
        setError(
          isAr
            ? 'يرجى رفع صورة رخصة القيادة (Driving License) بصيغة PDF'
            : 'Driving License PDF is required'
        );
        return false;
      }
      if (formData.truck.adr_certified && !formData.truck.adr_doc_key) {
        setError(
          isAr
            ? 'يرجى رفع صورة شهادة سلامة نقل المواد الخطرة (ADR Certificate)'
            : 'ADR safety certificate PDF is required when ADR is enabled'
        );
        return false;
      }

      // Truck Specifications & Documents
      const t = formData.truck;
      if (!t.category || !t.type_code || !t.body_code || !t.plate_number.trim()) {
        setError(
          isAr
              ? 'يرجى استكمال مواصفات الشاحنة (فئة النقل، نوع المركبة، الهيكل) ورقم اللوحة'
              : 'Please complete all truck specifications and plate number'
        );
        return false;
      }
      if (!t.license_doc_key) {
        setError(
          isAr
              ? 'يرجى رفع رخصة اقتناء الشاحنة (Truck Registration License PDF)'
              : 'Truck registration license PDF is required'
        );
        return false;
      }
      if (!t.photo_keys || t.photo_keys.length === 0) {
        setError(
          isAr
            ? 'يرجى رفع صورة واحدة على الأقل للشاحنة'
            : 'Please upload at least one photo of the truck'
        );
        return false;
      }
    } else if (step === 3) {
      if (!formData.iban.trim() || !formData.iban.trim().startsWith('JO')) {
        setError(
          isAr
            ? 'يرجى إدخال رقم آيبان أردني صحيح (يبدأ بـ JO)'
            : 'Please enter a valid Jordanian IBAN starting with JO'
        );
        return false;
      }
    }
    return true;
  }

  function nextStep() {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(STEPS.length, prev + 1));
    }
  }

  function prevStep() {
    setError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Find truck_type_id from catalog rows
      const matchedRow = catalogRows.find(
        (r) =>
          r.category === formData.truck.category &&
          r.type_code === formData.truck.type_code &&
          r.body_code === formData.truck.body_code
      );

      const truckTypeId = matchedRow ? matchedRow.id : 1;

      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        password: formData.password,
        scope: formData.scope,
        license_class: Number(formData.license_class),
        iban: formData.iban.trim(),
        cliq_alias: formData.cliq_alias.trim() || null,
        id_doc_key: formData.id_doc_key,
        license_doc_key: formData.license_doc_key,
        passport_doc_key: formData.passport_doc_key || null,
        truck: {
          truck_type_id: truckTypeId,
          plate_number: formData.truck.plate_number.trim(),
          cooling: formData.truck.cooling || null,
          adr_certified: !!formData.truck.adr_certified,
          adr_doc_key: formData.truck.adr_doc_key || null,
          gross_weight_code: formData.truck.gross_weight_code || null,
          license_doc_key: formData.truck.license_doc_key,
          photo_keys: formData.truck.photo_keys,
        },
        language: isAr ? 'ar' : 'en',
      };

      const res = await apiClient('/auth/signup/driver', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.user) {
        login('pending-token', res.user);
      }
      navigate('/pending-approval');
    } catch (err) {
      setError(err.message || 'Driver registration failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
              <ErrorBoundary>
                <div className="min-h-screen bg-surface flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
                  <div className="max-w-xl w-full mx-auto bg-card rounded-2xl border border-line shadow-sm p-6 sm:p-8 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-line pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-navy-900 flex items-center justify-center font-black">
                          <Truck className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <div>
                          <span className="text-sm font-black text-navy-900 block leading-tight">
                            {isAr ? 'تسجيل سائق جديد' : 'Driver Registration'}
                          </span>
                          <span className="text-[10px] text-ink-muted">
                            {isAr ? `الخطوة ${currentStep} من ${STEPS.length}` : `Step ${currentStep} of ${STEPS.length}`}
                          </span>
                        </div>
                      </div>
                      <Link
                        to="/signup"
                        className="text-xs font-semibold text-ink-muted hover:text-navy-900 transition"
                      >
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </Link>
                    </div>

                            {/* Step Indicator */ }
                            < div className="flex items-center justify-between px-1">
                          {STEPS.map((s, idx) => {
                            const isDone = s.id < currentStep;
                            const isCurrent = s.id === currentStep;
                            return (
                              <div key={s.id} className="flex items-center gap-2">
                                <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isDone
                                      ? 'bg-amber-500 text-navy-900'
                                      : isCurrent
                                        ? 'bg-navy-900 text-white ring-2 ring-amber-300'
                                        : 'border border-line bg-surface text-slate-400'
                                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4 stroke-[2.5]" /> : s.id}
                  </div>
                  <span className="hidden sm:inline text-xs font-semibold text-slate-700">
                    {isAr ? s.labelAr : s.labelEn}
                  </span>
                  {
                          idx < STEPS.length - 1 && (
                            <div
                              className={`h-0.5 w-6 sm:w-12 rounded-full ${idx < currentStep - 1 ? 'bg-amber-500' : 'bg-line'
                                }`}
                            />
                          )
                        }
                </div>
                  );
            })}
                </div>

                      {/* Error Alert */}
                      {error && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                          <span>{error}</span>
                        </div>
                      )}

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (currentStep < STEPS.length) {
                            nextStep();
                          } else {
                            handleSubmit(e);
                          }
                        }}
                        className="space-y-4"
                      >
                        {/* STEP 1: Personal Info & Scope */}
                        {currentStep === 1 && (
                          <div className="space-y-4 animate-fadeIn">
                            <div>
                              <label className="block text-xs font-bold text-navy-900 mb-1.5">
                                {isAr ? 'الاسم الكامل للسائق' : 'Full Name'} *
                              </label>
                              <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={isAr ? 'السيد عمر صالح' : 'Omar Saleh'}
                                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-line bg-white text-ink focus:ring-2 focus:ring-amber-500"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-navy-900 mb-1.5">
                                {isAr ? 'رقم الهاتف (مع رمز الدولة)' : 'Phone Number (with country code)'} *
                              </label>
                              <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+962791234567"
                                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-line bg-white text-ink focus:ring-2 focus:ring-amber-500 font-mono"
                              />
                              <span className="text-[10px] text-ink-muted">
                                {isAr ? 'أدخل الرقم كاملاً مع رمز الدولة (مثال: +96279...)' : 'Include country code, e.g. +962...'}
                              </span>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-navy-900 mb-1.5">
                                {isAr ? 'البريد الإلكتروني (اختياري)' : 'Email (Optional)'}
                              </label>
                              <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="driver@example.com"
                                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-line bg-white text-ink focus:ring-2 focus:ring-amber-500"
                              />
                            </div>

                                <div>
                                  <label className="block text-xs font-bold text-navy-900 mb-1.5">
                                    {isAr ? 'كلمة المرور' : 'Password'} *
                                  </label>
                                  <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-line bg-white text-ink focus:ring-2 focus:ring-amber-500"
                                  />
                                </div>

                                {/* Work Scope Selection */}
                                <div className="pt-1">
                                  <label className="block text-xs font-bold text-navy-900 mb-1.5">
                                    {isAr ? 'نطاق العمل' : 'Work Scope'} *
                                  </label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setFormData({ ...formData, scope: 'internal' })}
                                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${formData.scope === 'internal'
                                          ? 'border-navy-900 bg-navy-900 text-white shadow-xs'
                                          : 'border-line bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                      {isAr ? 'نقل محلي (داخلي فقط)' : 'Internal (Local only)'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setFormData({ ...formData, scope: 'external' })}
                                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${formData.scope === 'external'
                                          ? 'border-navy-900 bg-navy-900 text-white shadow-xs'
                                          : 'border-line bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                      {isAr ? 'نقل خارجي (دولي ومحلي)' : 'External (International)'}
                                    </button>
                                  </div>
                                  <span className="text-[10px] text-ink-muted mt-1 block">
                                    {formData.scope === 'external'
                                      ? isAr
                                        ? 'النقل الخارجي يتيح لك شحنات التصدير الدولية، ويتطلب إرفاق صورة جواز السفر أدناه.'
                                        : 'International scope allows external trips and requires passport upload below.'
                                      : isAr
                                        ? 'النقل الداخلي مخصص للشحنات داخل المحافظات الأردنية.'
                                        : 'Local scope covers freight shipments within Jordan.'}
                                  </span>
                                </div>

                                {/* Passport Upload if External Scope */}
                                {formData.scope === 'external' && (
                                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2 mt-2">
                                    <FileUpload
                                      type="document"
                                      label={isAr ? 'جواز السفر (Passport PDF) *' : 'Passport (PDF) *'}
                                      value={formData.passport_doc_key}
                                      onChange={(key) => setFormData({ ...formData, passport_doc_key: key })}
                                      kind="passports"
                                    />
                                  </div>
                                )}
                              </div>
            )}

                                  {/* STEP 2: Driver License, Documents & Complete Truck Selection */}
                                  {currentStep === 2 && (
                                    <div className="space-y-5 animate-fadeIn">
                                      {/* 1. Driver License Section */}
                                      <div className="space-y-4">
                                        <div className="flex items-center gap-2 border-b border-line pb-2">
                                          <FileCheck className="w-4 h-4 text-amber-500" />
                                          <h3 className="text-xs font-black text-navy-900 uppercase tracking-wider">
                                            {isAr ? 'بيانات رخصة القيادة والوثائق الشخصية' : 'Driver License & ID Documents'}
                                          </h3>
                                        </div>

                                        {/* Driver License Class */}
                                        <div>
                                          <label className="block text-xs font-bold text-navy-900 mb-1.5">
                                            {isAr ? 'فئة رخصة القيادة' : 'Driver License Class'} *
                                          </label>
                                          <select
                                            value={formData.license_class}
                                            onChange={(e) =>
                                              setFormData({ ...formData, license_class: Number(e.target.value) })
                                            }
                                            className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-line bg-white text-navy-900 focus:outline-hidden focus:border-navy-900"
                                          >
                                            <option value={4}>
                                              {isAr ? 'الفئة 4 (نقل خفيف ومتوسط حتى 7.5 طن)' : 'Class 4 (Light & Medium up to 7.5t)'}
                                            </option>
                                            <option value={5}>
                                              {isAr ? 'الفئة 5 (نقل ثقيل صلب وصهاريج)' : 'Class 5 (Heavy Rigid & Tankers)'}
                                            </option>
                                            <option value={6}>
                                              {isAr ? 'الفئة 6 (قاطرة ومقطورة - تريلا)' : 'Class 6 (Tractor + Trailer)'}
                                            </option>
                                          </select>
                                          <span className="text-[10px] text-ink-muted mt-1 block">
                                            {isAr
                                              ? 'تحدد فئة رخصتك تصنيفات الشاحنات المتاحة للاختيار أدناه.'
                                              : 'Your license class filters the eligible truck types available below.'}
                                          </span>
                                        </div>

                                        {/* National ID Document */}
                                        <FileUpload
                                          type="document"
                                          label={isAr ? 'صورة الهوية الشخصية (National ID PDF) *' : 'National ID (PDF) *'}
                                          value={formData.id_doc_key}
                                          onChange={(key) => setFormData({ ...formData, id_doc_key: key })}
                                          kind="id_documents"
                                        />

                                      {/* Driving License Document */}
                                      <FileUpload
                                        type="document"
                                        label={isAr ? 'صورة رخصة القيادة (Driving License PDF) *' : 'Driving License (PDF) *'}
                                        value={formData.license_doc_key}
                                        onChange={(key) => setFormData({ ...formData, license_doc_key: key })}
                                        kind="driver_licenses"
                                      />

                                      {/* ADR Hazardous Materials Certificate Section */}
                                      <div className="p-3.5 rounded-xl border border-line bg-surface space-y-3">
                                        <label className="flex items-center gap-2.5 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={formData.truck.adr_certified}
                                            onChange={(e) =>
                                              setFormData({
                                                ...formData,
                                                truck: { ...formData.truck, adr_certified: e.target.checked },
                                              })
                                            }
                                            className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-400"
                                          />
                                          <div>
                                            <div className="text-xs font-bold text-navy-900">
                                              {isAr ? 'هل تمتلك شهادة سلامة نقل المواد الخطرة (ADR)؟' : 'Hold an ADR Hazardous Materials Certificate?'}
                                            </div>
                                            <div className="text-[10px] text-ink-muted">
                                              {isAr
                                                ? 'تتيح لك قبول الشحنات الكيميائية والبترولية والخطرة'
                                                : 'Enables taking certified ADR hazardous shipments'}
                                            </div>
                                          </div>
                                        </label>

                                        {formData.truck.adr_certified && (
                                          <div className="pt-2 border-t border-line">
                                            <FileUpload
                                              type="document"
                                              label={isAr ? 'شهادة نقل المواد الخطرة (ADR Certificate PDF) *' : 'ADR Safety Certificate (PDF) *'}
                                              value={formData.truck.adr_doc_key}
                                              onChange={(key) =>
                                                setFormData({
                                                  ...formData,
                                                  truck: { ...formData.truck, adr_doc_key: key },
                                                })
                                              }
                                              kind="driver_licenses"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>

                <div className="space-y-4 pt-2 border-t border-line">
                                        <div className="flex items-center gap-2 border-b border-line pb-2">
                                          <Truck className="w-4 h-4 text-amber-500" />
                                          <h3 className="text-xs font-black text-navy-900 uppercase tracking-wider">
                                            {isAr ? 'مواصفات وبيانات الشاحنة' : 'Truck Specifications & Details'}
                                          </h3>
                                        </div>

                                        {/* Cascade Selector filtered dynamically by chosen license_class */}
                                        <TruckSelector
                                          licenseClass={formData.license_class}
                                          value={formData.truck}
                                          onChange={(updatedTruck) =>
                                            setFormData({
                                              ...formData,
                                              truck: { ...formData.truck, ...updatedTruck },
                                            })
                                          }
                                        />

                                        {/* Plate Number */}
                                        <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1.5">
                      {isAr ? 'رقم لوحة الشاحنة' : 'Plate Number'} *
                    </label>
                    <input
                      type="text"
                      value={formData.truck.plate_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          truck: { ...formData.truck, plate_number: e.target.value },
                        })
                      }
                      placeholder="44-12345"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-line bg-white text-ink font-mono"
                    />
                  </div>

                                  {/* Truck Registration Document */}
                                  <FileUpload
                                    type="document"
                                    label={isAr ? 'رخصة اقتناء الشاحنة (Truck Registration License PDF) *' : 'Truck Registration License (PDF) *'}
                                    value={formData.truck.license_doc_key}
                                    onChange={(key) =>
                                      setFormData({
                                        ...formData,
                                        truck: { ...formData.truck, license_doc_key: key },
                                      })
                                    }
                                    kind="truck_licenses"
                                  />

                                    {/* Truck Photos */}
                                    <FileUpload
                                      type="images"
                                      multiple
                                      maxCount={3}
                                      label={isAr ? 'صور الشاحنة (حتى 3 صور) *' : 'Truck Photos (up to 3 images) *'}
                                      value={formData.truck.photo_keys}
                                      onChange={(keys) =>
                                        setFormData({
                                          ...formData,
                                          truck: { ...formData.truck, photo_keys: keys },
                                        })
                                      }
                                      kind="truck_photos"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* STEP 3: Payout Details & Guarantee */}
                              {currentStep === 3 && (
                                <div className="space-y-4 animate-fadeIn">
                                  <p className="text-xs text-ink-muted">
                                    {isAr
                                      ? 'أدخل بيانات حسابك البنكي لتحويل مستحقاتك وأرباح النقل من حساب سيف باي فور تأكيد التسليم.'
                                      : 'Enter your bank credentials where SafePay will transfer your net freight earnings.'}
                                  </p>

                              <div>
                                <label className="block text-xs font-bold text-navy-900 mb-1.5">
                                  {isAr ? 'رقم الآيبان البنكي (IBAN)' : 'IBAN'} *
                                </label>
                                <input
                                  type="text"
                                  value={formData.iban}
                                  onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                                  placeholder="JO94CBJO0010000000000131000001"
                                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-line bg-white text-ink font-mono uppercase"
                                />
                                <span className="text-[10px] text-ink-muted">
                                  {isAr ? 'يبدأ بـ JO متبوعاً بـ 28 خانة' : 'Starts with JO followed by 28 digits'}
                                </span>
                              </div>

                                  <div>
                                    <label className="block text-xs font-bold text-navy-900 mb-1.5">
                                      {isAr ? 'معرّف كليك البنكي (CliQ Alias - اختياري)' : 'CliQ Alias (Optional)'}
                                    </label>
                                    <input
                                      type="text"
                                      value={formData.cliq_alias}
                                      onChange={(e) => setFormData({ ...formData, cliq_alias: e.target.value })}
                                      placeholder="OMAR_TRUCK"
                                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-line bg-white text-ink font-mono"
                                    />
                                  </div>

                                    <div className="p-4 rounded-xl bg-slate-50 border border-line space-y-2">
                                      <div className="flex items-center gap-2 text-xs font-bold text-navy-900">
                                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                        <span>{isAr ? 'تحويل أرباح مضمون 100%' : '100% Guaranteed Payout'}</span>
                                      </div>
                                      <p className="text-[11px] text-ink-muted leading-relaxed">
                                        {isAr
                                          ? 'جميع رحلاتك مدعومة بضمان سيف باي Escrow. فور إتمام التوصيل وتأكيد المصنع، يتم إرسال إشعار تحويل كامل أرباحك فوراً لحسابك المسجل.'
                                          : 'All freight jobs are escrow-backed. Once delivered and confirmed, your earnings are credited directly to your registered bank.'}
                                      </p>
                                    </div>
                                  </div>
            )}

                                  {/* Navigation Buttons */}
                                  <div className="pt-4 border-t border-line flex items-center justify-between">
                                    {currentStep > 1 ? (
                                      <button
                                        type="button"
                                        onClick={prevStep}
                                        className="px-4 py-2.5 rounded-xl border border-line text-xs font-bold text-navy-900 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                                        <span>{isAr ? 'السابق' : 'Previous'}</span>
                                      </button>
                                    ) : (
                                      <div />
                                    )}

                                    {currentStep < STEPS.length ? (
                                      <button
                                        type="button"
                                        onClick={nextStep}
                                        className="px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                                      >
                                        <span>{isAr ? 'التالي' : 'Next'}</span>
                                        <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                                      </button>
                                    ) : (
                                      <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-navy-900 text-xs font-black flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                                      >
                                        {isSubmitting
                                          ? isAr ? 'جاري الإرسال...' : 'Submitting...'
                                          : isAr ? 'إرسال طلب التسجيل' : 'Submit Application'}
                                        <Check className="w-4 h-4 stroke-[3]" />
                                      </button>
                                    )}
                                  </div>
          </form>
                          </div>
      </div>
              </ErrorBoundary>
              );
}
