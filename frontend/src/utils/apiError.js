import { API_BASE_URL } from '../services/api';

export function getApiErrorMessage(err, fallback = 'Request failed') {
  if (!err) return fallback;

  if (err.code === 'ECONNABORTED') {
    return 'Server is waking up — please wait a moment and try again.';
  }

  if (!err.response) {
    if (err.message?.includes('Network Error')) {
      return `Cannot reach API (${API_BASE_URL}). Check your connection or try again shortly.`;
    }
    return err.message || fallback;
  }

  const data = err.response.data;
  if (typeof data?.message === 'string' && data.message) return data.message;
  if (Array.isArray(data?.errors) && data.errors[0]) return data.errors[0];
  if (typeof data === 'string' && data) return data;

  return fallback;
}
