import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Truck, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../state/auth.jsx';
import { apiClient } from '../../api/client.js';

const DEMO_ACCOUNTS = [
  { role: 'manufacturer', name: 'Al-Nour Foods Co.', id: 'khaled@alnour.demo', labelEn: 'Manufacturer (Al-Nour)', labelAr: 'المصنّع (شركة النور)' },
  { role: 'driver', name: 'Mr. Omar Saleh', id: '+962790010001', labelEn: 'Driver (Mr. Omar)', labelAr: 'السائق (السيد عمر)' },
  { role: 'escrow', name: 'SafePay Escrow', id: 'escrow@safepay.demo', labelEn: 'Escrow (SafePay)', labelAr: 'حساب الضمان (سيف باي)' },
  { role: 'admin', name: 'Lina Qasem', id: 'admin@masar.demo', labelEn: 'Admin (Masar Staff)', labelAr: 'الإدارة (فريق مسار)' },
];

export default function Login() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const showDemoAccounts = import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true';

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data = await apiClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });

      login(data.token, data.user);

      if (data.user.status === 'pending' || data.user.status === 'rejected') {
        navigate('/pending-approval');
        return;
      }

      // Check redirect query param
      const searchParams = new URLSearchParams(location.search);
      const redirect = searchParams.get('redirect');
      if (redirect) {
        navigate(redirect);
        return;
      }

      // Role home redirect
      switch (data.user.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'escrow':
          navigate('/escrow');
          break;
        case 'manufacturer':
          navigate('/manufacturer');
          break;
        case 'driver':
          navigate('/driver');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  }

  function fillDemoAccount(acc) {
    setIdentifier(acc.id);
    setPassword('Masar@123');
    setError(null);
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-card rounded-3xl border border-line p-8 shadow-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-navy-900 text-amber-500 mb-2 shadow-sm">
            <Truck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">
            {isAr ? 'تسجيل الدخول إلى مسار' : 'Log in to Masar'}
          </h1>
          <p className="text-xs text-ink-muted leading-relaxed">
            {isAr
              ? 'تسجيل الدخول كمصنّع، سائق، حساب الضمان، أو إدارة'
              : 'Log in as a manufacturer, driver, escrow, or admin'}
          </p>
        </div>

        {/* Demo Accounts Tap-to-Fill Banner */}
        {showDemoAccounts && (
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-navy-900">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                {isAr ? 'حسابات التجربة السريعة:' : 'Demo Accounts (1-Tap):'}
              </span>
              <span className="text-[10px] text-ink-muted">Masar@123</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => fillDemoAccount(acc)}
                  className="px-2.5 py-2 text-start rounded-xl bg-white border border-line hover:border-amber-500 hover:bg-amber-100/40 transition text-xs shadow-2xs"
                >
                  <div className="font-bold text-navy-900 truncate">
                    {isAr ? acc.labelAr : acc.labelEn}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{acc.id}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-navy-900 mb-1.5">
              {isAr ? 'البريد الإلكتروني أو رقم الهاتف' : 'Email or Phone Number'}
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={isAr ? 'example@domain.com أو +962...' : 'Email or +96279...'}
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-line bg-white text-ink focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-900 mb-1.5">
              {isAr ? 'كلمة المرور' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-line bg-white text-ink focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-navy-900 font-bold text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (isAr ? 'جاري التحقق...' : 'Signing in...') : (isAr ? 'تسجيل الدخول' : 'Sign In')}
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </form>

        {/* Escrow badge footnote */}
        <div className="pt-2 border-t border-line text-center text-xs text-ink-muted flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{isAr ? 'محمي بواسطة حساب الضمان المالي' : 'Protected by Escrow Guarantee'}</span>
        </div>
      </div>
    </div>
  );
}

