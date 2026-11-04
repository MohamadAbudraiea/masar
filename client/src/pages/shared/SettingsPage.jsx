import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings,
  User,
  Lock,
  Globe,
  Bell,
  Check,
  AlertCircle,
  Save,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { useAuth } from '../../state/auth.jsx';

export default function SettingsPage() {
  const { user, login } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'preferences'
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Form states
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    email: '',
    contact_person: '',
    iban: '',
    cliq_alias: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [preferences, setPreferences] = useState({
    language: 'en',
    timezone: 'Asia/Amman',
    email_notifications: true,
  });

  // Load current settings
  async function loadSettings() {
    setIsLoading(true);
    try {
      const data = await apiClient('/settings');
      if (data.user) {
        setProfileData({
          name: data.user.name || '',
          phone: data.user.phone || '',
          email: data.user.email || '',
          contact_person: data.profile?.contact_person || '',
          iban: data.profile?.iban || '',
          cliq_alias: data.profile?.cliq_alias || '',
        });

        setPreferences({
          language: data.user.language || 'en',
          timezone: data.user.timezone || 'Asia/Amman',
          email_notifications: data.user.email_notifications !== false,
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function clearAlerts() {
    setSuccessMsg(null);
    setErrorMsg(null);
  }

  // 1. Save Profile
  async function handleSaveProfile(e) {
    e.preventDefault();
    clearAlerts();
    setIsSaving(true);

    try {
      const payload = {
        name: profileData.name.trim(),
        phone: profileData.phone.trim(),
        email: profileData.email.trim() || null,
        contact_person: profileData.contact_person.trim() || null,
        iban: profileData.iban.trim() || undefined,
        cliq_alias: profileData.cliq_alias.trim() || null,
      };

      await apiClient('/settings/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setSuccessMsg(isAr ? 'تم حفظ بيانات الملف الشخصي بنجاح' : 'Profile updated successfully');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  }

  // 2. Change Password
  async function handleChangePassword(e) {
    e.preventDefault();
    clearAlerts();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMsg(isAr ? 'كلمتا المرور غير متطابقتين' : 'New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setErrorMsg(isAr ? 'كلمة المرور يجب أن لا تقل عن 6 خانات' : 'Password must be at least 6 characters');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient('/settings/password', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccessMsg(isAr ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  }

  // 3. Save Preferences
  async function handleSavePreferences(updatedPrefs) {
    clearAlerts();
    setIsSaving(true);

    try {
      const res = await apiClient('/settings/preferences', {
        method: 'PATCH',
        body: JSON.stringify(updatedPrefs),
      });

      setPreferences(res.preferences || updatedPrefs);

      // Handle language change on client if updated
      if (updatedPrefs.language && updatedPrefs.language !== i18n.language) {
        i18n.changeLanguage(updatedPrefs.language);
      }

      setSuccessMsg(isAr ? 'تم تحديث التفضيلات بنجاح' : 'Preferences saved successfully');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500 text-navy-900 flex items-center justify-center font-black">
          <Settings className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-navy-900">
            {isAr ? 'إعدادات الحساب' : 'Account Settings'}
          </h1>
          <p className="text-xs text-ink-muted">
            {isAr
              ? 'إدارة الملف الشخصي، الأمان، وإشعارات البريد الإلكتروني'
              : 'Manage your profile, password security, language, and email notifications'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-line pb-2">
        {[
          { id: 'profile', labelEn: 'Profile', labelAr: 'الملف الشخصي', icon: User },
          { id: 'security', labelEn: 'Security & Password', labelAr: 'الأمان وكلمة المرور', icon: Lock },
          { id: 'preferences', labelEn: 'Preferences & Emails', labelAr: 'التفضيلات والإشعارات', icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                clearAlerts();
                setActiveTab(tab.id);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{isAr ? tab.labelAr : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-xs text-ink-muted space-y-3">
          <div className="w-6 h-6 border-2 border-navy-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <span>{isAr ? 'جاري تحميل الإعدادات...' : 'Loading settings...'}</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: Profile Form */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="bg-card rounded-2xl border border-line p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-black text-navy-900 border-b border-line pb-3">
                {isAr ? 'البيانات الأساسية' : 'Personal & Contact Information'}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1.5">
                    {isAr ? 'الاسم الكامل / اسم المنشأة' : 'Full Name / Company'} *
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-line bg-white text-navy-900 focus:outline-hidden focus:border-navy-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1.5">
                    {isAr ? 'رقم الهاتف الرئيسي' : 'Primary Phone'} *
                  </label>
                  <input
                    type="text"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-line bg-white text-navy-900 focus:outline-hidden focus:border-navy-900 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1.5">
                  {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-line bg-white text-navy-900 focus:outline-hidden focus:border-navy-900"
                />
              </div>

              {/* Manufacturer contact person */}
              {user?.role === 'manufacturer' && (
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1.5">
                    {isAr ? 'الشخص المسؤول عن التواصل' : 'Contact Person'}
                  </label>
                  <input
                    type="text"
                    value={profileData.contact_person}
                    onChange={(e) => setProfileData({ ...profileData, contact_person: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-line bg-white text-navy-900 focus:outline-hidden focus:border-navy-900"
                  />
                </div>
              )}

              {/* Driver payout credentials */}
              {user?.role === 'driver' && (
                <div className="pt-2 border-t border-line space-y-4">
                  <h3 className="text-xs font-black text-navy-900">
                    {isAr ? 'حساب تحويل مستحقات سيف باي (Payout Account)' : 'SafePay Payout Credentials'}
                  </h3>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1.5">
                      {isAr ? 'رقم الآيبان البنكي (IBAN)' : 'Bank IBAN'} *
                    </label>
                    <input
                      type="text"
                      value={profileData.iban}
                      onChange={(e) => setProfileData({ ...profileData, iban: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-line bg-white text-navy-900 focus:outline-hidden focus:border-navy-900 font-mono uppercase"
                      placeholder="JO94CBJO0010000000000131000001"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1.5">
                      {isAr ? 'معرّف كليك (CliQ Alias - اختياري)' : 'CliQ Alias (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={profileData.cliq_alias}
                      onChange={(e) => setProfileData({ ...profileData, cliq_alias: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-line bg-white text-navy-900 focus:outline-hidden focus:border-navy-900 font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : isAr ? 'حفظ التعديلات' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Change Password */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="bg-card rounded-2xl border border-line p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-black text-navy-900 border-b border-line pb-3">
                {isAr ? 'تغيير كلمة المرور' : 'Change Password'}
              </h2>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1.5">
                  {isAr ? 'كلمة المرور الحالية' : 'Current Password'} *
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-line bg-white text-navy-900 focus:outline-hidden focus:border-navy-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1.5">
                  {isAr ? 'كلمة المرور الجديدة (6 خانات على الأقل)' : 'New Password (min 6 characters)'} *
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-line bg-white text-navy-900 focus:outline-hidden focus:border-navy-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1.5">
                  {isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'} *
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-line bg-white text-navy-900 focus:outline-hidden focus:border-navy-900"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isSaving ? (isAr ? 'جاري التحديث...' : 'Updating...') : isAr ? 'تحديث كلمة المرور' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Preferences & Email Notifications Toggle */}
          {activeTab === 'preferences' && (
            <div className="bg-card rounded-2xl border border-line p-6 shadow-xs space-y-6">
              <h2 className="text-sm font-black text-navy-900 border-b border-line pb-3">
                {isAr ? 'تفضيلات النظام والإشعارات' : 'Preferences & Email Notifications'}
              </h2>

              {/* Language Switch */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-surface border border-line">
                <div>
                  <div className="text-xs font-bold text-navy-900">
                    {isAr ? 'لغة الواجهة' : 'Interface Language'}
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    {isAr ? 'اختر لغة العرض المفضلة لديك' : 'Select your display language'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSavePreferences({ ...preferences, language: 'ar' })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      preferences.language === 'ar'
                        ? 'bg-amber-500 text-navy-900 shadow-xs'
                        : 'bg-white border border-line text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    العربية (AR)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSavePreferences({ ...preferences, language: 'en' })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      preferences.language === 'en'
                        ? 'bg-amber-500 text-navy-900 shadow-xs'
                        : 'bg-white border border-line text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    English (EN)
                  </button>
                </div>
              </div>

              {/* Timezone */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-surface border border-line">
                <div>
                  <div className="text-xs font-bold text-navy-900">
                    {isAr ? 'المنطقة الزمنية' : 'Platform Timezone'}
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    {isAr
                      ? 'توقيت الأردن القياسي (Asia/Amman UTC+3)'
                      : 'Jordan Standard Time (Asia/Amman UTC+3)'}
                  </div>
                </div>
                <div className="text-xs font-mono font-bold text-navy-900 bg-white px-3 py-1.5 rounded-xl border border-line">
                  {preferences.timezone} (UTC+3)
                </div>
              </div>

              {/* Email Notifications Toggle (07 §4) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-line">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-navy-900">
                      {isAr ? 'إشعارات البريد الإلكتروني' : 'Transactional Email Notifications'}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted leading-relaxed">
                    {isAr
                      ? 'استلام تنبيهات دورة حياة الشحنة والإفراج المالي عبر البريد الإلكتروني. (ملاحظة: إشعارات الحساب الأمنية ترسل دائماً).'
                      : 'Receive shipment lifecycle alerts and escrow releases via email. Note: critical account status updates are always delivered.'}
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={preferences.email_notifications}
                    onChange={(e) =>
                      handleSavePreferences({
                        ...preferences,
                        email_notifications: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

