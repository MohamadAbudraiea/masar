import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, AlertTriangle, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../state/auth.jsx';
import AuthShell from '../../components/AuthShell.jsx';

export default function PendingApproval() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const isRejected = user?.status === 'rejected';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <AuthShell maxWidth="max-w-md">
      <div className="w-full max-w-md bg-card rounded-3xl border border-line p-8 shadow-sm text-center space-y-6">
        <div
          className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${
            isRejected ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
          }`}
        >
          {isRejected ? (
            <AlertTriangle className="w-8 h-8" />
          ) : (
            <Clock className="w-8 h-8 animate-spin-slow" />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-navy-900">
            {isRejected
              ? isAr ? 'طلب التسجيل غير مقبول' : 'Application Not Approved'
              : isAr ? 'طلبك قيد المراجعة والتدقيق' : "We're Reviewing Your Account"}
          </h2>
          <p className="text-xs text-ink-muted leading-relaxed">
            {isRejected
              ? isAr
                ? 'قام فريق المراجعة بمراجعة طلبك وتحديد السبب التالي:'
                : 'Our administration team reviewed your application with the following feedback:'
              : isAr
                ? 'فريق مسار يقوم حالياً بالتحقق من وثائقك وسجلاتك الرسمية. ستتلقى إشعاراً فور اعتماد حسابك.'
                : 'Masar is currently verifying your documents and official records. You will receive an email once your account is active.'}
          </p>
        </div>

        {isRejected && user?.rejection_reason && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 text-start font-medium leading-relaxed">
            <span className="font-bold block mb-1">
              {isAr ? 'سبب الرفض:' : 'Reason provided:'}
            </span>
            {user.rejection_reason}
          </div>
        )}

        <div className="pt-4 border-t border-line">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2.5 px-4 rounded-xl border border-line hover:bg-slate-100 text-xs font-bold text-navy-900 transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            {isAr ? 'تسجيل الخروج' : 'Log Out'}
          </button>
        </div>
      </div>
    </AuthShell>
  );
}

