import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Search,
  Bookmark,
  Link2,
  Check,
  Navigation,
  Loader2,
  Crosshair,
} from 'lucide-react';
import { apiClient } from '../api/client.js';

/**
 * 5-in-1 Location Picker component:
 * 1. Locate Me (Browser GPS Geolocation + Reverse Geocoding)
 * 2. Saved places (2 taps)
 * 3. OSM search with city/area
 * 4. Paste Google Maps link or lat,lng
 * 5. Pin / Coordinates preview
 *
 * @param {Object} props
 * @param {'pickup' | 'destination'} props.kind
 * @param {Object} props.value - { label, address, lat, lng, city, area, contact_name, contact_phone }
 * @param {Function} props.onChange
 * @param {Array} [props.savedLocations]
 * @param {string} [props.title]
 */
export default function LocationPicker({
  kind = 'pickup',
  value = null,
  onChange,
  savedLocations = [],
  title,
  showLocateMe,
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const canLocateMe = showLocateMe !== undefined ? showLocateMe : kind !== 'destination';

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('saved'); // 'saved' | 'search' | 'link'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [isResolvingLink, setIsResolvingLink] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [saveForNextTime, setSaveForNextTime] = useState(true);

  // 1. Locate Me using Browser Geolocation
  function handleLocateMe() {
    if (!navigator.geolocation) {
      alert(
        isAr
          ? 'المتصفح لا يدعم تحديد الموقع الجغرافي (Geolocation).'
          : 'Geolocation is not supported by your browser.'
      );
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // Reverse geocode to get city and area
          let revData = { city: 'Amman', area: null, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
          try {
            const rev = await apiClient(`/geo/reverse?lat=${lat}&lng=${lng}`);
            if (rev) revData = rev;
          } catch (e) {
            console.warn('Reverse geocode fallback:', e);
          }

          selectLocation({
            label: revData.area || revData.city || (isAr ? 'موقعي الحالي' : 'My Current Location'),
            address: revData.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            lat,
            lng,
            city: revData.city || 'Amman',
            area: revData.area || null,
          });
        } catch (err) {
          console.error('Failed to process geolocation:', err);
          alert(isAr ? 'حدث خطأ أثناء تحديد الموقع' : 'Failed to retrieve location details');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err.message);
        if (err.code === 1) {
          alert(
            isAr
              ? 'يرجى السماح بصلاحية الوصول إلى الموقع في المتصفح لتحديد موقعك تلقائياً.'
              : 'Please allow location permission in your browser to detect your current position.'
          );
        } else {
          alert(
            isAr
              ? 'تعذر تحديد الموقع الجغرافي. يرجى تجربة البحث بالاسم أو الرابط.'
              : 'Unable to detect position. Please use name search or Google Maps link.'
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }

  // 2. Search OSM
  async function handleSearch() {
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

  // 3. Resolve Google Maps link or coordinates
  async function handleResolveLink() {
    if (!linkInput.trim()) return;

    setIsResolvingLink(true);
    try {
      const resolved = await apiClient('/geo/resolve-link', {
        method: 'POST',
        body: JSON.stringify({ url: linkInput }),
      });

      if (resolved.lat && resolved.lng) {
        // Reverse geocode to get city/area
        let rev = { city: 'Amman', area: null, address: linkInput };
        try {
          rev = await apiClient(`/geo/reverse?lat=${resolved.lat}&lng=${resolved.lng}`);
        } catch (e) { }

        selectLocation({
          label: rev.area || rev.city || 'Custom Pin',
          address: rev.address || `${resolved.lat}, ${resolved.lng}`,
          lat: resolved.lat,
          lng: resolved.lng,
          city: rev.city || 'Amman',
          area: rev.area || null,
        });
      }
    } catch (err) {
      console.error('Failed to resolve link:', err);
      alert(isAr ? 'تعذر استخراج الإحداثيات من هذا الرابط' : 'Could not resolve location from this link');
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
      {/* Header with Title and "Locate Me" Action */}
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-bold text-navy-900">
          {title ||
            (kind === 'pickup'
              ? isAr ? 'موقع التحميل (الاستلام)' : 'Pickup Location'
              : isAr ? 'موقع التسليم' : 'Destination Location')}
        </label>

        {/* Instant Locate Me Pill Button */}
        {canLocateMe && (
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs disabled:opacity-50"
            title={isAr ? 'تحديد موقعي الجغرافي الحالي تلقائياً' : 'Detect my current GPS position'}
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            ) : (
              <Crosshair className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>{isLocating ? (isAr ? 'جاري التحديد...' : 'Locating...') : (isAr ? 'حدد موقعي' : 'Locate Me')}</span>
          </button>
        )}
      </div>

      {/* Main Trigger Field */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 text-start px-3.5 py-2.5 rounded-xl border border-line bg-white hover:border-navy-900 transition shadow-2xs flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="truncate">
              {value ? (
                <>
                  <div className="text-xs font-bold text-navy-900 truncate">
                    {value.label || value.address}
                  </div>
                  <div className="text-[11px] text-ink-muted truncate">
                    {[value.area, value.city].filter(Boolean).join(', ') || value.address}
                  </div>
                </>
              ) : (
                <span className="text-xs text-slate-400">
                  {isAr ? 'اختر أو ابحث عن موقع...' : 'Choose or search location...'}
                </span>
              )}
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 shrink-0 ms-2">
            {value ? (isAr ? 'تغيير' : 'Change') : (isAr ? 'تحديد' : 'Select')}
          </span>
        </button>

        {/* Direct Locate Me icon button */}
          {canLocateMe && (
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocating}
              className="px-3 rounded-xl border border-line bg-white hover:bg-slate-50 text-emerald-700 flex items-center justify-center shadow-2xs shrink-0 disabled:opacity-50"
              title={isAr ? 'حدد موقعي الحالي' : 'Locate Me'}
            >
              {isLocating ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
              <Navigation className="w-4 h-4 text-emerald-600" />
              )}
            </button>
          )}
        </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-40 mt-2 w-full bg-card border border-line rounded-2xl shadow-2xl p-4 space-y-3 animate-fade-in">
          {/* Quick Locate Me Banner inside Modal */}
          {canLocateMe && (
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocating}
              className="w-full p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              {isLocating ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <Crosshair className="w-4 h-4 text-emerald-600" />
              )}
              <span>
                {isLocating
                  ? isAr ? 'جاري قراءة إحداثيات موقعك...' : 'Reading GPS coordinates...'
                  : isAr ? 'استخدام موقعي الحالي الآن (GPS)' : 'Use My Current Location Now (GPS)'}
              </span>
            </button>
          )}

          {/* Navigation Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${activeTab === 'saved' ? 'bg-white shadow-xs text-navy-900 font-bold' : 'text-slate-500'
                }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{isAr ? 'المحفوظة' : 'Saved'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${activeTab === 'search' ? 'bg-white shadow-xs text-navy-900 font-bold' : 'text-slate-500'
                }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isAr ? 'بحث بالاسم' : 'Search'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('link')}
              className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${activeTab === 'link' ? 'bg-white shadow-xs text-navy-900 font-bold' : 'text-slate-500'
                }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'رابط خريطة' : 'Paste Link'}</span>
            </button>
          </div>

          {/* Tab 1: Saved Places */}
          {activeTab === 'saved' && (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {savedLocations.length > 0 ? (
                savedLocations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => selectLocation(loc)}
                    className="w-full text-start p-2.5 rounded-xl border border-line hover:border-emerald-500 hover:bg-emerald-50/40 transition flex items-center justify-between"
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

          {/* Tab 2: Search (NO NESTED FORM TAGS) */}
          {activeTab === 'search' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  placeholder={isAr ? 'مثال: سحاب، المنطقة الصناعية...' : 'e.g. Sahab Industrial, Amman...'}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-line focus:outline-hidden focus:border-navy-900"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="px-4 py-2 bg-navy-900 text-white rounded-xl text-xs font-semibold hover:bg-navy-800 disabled:opacity-50 shrink-0"
                >
                  {isSearching ? '...' : isAr ? 'بحث' : 'Search'}
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1">
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectLocation(res)}
                    className="w-full text-start p-2 rounded-xl hover:bg-slate-100 text-xs transition"
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

          {/* Tab 3: Paste Link / Coords (NO NESTED FORM TAGS) */}
          {activeTab === 'link' && (
            <div className="space-y-2">
              <input
                type="text"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleResolveLink();
                  }
                }}
                placeholder={isAr ? 'رابط خرائط جوجل أو إحداثيات (31.9539, 35.9106)' : 'Google Maps link or 31.9539, 35.9106'}
                className="w-full px-3 py-2 text-xs rounded-xl border border-line focus:outline-hidden focus:border-navy-900"
              />
              <button
                type="button"
                onClick={handleResolveLink}
                disabled={isResolvingLink}
                className="w-full py-2 bg-navy-900 text-white rounded-xl text-xs font-semibold hover:bg-navy-800 disabled:opacity-50"
              >
                {isResolvingLink ? '...' : isAr ? 'تحديد من الرابط' : 'Locate from Link'}
              </button>
            </div>
          )}

          {/* Footer Save Toggle */}
          <div className="border-t border-line pt-2.5 flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-ink-muted text-[11px]">
              <input
                type="checkbox"
                checked={saveForNextTime}
                onChange={(e) => setSaveForNextTime(e.target.checked)}
                className="rounded border-line text-emerald-600 focus:ring-0"
              />
              <span>{isAr ? 'حفظ في الأماكن المحفوظة' : 'Save for next time'}</span>
            </label>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-navy-900 text-[11px] font-semibold"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
