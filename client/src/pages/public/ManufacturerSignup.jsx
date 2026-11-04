import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Phone,
  MapPin,
  Boxes,
  FileCheck,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Truck,
} from 'lucide-react';
import LocationPicker from '../../components/LocationPicker.jsx';
import FileUpload from '../../components/FileUpload.jsx';
import ErrorBoundary from '../../components/ErrorBoundary.jsx';
import { apiClient } from '../../api/client.js';
import { useAuth } from '../../state/auth.jsx';

const STEPS = [
  { id: 1, labelEn: 'Company', labelAr: 'المنشأة', icon: Building2 },
  { id: 2, labelEn: 'Contacts', labelAr: 'الاتصال', icon: Phone },
  { id: 3, labelEn: 'Location', labelAr: 'الموقع', icon: MapPin },
  { id: 4, labelEn: 'Goods', labelAr: 'البضائع', icon: Boxes },
  { id: 5, labelEn: 'Documents', labelAr: 'الوثائق', icon: FileCheck },
];

export default function ManufacturerSignup() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    password: '',
    phones: [''],
    emails: [''],
    location: null,
    goods_category_ids: [],
    commercial_registration_key: '',
    professions_license_key: '',
  });

  // Load goods categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await apiClient('/reference/goods-categories');
        setAvailableCategories(cats || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    }
    loadCategories();
  }, []);

  function handleAddPhone() {
    setFormData((prev) => ({ ...prev, phones: [...prev.phones, ''] }));
  }

  function handlePhoneChange(index, val) {
    const updated = [...formData.phones];
    updated[index] = val;
    setFormData((prev) => ({ ...prev, phones: updated }));
  }

  function handleRemovePhone(index) {
    if (formData.phones.length === 1) return;
    setFormData((prev) => ({
      ...prev,
      phones: prev.phones.filter((_, i) => i !== index),
    }));
  }

  function handleAddEmail() {
    setFormData((prev) => ({ ...prev, emails: [...prev.emails, ''] }));
  }

  function handleEmailChange(index, val) {
    const updated = [...formData.emails];
    updated[index] = val;
    setFormData((prev) => ({ ...prev, emails: updated }));
  }

  function handleRemoveEmail(index) {
    if (formData.emails.length === 1) return;
    setFormData((prev) => ({
      ...prev,
      emails: prev.emails.filter((_, i) => i !== index),
    }));
  }

  function toggleCategory(catId) {
    const ids = formData.goods_category_ids;
    if (ids.includes(catId)) {
      setFormData((prev) => ({
        ...prev,
        goods_category_ids: ids.filter((id) => id !== catId),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        goods_category_ids: [...ids, catId],
      }));
    }
  }

  function validateStep(step) {
    setError(null);
    if (step === 1) {
      if (!formData.name.trim() || !formData.password.trim()) {
        setError(isAr ? 'يرجى إدخال اسم المنشأة وكلمة المرور' : 'Company name and password are required');
        return false;
      }
      if (formData.password.length < 6) {
        setError(isAr ? 'كلمة المرور يجب أن لا تقل عن 6 خانات' : 'Password must be at least 6 characters');
        return false;
      }
    } else if (step === 2) {
      const validPhone = formData.phones.some((p) => p.trim().startsWith('+'));
      if (!validPhone) {
        setError(isAr ? 'يرجى إدخال رقم هاتف واحد على الأقل مع رمز الدولة (+962...)' : 'Please provide at least one phone number with country code (+962...)');
        return false;
      }
      const validEmail = formData.emails.some((e) => e.trim().includes('@'));
      if (!validEmail) {
        setError(isAr ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please provide at least one valid email address');
        return false;
      }
    } else if (step === 3) {
      if (!formData.location || !formData.location.address) {
        setError(isAr ? 'يرجى اختيار موقع المصنع أو المستودع الرئيسي' : 'Please select your primary factory or warehouse location');
        return false;
      }
    } else if (step === 4) {
      if (formData.goods_category_ids.length === 0) {
        setError(isAr ? 'يرجى اختيار تصنيف بضائع واحد على الأقل' : 'Please select at least one goods category');
        return false;
      }
    } else if (step === 5) {
      if (!formData.commercial_registration_key || !formData.professions_license_key) {
        setError(isAr ? 'يرجى رفع السجل التجاري ورخصة المهن (PDF)' : 'Both Commercial Registration and Professions License PDFs are required');
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
    if (!validateStep(5)) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        contact_person: formData.contact_person.trim(),
        password: formData.password,
        phones: formData.phones.map((p) => p.trim()).filter(Boolean),
        emails: formData.emails.map((e) => e.trim()).filter(Boolean),
        location: formData.location,
        goods_category_ids: formData.goods_category_ids,
        commercial_registration_key: formData.commercial_registration_key,
        professions_license_key: formData.professions_license_key,
        language: isAr ? 'ar' : 'en',
      };

      const res = await apiClient('/auth/signup/manufacturer', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Login token for pending view
      if (res.user) {
        login('pending-token', res.user);
      }
      navigate('/pending-approval');
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
      <ErrorBoundary>
        <div className="min-h-screen bg-surface flex flex-col justify-center items-center p-4">
          <div className="w-full max-w-xl bg-card rounded-3xl border border-line p-6 sm:p-8 shadow-sm space-y-6">
            {/* Brand Bar */}
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-navy-900 flex items-center justify-center font-black">
                  <Truck className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-sm font-black text-navy-900 block leading-tight">
                    {isAr ? 'تسجيل مصنّع جديد' : 'Manufacturer Registration'}
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

            {/* Step Indicator */}
            <div className="flex items-center justify-between px-1">
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
                    {idx < STEPS.length - 1 && (
                      <div
                        className={`h-0.5 w-6 sm:w-12 rounded-full ${idx < currentStep - 1 ? 'bg-amber-500' : 'bg-line'
                          }`}
                      />
                    )}
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

            {/* Wizard Steps Form */}
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
              {/* STEP 1: Company Details */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1.5">
                      {isAr ? 'اسم المنشأة / الشركة' : 'Company / Factory Name'} *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={isAr ? 'شركة النور للصناعات الغذائية' : 'Al-Nour Foods Co.'}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-line bg-white text-ink focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1.5">
                      {isAr ? 'اسم مسؤول التواصل' : 'Contact Person (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      placeholder={isAr ? 'السيد خالد حداد' : 'Khaled Haddad'}
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
                    <span className="text-[10px] text-ink-muted">
                      {isAr ? '6 خانات على الأقل' : 'Minimum 6 characters'}
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 2: Contacts */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Phones List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-navy-900">
                        {isAr ? 'أرقام الهواتف (مع رمز الدولة)' : 'Phone Numbers (with country code)'} *
                      </label>
                      <button
                        type="button"
                        onClick={handleAddPhone}
                        className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isAr ? 'إضافة هاتف' : 'Add phone'}</span>
                      </button>
                    </div>
                    {formData.phones.map((phone, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => handlePhoneChange(i, e.target.value)}
                          placeholder="+962791234567"
                          className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-line bg-white text-ink"
                        />
                        {formData.phones.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePhone(i)}
                            className="p-2 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Emails List */}
                  <div className="space-y-2 pt-2 border-t border-line">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-navy-900">
                        {isAr ? 'عناوين البريد الإلكتروني' : 'Email Addresses'} *
                      </label>
                      <button
                        type="button"
                        onClick={handleAddEmail}
                        className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isAr ? 'إضافة بريد' : 'Add email'}</span>
                      </button>
                    </div>
                    {formData.emails.map((email, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => handleEmailChange(i, e.target.value)}
                          placeholder="orders@company.com"
                          className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-line bg-white text-ink"
                        />
                        {formData.emails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEmail(i)}
                            className="p-2 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: Primary Factory / Pickup Location */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  <p className="text-xs text-ink-muted">
                    {isAr
                      ? 'حدد موقع المصنع أو المستودع الرئيسي لتحميل البضائع. سيتم اعتماده كموقع استلام افتراضي.'
                      : 'Pin your main warehouse or factory. This will be saved as your primary pickup place.'}
                  </p>
                  <LocationPicker
                    kind="pickup"
                    value={formData.location}
                    onChange={(loc) => setFormData({ ...formData, location: loc })}
                  />
                </div>
              )}

              {/* STEP 4: Goods Categories Chips */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">
                      {isAr ? 'تصنيفات البضائع التي تنتجها منشأتك' : 'Categories of Goods You Produce'} *
                    </label>
                    <p className="text-[11px] text-ink-muted mb-3">
                      {isAr
                        ? 'اختر كل ما ينطبق. لن تظهر في شاشتك عند طلب شاحنة سوى التصنيفات المعتمدة هنا.'
                        : 'Select all that apply. Your shipment creator will only permit posting these categories.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {availableCategories.map((cat) => {
                      const isSelected = formData.goods_category_ids.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${isSelected
                              ? 'bg-navy-900 text-white shadow-xs'
                              : 'bg-white border border-line text-ink hover:border-amber-400'
                            }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-500" />}
                          <span>{isAr ? cat.name_ar : cat.name_en}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 5: Documents Upload (PDFs) */}
              {currentStep === 5 && (
                <div className="space-y-4 animate-fadeIn">
                  <FileUpload
                    type="document"
                    label={isAr ? 'السجل التجاري (Commercial Registration) *' : 'Commercial Registration (PDF) *'}
                    hint="PDF document"
                    value={formData.commercial_registration_key}
                    onChange={(key) => setFormData({ ...formData, commercial_registration_key: key })}
                    kind="commercial_registration"
                  />

                  <FileUpload
                    type="document"
                    label={isAr ? 'رخصة المهن (Professions License) *' : 'Professions License (PDF) *'}
                    hint="PDF document"
                    value={formData.professions_license_key}
                    onChange={(key) => setFormData({ ...formData, professions_license_key: key })}
                    kind="professions_license"
                  />
                </div>
              )}

              {/* Actions Bar */}
              <div className="pt-4 border-t border-line flex items-center justify-between">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-4 py-2.5 rounded-xl border border-line text-xs font-bold text-navy-900 hover:bg-slate-100 flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                    <span>{isAr ? 'السابق' : 'Previous'}</span>
                  </button>
                ) : <div />}

                {currentStep < STEPS.length ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <span>{isAr ? 'التالي' : 'Next'}</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-navy-900 text-xs font-black flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? (isAr ? 'جاري الإرسال...' : 'Submitting...') : (isAr ? 'إرسال طلب التسجيل' : 'Submit Application')}
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

