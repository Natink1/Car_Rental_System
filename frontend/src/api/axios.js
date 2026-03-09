import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let browser set Content-Type with boundary for FormData (multipart); do not send application/json
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only clear session and log out on 401 from the auth check (getMe). Other 401s (e.g. payment)
    // just reject so the current page can show the error instead of going white.
    const isAuthCheck = error.config?.method === 'get' && String(error.config?.url || '').includes('auth/me');
    if (error.response?.status === 401 && isAuthCheck) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-logout'));
    }
    return Promise.reject(error);
  }
);

export default api;

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}
