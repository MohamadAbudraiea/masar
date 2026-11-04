import React from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage } from './i18n/index.js';

export default function App() {
  const { t, i18n } = useTranslation();

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-ink">
      <div className="max-w-md w-full bg-card rounded-2xl p-8 border border-line shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center text-amber-500 font-bold text-xl">
              M
            </div>
            <div>
              <h1 className="text-xl font-bold text-navy-900">{t('app_name')}</h1>
              <p className="text-sm text-ink-muted">{t('tagline')}</p>
            </div>
          </div>
          <button
            onClick={() => setLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-line hover:bg-navy-100 transition"
          >
            {i18n.language === 'ar' ? 'English' : 'عربي'}
          </button>
        </div>

        <div className="border-t border-line pt-4 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-ink-muted">Project Base:</span>
            <span className="font-semibold text-emerald-600">Initialized ✓</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-ink-muted">Database Engine:</span>
            <span className="font-semibold text-navy-800">Supabase (PostgreSQL)</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-ink-muted">Timezone:</span>
            <span className="font-semibold text-navy-800">Asia/Amman (UTC+3)</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-100/50 border border-amber-500/20 text-xs text-navy-900 leading-relaxed">
          Base frontend and backend structure successfully prepared. Ready to connect Supabase and run schema migrations.
        </div>
      </div>
    </div>
  );
}

