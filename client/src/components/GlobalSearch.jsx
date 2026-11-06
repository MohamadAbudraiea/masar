import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Package, Building2, Truck, X, Loader2, CornerDownLeft, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '../state/auth.jsx';
import { apiClient } from '../api/client.js';
import { linkTo } from '../lib/links.js';
import StatusChip from './StatusChip.jsx';

const RECENT_KEY = 'masar_recent_search';

function readRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 5);
  } catch {
    return [];
  }
}
function pushRecent(q) {
  try {
    const next = [q, ...readRecent().filter((x) => x !== q)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — fine */
  }
}

/** Bold the part of `text` that matches `q` (case-insensitive). */
function Highlight({ text = '', q = '' }) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-amber-100 text-navy-900 rounded px-0.5">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

const GROUP_META = {
  ticket: { icon: Package, tile: 'bg-amber-100 text-[#8A5A00]' },
  manufacturer: { icon: Building2, tile: 'bg-navy-100 text-navy-700' },
  driver: { icon: Truck, tile: 'bg-[#CCFBF1] text-[#0F766E]' },
};

/**
 * Global search (05 §4). Role-based results come from GET /search — the server
 * already scopes what each role may see; this component only presents them.
 * Ctrl/⌘-K focuses, ↑/↓ moves, Enter opens, Esc closes.
 */
export default function GlobalSearch() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ tickets: [], manufacturers: [], drivers: [] });
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState(readRecent);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  const q = query.trim();

  // Debounced fetch (300 ms per spec)
  useEffect(() => {
    if (q.length < 2) {
      setResults({ tickets: [], manufacturers: [], drivers: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiClient(`/search?q=${encodeURIComponent(q)}`);
        setResults({ tickets: [], manufacturers: [], drivers: [], ...(data || {}) });
        setActive(0);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  // Ctrl/⌘-K shortcut
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Flatten for keyboard navigation
  const flat = useMemo(
    () => [
      ...results.tickets.map((r) => ({ entity: 'ticket', r })),
      ...results.manufacturers.map((r) => ({ entity: 'manufacturer', r })),
      ...results.drivers.map((r) => ({ entity: 'driver', r })),
    ],
    [results]
  );

  const handleSelect = useCallback(
    (entity, id) => {
      if (q) pushRecent(q);
      setRecent(readRecent());
      setIsOpen(false);
      setQuery('');
      inputRef.current?.blur();
      navigate(linkTo(user.role, entity, id));
    },
    [q, navigate, user?.role]
  );

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!flat.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % flat.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + flat.length) % flat.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = flat[active] || flat[0];
      handleSelect(hit.entity, hit.r.id);
    }
  }

  const groups = [
    { entity: 'ticket', label: isAr ? 'الشحنات' : 'Shipments', items: results.tickets },
    { entity: 'manufacturer', label: isAr ? 'المصانع' : 'Manufacturers', items: results.manufacturers },
    { entity: 'driver', label: isAr ? 'السائقون' : 'Drivers', items: results.drivers },
  ].filter((g) => g.items.length);

  // What this role can search for — drives the placeholder and the empty hint
  const scope =
    user?.role === 'driver'
      ? isAr ? 'شحناتك' : 'your shipments'
      : user?.role === 'manufacturer'
      ? isAr ? 'الشحنات والسائقين' : 'shipments and drivers'
      : isAr ? 'الشحنات، المصانع، السائقين' : 'shipments, manufacturers, drivers';

  let runningIndex = -1;

  return (
    <div ref={containerRef} className="relative w-[min(46vw,520px)]">
      <div
        className={`relative flex items-center rounded-xl border transition-all ${
          isOpen ? 'bg-card border-navy-700/40 ring-4 ring-navy-100' : 'bg-surface border-line hover:border-navy-700/30'
        }`}
      >
        <Search className="absolute start-3.5 h-4 w-4 text-ink-muted pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="global-search-results"
          aria-label={isAr ? 'بحث' : 'Search'}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={isAr ? `ابحث في ${scope}…` : `Search ${scope}…`}
          className="w-full bg-transparent ps-10 pe-20 h-10 text-sm text-ink placeholder:text-ink-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <div className="absolute end-2.5 flex items-center gap-1.5">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-navy-700" />}
          {query && !loading && (
            <button
              type="button"
              aria-label={isAr ? 'مسح' : 'Clear'}
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="h-6 w-6 rounded-md flex items-center justify-center text-ink-muted hover:bg-surface hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {!query && (
            <kbd className="hidden md:inline-flex items-center gap-0.5 h-6 px-1.5 rounded-md border border-line bg-card text-[11px] font-semibold text-ink-muted" dir="ltr">
              {isMac ? '⌘' : 'Ctrl'} K
            </kbd>
          )}
        </div>
      </div>

      {isOpen && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute top-full start-0 end-0 mt-2 bg-card border border-line rounded-2xl shadow-[0_20px_48px_-16px_rgba(7,30,51,0.35)] z-50 overflow-hidden"
        >
          <div className="max-h-[420px] overflow-y-auto p-2">
            {q.length < 2 ? (
              <div className="p-2">
                {recent.length > 0 && (
                  <>
                    <div className="px-2 pb-1.5 text-xs font-bold text-ink-muted">{isAr ? 'عمليات بحث سابقة' : 'Recent searches'}</div>
                    <div className="flex flex-wrap gap-1.5 px-2 pb-3">
                      {recent.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setQuery(r)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-navy-900 hover:bg-surface"
                        >
                          <Clock className="h-3 w-3 text-ink-muted" />
                          {r}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <div className="rounded-xl bg-surface px-3 py-3 text-xs text-ink-muted leading-relaxed">
                  {isAr ? (
                    <>اكتب رقم الشحنة مثل <b className="text-navy-900" dir="ltr">MSR-000124</b>{user?.role !== 'driver' && <>، أو اسم شركة أو سائق</>}.</>
                  ) : (
                    <>Type a shipment number like <b className="text-navy-900">MSR-000124</b>{user?.role !== 'driver' && <>, or a company or driver name</>}.</>
                  )}
                </div>
              </div>
            ) : !loading && groups.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-surface flex items-center justify-center">
                  <Search className="h-4 w-4 text-ink-muted" />
                </div>
                <div className="text-sm font-bold text-navy-900">
                  {isAr ? `لا نتائج لـ "${q}"` : `No results for "${q}"`}
                </div>
                <div className="text-xs text-ink-muted mt-0.5">{isAr ? 'جرّب رقماً أو اسماً آخر.' : 'Try another number or name.'}</div>
              </div>
            ) : (
              groups.map((g) => {
                const meta = GROUP_META[g.entity];
                const Icon = meta.icon;
                return (
                  <div key={g.entity} className="mb-1 last:mb-0">
                    <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
                      <span className="text-xs font-bold text-ink-muted">{g.label}</span>
                      <span className="text-[11px] font-semibold text-ink-muted tabular-nums">{g.items.length}</span>
                    </div>
                    {g.items.map((item) => {
                      runningIndex += 1;
                      const idx = runningIndex;
                      const isActive = idx === active;
                      const title = g.entity === 'ticket' ? item.ticket_number : item.name;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => handleSelect(g.entity, item.id)}
                          className={`w-full text-start px-2.5 py-2 rounded-xl flex items-center gap-3 transition-colors ${
                            isActive ? 'bg-navy-100/70' : 'hover:bg-surface'
                          }`}
                        >
                          <span className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${meta.tile}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-navy-900 truncate">
                              <Highlight text={title} q={q} />
                            </span>
                            <span className="block text-xs text-ink-muted truncate" dir={g.entity === 'ticket' ? undefined : 'ltr'}>
                              {g.entity === 'ticket'
                                ? `${item.pickup_city || '—'} → ${item.dest_city || '—'}`
                                : [item.phone, item.plate_number].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                          {g.entity === 'ticket' && item.status && <StatusChip status={item.status} className="shrink-0" />}
                          {isActive && <CornerDownLeft className="h-3.5 w-3.5 text-ink-muted shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
          <div className="hidden md:flex items-center gap-4 border-t border-line bg-surface/60 px-4 py-2 text-[11px] font-semibold text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              <ArrowDown className="h-3 w-3" /> {isAr ? 'تنقّل' : 'Navigate'}
            </span>
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" /> {isAr ? 'فتح' : 'Open'}
            </span>
            <span>Esc {isAr ? 'إغلاق' : 'Close'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
