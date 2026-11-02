import axios from 'axios';
import { authStorage } from './authStorage';

/** API gateway of the microservices backend. Production builds must set VITE_API_URL. */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8090';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const sentToken = Boolean(error.config?.headers?.Authorization);
    if (error.response?.status === 401 && sentToken) {
      authStorage.clear();
      const { pathname, search } = window.location;
      if (!pathname.startsWith('/login')) {
        window.location.href = loginUrl(`${pathname}${search}`);
      }
    }
    return Promise.reject(error);
  }
);

export function loginUrl(returnTo) {
  if (!returnTo || returnTo === '/' || returnTo.startsWith('/login')) return '/login';
  return `/login?redirect=${encodeURIComponent(returnTo)}`;
}

/** Only same-site paths are honoured, so ?redirect= cannot send users to another origin. */
export function safeRedirect(value, fallback) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  return value;
}

export const unwrap = (res) => res.data?.data ?? res.data;

export default api;
