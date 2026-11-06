import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Truck, ArrowRight, ShieldCheck, UserCheck, AlertCircle, Factory, Eye, EyeOff } from 'lucide-react';
import AuthShell from '../../components/AuthShell.jsx';
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
  const [showPw, setShowPw] = useState(false);

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
      setError(
        err.message === 'Invalid credentials'
          ? isAr ? 'البريد/الهاتف أو كلمة المرور غير صحيحة.' : 'That email/phone and password don\'t match. Check them and try again.'
          : err.message || (isAr ? 'تعذّر تسجيل الدخول.' : "Couldn't log in. Try again.")
      );
    } finally {
      setIsLoading(false);
    }
  }

  function fillDemoAccount(acc) {
    setIdentifier(acc.id);
    setPassword('Masar@123');
    setError(null);
  }

  const roleIcon = { manufacturer: Factory, driver: Truck, escrow: ShieldCheck, admin: UserCheck };

  return (
    <AuthShell variant="split" maxWidth="max-w-md">
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-extrabold text-navy-900 tracking-tight">{isAr ? 'تسجيل الدخول' : 'Log in'}</h1>
          <p className="text-sm text-ink-muted mt-1">
            {isAr ? 'للمصانع والسائقين وحساب الضمان والإدارة.' : 'For manufacturers, drivers, escrow and admin.'}
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-sm text-[#B91C1C] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-id" className="block text-sm font-bold text-navy-900 mb-1.5">
              {isAr ? 'البريد الإلكتروني أو رقم الهاتف' : 'Email or phone number'}
            </label>
            <input
              id="login-id"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={isAr ? 'name@company.com أو +962…' : 'name@company.com or +962…'}
              required
              dir="ltr"
              className="w-full h-12 px-4 text-[15px] rounded-xl border border-line bg-card text-ink focus:outline-none focus:border-navy-700/40 focus:ring-4 focus:ring-navy-100"
            />
          </div>
          <div>
            <label htmlFor="login-pw" className="block text-sm font-bold text-navy-900 mb-1.5">
              {isAr ? 'كلمة المرور' : 'Password'}
            </label>
            <div className="relative">
              <input
                id="login-pw"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-12 ps-4 pe-12 text-[15px] rounded-xl border border-line bg-card text-ink focus:outline-none focus:border-navy-700/40 focus:ring-4 focus:ring-navy-100"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? (isAr ? 'إخفاء كلمة المرور' : 'Hide password') : isAr ? 'إظهار كلمة المرور' : 'Show password'}
                className="absolute end-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg flex items-center justify-center text-ink-muted hover:bg-surface hover:text-ink"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-ink-muted">
              {isAr ? 'نسيت كلمة المرور؟ تواصل مع إدارة مسار لإعادة تعيينها.' : 'Forgot your password? Ask Masar admin to reset it.'}
            </p>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-navy-900 font-bold text-[15px] transition flex items-center justify-center gap-2 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-900 focus-visible:ring-offset-2"
          >
            {isLoading ? (isAr ? 'جاري الدخول…' : 'Logging in…') : isAr ? 'تسجيل الدخول' : 'Log in'}
            {!isLoading && <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />}
          </button>
        </form>

        <p className="text-sm text-ink-muted text-center">
          {isAr ? 'ليس لديك حساب؟' : "Don't have an account?"}{' '}
          <Link to="/signup" className="font-bold text-navy-900 underline decoration-amber-500 decoration-2 underline-offset-4">
            {isAr ? 'أنشئ حساباً' : 'Sign up'}
          </Link>
        </p>

        {showDemoAccounts && (
          <details open className="group rounded-2xl border border-line bg-card">
            <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between text-sm font-bold text-navy-900">
              <span>{isAr ? 'حسابات تجريبية' : 'Demo accounts'}</span>
              <span className="text-xs font-semibold text-ink-muted">
                {isAr ? 'اضغط للتعبئة' : 'Tap to fill'} · <span dir="ltr">Masar@123</span>
              </span>
            </summary>
            <div className="grid grid-cols-2 gap-2 px-3 pb-3">
              {DEMO_ACCOUNTS.map((acc) => {
                const Icon = roleIcon[acc.role] || UserCheck;
                const on = identifier === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => fillDemoAccount(acc)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 text-start rounded-xl border transition ${
                      on ? 'border-navy-900 bg-navy-100/60' : 'border-line hover:border-navy-700/40 hover:bg-surface'
                    }`}
                  >
                    <span className="h-8 w-8 shrink-0 rounded-lg bg-navy-900 text-amber-500 flex items-center justify-center">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-navy-900 truncate">{isAr ? acc.labelAr : acc.labelEn}</span>
                      <span className="block text-[11px] text-ink-muted truncate" dir="ltr">{acc.id}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </details>
        )}
      </div>
    </AuthShell>
  );
}
