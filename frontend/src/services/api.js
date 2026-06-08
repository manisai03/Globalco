import axios from 'axios';
import { authStorage } from './authStorage';

/** Production Render API — used when VITE_API_URL is missing from the Vercel build. */
const PROD_API_URL = 'https://globalco-job-board-api-vpee.onrender.com';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? PROD_API_URL : 'http://localhost:8080');

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
    if (error.response?.status === 401) {
      authStorage.clear();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const unwrap = (res) => res.data?.data ?? res.data;

export default api;
