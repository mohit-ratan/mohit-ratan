import axios from 'axios';

// The production build is always served by this same Node app (same origin
// as the API), so VITE_API_URL only matters in local dev against a
// separately-running backend (see client/.env.example). A production build
// ignores it outright — some hosts inject their own VITE_API_URL at build
// time (e.g. the app's own URL + "/api"), which would double up with the
// "/api/..." every call already hardcodes.
export const API_URL = import.meta.env.DEV ? (import.meta.env.VITE_API_URL || '') : '';

const client = axios.create({ baseURL: API_URL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('psw_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize error messages so callers can just do err.message
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Something went wrong.';
    return Promise.reject(new Error(message));
  }
);

// Turns a relative "/assets/uploads/xyz.png" from the API into an absolute URL.
export function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path) || path.startsWith('blob:')) return path;
  return `${API_URL}${path}`;
}

export default client;
