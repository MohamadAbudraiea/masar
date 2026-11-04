import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  variant = 'primary', // 'primary' (emerald) | 'danger' (rose) | 'warning' (amber) | 'navy' (navy)
  icon: CustomIcon,
  children,
  loading = false,
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  // Handle ESC key to dismiss
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const defaultIcons = {
    primary: CheckCircle2,
    danger: AlertCircle,
    warning: AlertTriangle,
    navy: Info,
  };

  const IconComponent = CustomIcon || defaultIcons[variant] || CheckCircle2;

  const colorStyles = {
    primary: {
      iconBg: 'bg-emerald-100 text-emerald-700',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    danger: {
      iconBg: 'bg-rose-100 text-rose-700',
      btn: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
    warning: {
      iconBg: 'bg-amber-100 text-amber-700',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    navy: {
      iconBg: 'bg-navy-100 text-navy-800',
      btn: 'bg-navy-900 hover:bg-navy-800 text-white',
    },
  };

  const style = colorStyles[variant] || colorStyles.primary;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-navy-950/65 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Backdrop Click Dismiss */}
      <div className="fixed inset-0" onClick={!loading ? onClose : undefined} />

      {/* Modal Dialog Card */}
      <div className="relative bg-card w-full max-w-md rounded-3xl border border-line shadow-2xl p-5 sm:p-6 space-y-4 z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl ${style.iconBg} flex items-center justify-center shrink-0`}>
              <IconComponent className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-black text-navy-900">{title}</h3>
              {description && (
                <div className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                  {description}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-ink-muted hover:text-navy-900 transition shrink-0 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Custom Body / Extra Content */}
        {children && <div className="space-y-3 pt-1">{children}</div>}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          {cancelText !== false && (
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-line text-xs sm:text-sm font-semibold text-navy-900 hover:bg-slate-50 transition active:scale-98 disabled:opacity-50"
            >
              {cancelText || (isAr ? 'إلغاء' : 'Cancel')}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50 ${style.btn}`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {confirmText || (isAr ? 'تأكيد' : 'Confirm')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

