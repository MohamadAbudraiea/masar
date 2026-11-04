export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;

    // Running on production vydo.tech
    if (hostname.endsWith('vydo.tech')) {
      return 'https://api-masar.vydo.tech/api';
    }

    // If served over HTTPS, always route to HTTPS API to prevent mixed-content blocks
    if (protocol === 'https:') {
      const envUrl = import.meta.env.VITE_API_URL;
      if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        return envUrl.startsWith('http://') ? envUrl.replace('http://', 'https://') : envUrl;
      }
      return 'https://api-masar.vydo.tech/api';
    }
  }

  return import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
}

export function getApiUrl(endpoint = '') {
  const base = getBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
}

export async function apiClient(endpoint, options = {}) {
  const token = localStorage.getItem('masar_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // If body is FormData, drop Content-Type so the browser sets boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const response = await fetch(`${getBaseUrl()}${cleanEndpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: { code: 'UNKNOWN_ERROR', message: response.statusText } };
    }
    const err = new Error(errorData.error?.message || 'Request failed');
    err.code = errorData.error?.code || 'REQUEST_FAILED';
    err.status = response.status;
    throw err;
  }

  return response.json();
}

