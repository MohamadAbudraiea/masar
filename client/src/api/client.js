const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

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

  const response = await fetch(`${BASE_URL}${endpoint}`, {
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

