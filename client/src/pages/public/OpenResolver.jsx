import React, { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserX, LogOut, ArrowRight, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../state/auth.jsx';

/**
 * Deep Link Resolver Page per 06 §1.6 & 07 §6:
 * Route: /open?to=<path>&as=<userId>
 * 1. Logged out -> redirect to /login?redirect=<to>
 * 2. Logged in as another user -> show account switch page
 * 3. Logged in as target user (or as not specified) -> navigate to <to>
 */
export default function OpenResolver() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const to = searchParams.get('to') || '/';
  const as = searchParams.get('as');

  useEffect(() => {
    // 1. If not authenticated, redirect to login preserving redirect target
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(to)}`, { replace: true });
      return;
    }

    // 3. If authenticated as the target user (or no specific target user required), proceed directly
    if (!as || user?.id === as) {
      navigate(to, { replace: true });
    }
  }, [isAuthenticated, user?.id, as, to, navigate]);

  // 2. If authenticated as someone else, render the Switch Account screen
  if (isAuthenticated && as && user?.id !== as) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-2xl border border-line shadow-sm p-6 text-center space-y-5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-black text-navy-900">
              {isAr ? 'هذا الرابط مخصص لحساب آخر' : 'This link is for another account'}
            </h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              {isAr
                ? `أنت مسجّل الدخول حالياً بحساب (${user?.name}). يحتوي هذا الرابط على معلومات سرية مخصصة لحساب مختلف.`
                : `You are currently logged in as (${user?.name}). This secure link was created for a different account.`}
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                logout();
                navigate(`/login?redirect=${encodeURIComponent(to)}`);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>{isAr ? 'تبديل الحساب وتسجيل الدخول' : 'Switch Account & Log In'}</span>
            </button>

            <Link
              to="/"
              className="w-full py-2.5 px-4 rounded-xl border border-line bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <span>{isAr ? 'العودة للرئيسية' : 'Return to Home'}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="flex items-center gap-3 text-sm text-ink-muted">
        <div className="w-5 h-5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
        <span>{isAr ? 'جاري توجيهك...' : 'Redirecting...'}</span>
      </div>
    </div>
  );
}

