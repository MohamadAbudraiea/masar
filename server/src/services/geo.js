import { config } from '../config.js';

// In-memory cache for Nominatim queries
const geoCache = new Map();

// Rate limiter: 1 request per second for Nominatim
let lastNominatimRequestTime = 0;
async function throttleNominatim() {
  const now = Date.now();
  const timeSinceLast = now - lastNominatimRequestTime;
  if (timeSinceLast < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - timeSinceLast));
  }
  lastNominatimRequestTime = Date.now();
}

/**
 * Calculates Haversine distance in kilometers between two coordinates.
 */
export function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Extracts city and area from Nominatim address object following strict fallback chains from 04 §3.
 * City fallback chain: city -> town -> village -> municipality -> county -> state
 * Area fallback chain: suburb -> neighbourhood -> quarter -> city_district -> hamlet
 */
export function extractCityAndArea(addressObj = {}) {
  const cityFallbacks = ['city', 'town', 'village', 'municipality', 'county', 'state'];
  const areaFallbacks = ['suburb', 'neighbourhood', 'quarter', 'city_district', 'hamlet'];

  let city = null;
  for (const key of cityFallbacks) {
    if (addressObj[key]) {
      city = addressObj[key];
      break;
    }
  }

  let area = null;
  for (const key of areaFallbacks) {
    if (addressObj[key]) {
      area = addressObj[key];
      break;
    }
  }

  return { city, area };
}

/**
 * Parses coordinates from Google Maps links (short or expanded).
 * Patterns: @lat,lng, !3dLAT!4dLNG, q=lat,lng, or ll=lat,lng
 */
export function parseCoordinatesFromUrl(urlString) {
  if (!urlString) return null;

  // Pattern 1: @lat,lng
  const atMatch = urlString.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }

  // Pattern 2: !3dLAT!4dLNG
  const bangMatch = urlString.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (bangMatch) {
    return { lat: parseFloat(bangMatch[1]), lng: parseFloat(bangMatch[2]) };
  }

  // Pattern 3: q=lat,lng or query=lat,lng or ll=lat,lng
  const paramMatch = urlString.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (paramMatch) {
    return { lat: parseFloat(paramMatch[1]), lng: parseFloat(paramMatch[2]) };
  }

  return null;
}

/**
 * Search locations with OpenStreetMap Nominatim.
 */
export async function searchLocations(queryText) {
  if (!queryText || !queryText.trim()) return [];

  const cacheKey = `search:${queryText.trim().toLowerCase()}`;
  if (geoCache.has(cacheKey)) {
    return geoCache.get(cacheKey);
  }

  await throttleNominatim();

  const url = new URL(`${config.geo.nominatimUrl}/search`);
  url.searchParams.set('q', queryText);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '5');

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': config.geo.nominatimUserAgent },
    });
    if (!res.ok) return [];

    const data = await res.json();
    const results = data.map((item) => {
      const { city, area } = extractCityAndArea(item.address);
      return {
        label: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        city,
        area,
      };
    });

    geoCache.set(cacheKey, results);
    return results;
  } catch (err) {
    console.error('Nominatim search failed:', err.message);
    return [];
  }
}

/**
 * Reverse geocode coordinates to full address, city, and area.
 */
export async function reverseGeocode(lat, lng) {
  const roundedLat = Number(lat).toFixed(4);
  const roundedLng = Number(lng).toFixed(4);
  const cacheKey = `reverse:${roundedLat},${roundedLng}`;

  if (geoCache.has(cacheKey)) {
    return geoCache.get(cacheKey);
  }

  await throttleNominatim();

  const url = new URL(`${config.geo.nominatimUrl}/reverse`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': config.geo.nominatimUserAgent },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const { city, area } = extractCityAndArea(data.address);
    const result = {
      address: data.display_name || `${lat}, ${lng}`,
      city,
      area,
    };

    geoCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error('Nominatim reverse failed:', err.message);
    return {
      address: `${lat}, ${lng}`,
      city: null,
      area: null,
    };
  }
}

/**
 * Calculates distance and geometry using OSRM with Haversine straight-line fallback.
 */
export async function calculateRoute(fromLat, fromLng, toLat, toLng) {
  const url = `${config.geo.osrmUrl}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM error ${res.status}`);
    const data = await res.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distanceKm = Number((route.distance / 1000).toFixed(1));
      return {
        distance_km: distanceKm,
        geometry: route.geometry, // GeoJSON LineString
      };
    }
  } catch (err) {
    // Fall back to Haversine straight line
  }

  const distanceKm = calculateHaversineKm(fromLat, fromLng, toLat, toLng);
  return {
    distance_km: distanceKm,
    geometry: {
      type: 'LineString',
      coordinates: [
        [fromLng, fromLat],
        [toLng, toLat],
      ],
    },
  };
}

