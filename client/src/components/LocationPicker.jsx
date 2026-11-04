import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Search, Bookmark, Link2, Check } from 'lucide-react';
import { apiClient } from '../api/client.js';

/**
 * 4-in-1 Location Picker component:
 * 1. Saved places (2 taps)
 * 2. OSM search with city/area
 * 3. Drop pin / coordinates
 * 4. Paste Google Maps link or lat,lng
 *
 * @param {Object} props
 * @param {'pickup' | 'destination'} props.kind
 * @param {Object} props.value - { label, address, lat, lng, city, area, contact_name, contact_phone }
 * @param {Function} props.onChange
 * @param {Array} [props.savedLocations]
 */
export default function LocationPicker({
  kind = 'pickup',
  value = null,
  onChange,
  savedLocations = [],
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('saved'); // 'saved' | 'search' | 'link'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [isResolvingLink, setIsResolvingLink] = useState(false);
  const [saveForNextTime, setSaveForNextTime] = useState(true);

  // Search OSM
  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await apiClient(`/geo/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(results || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }

  // Resolve link or coordinates
  async function handleResolveLink(e) {
    e.preventDefault();
    if (!linkInput.trim()) return;

    setIsResolvingLink(true);
    try {
      const resolved = await apiClient('/geo/resolve-link', {
        method: 'POST',
        body: JSON.stringify({ url: linkInput }),
      });

      if (resolved.lat && resolved.lng) {
        // Reverse geocode to get city/area
        const rev = await apiClient(`/geo/reverse?lat=${resolved.lat}&lng=${resolved.lng}`);
        selectLocation({
          label: rev.area || rev.city || 'Custom Pin',
          address: rev.address,
          lat: resolved.lat,
          lng: resolved.lng,
          city: rev.city,
          area: rev.area,
        });
      }
    } catch (err) {
      console.error('Failed to resolve link:', err);
    } finally {
      setIsResolvingLink(false);
    }
  }

  function selectLocation(loc) {
    onChange({
      ...loc,
      saveForNextTime,
    });
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-navy-900 mb-1.5">
        {kind === 'pickup'
          ? isAr ? 'موقع الاستلام' : 'Pickup Location'
          : isAr ? 'موقع التسليم' : 'Destination'}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-start px-4 py-3 rounded-xl border border-line bg-white hover:border-amber-500 transition shadow-xs flex items-center justify-between"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-amber-600">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="truncate">
            {value ? (
              <>
                <div className="text-sm font-bold text-navy-900 truncate">
                  {value.label || value.address}
                </div>
                <div className="text-xs text-ink-muted truncate">
                  {[value.area, value.city].filter(Boolean).join(', ') || value.address}
                </div>
              </>
            ) : (
              <span className="text-sm text-slate-400">
                {isAr ? 'اختر أو ابحث عن موقع...' : 'Choose or search location...'}
              </span>
            )}
          </div>
        </div>
        <span className="text-xs font-semibold text-amber-600 shrink-0 ms-2">
          {value ? (isAr ? 'تغيير' : 'Change') : (isAr ? 'تحديد' : 'Select')}
        </span>
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute z-30 mt-2 w-full max-w-lg bg-card border border-line rounded-2xl shadow-xl p-4 space-y-4">
          {/* Tabs */}
          <div className="flex rounded-xl bg-surface p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === 'saved' ? 'bg-white shadow-xs text-navy-900' : 'text-ink-muted'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              {isAr ? 'المحفوظة' : 'Saved'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === 'search' ? 'bg-white shadow-xs text-navy-900' : 'text-ink-muted'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              {isAr ? 'بحث بالاسم' : 'Search'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('link')}
              className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === 'link' ? 'bg-white shadow-xs text-navy-900' : 'text-ink-muted'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              {isAr ? 'رابط خريطة' : 'Paste Link'}
            </button>
          </div>

          {/* 1. Saved Places Tab */}
          {activeTab === 'saved' && (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {savedLocations.length > 0 ? (
                savedLocations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => selectLocation(loc)}
                    className="w-full text-start p-2.5 rounded-xl border border-line hover:border-amber-400 hover:bg-amber-50/30 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-navy-900">{loc.label}</div>
                      <div className="text-[11px] text-ink-muted">
                        {[loc.area, loc.city].filter(Boolean).join(', ') || loc.address}
                      </div>
                      {loc.contact_name && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {loc.contact_name} ({loc.contact_phone})
                        </div>
                      )}
                    </div>
                    {value?.id === loc.id && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </button>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  {isAr ? 'لا توجد مواقع محفوظة بعد' : 'No saved places yet'}
                </div>
              )}
            </div>
          )}

          {/* 2. Search Tab */}
          {activeTab === 'search' && (
            <div className="space-y-3">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isAr ? 'أدخل اسم المنطقة أو الشارع...' : 'Search street or area...'}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-line focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-2 bg-navy-900 text-white rounded-xl text-xs font-semibold hover:bg-navy-800 disabled:opacity-50"
                >
                  {isSearching ? '...' : isAr ? 'بحث' : 'Search'}
                </button>
              </form>

              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectLocation(res)}
                    className="w-full text-start p-2 rounded-lg hover:bg-slate-100 text-xs transition"
                  >
                    <div className="font-semibold text-navy-900">
                      {[res.area, res.city].filter(Boolean).join(', ') || res.label}
                    </div>
                    <div className="text-[10px] text-ink-muted truncate">{res.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Paste Link / Coords Tab */}
          {activeTab === 'link' && (
            <form onSubmit={handleResolveLink} className="space-y-3">
              <input
                type="text"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="Google Maps link or 31.9539, 35.9106"
                className="w-full px-3 py-2 text-xs rounded-xl border border-line focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={isResolvingLink}
                className="w-full py-2 bg-navy-900 text-white rounded-xl text-xs font-semibold hover:bg-navy-800 disabled:opacity-50"
              >
                {isResolvingLink ? '...' : isAr ? 'تحديد من الرابط' : 'Locate from Link'}
              </button>
            </form>
          )}

          {/* Footer Save Toggle */}
          <div className="border-t border-line pt-3 flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-ink-muted">
              <input
                type="checkbox"
                checked={saveForNextTime}
                onChange={(e) => setSaveForNextTime(e.target.checked)}
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
              />
              {isAr ? 'حفظ في الأماكن المفضلة' : 'Save for next time'}
            </label>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-ink"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

