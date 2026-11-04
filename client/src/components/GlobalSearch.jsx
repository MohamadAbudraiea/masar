import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Package, Building2, Truck, X, Loader2 } from 'lucide-react';
import { useAuth } from '../state/auth.jsx';
import { apiClient } from '../api/client.js';
import { linkTo } from '../lib/links.js';

export default function GlobalSearch() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ tickets: [], manufacturers: [], drivers: [] });
  const containerRef = useRef(null);

  // Debounce search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ tickets: [], manufacturers: [], drivers: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiClient(`/search?q=${encodeURIComponent(query.trim())}`);
        setResults(data || { tickets: [], manufacturers: [], drivers: [] });
        setIsOpen(true);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, token]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (entity, id) => {
    const targetUrl = linkTo(user.role, entity, id);
    setIsOpen(false);
    setQuery('');
    navigate(targetUrl);
  };

  const hasResults =
    results.tickets.length > 0 ||
    results.manufacturers.length > 0 ||
    results.drivers.length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-xs md:max-w-md">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
        <input
          type="text"
          value={query}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isAr ? 'بحث عام (شحنات، مصانع، سائقين)...' : 'Search shipments, companies, drivers...'}
          className="w-full ps-9 pe-8 py-1.5 text-xs bg-surface/70 border border-line rounded-lg focus:outline-none focus:border-amber-500 focus:bg-card text-ink transition-all placeholder:text-ink-muted"
        />
        {loading ? (
          <Loader2 className="absolute end-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-amber-500" />
        ) : query ? (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute end-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full start-0 end-0 mt-1.5 bg-card border border-line rounded-xl shadow-lg z-50 overflow-hidden max-h-[380px] overflow-y-auto">
          {!hasResults && !loading ? (
            <div className="p-4 text-center text-xs text-ink-muted">
              {isAr ? 'لا توجد نتائج مطابقة' : 'No matching results'}
            </div>
          ) : (
            <div className="p-2 space-y-3">
              {/* Tickets */}
              {results.tickets.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                    {isAr ? 'الشحنات' : 'Shipments'}
                  </div>
                  {results.tickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSelect('ticket', t.id)}
                      className="w-full text-start px-2.5 py-2 rounded-lg hover:bg-surface/80 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="font-semibold text-navy-900">{t.ticket_number}</span>
                        <span className="text-ink-muted">
                          {t.pickup_city} → {t.dest_city}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-medium px-1.5 py-0.5 rounded bg-surface border border-line/60">
                        {t.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Manufacturers */}
              {results.manufacturers.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                    {isAr ? 'الشركات المصنّعة' : 'Companies'}
                  </div>
                  {results.manufacturers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSelect('manufacturer', m.id)}
                      className="w-full text-start px-2.5 py-2 rounded-lg hover:bg-surface/80 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-navy-700 shrink-0" />
                        <span className="font-medium text-navy-900">{m.name}</span>
                      </div>
                      <span className="text-[11px] text-ink-muted">{m.phone}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Drivers */}
              {results.drivers.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                    {isAr ? 'السائقون' : 'Drivers'}
                  </div>
                  {results.drivers.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => handleSelect('driver', d.id)}
                      className="w-full text-start px-2.5 py-2 rounded-lg hover:bg-surface/80 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Truck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="font-medium text-navy-900">{d.name}</span>
                        {d.plate_number && (
                          <span className="text-[10px] text-ink-muted bg-surface px-1.5 py-0.5 rounded">
                            {d.plate_number}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-ink-muted">{d.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

