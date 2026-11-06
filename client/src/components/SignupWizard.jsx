import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ShieldCheck } from 'lucide-react';
import AuthShell from './AuthShell.jsx';

/**
 * Frame for the multi-step sign-up forms (05 §11: multi-step with a progress indicator).
 * Left: vertical stepper on the dotted-route motif. Right: the current step's card.
 * Completed steps are clickable so people can go back and fix something.
 */
export default function SignupWizard({ title, subtitle, steps, currentStep, onStepClick, prepare = [], children }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const step = steps.find((s) => s.id === currentStep) || steps[0];
  const pct = ((currentStep - 1) / Math.max(1, steps.length - 1)) * 100;

  return (
    <AuthShell maxWidth="max-w-5xl">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
        {/* Stepper */}
        <aside className="lg:sticky lg:top-8">
          <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-ink-muted mt-1">{subtitle}</p>}

          {/* mobile progress */}
          <div className="lg:hidden mt-4">
            <div className="flex items-center justify-between text-xs font-bold text-navy-900 mb-1.5">
              <span>{isAr ? step.labelAr : step.labelEn}</span>
              <span className="text-ink-muted tabular-nums">{currentStep} / {steps.length}</span>
            </div>
            <div className="h-2 rounded-full bg-line overflow-hidden">
              <div className="h-full bg-amber-500 transition-[width] duration-300" style={{ width: `${Math.max(8, (currentStep / steps.length) * 100)}%` }} />
            </div>
          </div>

          <ol className="hidden lg:block relative mt-6">
            {/* dotted route behind the stations */}
            <span aria-hidden="true" className="absolute start-[17px] top-4 bottom-4 border-s-[3px] border-dotted border-line" />
            <span
              aria-hidden="true"
              className="absolute start-[17px] top-4 border-s-[3px] border-dotted border-amber-500 transition-[height] duration-300"
              style={{ height: `calc(${pct}% - ${pct ? 8 : 0}px)` }}
            />
            {steps.map((s) => {
              const done = s.id < currentStep;
              const cur = s.id === currentStep;
              const Icon = s.icon;
              return (
                <li key={s.id} className="relative pb-6 last:pb-0">
                  <button
                    type="button"
                    disabled={!done}
                    onClick={() => done && onStepClick?.(s.id)}
                    className={`flex items-start gap-3 text-start w-full rounded-xl ${done ? 'cursor-pointer group' : 'cursor-default'}`}
                  >
                    <span
                      className={`relative z-[1] h-[38px] w-[38px] shrink-0 rounded-full flex items-center justify-center ring-4 ring-surface transition ${
                        done ? 'bg-amber-500 text-navy-900' : cur ? 'bg-navy-900 text-amber-500' : 'bg-card border-2 border-line text-ink-muted'
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" strokeWidth={3} /> : Icon ? <Icon className="h-4 w-4" /> : s.id}
                    </span>
                    <span className="pt-1">
                      <span className={`block text-sm font-bold ${cur || done ? 'text-navy-900' : 'text-ink-muted'} ${done ? 'group-hover:underline' : ''}`}>
                        {isAr ? s.labelAr : s.labelEn}
                      </span>
                      {(s.hintEn || s.hintAr) && (
                        <span className="block text-xs text-ink-muted leading-snug mt-0.5">{isAr ? s.hintAr : s.hintEn}</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {prepare.length > 0 && (
            <div className="hidden lg:block mt-8 rounded-2xl border border-line bg-card p-4">
              <p className="text-xs font-bold text-navy-900">{isAr ? 'جهّز هذه الملفات (PDF)' : 'Have these ready (PDF)'}</p>
              <ul className="mt-2 space-y-1.5">
                {prepare.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-xs text-ink">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* Card */}
        <section className="bg-card rounded-3xl border border-line p-6 sm:p-8">
          <header className="mb-6 pb-5 border-b border-line">
            <p className="text-xs font-bold text-ink-muted">
              {isAr ? `الخطوة ${currentStep} من ${steps.length}` : `Step ${currentStep} of ${steps.length}`}
            </p>
            <h2 className="text-xl font-extrabold text-navy-900 mt-1">{isAr ? step.labelAr : step.labelEn}</h2>
            {(step.hintEn || step.hintAr) && <p className="text-sm text-ink-muted mt-0.5">{isAr ? step.hintAr : step.hintEn}</p>}
          </header>
          <div className="space-y-5 [&_label]:text-sm [&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:h-12 [&_input]:text-[15px] [&_select]:h-12 [&_select]:text-[15px]">
            {children}
          </div>
          <p className="mt-6 pt-5 border-t border-line text-xs text-ink-muted flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#15803D]" />
            {isAr ? 'تراجع إدارة مسار وثائقك قبل تفعيل الحساب.' : 'Masar admin reviews your documents before your account goes live.'}
            <span className="ms-auto">
              {isAr ? 'لديك حساب؟' : 'Have an account?'}{' '}
              <Link to="/login" className="font-bold text-navy-900 underline decoration-amber-500 decoration-2 underline-offset-2">{isAr ? 'دخول' : 'Log in'}</Link>
            </span>
          </p>
        </section>
      </div>
    </AuthShell>
  );
}
